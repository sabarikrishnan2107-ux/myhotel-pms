import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  phase?: "MVP" | "v2" | "v3";
}

export function PagePlaceholder({ title, description, icon: Icon, features, phase = "MVP" }: Props) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-5">
      <div className="flex items-start gap-4">
        <span className="h-12 w-12 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-medium tracking-tight">{title}</h1>
            <Badge tone={phase === "MVP" ? "brand" : phase === "v2" ? "info" : "neutral"}>{phase}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
      </div>

      <Card className="p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex h-14 w-14 rounded-full bg-surface-sunken items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Module preview</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            This is part of the planned spec — the prototype focuses on the hero reception flow.
            Below are the planned capabilities for this module.
          </p>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-2">
          {features.map(f => (
            <div key={f} className="flex items-start gap-2.5 p-3 rounded-md bg-surface-sunken/50">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0 mt-1.5" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
