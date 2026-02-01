import { useState, useRef, useEffect } from "react";
import { X, Move, ZoomIn, ZoomOut, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Section } from "@/lib/api/capture";

interface ComparisonViewProps {
  screenshot: string;
  sections: Section[];
  onClose: () => void;
}

export function ComparisonView({ screenshot, sections, onClose }: ComparisonViewProps) {
  const [zoom, setZoom] = useState(0.4);
  const [syncScroll, setSyncScroll] = useState(true);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Sync scroll between panels
  const handleScroll = (source: 'left' | 'right') => {
    if (!syncScroll) return;
    
    const sourceRef = source === 'left' ? leftPanelRef : rightPanelRef;
    const targetRef = source === 'left' ? rightPanelRef : leftPanelRef;
    
    if (sourceRef.current && targetRef.current) {
      const scrollPercentage = sourceRef.current.scrollTop / 
        (sourceRef.current.scrollHeight - sourceRef.current.clientHeight);
      
      targetRef.current.scrollTop = scrollPercentage * 
        (targetRef.current.scrollHeight - targetRef.current.clientHeight);
    }
  };

  // Calculate section markers for original image
  const getSectionMarkers = () => {
    const markers: Array<{ y: number; name: string; color: string }> = [];
    let cumulativeY = 0;

    const typeColors: Record<string, string> = {
      hero: '#8b5cf6',
      navigation: '#64748b',
      stats: '#3b82f6',
      about: '#10b981',
      features: '#06b6d4',
      pricing: '#f59e0b',
      cards: '#6366f1',
      testimonials: '#ec4899',
      process: '#14b8a6',
      portfolio: '#a855f7',
      team: '#f97316',
      partners: '#84cc16',
      faq: '#f43f5e',
      blog: '#0ea5e9',
      contact: '#22c55e',
      footer: '#71717a',
    };

    for (const section of sections) {
      markers.push({
        y: cumulativeY,
        name: section.name,
        color: typeColors[section.type] || '#8b5cf6',
      });
      cumulativeY += section.estimatedHeight || 0;
    }

    return markers;
  };

  const markers = getSectionMarkers();

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Columns2 className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Modo de Comparação</h2>
            <p className="text-sm text-muted-foreground">
              Original × {sections.length} seções recortadas
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Sync scroll toggle */}
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
              syncScroll 
                ? 'bg-primary/20 border-primary/50 text-primary' 
                : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Move className="w-4 h-4" />
            <span className="text-sm font-medium">
              {syncScroll ? 'Scroll Sincronizado' : 'Scroll Livre'}
            </span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Comparison panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Original screenshot */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-2 bg-secondary/30 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Original</h3>
            <p className="text-xs text-muted-foreground">Screenshot completo da página</p>
          </div>
          
          <div 
            ref={leftPanelRef}
            className="flex-1 overflow-auto p-4"
            onScroll={() => handleScroll('left')}
          >
            <div className="relative inline-block mx-auto">
              <img
                src={screenshot}
                alt="Original"
                className="rounded-lg border border-border shadow-xl"
                style={{ width: `${zoom * 100}%`, minWidth: '300px' }}
              />
              
              {/* Section markers */}
              {markers.map((marker, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: `${marker.y}%` }}
                >
                  <div 
                    className="h-0.5 flex-1"
                    style={{ backgroundColor: `${marker.color}80` }}
                  />
                  <span 
                    className="absolute -left-2 -translate-x-full text-xs px-2 py-0.5 rounded whitespace-nowrap"
                    style={{ 
                      backgroundColor: marker.color,
                      color: 'white',
                    }}
                  >
                    {marker.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - Sliced sections */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 bg-secondary/30 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Seções Recortadas</h3>
            <p className="text-xs text-muted-foreground">{sections.length} imagens individuais</p>
          </div>
          
          <div 
            ref={rightPanelRef}
            className="flex-1 overflow-auto p-4"
            onScroll={() => handleScroll('right')}
          >
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div key={section.id} className="relative">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary/20 text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">{section.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({section.estimatedHeight?.toFixed(1)}%)
                    </span>
                  </div>
                  
                  {/* Section image */}
                  {section.imageUrl ? (
                    <img
                      src={section.imageUrl}
                      alt={section.name}
                      className="rounded-lg border border-border shadow-lg"
                      style={{ width: `${zoom * 100}%`, minWidth: '300px' }}
                    />
                  ) : (
                    <div 
                      className="rounded-lg border border-border bg-secondary/30 flex items-center justify-center"
                      style={{ width: `${zoom * 100}%`, minWidth: '300px', height: '150px' }}
                    >
                      <span className="text-muted-foreground">Imagem não disponível</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
