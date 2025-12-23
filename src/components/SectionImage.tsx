import { Download, Eye, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionImageProps {
  name: string;
  imageUrl: string;
  index: number;
  onPreview: () => void;
  onDownload: () => void;
}

export function SectionImage({ name, imageUrl, index, onPreview, onDownload }: SectionImageProps) {
  // Handle base64 images or regular URLs
  const imgSrc = imageUrl.startsWith('data:') ? imageUrl : imageUrl;

  return (
    <div 
      className="group relative rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Image container */}
      <div className="relative aspect-video overflow-hidden bg-secondary/30">
        <img
          src={imgSrc}
          alt={name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={onPreview}
            className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              // Open in full screen
              const newWindow = window.open();
              if (newWindow) {
                newWindow.document.write(`
                  <html>
                    <head><title>${name}</title></head>
                    <body style="margin:0;background:#0a0a0f;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;">
                      <img src="${imgSrc}" style="max-width:100%;height:auto;" />
                    </body>
                  </html>
                `);
              }
            }}
            className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
            title="Tela cheia"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Info bar */}
      <div className="flex items-center justify-between p-4">
        <div>
          <span className="text-xs font-medium text-primary">
            Seção {index + 1}
          </span>
          <h4 className="text-sm font-semibold text-foreground mt-0.5">
            {name}
          </h4>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <Download className="w-4 h-4" />
          PNG
        </Button>
      </div>
    </div>
  );
}
