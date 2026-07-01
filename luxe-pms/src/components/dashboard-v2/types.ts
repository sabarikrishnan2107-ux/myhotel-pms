import type { LucideIcon } from "lucide-react";
import type { ToneV2 } from "./tokens";

export type RoomStatusV2 = "available" | "occupied" | "reserved" | "out-of-order" | "blocked";

export interface RoomCellV2 {
  number: string;
  status: RoomStatusV2;
}

export interface FloorRowV2 {
  floor: string;
  rooms: RoomCellV2[];
}

export interface KpiV2 {
  id: string;
  label: string;
  value: number | string;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export interface QuickActionV2 {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  tone: ToneV2;
  badge?: number;
}

export interface PriorityItemV2 {
  id: string;
  icon: LucideIcon;
  tone: ToneV2;
  title: string;
  hint: string;
  count?: number;
}

export interface ArrivalDepartureRowV2 {
  id: string;
  guestName: string;
  tag?: string;
  meta: string;
  status?: "settled" | "balance";
  actionLabel: string;
}

export interface ActivityItemV2 {
  id: string;
  icon: LucideIcon;
  tone: ToneV2;
  title: string;
  actor: string;
  time: string;
}

export interface AiBriefingLineV2 {
  icon: LucideIcon;
  tone: ToneV2;
  text: string;
}

export interface DashboardV2Data {
  hotelName: string;
  hotelTagline: string;
  notificationCount: number;
  currentUser: { name: string; role: string; shift: string };
  occupancy: { pct: number; occupiedRooms: number; totalRooms: number; trendPct: number };
  kpis: KpiV2[];
  quickActions: QuickActionV2[];
  priorities: PriorityItemV2[];
  floors: FloorRowV2[];
  roomLegend: { status: RoomStatusV2; label: string }[];
  aiBriefing: AiBriefingLineV2[];
  arrivals: { summary: string; rows: ArrivalDepartureRowV2[] };
  departures: { summary: string; rows: ArrivalDepartureRowV2[] };
  activity: ActivityItemV2[];
}
