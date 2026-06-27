"use client";
import * as React from "react";
import {
  Smartphone, Loader2, CheckCircle2, X, Camera, CreditCard, Pen, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Docs = {
  guest_photo?: string | null;
  id_front?: string | null;
  id_back?: string | null;
  signature?: string | null;
} | undefined;

type SyncState = "creating" | "waiting" | "done" | "error";

const STEPS = [
  { key: "guest_photo", label: "Guest Photo", icon: Camera },
  { key: "id_front", label: "ID Front", icon: CreditCard },
  { key: "id_back", label: "ID Back", icon: CreditCard },
  { key: "signature", label: "Signature", icon: Pen },
] as const;

interface Props {
  state: SyncState;
  reference: string | null;
  docs: Docs;
  errorMessage?: string | null;
  onCancel: () => void;
  onHide: () => void;
  onDone: () => void;
}

/** Professional modal for the "Sync to mobile app" flow: sending → live waiting → captured. */
export function MobileSyncDialog({ state, reference, docs, errorMessage, onCancel, onHide, onDone }: Props) {
  const captured = (k: string) => !!(docs && (docs as Record<string, string | null | undefined>)[k]);
  const doneCount = STEPS.filter(s => captured(s.key)).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Mobile capture</p>
              {reference && <p className="text-xs text-muted-foreground">Booking {reference}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={state === "waiting" ? onHide : state === "done" ? onDone : onCancel}
            className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {state === "creating" && (
            <div className="py-8 flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-sm font-medium mt-4">Sending booking to the tablet…</p>
              <p className="text-xs text-muted-foreground mt-1">Creating the reservation and queuing it for capture.</p>
            </div>
          )}

          {state === "waiting" && (
            <>
              <div className="flex flex-col items-center text-center">
                <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-brand/20 animate-ping" />
                  <Smartphone className="h-7 w-7 relative" />
                </span>
                <p className="text-base font-semibold mt-4">Waiting for tablet capture</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Open booking <span className="font-medium text-foreground">{reference}</span> in the Hotel Client app and capture the guest&apos;s documents — progress shows here live.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                {STEPS.map(s => {
                  const ok = captured(s.key);
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                        ok ? "border-success/40 bg-success-soft/30" : "border-border",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", ok ? "text-success" : "text-muted-foreground")} />
                      <span className="text-sm flex-1 font-medium">{s.label}</span>
                      {ok
                        ? <CheckCircle2 className="h-5 w-5 text-success" />
                        : <Loader2 className="h-4 w-4 animate-spin text-subtle-foreground" />}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-center text-muted-foreground mt-3">{doneCount} of 4 captured</p>
            </>
          )}

          {state === "done" && (
            <div className="flex flex-col items-center text-center">
              <span className="h-14 w-14 rounded-full bg-success-soft text-success inline-flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <p className="text-base font-semibold mt-3">All documents captured</p>
              <p className="text-xs text-muted-foreground mt-1">They&apos;ve been added to this booking and the form below.</p>
              <div className="grid grid-cols-4 gap-2 mt-4 w-full">
                {STEPS.map(s => (
                  <div key={s.key} className="rounded-md border border-border bg-surface-sunken overflow-hidden aspect-square flex items-center justify-center">
                    {captured(s.key)
                      ? <img src={(docs as Record<string, string>)[s.key]} alt={s.label} className="h-full w-full object-cover" />
                      : <span className="text-[10px] text-muted-foreground">—</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="py-6 flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-danger" />
              <p className="text-sm font-medium mt-3">{errorMessage ?? "Something went wrong."}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          {state === "waiting" && (
            <>
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancel sync</Button>
              <Button variant="secondary" size="sm" onClick={onHide}>Hide</Button>
            </>
          )}
          {state === "creating" && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
          {state === "done" && <Button size="sm" onClick={onDone}>Done</Button>}
          {state === "error" && <Button variant="secondary" size="sm" onClick={onCancel}>Close</Button>}
        </div>
      </Card>
    </div>
  );
}
