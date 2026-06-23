// Lightweight, frontend-only role model layered on top of the token auth in
// `./api`. The role decides which nav items show and which routes are reachable.
// It is NOT a security boundary — it shapes the experience for guest / staff /
// manager demo logins. The API token is shared (one demo account).
import { NAV } from "./nav";

export type Role = "guest" | "staff" | "manager";

const ROLE_KEY = "pms_role";
const ALL_ROLES: Role[] = ["guest", "staff", "manager"];

/** Current role. Defaults to `manager` so the normal email/password login and
 *  any existing sessions keep full access. */
export function getRole(): Role {
  if (typeof window === "undefined") return "manager";
  const r = window.localStorage.getItem(ROLE_KEY);
  return (ALL_ROLES as string[]).includes(r ?? "") ? (r as Role) : "manager";
}
export function setRole(role: Role) {
  if (typeof window !== "undefined") window.localStorage.setItem(ROLE_KEY, role);
}
export function clearRole() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ROLE_KEY);
}
export function isRole(v: string | null | undefined): v is Role {
  return (ALL_ROLES as string[]).includes(v ?? "");
}

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  guest: "/portal/g123",
  staff: "/rack",
  manager: "/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Guest",
  staff: "Staff",
  manager: "Manager",
};

/** Roles allowed to see a nav item. Untagged items are operational →
 *  visible to staff and manager (never guest). */
export function rolesFor(item: { roles?: Role[] }): Role[] {
  return item.roles ?? ["staff", "manager"];
}

// ---- Real per-user page access (from the DB role, returned by /login + /me) ----
// `pms_pages` holds either "*" (all pages — Admin/Owner/Manager) or a JSON array
// of allowed sidebar hrefs. Absent → treat as all (keeps existing sessions working).
const PAGES_KEY = "pms_pages";
const ROLE_NAME_KEY = "pms_role_name";
const MODULES_KEY = "pms_modules";

type SessionUser = { role?: string; pages?: string[] | "*"; modules?: string[] };

/** Persist the role name + allowed pages + licensed modules from a login / me response. */
export function setSessionUser(user: SessionUser | undefined) {
  if (typeof window === "undefined" || !user) return;
  if (user.role) window.localStorage.setItem(ROLE_NAME_KEY, user.role);
  const pages = user.pages;
  if (pages === "*" || (Array.isArray(pages) && pages.includes("*"))) {
    window.localStorage.setItem(PAGES_KEY, "*");
  } else if (Array.isArray(pages)) {
    window.localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
  }
  // Persist licensed modules (empty array = all modules allowed, for backward compat).
  window.localStorage.setItem(MODULES_KEY, JSON.stringify(user.modules ?? []));
}
export function clearSessionUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PAGES_KEY);
  window.localStorage.removeItem(ROLE_NAME_KEY);
  window.localStorage.removeItem(MODULES_KEY);
}

/** Licensed module keys for the current session.
 *  Empty array means "no restriction" (default/legacy users see everything). */
export function getModules(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MODULES_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
export function getRoleName(): string {
  if (typeof window === "undefined") return "Admin";
  return window.localStorage.getItem(ROLE_NAME_KEY) || "Admin";
}
/** Allowed page hrefs, or "*" for all-access, or null when unset (→ all). */
export function getAllowedPages(): string[] | "*" | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PAGES_KEY);
  if (!raw) return null;
  if (raw === "*") return "*";
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : null; } catch { return null; }
}
/** Can the current user see/visit this page? Restricted only when the DB role
 *  defines a finite page list; Admin/Owner/Manager ("*") and unset → all. */
export function canAccessPage(pathname: string): boolean {
  const pages = getAllowedPages();
  if (pages === null || pages === "*") return true;
  const item = matchNavItem(pathname);
  // Pages with no nav entry (sub-routes/detail pages) inherit their parent's
  // access; if there's no governing item, allow (operational deep links).
  if (!item) return true;
  return pages.includes(item.href);
}

/** Longest-matching nav item for a pathname (so sub-pages inherit access). */
function matchNavItem(pathname: string) {
  return NAV
    .filter(i => pathname === i.href || pathname.startsWith(i.href + "/") || (i.href !== "/dashboard" && pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Can `role` visit `pathname`? Manager: everything. Otherwise look up the
 *  governing nav item; pages with no nav entry are treated as operational
 *  (staff allowed, guest blocked). */
export function canAccess(pathname: string, role: Role): boolean {
  if (role === "manager") return true;
  const item = matchNavItem(pathname);
  if (!item) return role === "staff";
  return rolesFor(item).includes(role);
}
