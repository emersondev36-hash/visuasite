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
  estimatedHeight: number; // Percentage of total height (0-100)
  htmlTagCount: number; // Number of matching HTML elements
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
    console.log('capture-site version: 2025-01-22-v3-advanced-slicing');

    // Use v1 API with proper format
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
        waitFor: 5000,
        screenshot: true,
        fullPageScreenshot: true,
      }),
    });

    const data: ScrapeResult = await response.json();

    console.log('Firecrawl response status:', response.status);
    console.log('Firecrawl data success:', data.success);

    if (!response.ok || !data.success) {
      console.error('Firecrawl API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error || `Falha ao capturar o site (status ${response.status})` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get screenshot from response - try multiple paths
    const screenshot = data.data?.screenshot;
    
    if (!screenshot) {
      console.error('No screenshot in response. Response data keys:', Object.keys(data.data || {}));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível capturar o screenshot do site' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze the HTML to detect sections with improved algorithm
    const html = data.data?.html || '';
    const sections = detectSectionsWithHeights(html);
    
    console.log('Capture successful, detected sections:', sections.length);
    console.log('Sections:', sections.map(s => `${s.name} (${s.estimatedHeight}%)`).join(', '));

    return new Response(
      JSON.stringify({
        success: true,
        screenshot: screenshot,
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

// Advanced section detection with height estimation based on HTML structure
function detectSectionsWithHeights(html: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  const foundTypes = new Set<string>();

  // Section configuration with base heights and detection patterns
  const sectionConfigs = [
    {
      type: 'hero',
      name: 'Hero / Topo',
      baseHeight: 18,
      patterns: [
        /<header[^>]*>[\s\S]*?<\/header>/gi,
        /<section[^>]*class="[^"]*\b(hero|banner|jumbotron|masthead)\b[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
        /<div[^>]*class="[^"]*\b(hero|banner|jumbotron|masthead|main-banner)\b[^"]*"[^>]*>/gi,
        /class="[^"]*\b(hero-section|hero-wrapper|hero-container)\b[^"]*"/gi,
      ],
      contentPatterns: [
        /<h1[^>]*>[\s\S]*?<\/h1>/gi,
        /<video[^>]*>/gi,
        /background(-image)?:\s*url/gi,
      ],
      order: 1,
    },
    {
      type: 'navigation',
      name: 'Navegação',
      baseHeight: 4,
      patterns: [
        /<nav[^>]*>[\s\S]*?<\/nav>/gi,
        /<div[^>]*class="[^"]*\b(navbar|navigation|nav-bar|menu-bar)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<a[^>]*href[^>]*>/gi,
        /<button[^>]*>/gi,
      ],
      order: 0,
    },
    {
      type: 'stats',
      name: 'Estatísticas',
      baseHeight: 10,
      patterns: [
        /<section[^>]*class="[^"]*\b(stats?|statistics?|metrics?|numbers?|counter|achievements?)\b[^"]*"[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(stats?|statistics?|metrics?|numbers?|counter)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /\d+[,.]?\d*[+%kKmMbB]?/g,
        /<span[^>]*class="[^"]*\b(number|count|stat)\b[^"]*"[^>]*>/gi,
      ],
      order: 2,
    },
    {
      type: 'about',
      name: 'Sobre / Apresentação',
      baseHeight: 12,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(about|intro|introduction|presentation|company|who-we-are)\b[^"]*"|id="[^"]*\b(about|intro)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(about-section|about-us|introduction)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<p[^>]*>[\s\S]*?<\/p>/gi,
        /<img[^>]*>/gi,
      ],
      order: 3,
    },
    {
      type: 'features',
      name: 'Funcionalidades',
      baseHeight: 15,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(features?|services?|benefits?|solutions?|capabilities)\b[^"]*"|id="[^"]*\b(features?|services?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(features?-section|services?-section|feature-list)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<svg[^>]*>/gi,
        /<i[^>]*class="[^"]*fa[^"]*"[^>]*>/gi,
        /class="[^"]*icon[^"]*"/gi,
      ],
      order: 4,
    },
    {
      type: 'pricing',
      name: 'Preços',
      baseHeight: 14,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(pricing|plans?|packages?|tiers?)\b[^"]*"|id="[^"]*\b(pricing|plans?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(pricing-section|pricing-table|price-cards?)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /\$\d+/g,
        /€\d+/g,
        /R\$\s*\d+/gi,
        /\/month|\/year|\/mês|\/ano/gi,
      ],
      order: 5,
    },
    {
      type: 'cards',
      name: 'Cards / Grid',
      baseHeight: 14,
      patterns: [
        /<div[^>]*class="[^"]*\b(cards?|grid|items?|products?|catalog|card-group)\b[^"]*"[^>]*>/gi,
        /<ul[^>]*class="[^"]*\b(cards?|grid|items?)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<article[^>]*>/gi,
        /class="[^"]*card[^"]*"/gi,
      ],
      order: 6,
    },
    {
      type: 'testimonials',
      name: 'Depoimentos',
      baseHeight: 12,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(testimonials?|reviews?|quotes?|feedback|clients?-say|social-proof)\b[^"]*"|id="[^"]*\b(testimonials?|reviews?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(testimonials?-section|reviews?-section|testimonial-carousel)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<blockquote[^>]*>/gi,
        /<q[^>]*>/gi,
        /class="[^"]*\b(avatar|profile-pic|testimonial-img)\b[^"]*"/gi,
        /★|⭐|class="[^"]*star[^"]*"/gi,
      ],
      order: 7,
    },
    {
      type: 'process',
      name: 'Processo / Como Funciona',
      baseHeight: 12,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(process|steps?|how-it-works?|workflow|timeline|roadmap)\b[^"]*"|id="[^"]*\b(process|how-it-works?|steps?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(process-section|steps?-section|how-it-works?-section)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /step\s*[1-9]|passo\s*[1-9]/gi,
        /class="[^"]*\b(step-number|step-icon|timeline-item)\b[^"]*"/gi,
      ],
      order: 8,
    },
    {
      type: 'portfolio',
      name: 'Portfólio / Projetos',
      baseHeight: 15,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(portfolio|gallery|works?|projects?|showcase|case-stud)\b[^"]*"|id="[^"]*\b(portfolio|gallery|works?|projects?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(portfolio-section|gallery-section|works?-section)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<img[^>]*>/gi,
        /<figure[^>]*>/gi,
        /class="[^"]*\b(project-item|gallery-item|work-item)\b[^"]*"/gi,
      ],
      order: 9,
    },
    {
      type: 'team',
      name: 'Equipe',
      baseHeight: 12,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(team|members?|people|staff|employees?)\b[^"]*"|id="[^"]*\b(team|our-team)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(team-section|team-members?|staff-section)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /class="[^"]*\b(team-member|member-card|staff-card)\b[^"]*"/gi,
        /class="[^"]*\b(avatar|profile|member-photo)\b[^"]*"/gi,
      ],
      order: 10,
    },
    {
      type: 'partners',
      name: 'Parceiros / Clientes',
      baseHeight: 8,
      patterns: [
        /<section[^>]*class="[^"]*\b(partners?|clients?|logos?|brands?|trusted-by|companies)\b[^"]*"[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(partners?-section|clients?-section|logo-grid|brand-logos)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<img[^>]*(?:logo|brand|client|partner)[^>]*>/gi,
        /class="[^"]*\b(partner-logo|client-logo|brand-logo)\b[^"]*"/gi,
      ],
      order: 11,
    },
    {
      type: 'faq',
      name: 'FAQ / Perguntas Frequentes',
      baseHeight: 12,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(faq|questions?|accordion|help)\b[^"]*"|id="[^"]*\b(faq|questions?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(faq-section|questions?-section|accordion-section)\b[^"]*"[^>]*>/gi,
        /<details[^>]*>/gi,
      ],
      contentPatterns: [
        /<summary[^>]*>/gi,
        /\?<\/h[3-6]>/gi,
        /class="[^"]*\b(faq-item|question-item|accordion-item)\b[^"]*"/gi,
      ],
      order: 12,
    },
    {
      type: 'blog',
      name: 'Blog / Notícias',
      baseHeight: 14,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(blog|posts?|articles?|news|updates?)\b[^"]*"|id="[^"]*\b(blog|news|articles?)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(blog-section|news-section|articles?-section|posts?-grid)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<article[^>]*>/gi,
        /<time[^>]*>/gi,
        /class="[^"]*\b(post-card|blog-card|article-card|news-item)\b[^"]*"/gi,
      ],
      order: 13,
    },
    {
      type: 'contact',
      name: 'Contato / CTA',
      baseHeight: 10,
      patterns: [
        /<section[^>]*(?:class="[^"]*\b(contact|form|cta|call-to-action|get-started|subscribe|newsletter)\b[^"]*"|id="[^"]*\b(contact|cta|get-in-touch)\b[^"]*")[^>]*>/gi,
        /<div[^>]*class="[^"]*\b(contact-section|cta-section|newsletter-section)\b[^"]*"[^>]*>/gi,
        /<form[^>]*class="[^"]*\b(contact|subscribe|newsletter)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /<form[^>]*>/gi,
        /<input[^>]*type="email"[^>]*>/gi,
        /<input[^>]*type="tel"[^>]*>/gi,
        /<textarea[^>]*>/gi,
      ],
      order: 14,
    },
    {
      type: 'footer',
      name: 'Rodapé',
      baseHeight: 8,
      patterns: [
        /<footer[^>]*>[\s\S]*?<\/footer>/gi,
        /<div[^>]*class="[^"]*\b(footer|site-footer|main-footer)\b[^"]*"[^>]*>/gi,
      ],
      contentPatterns: [
        /©|copyright|direitos reservados/gi,
        /<a[^>]*href[^>]*>/gi,
        /class="[^"]*\b(social|social-links?)\b[^"]*"/gi,
      ],
      order: 99,
    },
  ];

  // Calculate matches and heights for each section type
  const detectedConfigs: Array<{
    config: typeof sectionConfigs[0];
    matches: number;
    contentMatches: number;
    adjustedHeight: number;
  }> = [];

  for (const config of sectionConfigs) {
    let matches = 0;
    let contentMatches = 0;

    // Count main pattern matches
    for (const pattern of config.patterns) {
      const found = html.match(pattern);
      if (found) {
        matches += found.length;
      }
    }

    // Count content pattern matches for height estimation
    for (const pattern of config.contentPatterns) {
      const found = html.match(pattern);
      if (found) {
        contentMatches += found.length;
      }
    }

    if (matches > 0 || (config.type === 'hero' || config.type === 'footer')) {
      // Adjust height based on content
      let adjustedHeight = config.baseHeight;
      
      // More content = potentially taller section
      if (contentMatches > 10) {
        adjustedHeight *= 1.3;
      } else if (contentMatches > 5) {
        adjustedHeight *= 1.15;
      }

      detectedConfigs.push({
        config,
        matches: Math.max(1, matches),
        contentMatches,
        adjustedHeight,
      });
    }
  }

  // Calculate total height percentage
  let totalHeight = detectedConfigs.reduce((sum, d) => sum + d.adjustedHeight, 0);

  // Normalize to 100%
  const normalizationFactor = 100 / totalHeight;

  // Sort by order
  detectedConfigs.sort((a, b) => a.config.order - b.config.order);

  // Create sections with normalized heights
  for (let i = 0; i < detectedConfigs.length; i++) {
    const detected = detectedConfigs[i];
    const normalizedHeight = detected.adjustedHeight * normalizationFactor;
    const confidence = Math.min(100, 50 + detected.matches * 12 + detected.contentMatches * 3);

    sections.push({
      id: crypto.randomUUID(),
      name: detected.config.name,
      type: detected.config.type,
      order: i,
      confidence: Math.round(confidence),
      estimatedHeight: Math.round(normalizedHeight * 10) / 10,
      htmlTagCount: detected.matches + detected.contentMatches,
    });

    foundTypes.add(detected.config.type);
  }

  // Ensure we have at least hero and footer
  if (!foundTypes.has('hero')) {
    sections.unshift({
      id: crypto.randomUUID(),
      name: 'Hero / Topo',
      type: 'hero',
      order: 0,
      confidence: 90,
      estimatedHeight: 20,
      htmlTagCount: 1,
    });
  }

  if (!foundTypes.has('footer')) {
    sections.push({
      id: crypto.randomUUID(),
      name: 'Rodapé',
      type: 'footer',
      order: 99,
      confidence: 80,
      estimatedHeight: 8,
      htmlTagCount: 1,
    });
  }

  // Re-sort and re-number
  sections.sort((a, b) => a.order - b.order);
  sections.forEach((section, index) => {
    section.order = index;
  });

  // Final normalization pass
  const finalTotal = sections.reduce((sum, s) => sum + s.estimatedHeight, 0);
  if (Math.abs(finalTotal - 100) > 0.5) {
    const finalFactor = 100 / finalTotal;
    sections.forEach(s => {
      s.estimatedHeight = Math.round(s.estimatedHeight * finalFactor * 10) / 10;
    });
  }

  return sections;
}
