"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleV2() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] dark:text-[#8B94A8] shrink-0"
        aria-label="Toggle theme"
      >
        <Sun className="h-[18px] w-[18px]" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] dark:text-[#8B94A8] hover:bg-[#F7F8FC] dark:hover:bg-[#1B2338] hover:text-[#111827] dark:hover:text-[#E8ECF4] transition-colors shrink-0"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Theme: ${isDark ? "dark" : "light"}`}
    >
      {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
