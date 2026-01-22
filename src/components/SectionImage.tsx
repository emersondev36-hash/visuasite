import { Download, Maximize2, Sparkles, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionImageProps {
  name: string;
  imageUrl: string;
  index: number;
  confidence?: number;
  estimatedHeight?: number;
  type?: string;
  onPreview: () => void;
  onDownload: () => void;
}

const typeLabels: Record<string, string> = {
  hero: 'Hero',
  navigation: 'Nav',
  stats: 'Stats',
  about: 'Sobre',
  features: 'Features',
  pricing: 'Preços',
  cards: 'Cards',
  testimonials: 'Depoimentos',
  process: 'Processo',
  portfolio: 'Portfólio',
  team: 'Equipe',
  partners: 'Parceiros',
  faq: 'FAQ',
  blog: 'Blog',
  contact: 'Contato',
  footer: 'Footer',
};

const typeColors: Record<string, string> = {
  hero: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  navigation: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  stats: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  about: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  features: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  pricing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cards: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  testimonials: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  process: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  portfolio: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  team: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  partners: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  faq: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  blog: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  contact: 'bg-green-500/20 text-green-400 border-green-500/30',
  footer: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function SectionImage({
  name,
  imageUrl,
  index,
  confidence = 100,
  estimatedHeight,
  type = 'hero',
  onPreview,
  onDownload,
}: SectionImageProps) {
  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-amber-400';
    return 'text-orange-400';
  };

  const typeLabel = typeLabels[type] || type;
  const typeColor = typeColors[type] || 'bg-primary/20 text-primary border-primary/30';

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

        {/* Type badge on image */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-sm ${typeColor}`}>
          {typeLabel}
        </div>

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
          {estimatedHeight !== undefined && estimatedHeight > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/50">
              <Ruler className="w-3 h-3" />
              {estimatedHeight.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
