import { PlaneLanding } from "lucide-react";
import { ArrivalDepartureCardV2 } from "./arrival-departure-card";
import type { ArrivalDepartureRowV2 } from "./types";

interface Props {
  summary: string;
  rows: ArrivalDepartureRowV2[];
}

export function ArrivalsCardV2({ summary, rows }: Props) {
  return (
    <ArrivalDepartureCardV2
      title="Today's Arrivals"
      icon={PlaneLanding}
      summary={summary}
      rows={rows}
      viewAllHref="/checkin"
      emptyLabel="No arrivals scheduled today."
    />
  );
}
