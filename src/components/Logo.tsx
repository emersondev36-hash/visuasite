import { Layers } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent">
          <Layers className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-foreground tracking-tight">
          Visual Site
        </span>
        <span className="text-xs font-medium text-primary -mt-1">
          Splitter
        </span>
      </div>
    </div>
  );
}
