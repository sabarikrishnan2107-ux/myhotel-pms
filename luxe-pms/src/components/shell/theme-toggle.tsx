"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme"><Sun className="h-4 w-4" /></Button>;
  }

  const current = theme ?? "system";
  const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  const Icon = current === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Theme: ${current}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
