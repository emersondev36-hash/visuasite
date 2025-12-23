import { Download, Grid3X3, LayoutList, RotateCcw, FileArchive } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionImage } from "./SectionImage";
import { useToast } from "@/hooks/use-toast";
import type { Section } from "@/lib/api/capture";

interface ResultsGridProps {
  sections: Section[];
  siteUrl: string;
  onReset: () => void;
}

export function ResultsGrid({ sections, siteUrl, onReset }: ResultsGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { toast } = useToast();

  const handleDownloadAll = async () => {
    toast({
      title: "Preparando download...",
      description: "Gerando arquivo ZIP com todas as seções",
    });

    // For each section, create download
    for (const section of sections) {
      await handleDownloadSection(section);
    }

    toast({
      title: "Downloads iniciados!",
      description: `${sections.length} imagens estão sendo baixadas`,
    });
  };

  const handleDownloadSection = async (section: Section) => {
    try {
      const link = document.createElement("a");
      const fileName = `${section.name.toLowerCase().replace(/\s+/g, "-").replace(/[\/\\]/g, "-")}.png`;
      
      if (section.imageUrl.startsWith('data:')) {
        // Base64 image
        link.href = section.imageUrl;
      } else {
        // Regular URL - fetch and convert to blob
        const response = await fetch(section.imageUrl);
        const blob = await response.blob();
        link.href = URL.createObjectURL(blob);
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a imagem",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (section: Section) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${section.name} - Visual Site Splitter</title></head>
          <body style="margin:0;background:#0a0a0f;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:20px;">
            <img src="${section.imageUrl}" style="max-width:100%;height:auto;border-radius:8px;" />
          </body>
        </html>
      `);
    }
  };

  // Extract domain from URL for display
  const displayUrl = (() => {
    try {
      const urlStr = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
      const url = new URL(urlStr);
      return url.hostname;
    } catch {
      return siteUrl;
    }
  })();

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Seções Capturadas
          </h2>
          <p className="text-muted-foreground mt-1">
            {sections.length} seção(ões) encontrada(s) em{" "}
            <span className="text-primary font-medium">{siteUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-lg bg-secondary/50 border border-border/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em grade"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Nova URL
          </Button>

          <Button variant="hero" onClick={handleDownloadAll}>
            <FileArchive className="w-4 h-4" />
            Baixar Todas
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "flex flex-col gap-4"
        }
      >
        {sections.map((section, index) => (
          <SectionImage
            key={section.id}
            name={section.name}
            imageUrl={section.imageUrl}
            index={index}
            onPreview={() => handlePreview(section)}
            onDownload={() => handleDownloadSection(section)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-12 p-6 rounded-xl bg-card/40 border border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Resumo da Captura
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Seções</p>
            <p className="text-2xl font-bold text-foreground">{sections.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Formato</p>
            <p className="text-2xl font-bold text-foreground">PNG</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resolução</p>
            <p className="text-2xl font-bold text-foreground">HD</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold text-primary">Pronto</p>
          </div>
        </div>
      </div>
    </div>
  );
}
