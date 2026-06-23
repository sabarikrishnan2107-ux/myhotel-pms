// Pure nightly room pricing from configured Seasons + Holidays, with a fixed
// weekend uplift. Framework-free and timezone-deterministic (UTC date math) so
// it unit-tests reliably. Returns the same shape the booking summary already uses.

export interface Season { from: string; to: string; multiplier: number }
export interface Holiday { date: string; surchargePct: number }
export type NightKind = "weekday" | "weekend" | "holiday";
export interface NightLine { date: Date; kind: NightKind; rate: number }
export interface NightlyBreakdown {
  counts: { weekday: number; weekend: number; holiday: number };
  total: number;
  lines: NightLine[];
  avgRate: number;
}

export function buildNightlyBreakdown(
  checkInISO: string,
  nights: number,
  baseRate: number,
  seasons: Season[],
  holidays: Holiday[],
  weekendMultiplier = 1.2,
): NightlyBreakdown {
  const lines: NightLine[] = [];
  const counts = { weekday: 0, weekend: 0, holiday: 0 };
  let total = 0;
  const base = Number(baseRate) || 0;

  for (let i = 0; i < nights; i++) {
    const d = new Date(`${checkInISO}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);

    const holiday = holidays.find(h => h.date === iso);
    const season = seasons.find(s => iso >= s.from && iso <= s.to);
    const seasonMult = season ? (Number(season.multiplier) || 1) : 1;
    const isWeekend = d.getUTCDay() === 5 || d.getUTCDay() === 6; // Fri/Sat
    const surcharge = holiday ? (Number(holiday.surchargePct) || 0) : 0;
    const weekendFactor = isWeekend && !holiday ? weekendMultiplier : 1;

    const kind: NightKind = holiday ? "holiday" : isWeekend ? "weekend" : "weekday";
    const rate = Math.round(base * seasonMult * weekendFactor * (1 + surcharge / 100));

    counts[kind] += 1;
    total += rate;
    lines.push({ date: d, kind, rate });
  }

  return { counts, total, lines, avgRate: nights ? Math.round(total / nights) : 0 };
}
