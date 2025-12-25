import { Download, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionImageProps {
  name: string;
  imageUrl: string;
  index: number;
  confidence?: number;
  onPreview: () => void;
  onDownload: () => void;
}

export function SectionImage({
  name,
  imageUrl,
  index,
  confidence = 100,
  onPreview,
  onDownload,
}: SectionImageProps) {
  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-amber-400';
    return 'text-orange-400';
  };

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image container */}
      <div className="relative aspect-video overflow-hidden bg-secondary/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent opacity-60" />

        {/* Actions overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="bg-card/90 backdrop-blur-sm hover:bg-card"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            Expandir
          </Button>
          <Button
            size="sm"
            variant="hero"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-4 h-4 mr-1" />
            Baixar
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-medium text-foreground truncate">{name}</h3>
          </div>
          
          {confidence !== undefined && (
            <div className="flex items-center gap-1">
              <Sparkles className={`w-3 h-3 ${getConfidenceColor()}`} />
              <span className={`text-xs font-medium ${getConfidenceColor()}`}>
                {confidence}%
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-secondary/50">PNG</span>
          <span className="px-2 py-0.5 rounded bg-secondary/50">HD</span>
        </div>
      </div>
    </div>
  );
}
