"use client";
import * as React from "react";
import Link from "next/link";
import { Search, FileBarChart, FileDown, Calendar, ChevronRight, Star, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { REPORT_CATEGORIES } from "@/lib/mock-data-ext";

export default function ReportsPage() {
  const [search, setSearch] = React.useState("");
  const [favView, setFavView] = React.useState<"all" | "favorites" | "recent">("all");
  const [favorites, setFavorites] = React.useState<Set<string>>(() => new Set(["r-rev-mtd", "r-night-audit"]));
  const [recent] = React.useState<Set<string>>(() => new Set(["r-rev-mtd", "r-night-audit", "r-occ"]));
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const total = REPORT_CATEGORIES.reduce((s, c) => s + c.reports.length, 0);
  const toggleFav = (id: string) => setFavorites(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); showToast("Removed from favorites"); }
    else { next.add(id); showToast("Added to favorites"); }
    return next;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Reports Center</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} reports · export PDF / Excel / CSV · save views · schedule by email</p>
        </div>
        <Button variant="outline" onClick={() => showToast("Scheduled reports manager opened · 3 active schedules")}>
          <Calendar className="h-4 w-4" />Scheduled reports
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="pl-9 h-9" />
          </div>
          <Button variant={favView === "favorites" ? "primary" : "outline"} size="sm" onClick={() => setFavView(favView === "favorites" ? "all" : "favorites")}>
            <Star className={`h-3.5 w-3.5 ${favView === "favorites" ? "fill-current" : ""}`} />Favorites ({favorites.size})
          </Button>
          <Button variant={favView === "recent" ? "primary" : "outline"} size="sm" onClick={() => setFavView(favView === "recent" ? "all" : "recent")}>
            Recently run ({recent.size})
          </Button>
        </div>
      </Card>

      {REPORT_CATEGORIES.map(cat => {
        const reports = cat.reports.filter(r => {
          if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
          if (favView === "favorites" && !favorites.has(r.id)) return false;
          if (favView === "recent" && !recent.has(r.id)) return false;
          return true;
        });
        if (reports.length === 0) return null;
        return (
          <section key={cat.name}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold tracking-tight">{cat.name}</h2>
              <Badge tone="neutral">{reports.length}</Badge>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reports.map(r => {
                // Night Audit Report routes to its dedicated page; everything else goes through the viewer
                const href = r.name === "Night Audit Report" ? "/night-audit" : `/reports/${r.id}`;
                const isFav = favorites.has(r.id);
                return (
                  <Link key={r.id} href={href} className="block">
                    <Card className="p-4 hover:shadow-md hover:border-brand transition-all cursor-pointer group h-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-brand-foreground transition-colors">
                          <FileBarChart className="h-4 w-4" />
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(r.id); }}
                          className={isFav ? "text-warning" : "text-subtle-foreground hover:text-warning"}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                        </button>
                      </div>
                      <p className="mt-3 font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <FileDown className="h-3 w-3" />Exportable
                        </span>
                        <span className="text-xs text-brand font-medium inline-flex items-center gap-0.5 group-hover:underline">
                          Open<ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </div>
  );
}
