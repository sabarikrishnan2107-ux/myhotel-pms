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
