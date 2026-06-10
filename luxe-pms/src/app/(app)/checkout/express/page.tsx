"use client";
import * as React from "react";
import Link from "next/link";
import { Zap, Search, BedDouble, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, PaymentBadge } from "@/components/ui/badge";
import { money } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import type { PaymentStatus } from "@/lib/types";

type CheckedInBooking = {
  id: number; bookingNo: string; guestName: string; roomNumber?: string;
  roomType?: string; nights?: number; total?: number; balance?: number;
  paymentStatus?: PaymentStatus; status?: string;
};

// Picker: choose an in-house guest to run the one-tap express checkout for.
export default function ExpressCheckoutPicker() {
  const [rows, setRows] = React.useState<CheckedInBooking[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    apiGet<CheckedInBooking[]>("/bookings")
      .then(list => setRows(list.filter(b => (b.status ?? "") === "checked-in")))
      .catch(() => {});
  }, []);

  const filtered = rows.filter(b => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${b.bookingNo} ${b.guestName} ${b.roomNumber ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white shadow-lg">
          <Zap className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-medium tracking-tight">Express checkout</h1>
            <Badge tone="brand"><Sparkles className="h-3 w-3" /> One-tap</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Pick an in-house guest to settle and check out in one tap.</p>
        </div>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search room, guest, or booking #" className="pl-9 h-9" />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BedDouble className="h-8 w-8 mx-auto text-subtle-foreground" />
          <p className="mt-3 font-medium">No in-house guests to check out</p>
          <p className="text-xs text-muted-foreground mt-1">Only checked-in bookings appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(b => (
            <Link key={b.id} href={`/checkout/express/${b.bookingNo}`}>
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold tabular">Room {b.roomNumber ?? "—"}</p>
                    <p className="text-sm font-medium mt-0.5 truncate">{b.guestName}</p>
                    <p className="text-[11px] text-muted-foreground">{b.roomType ?? "Room"} · {b.bookingNo}</p>
                  </div>
                  {b.paymentStatus && <PaymentBadge status={b.paymentStatus} />}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="tabular font-medium">{money(b.balance ?? 0)}</span>
                </div>
                <Button size="sm" className="w-full mt-3">
                  Express checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
