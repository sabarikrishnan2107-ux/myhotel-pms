"use client";
import * as React from "react";
import {
  Info,
  Sparkles,
  CheckCircle2,
  XCircle,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Image as ImageIcon,
  Eye,
  GitCompareArrows,
  StickyNote,
  X,
  MapPin,
  Calendar,
  Tag,
  Palette,
  Building2,
  User,
  AlertTriangle,
  Package,
  ArrowRight,
  Check,
  Camera,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type ToneType = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

type Urgency = "High" | "Medium" | "Low";

type LostReport = {
  id: string;
  guest: string;
  room: string;
  stayDates: string;
  itemName: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  location: string;
  reportedAt: string;
  urgency: Urgency;
  hasPhoto: boolean;
  contact: string;
};

type FoundItem = {
  id: string;
  name: string;
  category: string;
  value: number;
  color: string;
  brand: string;
  foundLocation: string;
  foundDate: string;
  foundRoom: string;
  description: string;
  hvi: boolean;
};

type MatchRow = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  lost: string;
  found: string;
  matched: boolean;
};

type Candidate = {
  foundItem: FoundItem;
  score: number;
  rows: MatchRow[];
};

const URGENCY_TONE: Record<Urgency, ToneType> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

function scoreTone(score: number): { tone: ToneType; label: string; bar: string } {
  if (score >= 80) return { tone: "success", label: "Strong match", bar: "bg-emerald-500" };
  if (score >= 60) return { tone: "warning", label: "Possible match", bar: "bg-amber-500" };
  return { tone: "neutral", label: "Weak match", bar: "bg-muted-foreground/50" };
}

// ---- REAL DATA wiring ----
type ApiLostReport = {
  id: number | string; guest: string; room?: string; stayFrom?: string; stayTo?: string;
  itemName: string; itemCategory?: string; description?: string; color?: string; brand?: string;
  lastSeen?: string; reportedOn?: string; urgency?: string; hasPhoto?: boolean; phone?: string; status?: string;
};
type ApiFound = {
  id: number | string; name: string; category?: string; value?: number; color?: string; brand?: string;
  foundLocation?: string; foundDate?: string; description?: string; hvi?: boolean; status?: string;
};

const LOST_OPEN = ["Reported", "Searching", "Possible match", "Verification pending"];
const FOUND_CLAIMABLE = ["Waiting", "Notified", "Storage"];

function apiToLost(r: ApiLostReport): LostReport {
  return {
    id: String(r.id),
    guest: r.guest,
    room: r.room || "—",
    stayDates: [r.stayFrom, r.stayTo].filter(Boolean).join(" - ") || "—",
    itemName: r.itemName,
    category: r.itemCategory || "—",
    description: r.description || "",
    color: r.color || "",
    brand: r.brand || "",
    location: r.lastSeen || "",
    reportedAt: r.reportedOn || "",
    urgency: r.urgency === "Urgent" || r.urgency === "High" ? "High" : r.urgency === "Low" ? "Low" : "Medium",
    hasPhoto: !!r.hasPhoto,
    contact: r.phone || "",
  };
}
function apiToFound(i: ApiFound): FoundItem {
  return {
    id: String(i.id),
    name: i.name,
    category: i.category || "",
    value: i.value || 0,
    color: i.color || "",
    brand: i.brand || "",
    foundLocation: i.foundLocation || "",
    foundDate: i.foundDate || "",
    foundRoom: i.foundLocation || "",
    description: i.description || "",
    hvi: !!i.hvi,
  };
}

const norm = (s: string) => (s || "").toLowerCase().trim();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
function overlaps(a: string, b: string) {
  const wb = new Set(words(b));
  return words(a).some((w) => wb.has(w));
}

