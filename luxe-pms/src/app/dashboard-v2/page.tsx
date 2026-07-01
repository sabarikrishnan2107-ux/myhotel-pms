import { SidebarV2 } from "@/components/dashboard-v2/sidebar";
import { TopHeaderV2 } from "@/components/dashboard-v2/top-header";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";

export default function DashboardV2Page() {
  const data = MOCK_DASHBOARD_V2_DATA;

  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <TopHeaderV2 notificationCount={data.notificationCount} currentUser={data.currentUser} />
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
