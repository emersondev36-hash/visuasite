import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

export interface Section {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  order: number;
  confidence: number;
  estimatedHeight?: number;
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
    estimatedHeight?: number;
    htmlTagCount?: number;
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

// Load an image from base64 or URL with high quality
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error('Image load error:', e);
      reject(new Error('Failed to load image'));
    };
    img.src = src;
  });
}

// Slice a portion of the image with high quality PNG output
function sliceImage(
  img: HTMLImageElement,
  startY: number,
  height: number,
  width: number
): string {
  // Ensure we don't exceed image bounds
  const actualStartY = Math.max(0, Math.round(startY));
  const availableHeight = img.height - actualStartY;
  const actualHeight = Math.min(Math.round(height), availableHeight);
  
  if (actualHeight <= 0) {
    console.warn(`Invalid slice: startY=${actualStartY}, height=${actualHeight}, imgHeight=${img.height}`);
    return '';
  }

  // Create a new canvas for each slice to ensure clean output
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = actualHeight;
  
  const ctx = canvas.getContext('2d', { 
    alpha: false,
    willReadFrequently: false,
  });
  
  if (!ctx) {
    console.error('Could not create canvas context');
    return '';
  }

  // High quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Fill with white background first to avoid transparency issues
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw the image slice
  ctx.drawImage(
    img,
    0, actualStartY, width, actualHeight, // Source rectangle
    0, 0, width, actualHeight              // Destination rectangle
  );
  
  // Return as high quality PNG
  return canvas.toDataURL('image/png');
}

// Find natural break points in the image (areas of similar color)
function findBreakPoints(
  img: HTMLImageElement,
  estimatedY: number,
  searchRange: number = 50
): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) return estimatedY;
  
  // Create a narrow strip to analyze
  const stripWidth = img.width;
  const startY = Math.max(0, estimatedY - searchRange);
  const endY = Math.min(img.height, estimatedY + searchRange);
  const stripHeight = endY - startY;
  
  if (stripHeight <= 0) return estimatedY;
  
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  ctx.drawImage(img, 0, startY, stripWidth, stripHeight, 0, 0, stripWidth, stripHeight);
  
  try {
    const imageData = ctx.getImageData(0, 0, stripWidth, stripHeight);
    const data = imageData.data;
    
    // Calculate row variance scores
    const rowScores: number[] = [];
    
    for (let y = 0; y < stripHeight; y++) {
      let variance = 0;
      let prevR = 0, prevG = 0, prevB = 0;
      
      for (let x = 0; x < stripWidth; x++) {
        const idx = (y * stripWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (x > 0) {
          variance += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
        }
        prevR = r;
        prevG = g;
        prevB = b;
      }
      
      rowScores.push(variance / stripWidth);
    }
    
    // Find the row with lowest variance (most uniform - likely a divider or background)
    let minScore = Infinity;
    let bestY = Math.floor(stripHeight / 2);
    
    // Look for low-variance rows
    for (let y = 5; y < stripHeight - 5; y++) {
      // Average score across a few rows for stability
      const avgScore = (rowScores[y - 1] + rowScores[y] + rowScores[y + 1]) / 3;
      if (avgScore < minScore) {
        minScore = avgScore;
        bestY = y;
      }
    }
    
    return startY + bestY;
  } catch (e) {
    console.warn('Could not analyze break points:', e);
    return estimatedY;
  }
}

