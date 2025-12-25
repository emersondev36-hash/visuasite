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

// Generate section images from the screenshot
export function generateSectionImages(
  screenshot: string,
  sections: Array<{ 
    id: string; 
    name: string; 
    type: string;
    order: number;
    confidence: number;
  }>
): Section[] {
  // For now, we use the full screenshot for each section
  // This simulates section detection - in production you would
  // use image processing to actually slice the screenshot
  return sections.map((section) => ({
    ...section,
    imageUrl: screenshot,
    order: section.order ?? 0,
    confidence: section.confidence ?? 100,
  }));
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
  const fileName = `${sanitizeFileName(section.name)}.png`;
  const link = document.createElement('a');
  
  if (section.imageUrl.startsWith('data:')) {
    link.href = section.imageUrl;
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
    return;
  }
  
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
