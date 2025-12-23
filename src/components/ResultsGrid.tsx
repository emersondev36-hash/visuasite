import { Download, Grid3X3, LayoutList, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionImage } from "./SectionImage";

interface Section {
  id: string;
  name: string;
  imageUrl: string;
}

interface ResultsGridProps {
  sections: Section[];
  siteUrl: string;
  onReset: () => void;
}

export function ResultsGrid({ sections, siteUrl, onReset }: ResultsGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDownloadAll = () => {
    // In a real implementation, this would create and download a ZIP file
    console.log("Downloading all sections...");
  };

  const handleDownloadSection = (section: Section) => {
    // Create a temporary link to download the image
    const link = document.createElement("a");
    link.href = section.imageUrl;
    link.download = `${section.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (section: Section) => {
    window.open(section.imageUrl, "_blank");
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Seções Capturadas
          </h2>
          <p className="text-muted-foreground mt-1">
            {sections.length} seções encontradas em{" "}
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
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Nova URL
          </Button>

          <Button variant="hero" onClick={handleDownloadAll}>
            <Download className="w-4 h-4" />
            Baixar ZIP
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
    </div>
  );
}
