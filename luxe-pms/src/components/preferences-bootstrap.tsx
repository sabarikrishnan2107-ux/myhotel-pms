"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { loadPreferences, applyAppearance } from "@/lib/preferences";
import { loadBranding, applyBranding } from "@/lib/use-branding";
import { setDateTimePrefs } from "@/lib/utils";

// On app load, fetch the user's saved preferences + property branding and apply
// them to the document: appearance/accessibility/theme, plus brand colors,
// fonts, favicon and the email signature. Renders nothing.
export function PreferencesBootstrap() {
  const { setTheme } = useTheme();
  // Apply saved settings ONCE on mount. Deliberately not depending on setTheme:
  // next-themes' setTheme identity changes with the theme, so re-running would
  // re-force the saved theme and fight the user's selection, looping.
  React.useEffect(() => {
    let active = true;
    loadPreferences().then(p => {
      if (!active) return;
      applyAppearance(p);
      setDateTimePrefs({ dateFormat: p.dateFormat, timeFormat: p.timeFormat, timezone: p.timezone });
      if (p.theme) setTheme(p.theme === "auto" ? "system" : p.theme);
    });
    loadBranding().then(b => { if (active) applyBranding(b); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
