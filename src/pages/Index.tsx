import { useState, useEffect, useCallback } from "react";
import { Scissors, Image, Zap, Shield, Sparkles, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { UrlInput } from "@/components/UrlInput";
import { FeatureCard } from "@/components/FeatureCard";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultsGrid } from "@/components/ResultsGrid";
import { useToast } from "@/hooks/use-toast";
import { captureSite, generateSectionImages, type Section } from "@/lib/api/capture";

type AppState = "input" | "processing" | "results" | "error";

const features = [
  {
    icon: Scissors,
    title: "Corte Inteligente",
    description: "Detecta automaticamente as seções visuais do site com precisão.",
  },
  {
    icon: Image,
    title: "Alta Resolução",
    description: "Captura em alta definição para imagens cristalinas.",
  },
  {
    icon: Zap,
    title: "Processamento Rápido",
    description: "Análise e geração de imagens em segundos.",
  },
  {
    icon: Shield,
    title: "Qualidade Premium",
    description: "Exportação em PNG sem compressão ou perda de qualidade.",
  },
];

export default function Index() {
  const [appState, setAppState] = useState<AppState>("input");
  const [currentUrl, setCurrentUrl] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [sections, setSections] = useState<Section[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = useCallback(async (url: string) => {
    setCurrentUrl(url);
    setAppState("processing");
    setProcessingStep(0);
    setIsLoading(true);
    setErrorMessage("");

    // Simulate processing steps while waiting for API
    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => Math.min(prev + 1, 2));
    }, 1500);

    try {
      const result = await captureSite(url);

      clearInterval(stepInterval);

      if (!result.success || !result.screenshot) {
        setErrorMessage(result.error || "Não foi possível capturar o site");
        setAppState("error");
        toast({
          title: "Erro na captura",
          description: result.error || "Não foi possível capturar o site",
          variant: "destructive",
        });
        return;
      }

      // Move to final step
      setProcessingStep(3);

      // Generate section images from the screenshot
      const sectionImages = generateSectionImages(
        result.screenshot,
        result.sections || [{ id: "1", name: "Página Completa", type: "full" }]
      );

      setSections(sectionImages);

      setTimeout(() => {
        setAppState("results");
        toast({
          title: "Captura concluída!",
          description: `${sectionImages.length} seções foram identificadas e capturadas.`,
        });
      }, 500);
    } catch (error) {
      clearInterval(stepInterval);
      console.error("Error capturing site:", error);
      setErrorMessage("Erro ao processar a solicitação");
      setAppState("error");
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao capturar o site",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    setAppState("input");
    setCurrentUrl("");
    setProcessingStep(0);
    setSections([]);
    setErrorMessage("");
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Powered by AI</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-12">
          {appState === "input" && (
            <div className="animate-fade-in">
              {/* Hero */}
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Scissors className="w-4 h-4" />
                  Ferramenta profissional para designers e devs
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                  Divida qualquer site em{" "}
                  <span className="gradient-text">seções visuais</span>{" "}
                  perfeitas
                </h1>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                  Cole uma URL e receba múltiplas imagens em alta resolução, 
                  cada uma representando uma seção clara do site. Perfeito para 
                  análise, redesign ou documentação.
                </p>

                <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <FeatureCard {...feature} />
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div className="mt-24 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Como funciona
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-12">
                  Um processo simples de 3 passos para obter suas imagens
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 max-w-4xl mx-auto">
                  {[
                    { step: "01", title: "Cole a URL", desc: "Insira o endereço do site" },
                    { step: "02", title: "Processamento", desc: "IA analisa e divide" },
                    { step: "03", title: "Download", desc: "Baixe as imagens" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-3">
                          <span className="text-xl font-bold gradient-text">
                            {item.step}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      {index < 2 && (
                        <div className="hidden md:block w-16 h-px bg-gradient-to-r from-border to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {appState === "processing" && (
            <div className="py-12">
              <ProcessingState currentStep={processingStep} url={currentUrl} />
            </div>
          )}

          {appState === "error" && (
            <div className="py-12 max-w-xl mx-auto text-center animate-fade-in">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 text-destructive mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                Erro ao Capturar
              </h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || "Não foi possível capturar o site. Verifique a URL e tente novamente."}
              </p>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {appState === "results" && (
            <ResultsGrid
              sections={sections}
              siteUrl={currentUrl}
              onReset={handleReset}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 mt-12">
          <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
            <p>
              Visual Site Splitter © {new Date().getFullYear()} • 
              Feito para designers, desenvolvedores e analistas
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
