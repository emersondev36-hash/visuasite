import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export interface ViewportConfig {
  id: ViewportSize;
  label: string;
  icon: typeof Monitor;
  width: number;
  height: number;
}

export const VIEWPORT_CONFIGS: ViewportConfig[] = [
  {
    id: 'desktop',
    label: 'Desktop',
    icon: Monitor,
    width: 1440,
    height: 900,
  },
  {
    id: 'tablet',
    label: 'Tablet',
    icon: Tablet,
    width: 768,
    height: 1024,
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: Smartphone,
    width: 375,
    height: 812,
  },
];

interface ViewportSelectorProps {
  selected: ViewportSize;
  onChange: (viewport: ViewportSize) => void;
  disabled?: boolean;
}

export function ViewportSelector({ selected, onChange, disabled }: ViewportSelectorProps) {
  return (
    <div className="flex items-center p-1 rounded-lg bg-secondary/50 border border-border/50">
      {VIEWPORT_CONFIGS.map((config) => {
        const Icon = config.icon;
        const isSelected = selected === config.id;
        
        return (
          <button
            key={config.id}
            onClick={() => onChange(config.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={`${config.label} (${config.width}x${config.height})`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Hook to get viewport dimensions
export function getViewportDimensions(viewport: ViewportSize): { width: number; height: number } {
  const config = VIEWPORT_CONFIGS.find(v => v.id === viewport);
  return config ? { width: config.width, height: config.height } : { width: 1440, height: 900 };
}
