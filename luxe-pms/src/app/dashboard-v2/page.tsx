import { SidebarV2 } from "@/components/dashboard-v2/sidebar";

export default function DashboardV2Page() {
  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