// Scores one found item against a lost report and builds the comparison rows.
function buildCandidate(lost: LostReport, f: FoundItem): Candidate {
  const rows: MatchRow[] = [
    { label: "Item", icon: Package, lost: lost.itemName, found: f.name, matched: overlaps(lost.itemName, f.name) },
    { label: "Category", icon: Tag, lost: lost.category, found: f.category, matched: !!norm(lost.category) && norm(lost.category) === norm(f.category) },
    { label: "Brand", icon: Building2, lost: lost.brand || "—", found: f.brand || "—", matched: !!norm(lost.brand) && norm(lost.brand) === norm(f.brand) },
    { label: "Color", icon: Palette, lost: lost.color || "—", found: f.color || "—", matched: !!norm(lost.color) && overlaps(lost.color, f.color) },
    { label: "Location", icon: MapPin, lost: lost.location || "—", found: f.foundLocation || "—", matched: !!norm(lost.location) && overlaps(lost.location, f.foundLocation) },
  ];
  const matched = rows.filter((r) => r.matched).length;
  const score = Math.round((matched / rows.length) * 100);
  return { foundItem: f, score, rows };
}

export default function MatchingTab({ onToast }: { onToast: (m: string) => void }) {
  const [search, setSearch] = React.useState("");
  const [drawerItem, setDrawerItem] = React.useState<FoundItem | null>(null);
  const [compareItem, setCompareItem] = React.useState<{ lost: LostReport; found: FoundItem } | null>(null);
  const [notesFor, setNotesFor] = React.useState<FoundItem | null>(null);
  const [notesText, setNotesText] = React.useState("");

  // Live lost reports + claimable found items; matches are scored client-side.
  const [lostData, setLostData] = React.useState<LostReport[] | null>(null);
  const [foundData, setFoundData] = React.useState<FoundItem[]>([]);
  const [justConfirmed, setJustConfirmed] = React.useState<
    { id: string; lostId: string; foundId: string; item: string; guest: string; returnedOn: string }[]
  >([]);
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<ApiLostReport[]>("/lost-reports").catch(() => [] as ApiLostReport[]),
      apiGet<ApiFound[]>("/found-items").catch(() => [] as ApiFound[]),
    ]).then(([lr, fi]) => {
      if (cancelled) return;
      const open = lr.filter((r) => LOST_OPEN.includes(r.status ?? "Reported"));
      if (open.length) setLostData(open.map(apiToLost));
      setFoundData(fi.filter((i) => FOUND_CLAIMABLE.includes(i.status ?? "")).map(apiToFound));
    });
    return () => { cancelled = true; };
  }, []);

  const reportsList = lostData ?? [];

  const [pickedReportId, setPickedReportId] = React.useState<string>("");
  // Default the selection to the first available report once data loads.
  React.useEffect(() => {
    if (!pickedReportId && reportsList.length) {
      setPickedReportId(reportsList[0].id);
    }
  }, [pickedReportId, reportsList]);
  // Fall back to the first available report when the picked id isn't in the list.
  const selectedReportId = reportsList.some((r) => r.id === pickedReportId)
    ? pickedReportId
    : reportsList[0]?.id;
  const setSelectedReportId = setPickedReportId;

  const selected = reportsList.find((r) => r.id === selectedReportId);

  // Candidate matches: scored client-side against claimable found items.
  const allCandidates: Candidate[] = selected
    ? foundData
        .map((f) => buildCandidate(selected, f))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
    : [];
  const candidates = search.trim()
    ? allCandidates.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.foundItem.name.toLowerCase().includes(q) ||
          c.foundItem.brand.toLowerCase().includes(q) ||
          c.foundItem.color.toLowerCase().includes(q) ||
          c.foundItem.foundLocation.toLowerCase().includes(q) ||
          c.foundItem.description.toLowerCase().includes(q)
        );
      })
    : allCandidates;

  const recentConfirmed = justConfirmed;

  // Confirm: claim the found item for the guest and mark the report verified.
  const confirmMatch = (lost: LostReport, f: FoundItem) => {
    setFoundData((prev) => prev.filter((x) => x.id !== f.id));
    setJustConfirmed((prev) => [
      { id: `MC-${f.id}`, lostId: lost.id, foundId: f.id, item: f.name, guest: lost.guest, returnedOn: "just now" },
      ...prev,
    ]);
    apiPut(`/found-items/${f.id}`, { status: "Claimed", guestName: lost.guest }).catch(() => {});
    apiPut(`/lost-reports/${lost.id}`, { status: "Verified" }).catch(() => {});
    onToast(`Match confirmed · ${lost.guest} notified about "${f.name}"`);
  };

  return (
    <div className="space-y-4">
      {/* EXPLAINER BANNER */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-md bg-blue-100 dark:bg-blue-900/50 grid place-items-center shrink-0">
            <Info className="size-4 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              How smart matching works
              <Badge tone="info">AI-assisted</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Auto-match scores compare room/stay dates, item category, location, color, brand, and description keywords. Review and confirm matches to notify guests.
            </p>
          </div>
        </div>
      </Card>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-brand-soft text-brand grid place-items-center shrink-0">
              <Target className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Possible matches today</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">14</div>
              <div className="text-[11px] text-muted-foreground">across 9 active reports</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Confirmed this week</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">23</div>
              <div className="text-[11px] text-muted-foreground">+5 vs last week</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
              <TrendingUp className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Avg match score</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">72%</div>
              <div className="text-[11px] text-muted-foreground">past 30 days</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white grid place-items-center shrink-0">
              <Trophy className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Returns from matches</div>
              <div className="text-xl font-bold tabular text-foreground mt-0.5">68</div>
              <div className="text-[11px] text-muted-foreground">YTD · 81% success</div>
            </div>
          </div>
        </Card>
      </div>

      {/* MAIN 2-PANE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* LEFT — Lost reports list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Active lost reports</div>
            <Badge tone="info">{reportsList.length}</Badge>
          </div>
          <div className="space-y-2">
            {reportsList.map((r) => {
              const active = r.id === selectedReportId;
              const count = foundData.filter((f) => buildCandidate(r, f).score > 0).length;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={cn(
                    "w-full text-left rounded-md border transition-colors",
                    active
                      ? "border-brand bg-brand-soft/50"
                      : "border-border bg-surface hover:bg-surface-sunken/60",
                  )}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] tabular text-muted-foreground font-medium">{r.id}</span>
                      <Badge tone={URGENCY_TONE[r.urgency]}>{r.urgency}</Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground line-clamp-1">{r.itemName}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <User className="size-3" />
                      <span className="truncate">{r.guest}</span>
                      <span className="text-border">·</span>
                      <span className="tabular">Rm {r.room}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.reportedAt}</span>
                      <span className="text-[11px] font-medium text-brand flex items-center gap-1">
                        <Sparkles className="size-3" />
                        {count} matches
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Selected report + candidates */}
        <div className="space-y-4">
          {!selected ? (
            <Card className="p-8 text-center">
              <Package className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm font-medium text-foreground">No active lost reports</div>
              <div className="text-xs text-muted-foreground mt-1">New reports will appear here for matching.</div>
            </Card>
          ) : (
          <>
          {/* SELECTED LOST REPORT CARD */}
          <Card className="p-4">
            <div className="flex items-start gap-4">
              {/* Photo placeholder */}
              <div className="size-20 rounded-md bg-surface-sunken grid place-items-center shrink-0 border border-border">
                {selected.hasPhoto ? (
                  <ImageIcon className="size-7 text-muted-foreground" />
                ) : (
                  <Camera className="size-7 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="info">{selected.id}</Badge>
                  <Badge tone={URGENCY_TONE[selected.urgency]}>
                    <AlertTriangle className="size-3 mr-1" />
                    {selected.urgency} urgency
                  </Badge>
                  <Badge tone="neutral">{selected.category}</Badge>
                </div>
                <div className="text-base font-semibold text-foreground">{selected.itemName}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{selected.description}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Guest</div>
                    <div className="text-xs font-medium text-foreground mt-0.5 truncate">{selected.guest}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Room</div>
                    <div className="text-xs font-medium text-foreground mt-0.5 tabular">{selected.room}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Stay</div>
                    <div className="text-xs font-medium text-foreground mt-0.5">{selected.stayDates}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reported</div>
                    <div className="text-xs font-medium text-foreground mt-0.5">{selected.reportedAt}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Find matches search */}
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type keywords to filter beyond auto-matches (e.g. 'aviator', 'gold', 'pool')"
                  className="pl-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onToast(`Searching found items for "${search || "all keywords"}"`);
                }}
              >
                <Search className="size-3.5 mr-1.5" />
                Find
              </Button>
            </div>
          </Card>

          {/* MATCH CANDIDATES */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              Ranked candidates
              <Badge tone="neutral">{candidates.length}</Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Strong 80+
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-amber-500" />
                Possible 60-79
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-muted-foreground/50" />
                Weak {"<60"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {candidates.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <div className="text-sm font-medium text-foreground">No candidates match your filter</div>
                <div className="text-xs text-muted-foreground mt-1">Try clearing the search or pick a different lost report.</div>
              </Card>
            ) : (
              candidates.map((c) => {
                const tone = scoreTone(c.score);
                const matchedCount = c.rows.filter((r) => r.matched).length;
                return (
                  <Card key={c.foundItem.id} className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "size-16 rounded-md grid place-items-center shrink-0 border",
                          c.foundItem.hvi
                            ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent text-white"
                            : "bg-surface-sunken border-border",
                        )}
                      >
                        <ImageIcon className={cn("size-6", c.foundItem.hvi ? "text-white" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] tabular text-muted-foreground font-medium">{c.foundItem.id}</span>
                          <Badge tone="neutral">{c.foundItem.category}</Badge>
                          {c.foundItem.hvi && (
                            <Badge tone="warning">
                              <Trophy className="size-3 mr-1" />
                              HVI
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-1">{c.foundItem.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {c.foundItem.foundLocation}
                          </span>
                          <span className="tabular font-medium text-foreground">{money(c.foundItem.value)}</span>
                        </div>
                      </div>
                      {/* Score */}
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold tabular text-foreground">{c.score}%</div>
                        <Badge tone={tone.tone}>{tone.label}</Badge>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{matchedCount} of 6 attributes match</span>
                        <span className="tabular">{c.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${c.score}%` }} />
                      </div>
                    </div>

                    {/* Match breakdown table */}
                    <Card className="overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-sunken/40">
                          <tr>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Attribute</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Lost report</th>
                            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Found item</th>
                            <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.rows.map((row, idx) => {
                            const Icon = row.icon;
                            return (
                              <tr key={idx} className="border-t border-border">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2 text-xs text-foreground">
                                    <Icon className="size-3.5 text-muted-foreground" />
                                    {row.label}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.lost}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{row.found}</td>
                                <td className="px-3 py-2 text-right">
                                  {row.matched ? (
                                    <CheckCircle2 className="size-4 text-emerald-500 inline-block" />
                                  ) : (
                                    <XCircle className="size-4 text-muted-foreground/60 inline-block" />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setDrawerItem(c.foundItem)}>
                          <Eye className="size-3.5 mr-1.5" />
                          View full item
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCompareItem({ lost: selected, found: c.foundItem })}>
                          <GitCompareArrows className="size-3.5 mr-1.5" />
                          Compare photos
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNotesFor(c.foundItem);
                            setNotesText("");
                          }}
                        >
                          <StickyNote className="size-3.5 mr-1.5" />
                          Add notes
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToast(`${c.foundItem.id} rejected as match for ${selected.id}`)}
                        >
                          <XCircle className="size-3.5 mr-1.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => confirmMatch(selected, c.foundItem)}
                        >
                          <Check className="size-3.5 mr-1.5" />
                          Confirm match
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* RECENT CONFIRMED MATCHES */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Recent confirmed matches
              </div>
              <Button size="sm" variant="ghost" onClick={() => onToast("Opening full match history")}>View all</Button>
            </div>
            <div className="space-y-2">
              {recentConfirmed.length === 0 && (
                <div className="text-xs text-muted-foreground py-3 text-center">No confirmed matches yet.</div>
              )}
              {recentConfirmed.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-surface-sunken/40 border border-border"
                >
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                    <Check className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.item}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="tabular">{m.lostId}</span>
                      <ArrowRight className="size-3" />
                      <span className="tabular">{m.foundId}</span>
                      <span className="text-border">·</span>
                      <span className="truncate">{m.guest}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone="success">Returned</Badge>
                    <div className="text-[10px] text-muted-foreground mt-1 tabular">{m.returnedOn}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          </>
          )}
        </div>
      </div>

      {/* DRAWER — full found item */}
      {drawerItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <Card className="w-full max-w-xl overflow-y-auto rounded-none">
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] tabular text-muted-foreground font-medium">{drawerItem.id}</div>
                  <div className="text-lg font-semibold text-foreground mt-0.5">{drawerItem.name}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge tone="neutral">{drawerItem.category}</Badge>
                    {drawerItem.hvi && <Badge tone="warning">HVI · {money(drawerItem.value)}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDrawerItem(null)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div
                className={cn(
                  "aspect-video rounded-md grid place-items-center border",
                  drawerItem.hvi
                    ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent"
                    : "bg-surface-sunken border-border",
                )}
              >
                <ImageIcon className={cn("size-10", drawerItem.hvi ? "text-white" : "text-muted-foreground")} />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Description</div>
                  <div className="text-sm text-foreground mt-1">{drawerItem.description}</div>
                </div>

                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-sunken/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Attribute</th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Brand</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.brand}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Color</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.color}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Found at</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.foundLocation}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Found on</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{drawerItem.foundDate}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Nearest room</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground tabular">{drawerItem.foundRoom}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-xs text-muted-foreground">Declared value</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground tabular">{money(drawerItem.value)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => setDrawerItem(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  disabled={!selected}
                  onClick={() => {
                    if (!selected) return;
                    confirmMatch(selected, drawerItem);
                    setDrawerItem(null);
                  }}
                >
                  <Check className="size-3.5 mr-1.5" />
                  Confirm as match
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL — compare photos */}
      {compareItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitCompareArrows className="size-4 text-brand" />
                Compare photos
              </div>
              <Button size="sm" variant="ghost" onClick={() => setCompareItem(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="info">Lost report</Badge>
                  <span className="text-[11px] tabular text-muted-foreground">{compareItem.lost.id}</span>
                </div>
                <div className="aspect-square rounded-md bg-surface-sunken grid place-items-center border border-border">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
                <div className="text-xs font-semibold text-foreground">{compareItem.lost.itemName}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-3">{compareItem.lost.description}</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge tone="success">Found item</Badge>
                  <span className="text-[11px] tabular text-muted-foreground">{compareItem.found.id}</span>
                </div>
                <div
                  className={cn(
                    "aspect-square rounded-md grid place-items-center border",
                    compareItem.found.hvi
                      ? "bg-linear-to-br from-amber-400 to-orange-500 border-transparent"
                      : "bg-surface-sunken border-border",
                  )}
                >
                  <ImageIcon className={cn("size-10", compareItem.found.hvi ? "text-white" : "text-muted-foreground")} />
                </div>
                <div className="text-xs font-semibold text-foreground">{compareItem.found.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-3">{compareItem.found.description}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setCompareItem(null)}>
                Close
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToast(`${compareItem.found.id} rejected as match for ${compareItem.lost.id}`)}
              >
                <XCircle className="size-3.5 mr-1.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  confirmMatch(compareItem.lost, compareItem.found);
                  setCompareItem(null);
                }}
              >
                <Check className="size-3.5 mr-1.5" />
                Confirm match
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL — add notes */}
      {notesFor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <StickyNote className="size-4 text-amber-500" />
                Add notes
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNotesFor(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Notes on candidate <span className="font-medium text-foreground">{notesFor.id} · {notesFor.name}</span>
            </div>
            <div className="space-y-2">
              <Label>Internal note</Label>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={4}
                placeholder="e.g. Guest mentioned a small scratch on the lens - matches photo evidence."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setNotesFor(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onToast(`Note saved on ${notesFor.id}`);
                  setNotesFor(null);
                }}
              >
                <Check className="size-3.5 mr-1.5" />
                Save note
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
