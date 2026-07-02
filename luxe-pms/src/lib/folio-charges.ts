// Pure day-grouping/sorting logic for the Folio Charges tab — separated
// from folio/[id]/page.tsx so it's unit-testable without React/DOM.
import type { FolioCharge } from "@/lib/types";

export function groupChargesByDay(charges: FolioCharge[]): Array<{ date: string; items: FolioCharge[] }> {
  const byDate = new Map<string, FolioCharge[]>();
  for (const c of charges) {
    const bucket = byDate.get(c.date);
    if (bucket) bucket.push(c);
    else byDate.set(c.date, [c]);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items: sortByCreatedAt(items) }));
}

function sortByCreatedAt(items: FolioCharge[]): FolioCharge[] {
  return [...items].sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0;
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
