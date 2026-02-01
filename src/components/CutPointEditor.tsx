import { useState, useRef, useEffect, useCallback } from "react";
import { GripHorizontal, Check, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Section } from "@/lib/api/capture";

interface CutPointEditorProps {
  screenshot: string;
  sections: Section[];
  onSave: (updatedSections: Section[]) => void;
  onCancel: () => void;
}

interface CutPoint {
  y: number; // Percentage 0-100
  sectionIndex: number;
}

export function CutPointEditor({ screenshot, sections, onSave, onCancel }: CutPointEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [imageHeight, setImageHeight] = useState(0);
  const [zoom, setZoom] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize cut points from sections
  useEffect(() => {
    if (sections.length <= 1) {
      setCutPoints([]);
      return;
    }

    // Calculate cumulative positions
    let cumulativeHeight = 0;
    const points: CutPoint[] = [];

    for (let i = 0; i < sections.length - 1; i++) {
      cumulativeHeight += sections[i].estimatedHeight || (100 / sections.length);
      points.push({
        y: Math.min(cumulativeHeight, 99),
        sectionIndex: i,
      });
    }

    setCutPoints(points);
  }, [sections]);

  // Update image height on load
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageHeight(imageRef.current.naturalHeight);
    }
  }, []);

  // Handle drag start
  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
    setIsDragging(true);
  }, []);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !containerRef.current || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(2, Math.min(98, (y / rect.height) * 100));

    setCutPoints(prev => {
      const updated = [...prev];
      const prevPoint = draggingIndex > 0 ? updated[draggingIndex - 1].y + 2 : 2;
      const nextPoint = draggingIndex < updated.length - 1 ? updated[draggingIndex + 1].y - 2 : 98;
      
      updated[draggingIndex] = {
        ...updated[draggingIndex],
        y: Math.max(prevPoint, Math.min(nextPoint, percentage)),
      };
      return updated;
    });
  }, [draggingIndex]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
    setIsDragging(false);
  }, []);

  // Attach global mouse events when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Generate new sections based on cut points
  const handleSave = useCallback(() => {
    const newSections: Section[] = [];
    let lastY = 0;

    // Create sections based on cut points
    for (let i = 0; i <= cutPoints.length; i++) {
      const currentY = i < cutPoints.length ? cutPoints[i].y : 100;
      const height = currentY - lastY;
      
      const originalSection = sections[i] || sections[sections.length - 1];
      
      newSections.push({
        ...originalSection,
        id: `${originalSection.id}-edited-${i}`,
        order: i,
        estimatedHeight: height,
      });
      
      lastY = currentY;
    }

    onSave(newSections);
  }, [cutPoints, sections, onSave]);

  // Reset to original cut points
  const handleReset = useCallback(() => {
    let cumulativeHeight = 0;
    const points: CutPoint[] = [];

    for (let i = 0; i < sections.length - 1; i++) {
      cumulativeHeight += sections[i].estimatedHeight || (100 / sections.length);
      points.push({
        y: Math.min(cumulativeHeight, 99),
        sectionIndex: i,
      });
    }

    setCutPoints(points);
  }, [sections]);

  // Calculate section heights for display
  const getSectionHeights = useCallback(() => {
    const heights: Array<{ height: number; name: string }> = [];
    let lastY = 0;

    for (let i = 0; i <= cutPoints.length; i++) {
      const currentY = i < cutPoints.length ? cutPoints[i].y : 100;
      const height = currentY - lastY;
      heights.push({
        height,
        name: sections[i]?.name || `Seção ${i + 1}`,
      });
      lastY = currentY;
    }

    return heights;
  }, [cutPoints, sections]);

  const sectionHeights = getSectionHeights();

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div>
          <h2 className="text-xl font-bold text-foreground">Editor de Pontos de Corte</h2>
          <p className="text-sm text-muted-foreground">
            Arraste as linhas para ajustar onde cada seção termina
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom(prev => Math.max(0.25, prev - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setZoom(prev => Math.min(2, prev + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            Resetar
          </Button>
          
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          
          <Button variant="hero" onClick={handleSave}>
            <Check className="w-4 h-4" />
            Aplicar Cortes
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-6 justify-center">
          {/* Image with cut lines */}
          <div 
            ref={containerRef}
            className="relative inline-block"
            style={{ cursor: isDragging ? 'ns-resize' : 'default' }}
          >
            <img
              ref={imageRef}
              src={screenshot}
              alt="Screenshot"
              className="rounded-lg border border-border shadow-2xl"
              style={{ 
                maxWidth: '100%',
                width: `${zoom * 100}%`,
                minWidth: '400px',
              }}
              onLoad={handleImageLoad}
            />

            {/* Cut point lines */}
            {cutPoints.map((point, index) => (
              <div
                key={index}
                className={`absolute left-0 right-0 flex items-center justify-center group cursor-ns-resize ${
                  draggingIndex === index ? 'z-30' : 'z-20'
                }`}
                style={{ top: `${point.y}%` }}
                onMouseDown={(e) => handleMouseDown(index, e)}
              >
                {/* Line */}
                <div className={`absolute inset-x-0 h-0.5 ${
                  draggingIndex === index 
                    ? 'bg-primary shadow-lg shadow-primary/50' 
                    : 'bg-destructive/80 group-hover:bg-primary'
                } transition-colors`} />
                
                {/* Handle */}
                <div className={`relative flex items-center justify-center w-8 h-6 rounded-md ${
                  draggingIndex === index 
                    ? 'bg-primary text-primary-foreground scale-110' 
                    : 'bg-card border border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary'
                } transition-all shadow-lg`}>
                  <GripHorizontal className="w-4 h-4" />
                </div>

                {/* Position indicator */}
                <div className={`absolute -left-16 text-xs font-mono px-2 py-1 rounded ${
                  draggingIndex === index 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card/90 border border-border text-muted-foreground'
                }`}>
                  {point.y.toFixed(1)}%
                </div>
              </div>
            ))}

            {/* Section labels overlay */}
            {sectionHeights.map((section, index) => {
              const startY = index === 0 ? 0 : cutPoints[index - 1].y;
              const endY = index < cutPoints.length ? cutPoints[index].y : 100;
              const centerY = (startY + endY) / 2;

              return (
                <div
                  key={index}
                  className="absolute left-3 transform -translate-y-1/2 bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-md text-sm font-medium text-foreground shadow-lg z-10"
                  style={{ top: `${centerY}%` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-primary/20 text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="truncate max-w-[120px]">{section.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {section.height.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section list sidebar */}
          <div className="w-64 shrink-0">
            <div className="sticky top-0 space-y-3">
              <h3 className="font-semibold text-foreground">Seções ({sectionHeights.length})</h3>
              
              <div className="space-y-2">
                {sectionHeights.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary/20 text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {section.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {section.height.toFixed(1)}% da página
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Arraste as linhas vermelhas para ajustar os pontos de corte. 
                  Cada seção será exportada como uma imagem separada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
