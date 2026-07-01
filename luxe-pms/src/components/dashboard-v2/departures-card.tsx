import { PlaneTakeoff } from "lucide-react";
import { ArrivalDepartureCardV2 } from "./arrival-departure-card";
import type { ArrivalDepartureRowV2 } from "./types";

interface Props {
  summary: string;
  rows: ArrivalDepartureRowV2[];
}

export function DeparturesCardV2({ summary, rows }: Props) {
  return (
    <ArrivalDepartureCardV2
      title="Today's Departures"
      icon={PlaneTakeoff}
      summary={summary}
      rows={rows}
      viewAllHref="/checkout"
      emptyLabel="No departures due today."
    />
  );
}
