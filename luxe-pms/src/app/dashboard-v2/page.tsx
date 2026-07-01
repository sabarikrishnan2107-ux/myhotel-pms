import { SidebarV2 } from "@/components/dashboard-v2/sidebar";
import { TopHeaderV2 } from "@/components/dashboard-v2/top-header";
import { OccupancyHeroV2 } from "@/components/dashboard-v2/occupancy-hero";
import { KpiCardV2 } from "@/components/dashboard-v2/kpi-card";
import { QuickActionTileV2 } from "@/components/dashboard-v2/quick-action-tile";
import { PrioritiesListV2 } from "@/components/dashboard-v2/priorities-list";
import { RoomStatusGridV2 } from "@/components/dashboard-v2/room-status-grid";
import { AiBriefingCardV2 } from "@/components/dashboard-v2/ai-briefing-card";
import { ArrivalsCardV2 } from "@/components/dashboard-v2/arrivals-card";
import { DeparturesCardV2 } from "@/components/dashboard-v2/departures-card";
import { ActivityFeedV2 } from "@/components/dashboard-v2/activity-feed";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";

export default function DashboardV2Page() {
  const data = MOCK_DASHBOARD_V2_DATA;

  return (
    <div className="flex min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="flex-1 min-w-0">
        <TopHeaderV2 notificationCount={data.notificationCount} currentUser={data.currentUser} />
        <main className="px-6 py-6 space-y-6">
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-5">
            <OccupancyHeroV2
              pct={data.occupancy.pct}
              occupiedRooms={data.occupancy.occupiedRooms}
              totalRooms={data.occupancy.totalRooms}
              trendPct={data.occupancy.trendPct}
            />
            {data.kpis.map(kpi => (
              <KpiCardV2 key={kpi.id} {...kpi} />
            ))}
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {data.quickActions.map(action => (
              <QuickActionTileV2 key={action.id} {...action} />
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <ArrivalsCardV2 summary={data.arrivals.summary} rows={data.arrivals.rows} />
            <DeparturesCardV2 summary={data.departures.summary} rows={data.departures.rows} />
            <ActivityFeedV2 items={data.activity} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <PrioritiesListV2 items={data.priorities} />
            <RoomStatusGridV2 floors={data.floors} legend={data.roomLegend} />
            <AiBriefingCardV2 lines={data.aiBriefing} />
          </section>
        </main>
      </div>
    </div>
  );
}
