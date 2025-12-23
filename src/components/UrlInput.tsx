import { useState } from "react";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
        
        {/* Input container */}
        <div className="relative flex items-center gap-2 p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50">
            <Globe className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <Input
            type="url"
            placeholder="Cole a URL do site (ex: https://exemplo.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border-0 bg-transparent h-12 text-base focus:ring-0 placeholder:text-muted-foreground/60"
            disabled={isLoading}
          />
          
          <Button
            type="submit"
            variant="hero"
            size="lg"
            disabled={!url.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando
              </>
            ) : (
              <>
                Capturar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
      
      <p className="text-center text-sm text-muted-foreground mt-4">
        Suporta qualquer site público • Captura em alta resolução (2x DPR)
      </p>
    </form>
  );
}
