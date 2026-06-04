"use client";
import * as React from "react";
import {
  Plus,
  Sparkles,
  LayoutDashboard,
  Package,
  FileText,
  Link2,
  Boxes,
  Send,
  Trash2,
  FileBarChart,
  Settings,
  ScrollText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardTab from "./_components/DashboardTab";
import FoundItemsTab from "./_components/FoundItemsTab";
import LostReportsTab from "./_components/LostReportsTab";
import MatchingTab from "./_components/MatchingTab";
import StorageTab from "./_components/StorageTab";
import ReturnsTab from "./_components/ReturnsTab";
import DisposalTab from "./_components/DisposalTab";
import ReportsTab from "./_components/ReportsTab";
import SettingsTab from "./_components/SettingsTab";
import AuditTab from "./_components/AuditTab";

type LFTab =
  | "dashboard"
  | "found"
  | "lost"
  | "matching"
  | "storage"
  | "returns"
  | "disposal"
  | "reports"
  | "settings"
  | "audit";

const TABS: { id: LFTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "found", label: "Found Items", icon: Package },
  { id: "lost", label: "Lost Reports", icon: FileText },
  { id: "matching", label: "Matching", icon: Link2 },
  { id: "storage", label: "Storage", icon: Boxes },
  { id: "returns", label: "Returns", icon: Send },
  { id: "disposal", label: "Disposal", icon: Trash2 },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

export default function LostFoundPage() {
  const [tab, setTab] = React.useState<LFTab>("dashboard");
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-white inline-flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">Lost & Found</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Register found items, match with guest reports, manage storage, returns & disposal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => showToast("Lost report form opened")}
            className="h-9 px-3 rounded-md border border-border bg-surface hover:bg-surface-sunken text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Report lost item
          </button>
          <button
            type="button"
            onClick={() => showToast("Registration form opened")}
            className="h-9 px-3 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Register found item
          </button>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="border-b border-border">
        <div className="flex flex-wrap gap-x-1 -mb-px">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      {tab === "dashboard" && <DashboardTab onToast={showToast} />}
      {tab === "found" && <FoundItemsTab onToast={showToast} />}
      {tab === "lost" && <LostReportsTab onToast={showToast} />}
      {tab === "matching" && <MatchingTab onToast={showToast} />}
      {tab === "storage" && <StorageTab onToast={showToast} />}
      {tab === "returns" && <ReturnsTab onToast={showToast} />}
      {tab === "disposal" && <DisposalTab onToast={showToast} />}
      {tab === "reports" && <ReportsTab onToast={showToast} />}
      {tab === "settings" && <SettingsTab onToast={showToast} />}
      {tab === "audit" && <AuditTab onToast={showToast} />}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
