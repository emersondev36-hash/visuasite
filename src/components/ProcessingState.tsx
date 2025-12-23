import { Globe, Scan, Scissors, Download, CheckCircle2 } from "lucide-react";

interface ProcessingStateProps {
  currentStep: number;
  url: string;
}

const steps = [
  { icon: Globe, label: "Conectando ao site", description: "Acessando a URL informada" },
  { icon: Scan, label: "Renderizando página", description: "Capturando em alta resolução" },
  { icon: Scissors, label: "Detectando seções", description: "Identificando blocos visuais" },
  { icon: Download, label: "Gerando imagens", description: "Criando arquivos PNG" },
];

export function ProcessingState({ currentStep, url }: ProcessingStateProps) {
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Processando Site
        </h2>
        <p className="text-muted-foreground">
          <span className="text-primary font-medium">{url}</span>
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={index}
              className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                isActive
                  ? "bg-primary/10 border-primary/50"
                  : isComplete
                  ? "bg-card/40 border-border/50"
                  : "bg-card/20 border-border/30 opacity-50"
              }`}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground animate-pulse-glow"
                    : isComplete
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Icon className={`w-6 h-6 ${isActive ? "animate-pulse" : ""}`} />
                )}
              </div>

              {/* Text */}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isActive
                      ? "text-foreground"
                      : isComplete
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Progress indicator */}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-8">
        <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-3">
          Etapa {currentStep + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}
