const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeResult {
  success: boolean;
  data?: {
    screenshot?: string;
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl não está configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Capturing URL:', formattedUrl);

    // Capture full page screenshot with high resolution
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['screenshot', 'markdown', 'html'],
        onlyMainContent: false,
        waitFor: 3000, // Wait for dynamic content
        screenshot: true,
        fullPageScreenshot: true,
      }),
    });

    const data: ScrapeResult = await response.json();

    if (!response.ok || !data.success) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error || `Falha ao capturar o site (status ${response.status})` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze the HTML to detect sections
    const html = data.data?.html || '';
    const sections = detectSections(html, data.data?.screenshot || '');
    
    console.log('Capture successful, detected sections:', sections.length);

    return new Response(
      JSON.stringify({
        success: true,
        screenshot: data.data?.screenshot,
        sections,
        metadata: {
          title: data.data?.metadata?.title || 'Site',
          url: formattedUrl,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error capturing site:', error);
    const errorMessage = error instanceof Error ? error.message : 'Falha ao processar';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to detect sections from HTML structure
function detectSections(html: string, screenshot: string): Array<{
  id: string;
  name: string;
  type: string;
}> {
  const sections: Array<{ id: string; name: string; type: string }> = [];
  
  // Define section patterns to detect
  const sectionPatterns = [
    { regex: /<header[^>]*>|<nav[^>]*>|class="[^"]*hero[^"]*"|class="[^"]*banner[^"]*"/gi, name: 'Hero / Topo', type: 'hero' },
    { regex: /class="[^"]*stat[^"]*"|class="[^"]*metric[^"]*"|class="[^"]*number[^"]*"/gi, name: 'Estatísticas', type: 'stats' },
    { regex: /class="[^"]*about[^"]*"|class="[^"]*intro[^"]*"|class="[^"]*presentation[^"]*"/gi, name: 'Apresentação', type: 'about' },
    { regex: /class="[^"]*feature[^"]*"|class="[^"]*service[^"]*"|class="[^"]*benefit[^"]*"/gi, name: 'Funcionalidades', type: 'features' },
    { regex: /class="[^"]*card[^"]*"|class="[^"]*grid[^"]*"|class="[^"]*pricing[^"]*"/gi, name: 'Cards / Grid', type: 'cards' },
    { regex: /class="[^"]*testimon[^"]*"|class="[^"]*review[^"]*"|class="[^"]*quote[^"]*"/gi, name: 'Depoimentos', type: 'testimonials' },
    { regex: /class="[^"]*process[^"]*"|class="[^"]*step[^"]*"|class="[^"]*how[^"]*"/gi, name: 'Processo', type: 'process' },
    { regex: /class="[^"]*portfolio[^"]*"|class="[^"]*gallery[^"]*"|class="[^"]*work[^"]*"/gi, name: 'Portfólio', type: 'portfolio' },
    { regex: /class="[^"]*faq[^"]*"|class="[^"]*question[^"]*"|class="[^"]*accordion[^"]*"/gi, name: 'FAQ', type: 'faq' },
    { regex: /class="[^"]*contact[^"]*"|class="[^"]*form[^"]*"|class="[^"]*cta[^"]*"/gi, name: 'Contato / CTA', type: 'contact' },
    { regex: /<footer[^>]*>|class="[^"]*footer[^"]*"/gi, name: 'Rodapé', type: 'footer' },
  ];

  // Always add hero
  sections.push({ id: crypto.randomUUID(), name: 'Hero / Topo', type: 'hero' });

  // Check for each pattern in HTML
  for (const pattern of sectionPatterns) {
    if (pattern.type !== 'hero' && pattern.regex.test(html)) {
      // Avoid duplicates
      if (!sections.some(s => s.type === pattern.type)) {
        sections.push({
          id: crypto.randomUUID(),
          name: pattern.name,
          type: pattern.type,
        });
      }
    }
  }

  // Always add footer if not present
  if (!sections.some(s => s.type === 'footer')) {
    sections.push({ id: crypto.randomUUID(), name: 'Rodapé', type: 'footer' });
  }

  return sections;
}