// Generate section images by slicing the screenshot based on estimated heights
export async function generateSectionImages(
  screenshot: string,
  sections: Array<{ 
    id: string; 
    name: string; 
    type: string;
    order: number;
    confidence: number;
    estimatedHeight?: number;
    htmlTagCount?: number;
  }>
): Promise<Section[]> {
  if (!screenshot || sections.length === 0) {
    return sections.map((section) => ({
      ...section,
      imageUrl: screenshot || '',
    }));
  }

  try {
    console.log(`Loading screenshot for slicing ${sections.length} sections...`);
    const img = await loadImage(screenshot);
    const totalHeight = img.height;
    const totalWidth = img.width;
    
    console.log(`Screenshot dimensions: ${totalWidth}x${totalHeight}px`);

    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Calculate heights based on estimated percentages from backend
    const hasHeightData = sortedSections.every(s => s.estimatedHeight !== undefined && s.estimatedHeight > 0);
    
    let sectionHeights: number[];
    
    if (hasHeightData) {
      // Use backend-provided height estimates
      const totalEstimated = sortedSections.reduce((sum, s) => sum + (s.estimatedHeight || 0), 0);
      sectionHeights = sortedSections.map(s => 
        Math.round((s.estimatedHeight! / totalEstimated) * totalHeight)
      );
      console.log('Using backend height estimates:', sortedSections.map((s, i) => 
        `${s.name}: ${s.estimatedHeight}% -> ${sectionHeights[i]}px`
      ));
    } else {
      // Fallback to weighted distribution
      const weights: Record<string, number> = {
        hero: 1.4,
        navigation: 0.25,
        stats: 0.6,
        about: 1.0,
        features: 1.3,
        pricing: 1.2,
        cards: 1.1,
        testimonials: 0.9,
        process: 1.0,
        portfolio: 1.3,
        team: 0.9,
        partners: 0.5,
        faq: 0.9,
        blog: 1.1,
        contact: 0.8,
        footer: 0.4,
      };
      
      const totalWeight = sortedSections.reduce((sum, s) => sum + (weights[s.type] || 0.8), 0);
      sectionHeights = sortedSections.map(s => 
        Math.round(((weights[s.type] || 0.8) / totalWeight) * totalHeight)
      );
      console.log('Using fallback weight estimates');
    }

    // Minimum and maximum section heights
    const minHeight = 150;
    const maxHeight = totalHeight * 0.4; // No section should be more than 40% of page

    // Apply constraints
    sectionHeights = sectionHeights.map(h => Math.max(minHeight, Math.min(h, maxHeight)));

    // Adjust to fit total height exactly
    const currentTotal = sectionHeights.reduce((sum, h) => sum + h, 0);
    const adjustment = totalHeight / currentTotal;
    sectionHeights = sectionHeights.map(h => Math.round(h * adjustment));

    // Fix rounding errors
    const diff = totalHeight - sectionHeights.reduce((sum, h) => sum + h, 0);
    if (diff !== 0 && sectionHeights.length > 0) {
      // Add difference to the largest section
      const maxIdx = sectionHeights.indexOf(Math.max(...sectionHeights));
      sectionHeights[maxIdx] += diff;
    }

    // Generate sliced images with smart break point detection
    let currentY = 0;
    const slicedSections: Section[] = [];
    const useSmartBreaks = totalHeight > 2000 && sortedSections.length > 3;

    for (let i = 0; i < sortedSections.length; i++) {
      const section = sortedSections[i];
      let sectionHeight = sectionHeights[i];
      
      // For middle sections, try to find natural break points
      if (useSmartBreaks && i > 0 && i < sortedSections.length - 1) {
        const estimatedEndY = currentY + sectionHeight;
        if (estimatedEndY < totalHeight - minHeight) {
          const adjustedEndY = findBreakPoints(img, estimatedEndY, 30);
          const heightDiff = adjustedEndY - estimatedEndY;
          
          // Only adjust if the difference is reasonable
          if (Math.abs(heightDiff) < sectionHeight * 0.2) {
            sectionHeight += heightDiff;
            // Adjust next section to compensate
            if (i + 1 < sectionHeights.length) {
              sectionHeights[i + 1] -= heightDiff;
            }
          }
        }
      }
      
      // For last section, take all remaining space
      if (i === sortedSections.length - 1) {
        sectionHeight = totalHeight - currentY;
      }
      
      // Skip if we're past the image
      if (currentY >= totalHeight) {
        console.warn(`Section ${section.name} starts past image end`);
        slicedSections.push({
          ...section,
          imageUrl: '',
        });
        continue;
      }
      
      // Slice the image
      const slicedImageUrl = sliceImage(img, currentY, sectionHeight, totalWidth);
      
      console.log(`Section ${i + 1}/${sortedSections.length} "${section.name}": y=${currentY}, height=${sectionHeight}px`);
      
      slicedSections.push({
        id: section.id,
        name: section.name,
        type: section.type,
        order: section.order,
        confidence: section.confidence,
        estimatedHeight: section.estimatedHeight,
        imageUrl: slicedImageUrl || screenshot,
      });
      
      currentY += sectionHeight;
    }

    console.log('Slicing complete:', slicedSections.length, 'sections');
    return slicedSections;
  } catch (error) {
    console.error('Error slicing screenshot:', error);
    // Fallback: return all sections with full screenshot
    return sections.map((section) => ({
      ...section,
      imageUrl: screenshot,
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
  
  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// Sanitize file name for safe downloads
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
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
