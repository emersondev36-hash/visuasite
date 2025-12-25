import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

export interface Section {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  order: number;
  confidence: number;
}

export interface CaptureResult {
  success: boolean;
  screenshot?: string;
  sections?: Array<{ 
    id: string; 
    name: string; 
    type: string;
    order: number;
    confidence: number;
  }>;
  metadata?: {
    title: string;
    url: string;
    capturedAt?: string;
  };
  error?: string;
}

export async function captureSite(url: string): Promise<CaptureResult> {
  try {
    const { data, error } = await supabase.functions.invoke('capture-site', {
      body: { url },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
    }

    return data as CaptureResult;
  } catch (err) {
    console.error('Error calling capture-site:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro ao capturar o site' 
    };
  }
}

// Load an image from base64 or URL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Slice a portion of the image and return as base64
function sliceImage(
  img: HTMLImageElement,
  startY: number,
  height: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): string {
  // Ensure we don't exceed image bounds
  const actualHeight = Math.min(height, img.height - startY);
  if (actualHeight <= 0) return '';
  
  canvas.width = img.width;
  canvas.height = actualHeight;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0, startY, img.width, actualHeight, // source
    0, 0, img.width, actualHeight        // destination
  );
  
  return canvas.toDataURL('image/png', 1.0);
}

// Generate section images by actually slicing the screenshot
export async function generateSectionImages(
  screenshot: string,
  sections: Array<{ 
    id: string; 
    name: string; 
    type: string;
    order: number;
    confidence: number;
  }>
): Promise<Section[]> {
  if (!screenshot || sections.length === 0) {
    return sections.map((section) => ({
      ...section,
      imageUrl: screenshot || '',
      order: section.order ?? 0,
      confidence: section.confidence ?? 100,
    }));
  }

  try {
    // Load the full screenshot
    const img = await loadImage(screenshot);
    const totalHeight = img.height;
    const totalWidth = img.width;
    
    console.log(`Screenshot loaded: ${totalWidth}x${totalHeight}px, ${sections.length} sections`);
    
    // Create canvas for slicing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Define section height distribution
    // Different section types typically have different heights
    const sectionHeightWeights: Record<string, number> = {
      hero: 1.2,
      navigation: 0.3,
      stats: 0.6,
      about: 1.0,
      features: 1.2,
      pricing: 1.0,
      cards: 1.0,
      testimonials: 0.8,
      process: 1.0,
      portfolio: 1.2,
      team: 0.8,
      partners: 0.5,
      faq: 0.8,
      blog: 1.0,
      contact: 0.7,
      footer: 0.4,
    };

    // Calculate total weight
    let totalWeight = 0;
    sections.forEach(section => {
      totalWeight += sectionHeightWeights[section.type] || 0.8;
    });

    // Minimum section height (ensures no section is too small)
    const minSectionHeight = 200;
    
    // Calculate height per weight unit
    const heightPerWeight = totalHeight / totalWeight;
    
    // Generate sliced images
    let currentY = 0;
    const slicedSections: Section[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const weight = sectionHeightWeights[section.type] || 0.8;
      
      // Calculate section height
      let sectionHeight = Math.round(heightPerWeight * weight);
      
      // Ensure minimum height
      sectionHeight = Math.max(sectionHeight, minSectionHeight);
      
      // For the last section, take whatever is left
      if (i === sections.length - 1) {
        sectionHeight = totalHeight - currentY;
      }
      
      // Skip if we're past the image
      if (currentY >= totalHeight) {
        slicedSections.push({
          ...section,
          imageUrl: '',
          order: section.order ?? i,
          confidence: section.confidence ?? 100,
        });
        continue;
      }
      
      // Slice the image
      const slicedImageUrl = sliceImage(img, currentY, sectionHeight, canvas, ctx);
      
      slicedSections.push({
        ...section,
        imageUrl: slicedImageUrl || screenshot, // Fallback to full screenshot
        order: section.order ?? i,
        confidence: section.confidence ?? 100,
      });
      
      console.log(`Section ${i + 1} (${section.name}): y=${currentY}, height=${sectionHeight}`);
      
      currentY += sectionHeight;
    }

    return slicedSections;
  } catch (error) {
    console.error('Error slicing screenshot:', error);
    // Fallback: return all sections with full screenshot
    return sections.map((section, i) => ({
      ...section,
      imageUrl: screenshot,
      order: section.order ?? i,
      confidence: section.confidence ?? 100,
    }));
  }
}

// Convert base64 to blob for download
export function base64ToBlob(base64: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'image/png' });
}

// Create ZIP file with all section images
export async function createSectionsZip(
  sections: Section[],
  siteName: string
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(siteName) || zip;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section.imageUrl) continue;
    
    const fileName = `${String(i + 1).padStart(2, '0')}-${sanitizeFileName(section.name)}.png`;
    
    try {
      if (section.imageUrl.startsWith('data:')) {
        // Base64 image
        const blob = base64ToBlob(section.imageUrl);
        folder.file(fileName, blob);
      } else {
        // URL - fetch the image
        const response = await fetch(section.imageUrl);
        const blob = await response.blob();
        folder.file(fileName, blob);
      }
    } catch (error) {
      console.error(`Error adding ${section.name} to ZIP:`, error);
    }
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

// Sanitize file name for safe downloads
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Download a single section image
export function downloadSection(section: Section): void {
  if (!section.imageUrl) return;
  
  const fileName = `${sanitizeFileName(section.name)}.png`;
  const link = document.createElement('a');
  
  if (section.imageUrl.startsWith('data:')) {
    link.href = section.imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // For URLs, we need to fetch and create a blob
    fetch(section.imageUrl)
      .then(response => response.blob())
      .then(blob => {
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      });
  }
}

// Download all sections as ZIP
export async function downloadAllSectionsAsZip(
  sections: Section[],
  siteUrl: string
): Promise<void> {
  // Extract domain name for ZIP file name
  let siteName = 'visual-site-splitter';
  try {
    const urlStr = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    const url = new URL(urlStr);
    siteName = url.hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    // Use default name
  }
  
  const zipBlob = await createSectionsZip(sections, siteName);
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = `${siteName}-sections.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
