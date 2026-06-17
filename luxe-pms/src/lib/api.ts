// Thin client for the Laravel backend (hotel-pms-api).
// Base URL is configurable via NEXT_PUBLIC_API_URL; defaults to local dev.
import { setSessionUser, clearSessionUser } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "pms_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

// Central handler: on 401 the token is stale → clear it and bounce to /login.
function handleUnauthorized(res: Response) {
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    if (window.location.pathname !== "/login") window.location.href = "/login";
  }
}

// ---- Auth ----
// Returns { twoFactorRequired: true } when the account has 2FA on and no code
// was supplied; otherwise stores the token and returns the user.
export async function login(
  email: string,
  password: string,
  code?: string,
): Promise<{ twoFactorRequired?: true; user?: { name: string; email: string } }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, ...(code ? { code } : {}) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || "Login failed");
  }
  const data = await res.json();
  if (data.two_factor_required) return { twoFactorRequired: true };
  setToken(data.token);
  setSessionUser(data.user);  // store role + allowed pages for RBAC
  return { user: data.user };
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/logout`, { method: "POST", headers: authHeaders() });
  } catch {
    /* ignore network errors on logout */
  }
  clearToken();
  clearSessionUser();
}

// ---- CRUD ----
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`GET ${path} failed: ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`PUT ${path} failed: ${res.status}`); }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`POST ${path} failed: ${res.status}`); }
  return res.json() as Promise<T>;
}

// Default email signature (from Branding & Assets). Set once by the branding
// bootstrap/panel so every outbound email is signed without each caller knowing
// about branding. Kept here (not in use-branding) to avoid a circular import.
let emailSignature = "";
export function setEmailSignature(sig: string) { emailSignature = sig || ""; }

// Sends a branded email through the backend's single configured mail account
// (Gmail SMTP). Every "email customer/guest/staff" action funnels through here.
export type EmailRow = { label: string; value?: string };
export async function sendEmail(payload: {
  to: string;
  subject: string;
  heading: string;
  greeting?: string;
  intro?: string;
  rows?: EmailRow[];
  note?: string;
  context?: string;
}): Promise<{ sent: true; to: string }> {
  // Append the configured signature to the note so it lands at the foot of
  // every email; callers' own notes are preserved above it.
  const note = [payload.note, emailSignature].filter(Boolean).join("\n\n") || undefined;
  return apiPost("/email/send", { ...payload, note });
}

export async function apiUpload(file: File): Promise<{ url: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: authHeaders(), // let the browser set the multipart boundary
    body: form,
  });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`upload failed: ${res.status}`); }
  return res.json() as Promise<{ url: string; path: string }>;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`download failed: ${res.status}`); }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) { handleUnauthorized(res); throw new Error(`DELETE ${path} failed: ${res.status}`); }
}

// Reconciles a list section against the backend: creates new items (no numeric id),
// updates changed ones, deletes removed ones. Returns the server-truth array.
export async function syncList<T extends { id: unknown }>(
  resource: string,
  prev: T[],
  next: T[],
): Promise<T[]> {
  const strip = (o: T) => {
    const c = { ...o } as Record<string, unknown>;
    delete c.id; delete c.created_at; delete c.updated_at;
    return JSON.stringify(c);
  };
  const prevById = new Map(prev.map(x => [String(x.id), x]));
  const nextIds = new Set(next.map(x => String(x.id)));

  // deletes
  await Promise.all(
    prev.filter(o => !nextIds.has(String(o.id))).map(o => apiDelete(`/${resource}/${o.id}`)),
  );

  // creates + updates, preserving order. An item not in `prev` is new → POST.
  const reconciled: T[] = [];
  for (const n of next) {
    const old = prevById.get(String(n.id));
    if (!old) {
      const { id: _drop, ...body } = n as Record<string, unknown>;
      void _drop;
      reconciled.push(await apiPost<T>(`/${resource}`, body));
    } else if (strip(old) !== strip(n)) {
      reconciled.push(await apiPut<T>(`/${resource}/${n.id}`, n));
    } else {
      reconciled.push(n);
    }
  }
  return reconciled;
}
