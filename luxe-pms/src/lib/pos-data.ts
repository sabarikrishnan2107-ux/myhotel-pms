// Pure helpers for the Restaurant POS: tolerant table-code matching and KPI
// math. Framework-free so they unit-test in the node environment.

export interface PosKpis {
  activeKots: number;
  inQueue: number;
  cooking: number;
  avgDwellMin: number | null;
  covers: number;
  revenue: number;
}

const OPEN_STATUSES = ["placed", "preparing", "ready"];
const lc = (s?: string | null) => (s ?? "").toLowerCase();

/**
 * Canonicalise a table code so the POS floor map (T1, T2, …) and the seeded
 * F&B orders (T-07, Bar-5, …) line up: upper-case, drop separators, and strip
 * leading zeros from the trailing number. "T-07" → "T7", "T10" → "T10".
 */
export function normalizeTableCode(code: string): string {
  const up = (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = up.match(/^([A-Z]*)(\d*)$/);
  if (!m) return up;
  const [, prefix, digits] = m;
  return prefix + digits.replace(/^0+/, "");
}

/** The open order for a table (status placed/preparing/ready), matched tolerantly. */
export function openOrderForTable<T extends { tableNo?: string | null; status?: string }>(
  orders: T[],
  tableCode: string,
): T | null {
  const target = normalizeTableCode(tableCode);
  return (
    orders.find(
      o => OPEN_STATUSES.includes(lc(o.status)) && normalizeTableCode(o.tableNo ?? "") === target,
    ) ?? null
  );
}

/** Live KPI numbers for the POS header, computed from orders + the floor map. */
export function computePosKpis(
  orders: Array<{ status?: string; total?: number; created_at?: string | null }>,
  tables: Array<{ covers?: number | null; seatedAt?: string | null }>,
  now: Date,
): PosKpis {
  const inQueue = orders.filter(o => lc(o.status) === "placed").length;
  const cooking = orders.filter(o => lc(o.status) === "preparing").length;
  const ready = orders.filter(o => lc(o.status) === "ready").length;

  const today = now.toISOString().slice(0, 10);
  const revenue = orders
    .filter(o => (o.created_at ?? "").slice(0, 10) === today)
    .reduce((s, o) => s + (Number(o.total) || 0), 0);

  const covers = tables.reduce((s, t) => s + (Number(t.covers) || 0), 0);

  const dwell: number[] = [];
  const nowMs = now.getTime();
  const nowDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  for (const t of tables) {
    const at = (t.seatedAt ?? "").trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(at);
    if (!m) continue;
    const seatedMs = Date.parse(`${nowDate}T${m[1].padStart(2, "0")}:${m[2]}:00Z`);
    dwell.push(Math.max(0, Math.round((nowMs - seatedMs) / 60000)));
  }
  const avgDwellMin = dwell.length
    ? Math.round(dwell.reduce((a, b) => a + b, 0) / dwell.length)
    : null;

  return { activeKots: inQueue + cooking + ready, inQueue, cooking, avgDwellMin, covers, revenue };
}
