"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, GROUP_LABEL, moduleAllowed, type NavItem } from "@/lib/nav";
import { getRole, rolesFor, canAccessPage, getModules, type Role } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Logo } from "@/components/logo";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// Tailwind class strings used below — literal so JIT can detect them:
//   collapsed rail width: w-14 / lg:w-14   (56 px)
//   expanded width:       w-72 / lg:w-72   (288 px)

export function Sidebar({ open, onClose }: SidebarProps) {
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
      groups[item.group] ??= [];
      groups[item.group].push(item);
    }
    return groups;
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Layout spacer — reserves the narrow rail width in document flow on desktop */}
      <div className="hidden lg:block w-14 shrink-0 h-svh" aria-hidden />

      {/* The actual sidebar — fixed-position so it can overflow the rail width on hover */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "fixed top-0 left-0 z-40 h-svh flex flex-col overflow-hidden",
          "bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] border-r border-[hsl(var(--sidebar-border))]",
          // Mobile: full width slide-in / out via translate
          "w-72",
          // Desktop: collapsed by default to an icon rail, expand on hover
          expanded ? "lg:w-72 lg:shadow-2xl lg:shadow-black/30" : "lg:w-14",
          // Mobile open / closed (desktop: always translated to 0)
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-[width,transform,box-shadow] duration-200 ease-out"
        )}
      >
        {/* Inner content stays full width; gets clipped by aside when collapsed */}
        <div className="flex flex-col h-full w-72">
          {/* Brand header */}
          <div className="h-16 flex items-center justify-between pl-4 pr-3 border-b border-[hsl(var(--sidebar-border))] shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-[hsl(var(--sidebar-active))]/40 group-hover:scale-105 transition-transform">
                <Logo />
              </span>
              <span className={cn(
                "flex flex-col leading-tight transition-opacity duration-150 min-w-0",
                expanded ? "lg:opacity-100" : "lg:opacity-0"
              )}>
                <span className="text-base font-semibold tracking-tight text-[hsl(var(--sidebar-fg))] truncate">MYHOTEL</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--sidebar-active))] font-medium truncate">Hospitality OS</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-md hover:bg-[hsl(var(--sidebar-bg-elevated))] inline-flex items-center justify-center text-[hsl(var(--sidebar-muted))] shrink-0"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {(["operations", "billing", "people", "erp", "system", "demo"] as const).map((group) => {
              const items = (grouped[group] ?? []).filter(item => rolesFor(item).includes(role) && canAccessPage(item.href) && moduleAllowed(item, modules));
              if (items.length === 0) return null;
              return (
              <div key={group} className="px-2 mb-4">
                <p className={cn(
                  "px-3 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--sidebar-muted))]/70 font-semibold mb-1.5 transition-opacity duration-150 whitespace-nowrap",
                  expanded ? "lg:opacity-100" : "lg:opacity-0"
                )}>
                  {GROUP_LABEL[group]}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          prefetch
                          title={!expanded ? item.label : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-md pl-3 pr-3 py-2 text-sm relative",
                            "transition-[background-color,color,transform] duration-150 ease-out",
                            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--sidebar-active))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar-bg))]",
                            active
                              ? "bg-gradient-to-r from-[hsl(var(--sidebar-active))]/18 via-[hsl(var(--sidebar-active))]/8 to-transparent text-[hsl(var(--sidebar-active))] font-semibold"
                              : "text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-bg-elevated))]/60 active:scale-[0.98]"
                          )}
                        >
                          {/* Left gold indicator on active */}
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-[hsl(var(--sidebar-active))] shadow-[0_0_8px_hsl(var(--sidebar-active))] transition-all duration-200 ease-out",
                              active ? "h-7 opacity-100" : "h-0 opacity-0"
                            )}
                          />
                          <Icon
                            strokeWidth={2}
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors",
                              active ? "text-[hsl(var(--sidebar-active))]" : "text-[hsl(var(--sidebar-fg))]"
                            )}
                          />
                          <span className={cn(
                            "flex-1 truncate transition-opacity duration-150",
                            expanded ? "lg:opacity-100" : "lg:opacity-0"
                          )}>
                            {item.label}
                          </span>

                          {/* Badge: when expanded, full chip on the right; when collapsed, tiny dot over the icon */}
                          {item.badge && expanded && (
                            <span className={cn(
                              "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold transition-colors",
                              active
                                ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-bg))]"
                                : "bg-[hsl(var(--sidebar-bg-elevated))] text-[hsl(var(--sidebar-muted))] group-hover:bg-[hsl(var(--sidebar-active))]/20 group-hover:text-[hsl(var(--sidebar-active))]"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          {item.badge && !expanded && (
                            <span
                              aria-hidden
                              className="hidden lg:block absolute top-1 left-7 h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-active))] ring-2 ring-[hsl(var(--sidebar-bg))]"
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

          {/* Status footer */}
          <div className="border-t border-[hsl(var(--sidebar-border))] p-2">
            <div className={cn(
              "rounded-md bg-[hsl(var(--sidebar-bg-elevated))] transition-all overflow-hidden",
              expanded ? "lg:p-3" : "lg:p-2"
            )}>
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--sidebar-muted))]">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
                <span className={cn(
                  "transition-opacity duration-150 whitespace-nowrap",
                  expanded ? "lg:opacity-100" : "lg:opacity-0"
                )}>System operational</span>
              </div>
              <p className={cn(
                "mt-1 text-[11px] text-[hsl(var(--sidebar-muted))]/70 transition-opacity duration-150 whitespace-nowrap",
                expanded ? "lg:opacity-100" : "lg:opacity-0"
              )}>Last sync 14 sec ago</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
