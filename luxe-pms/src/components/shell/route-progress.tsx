"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Thin progress bar that flashes briefly across the top whenever the path changes,
 *  giving a tactile confirmation that navigation happened. */
export function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const firstRender = React.useRef(true);

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPhase("running");
    const t1 = setTimeout(() => setPhase("done"), 280);
    const t2 = setTimeout(() => setPhase("idle"), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pathname]);

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none overflow-hidden">
      <div
        className={cn(
          "h-full bg-brand transition-all ease-out shadow-[0_0_8px_var(--color-brand)]",
          phase === "idle" && "w-0 opacity-0 duration-100",
          phase === "running" && "w-[85%] opacity-100 duration-300",
          phase === "done" && "w-full opacity-0 duration-300",
        )}
      />
    </div>
  );
}
