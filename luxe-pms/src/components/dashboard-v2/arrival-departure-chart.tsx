import type { WeeklyArrivalsDeparturesV2 } from "./types";

interface Props {
  data: WeeklyArrivalsDeparturesV2[];
}

export function ArrivalDepartureChartV2({ data }: Props) {
  const max = Math.max(1, ...data.flatMap(d => [d.arrivals, d.departures]));

  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)] h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.06em]">Arrivals vs Departures</p>
        <div className="flex items-center gap-3 text-[11px] text-[#6B7280] dark:text-[#8B94A8]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#6D4AFF]" /> Arrivals</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#F5B800]" /> Departures</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 flex-1 min-h-[240px]">
        {data.map(d => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="flex items-end gap-1.5 h-full w-full justify-center">
              <div
                className="w-3.5 rounded-full bg-[#6D4AFF]"
                style={{ height: `${Math.max(4, (d.arrivals / max) * 100)}%` }}
                title={`Arrivals · ${d.arrivals}`}
              />
              <div
                className="w-3.5 rounded-full bg-[#F5B800]"
                style={{ height: `${Math.max(4, (d.departures / max) * 100)}%` }}
                title={`Departures · ${d.departures}`}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#6D4AFF]">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
