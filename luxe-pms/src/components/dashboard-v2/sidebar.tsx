"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, GROUP_LABEL, moduleAllowed, type NavItem } from "@/lib/nav";
import { getRole, rolesFor, canAccessPage, getModules, type Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_GROUPS = ["operations", "billing", "people", "erp", "system", "demo"] as const;

export function SidebarV2() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(false);

  // Role + modules are read client-side after mount to avoid SSR/localStorage mismatch.
  const [role, setRoleState] = React.useState<Role>("manager");
  const [modules, setModules] = React.useState<string[]>([]);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- role/modules only exist client-side
    setRoleState(getRole());
    setModules(getModules());
  }, [pathname]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    for (const item of NAV) {
      const href = item.href === "/dashboard" ? "/dashboard-v2" : item.href;
      groups[item.group] ??= [];
      groups[item.group].push({ ...item, href });
    }
    return groups;
  }, []);

  return (
    <>
      {/* Layout spacer — tracks the sidebar's width so content compresses instead of being covered */}
      <div className={cn(
        "hidden lg:block shrink-0 h-svh transition-[width] duration-200 ease-out",
        expanded ? "w-64" : "w-14"
      )} aria-hidden />

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col overflow-hidden bg-[#101A33] text-white",
          "transition-[width] duration-200 ease-out",
          expanded ? "w-64 shadow-2xl shadow-black/40" : "w-14"
        )}
      >
        <div className="flex flex-col h-full w-64">
          <div className="h-20 flex items-center gap-3 px-3.5 border-b border-white/10 shrink-0">
            <span className="h-10 w-10 rounded-lg bg-[#F5B800] text-[#101A33] flex items-center justify-center font-bold text-sm shrink-0">
              PP
            </span>
            <div className={cn("min-w-0 transition-opacity duration-150", expanded ? "opacity-100" : "opacity-0")}>
              <p className="text-sm font-semibold leading-tight truncate">The Pearl Palace</p>
              <p className="text-[11px] text-white/50 truncate">Luxury Hotel &amp; Resort</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
            {NAV_GROUPS.map(group => {
              const items = (grouped[group] ?? []).filter(item => rolesFor(item).includes(role) && canAccessPage(item.href === "/dashboard-v2" ? "/dashboard" : item.href) && moduleAllowed(item, modules));
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className={cn(
                    "px-3 text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold mb-1.5 transition-opacity duration-150 whitespace-nowrap",
                    expanded ? "opacity-100" : "opacity-0"
                  )}>
                    {GROUP_LABEL[group]}
                  </p>
                  <ul className="space-y-1">
                    {items.map(item => {
                      const active = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            title={!expanded ? item.label : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors relative",
                              active
                                ? "bg-[#6D4AFF] text-white font-semibold shadow-md shadow-[#6D4AFF]/30"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className={cn("flex-1 truncate transition-opacity duration-150", expanded ? "opacity-100" : "opacity-0")}>
                              {item.label}
                            </span>
                            {item.badge && expanded && (
                              <span className={cn(
                                "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold",
                                active ? "bg-white text-[#6D4AFF]" : "bg-white/10 text-white/70"
                              )}>
                                {item.badge}
                              </span>
                            )}
                            {item.badge && !expanded && (
                              <span
                                aria-hidden
                                className="absolute top-1 left-7 h-1.5 w-1.5 rounded-full bg-[#F5B800] ring-2 ring-[#101A33]"
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
          <div className="p-3 border-t border-white/10">
            <div className={cn(
              "rounded-lg bg-white/5 p-3 text-xs text-white/60 overflow-hidden transition-opacity duration-150",
              expanded ? "opacity-100" : "opacity-0"
            )}>
              <p className="font-medium text-white/80 whitespace-nowrap">Quick Support</p>
              <p className="mt-0.5 whitespace-nowrap">We are online 24/7</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
