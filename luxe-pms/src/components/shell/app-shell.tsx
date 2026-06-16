"use client";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { RouteProgress } from "./route-progress";
import { NotificationsProvider } from "@/components/notifications/store";
import { getToken, apiGet } from "@/lib/api";
import { getRole, canAccess, canAccessPage, setSessionUser, ROLE_HOME } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Auth gate: bounce to /login when there's no token (client-only check).
  // Role gate: bounce to the role's home when the route isn't permitted.
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const ok = !!getToken();
    if (!ok) {
      router.replace("/login");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token only exists client-side
      setAuthed(false);
      return;
    }
    const role = getRole();
    if (!canAccess(pathname, role) || !canAccessPage(pathname)) {
      router.replace(canAccessPage("/dashboard") ? ROLE_HOME[role] : "/login");
      setAuthed(false);
      return;
    }
    setAuthed(true);
  }, [router, pathname]);

  // Refresh the role + allowed pages from the server on load (role may have
  // changed since last login); re-check access once it resolves.
  React.useEffect(() => {
    if (!getToken()) return;
    apiGet<{ role?: string; pages?: string[] | "*" }>("/me")
      .then(u => {
        setSessionUser(u);
        if (!canAccessPage(window.location.pathname)) router.replace("/dashboard");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (authed !== true) {
    // Avoid flashing the app before the auth check resolves.
    return <div className="min-h-svh bg-background" />;
  }

  return (
    <NotificationsProvider>
      <div className="flex min-h-svh bg-background">
        <RouteProgress />
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar onOpenSidebar={() => setOpen(true)} />
          {/* `key` triggers a fresh enter animation on every route change for tactile smoothness */}
          <main key={pathname} className="flex-1 min-w-0 animate-page-in">{children}</main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
