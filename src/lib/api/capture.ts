import { supabase } from "@/integrations/supabase/client";

export interface Section {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
}

export interface CaptureResult {
  success: boolean;
  screenshot?: string;
  sections?: Array<{ id: string; name: string; type: string }>;
  metadata?: {
    title: string;
    url: string;
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

// Simulate section splitting from a single screenshot
// In production, this would use image processing APIs
export function generateSectionImages(
  screenshot: string,
  sections: Array<{ id: string; name: string; type: string }>
): Section[] {
  // For now, we'll use the same screenshot for all sections
  // with visual variations to simulate different sections
  // In a real implementation, this would slice the actual screenshot
  
  return sections.map((section, index) => ({
    ...section,
    imageUrl: screenshot,
  }));
}
