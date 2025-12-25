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

interface DetectedSection {
  id: string;
  name: string;
  type: string;
  order: number;
  confidence: number;
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
        formats: ['screenshot', 'html'],
        onlyMainContent: false,
        waitFor: 5000, // Wait for dynamic content to load
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

    // Analyze the HTML to detect sections with improved algorithm
    const html = data.data?.html || '';
    const sections = detectSectionsAdvanced(html);
    
    console.log('Capture successful, detected sections:', sections.length);
    console.log('Section details:', sections.map(s => `${s.name} (${s.confidence}%)`));

    return new Response(
      JSON.stringify({
        success: true,
        screenshot: data.data?.screenshot,
        sections,
        metadata: {
          title: data.data?.metadata?.title || 'Site',
          url: formattedUrl,
          capturedAt: new Date().toISOString(),
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

// Advanced section detection with confidence scoring
function detectSectionsAdvanced(html: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  const foundTypes = new Set<string>();
  let order = 0;

  // Define section patterns with weights for confidence scoring
  const sectionPatterns = [
    { 
      patterns: [
        /<header[^>]*>/gi,
        /class="[^"]*\b(hero|banner|jumbotron|masthead|main-header)\b[^"]*"/gi,
        /id="[^"]*\b(hero|banner|top)\b[^"]*"/gi,
        /<section[^>]*class="[^"]*\b(hero)\b/gi,
      ],
      name: 'Hero / Topo', 
      type: 'hero',
      priority: 1,
    },
    { 
      patterns: [
        /class="[^"]*\b(nav|navigation|menu|navbar)\b[^"]*"/gi,
        /<nav[^>]*>/gi,
      ],
      name: 'Navegação', 
      type: 'navigation',
      priority: 2,
    },
    { 
      patterns: [
        /class="[^"]*\b(stats?|statistic|metrics?|numbers?|counter|achievement)\b[^"]*"/gi,
        /class="[^"]*\b(kpi|data-point)\b[^"]*"/gi,
      ],
      name: 'Estatísticas', 
      type: 'stats',
      priority: 3,
    },
    { 
      patterns: [
        /class="[^"]*\b(about|intro|introduction|presentation|company|who-we-are)\b[^"]*"/gi,
        /id="[^"]*\b(about|intro)\b[^"]*"/gi,
      ],
      name: 'Apresentação', 
      type: 'about',
      priority: 4,
    },
    { 
      patterns: [
        /class="[^"]*\b(features?|services?|benefits?|solutions?|capabilities)\b[^"]*"/gi,
        /id="[^"]*\b(features?|services?)\b[^"]*"/gi,
      ],
      name: 'Funcionalidades', 
      type: 'features',
      priority: 5,
    },
    { 
      patterns: [
        /class="[^"]*\b(pricing|plans?|packages?|tiers?)\b[^"]*"/gi,
        /id="[^"]*\b(pricing|plans?)\b[^"]*"/gi,
      ],
      name: 'Preços', 
      type: 'pricing',
      priority: 6,
    },
    { 
      patterns: [
        /class="[^"]*\b(cards?|grid|items?|products?|catalog)\b[^"]*"/gi,
      ],
      name: 'Cards / Grid', 
      type: 'cards',
      priority: 7,
    },
    { 
      patterns: [
        /class="[^"]*\b(testimonials?|reviews?|quotes?|feedback|clients?-say)\b[^"]*"/gi,
        /id="[^"]*\b(testimonials?|reviews?)\b[^"]*"/gi,
      ],
      name: 'Depoimentos', 
      type: 'testimonials',
      priority: 8,
    },
    { 
      patterns: [
        /class="[^"]*\b(process|steps?|how-it-works?|workflow|timeline|roadmap)\b[^"]*"/gi,
        /id="[^"]*\b(process|how-it-works?)\b[^"]*"/gi,
      ],
      name: 'Processo', 
      type: 'process',
      priority: 9,
    },
    { 
      patterns: [
        /class="[^"]*\b(portfolio|gallery|works?|projects?|showcase|case-stud)\b[^"]*"/gi,
        /id="[^"]*\b(portfolio|gallery|works?)\b[^"]*"/gi,
      ],
      name: 'Portfólio', 
      type: 'portfolio',
      priority: 10,
    },
    { 
      patterns: [
        /class="[^"]*\b(team|members?|people|staff|employees?)\b[^"]*"/gi,
        /id="[^"]*\b(team)\b[^"]*"/gi,
      ],
      name: 'Equipe', 
      type: 'team',
      priority: 11,
    },
    { 
      patterns: [
        /class="[^"]*\b(partners?|clients?|logos?|brands?|trusted-by)\b[^"]*"/gi,
      ],
      name: 'Parceiros / Clientes', 
      type: 'partners',
      priority: 12,
    },
    { 
      patterns: [
        /class="[^"]*\b(faq|questions?|accordion|help)\b[^"]*"/gi,
        /id="[^"]*\b(faq|questions?)\b[^"]*"/gi,
        /<details[^>]*>/gi,
      ],
      name: 'FAQ', 
      type: 'faq',
      priority: 13,
    },
    { 
      patterns: [
        /class="[^"]*\b(blog|posts?|articles?|news|updates?)\b[^"]*"/gi,
        /id="[^"]*\b(blog|news)\b[^"]*"/gi,
      ],
      name: 'Blog / Notícias', 
      type: 'blog',
      priority: 14,
    },
    { 
      patterns: [
        /class="[^"]*\b(contact|form|cta|call-to-action|get-started|subscribe|newsletter)\b[^"]*"/gi,
        /id="[^"]*\b(contact|cta)\b[^"]*"/gi,
        /<form[^>]*>/gi,
      ],
      name: 'Contato / CTA', 
      type: 'contact',
      priority: 15,
    },
    { 
      patterns: [
        /<footer[^>]*>/gi,
        /class="[^"]*\b(footer|site-footer|bottom)\b[^"]*"/gi,
        /id="[^"]*\b(footer)\b[^"]*"/gi,
      ],
      name: 'Rodapé', 
      type: 'footer',
      priority: 99,
    },
  ];

  // Always add hero first
  sections.push({ 
    id: crypto.randomUUID(), 
    name: 'Hero / Topo', 
    type: 'hero',
    order: order++,
    confidence: 100,
  });
  foundTypes.add('hero');

  // Check for each pattern in HTML
  for (const pattern of sectionPatterns) {
    if (pattern.type === 'hero') continue; // Already added

    let matchCount = 0;
    for (const regex of pattern.patterns) {
      const matches = html.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    }

    if (matchCount > 0 && !foundTypes.has(pattern.type)) {
      // Calculate confidence based on match count
      const confidence = Math.min(100, 50 + matchCount * 15);
      
      sections.push({
        id: crypto.randomUUID(),
        name: pattern.name,
        type: pattern.type,
        order: order++,
        confidence,
      });
      foundTypes.add(pattern.type);
    }
  }

  // Ensure footer is last if present
  const footerIndex = sections.findIndex(s => s.type === 'footer');
  if (footerIndex !== -1) {
    const footer = sections.splice(footerIndex, 1)[0];
    footer.order = 999;
    sections.push(footer);
  } else {
    // Add footer if not found
    sections.push({ 
      id: crypto.randomUUID(), 
      name: 'Rodapé', 
      type: 'footer',
      order: 999,
      confidence: 80,
    });
  }

  // Sort by order
  sections.sort((a, b) => a.order - b.order);

  // Re-assign sequential order numbers
  sections.forEach((section, index) => {
    section.order = index;
  });

  return sections;
}
