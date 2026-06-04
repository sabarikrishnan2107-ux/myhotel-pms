"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { RouteProgress } from "./route-progress";
import { NotificationsProvider } from "@/components/notifications/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
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
