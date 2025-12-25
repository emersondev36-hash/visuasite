import { Download, Grid3X3, LayoutList, RotateCcw, FileArchive, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionImage } from "./SectionImage";
import { useToast } from "@/hooks/use-toast";
import { downloadSection, downloadAllSectionsAsZip, type Section } from "@/lib/api/capture";

interface ResultsGridProps {
  sections: Section[];
  siteUrl: string;
  onReset: () => void;
}

export function ResultsGrid({ sections, siteUrl, onReset }: ResultsGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    toast({
      title: "Preparando download...",
      description: "Gerando arquivo ZIP com todas as seções",
    });

    try {
      await downloadAllSectionsAsZip(sections, siteUrl);
      toast({
        title: "Download concluído!",
        description: `${sections.length} imagens foram baixadas em um arquivo ZIP`,
      });
    } catch (error) {
      console.error('ZIP download error:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível gerar o arquivo ZIP",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSection = (section: Section) => {
    try {
      downloadSection(section);
      toast({
        title: "Download iniciado",
        description: `Baixando ${section.name}`,
      });
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
        <!DOCTYPE html>
        <html>
          <head>
            <title>${section.name} - Visual Site Splitter</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background: #0a0a0f; 
                min-height: 100vh; 
                display: flex; 
                justify-content: center; 
                align-items: flex-start;
                padding: 40px 20px;
              }
              img { 
                max-width: 100%; 
                height: auto; 
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              }
              .info {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(15, 15, 23, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
              }
              .badge {
                display: inline-block;
                background: linear-gradient(135deg, #a855f7, #6366f1);
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 8px;
              }
            </style>
          </head>
          <body>
            <div class="info">
              ${section.name}
              <span class="badge">${section.confidence}% confiança</span>
            </div>
            <img src="${section.imageUrl}" alt="${section.name}" />
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

  // Calculate total confidence
  const avgConfidence = sections.length > 0
    ? Math.round(sections.reduce((sum, s) => sum + (s.confidence || 100), 0) / sections.length)
    : 0;

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
            <span className="text-primary font-medium">{displayUrl}</span>
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

          <Button 
            variant="hero" 
            onClick={handleDownloadAll}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileArchive className="w-4 h-4" />
            )}
            {isDownloading ? 'Gerando...' : 'Baixar ZIP'}
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
            confidence={section.confidence}
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
            <p className="text-sm text-muted-foreground">Confiança Média</p>
            <p className="text-2xl font-bold text-foreground">{avgConfidence}%</p>
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
