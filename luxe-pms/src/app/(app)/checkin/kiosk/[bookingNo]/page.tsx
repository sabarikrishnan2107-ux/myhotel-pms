"use client";
import * as React from "react";
import {
  Hand,
  ShieldCheck,
  Camera,
  PenLine,
  KeyRound,
  Receipt,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CalendarDays,
  BedDouble,
  Users,
  CreditCard,
  Mail,
  Printer,
  IdCard,
  ArrowLeft,
  Eraser,
  MapPin,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type StepKey = "welcome" | "verify" | "id" | "signature" | "room" | "folio" | "complete";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "verify", label: "Verify" },
  { key: "id", label: "ID Capture" },
  { key: "signature", label: "Signature" },
  { key: "room", label: "Room" },
  { key: "folio", label: "Folio" },
  { key: "complete", label: "Done" },
];

const BOOKING = {
  bookingNo: "BK100278",
  guest: "Akash Bhatt",
  phone: "+91 98201 33445",
  email: "akash.bhatt@example.in",
  roomType: "Deluxe King",
  nights: 2,
  checkIn: "26 May 2026",
  checkOut: "28 May 2026",
  pax: { adults: 2, children: 0 },
  total: 13000,
  roomCharge: 11016,
  taxes: 1984,
  assignedRoom: "412",
  floor: 4,
  locker: "Locker #14",
  lockerCode: "4821",
  paymentCard: "HDFC ••4521",
};

const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driver License"] as const;
type IdType = (typeof ID_TYPES)[number];

export default function CheckinKioskPage({
  params,
}: {
  params: Promise<{ bookingNo: string }>;
}) {
  const { bookingNo } = React.use(params);

  const [stepIdx, setStepIdx] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [idType, setIdType] = React.useState<IdType>("Aadhaar");
  const [frontCaptured, setFrontCaptured] = React.useState(false);
  const [backCaptured, setBackCaptured] = React.useState(false);
  const [signed, setSigned] = React.useState(false);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const step = STEPS[stepIdx];
  const progressPct = ((stepIdx + 1) / STEPS.length) * 100;

  const next = (msg?: string) => {
    if (msg) showToast(msg);
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));
  const restart = () => {
    setStepIdx(0);
    setFrontCaptured(false);
    setBackCaptured(false);
    setSigned(false);
    showToast("Kiosk reset");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 lg:p-10 space-y-6">
        {/* Header bar — minimal chrome */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                The Pearl Marina · Self Check-in
              </div>
              <div className="text-lg font-semibold">Booking {bookingNo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && stepIdx < STEPS.length - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={back}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Restart
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Step {stepIdx + 1} of {STEPS.length}
            </div>
            <Badge tone="brand">{step.label}</Badge>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand to-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 hidden sm:flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  "transition-colors",
                  i <= stepIdx ? "text-foreground font-semibold" : "",
                )}
              >
                {s.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Step content */}
        {step.key === "welcome" && (
          <WelcomeStep onStart={() => next("Let's get you checked in")} />
        )}
        {step.key === "verify" && (
          <VerifyStep onConfirm={() => next("Details confirmed")} />
        )}
        {step.key === "id" && (
          <IdStep
            idType={idType}
            onTypeChange={(t) => {
              setIdType(t);
              showToast(`${t} selected`);
            }}
            frontCaptured={frontCaptured}
            backCaptured={backCaptured}
            onCaptureFront={() => {
              setFrontCaptured(true);
              showToast("Front captured");
            }}
            onCaptureBack={() => {
              setBackCaptured(true);
              showToast("Back captured");
            }}
            onContinue={() => next("ID submitted for verification")}
          />
        )}
        {step.key === "signature" && (
          <SignatureStep
            signed={signed}
            onSign={() => {
              setSigned(true);
              showToast("Signature drawn");
            }}
            onClear={() => {
              setSigned(false);
              showToast("Signature cleared");
            }}
            onDone={() => next("Signature saved")}
          />
        )}
        {step.key === "room" && (
          <RoomStep onContinue={() => next("Room allocated")} />
        )}
        {step.key === "folio" && (
          <FolioStep
            onAuthorize={() => next("Folio authorized")}
          />
        )}
        {step.key === "complete" && (
          <CompleteStep
            onEmail={() => showToast("Receipt sent to akash.bhatt@example.in")}
            onPrint={() => showToast("Sending to lobby printer")}
            onRestart={restart}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Step 1: Welcome ───────────── */
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <Card className="p-12 lg:p-16 text-center space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-sunken text-sm text-muted-foreground">
        <Hand className="w-4 h-4 text-brand" />
        Namaste
      </div>
      <div className="space-y-4">
        <div className="text-3xl lg:text-4xl text-muted-foreground">Welcome,</div>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
          {BOOKING.guest}
        </h1>
        <div className="text-2xl text-muted-foreground pt-2">
          Booking {BOOKING.bookingNo} · {BOOKING.roomType} · {BOOKING.nights} nights
        </div>
      </div>
      <div className="pt-6">
        <Button
          size="lg"
          onClick={onStart}
          className="text-2xl px-12 py-8 h-auto rounded-2xl shadow-xl"
        >
          Tap to start
          <ChevronRight className="w-7 h-7 ml-2" />
        </Button>
      </div>
      <div className="text-sm text-muted-foreground pt-4">
        Estimated time: under 2 minutes
      </div>
    </Card>
  );
}

/* ───────────── Step 2: Verify ───────────── */
function VerifyStep({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Card className="p-8 lg:p-12 space-y-8">
      <div className="space-y-2">
        <Badge tone="info">Step 2</Badge>
        <h2 className="text-3xl lg:text-4xl font-bold">
          Please verify your reservation
        </h2>
        <p className="text-xl text-muted-foreground">
          Tap confirm if everything below looks correct.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VerifyRow
          icon={<ShieldCheck className="w-6 h-6" />}
          label="Booking Number"
          value={BOOKING.bookingNo}
        />
        <VerifyRow
          icon={<Users className="w-6 h-6" />}
          label="Primary Guest"
          value={BOOKING.guest}
          sub={BOOKING.phone}
        />
        <VerifyRow
          icon={<CalendarDays className="w-6 h-6" />}
          label="Stay Dates"
          value={`${BOOKING.checkIn} → ${BOOKING.checkOut}`}
          sub={`${BOOKING.nights} nights`}
        />
        <VerifyRow
          icon={<BedDouble className="w-6 h-6" />}
          label="Room Type"
          value={BOOKING.roomType}
          sub={`${BOOKING.pax.adults} adults · ${BOOKING.pax.children} children`}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <div className="text-sm uppercase tracking-wider text-muted-foreground">
            Total
          </div>
          <div className="text-3xl font-bold tabular">{money(BOOKING.total)}</div>
        </div>
        <Button
          size="lg"
          onClick={onConfirm}
          className="text-xl px-10 py-7 h-auto rounded-2xl"
        >
          Confirm and continue
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

function VerifyRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl bg-surface-sunken/50">
      <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-brand shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular truncate">{value}</div>
        {sub && (
          <div className="text-base text-muted-foreground tabular">{sub}</div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Step 3: ID Capture ───────────── */
function IdStep({
  idType,
  onTypeChange,
  frontCaptured,
  backCaptured,
  onCaptureFront,
  onCaptureBack,
  onContinue,
}: {
  idType: IdType;
  onTypeChange: (t: IdType) => void;
  frontCaptured: boolean;
  backCaptured: boolean;
  onCaptureFront: () => void;
  onCaptureBack: () => void;
  onContinue: () => void;
}) {
  const ready = frontCaptured && backCaptured;
  return (
    <Card className="p-8 lg:p-12 space-y-8">
      <div className="space-y-2">
        <Badge tone="info">Step 3</Badge>
        <h2 className="text-3xl lg:text-4xl font-bold">Capture your ID</h2>
        <p className="text-xl text-muted-foreground">
          Required by law. Document stays encrypted on property.
        </p>
      </div>

      {/* Document-type pills */}
      <div>
        <div className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Document type
        </div>
        <div className="flex flex-wrap gap-3">
          {ID_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={cn(
                "px-6 py-3 rounded-full border-2 text-lg font-medium transition-all",
                idType === t
                  ? "border-brand bg-brand text-white shadow-md"
                  : "border-border bg-background hover:border-brand/50",
              )}
            >
              <IdCard className="w-5 h-5 inline mr-2" />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Camera tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CameraTile
          label="Front of document"
          captured={frontCaptured}
          onCapture={onCaptureFront}
        />
        <CameraTile
          label="Back of document"
          captured={backCaptured}
          onCapture={onCaptureBack}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-base text-muted-foreground">
          {ready
            ? "Both sides captured. You may continue."
            : "Capture both sides to continue."}
        </div>
        <Button
          size="lg"
          onClick={onContinue}
          disabled={!ready}
          className="text-xl px-10 py-7 h-auto rounded-2xl"
        >
          Continue
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

function CameraTile({
  label,
  captured,
  onCapture,
}: {
  label: string;
  captured: boolean;
  onCapture: () => void;
}) {
  return (
    <button
      onClick={onCapture}
      className={cn(
        "relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 group",
        captured
          ? "border-success bg-success/5"
          : "border-border bg-surface-sunken/40 hover:border-brand hover:bg-surface-sunken",
      )}
    >
      {captured ? (
        <>
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <div className="text-2xl font-semibold">Captured</div>
          <div className="text-base text-muted-foreground">{label}</div>
          <Badge tone="success">Verified</Badge>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold">Tap to capture</div>
          <div className="text-base text-muted-foreground">{label}</div>
        </>
      )}
    </button>
  );
}

/* ───────────── Step 4: Signature ───────────── */
function SignatureStep({
  signed,
  onSign,
  onClear,
  onDone,
}: {
  signed: boolean;
  onSign: () => void;
  onClear: () => void;
  onDone: () => void;
}) {
  return (
    <Card className="p-8 lg:p-12 space-y-8">
      <div className="space-y-2">
        <Badge tone="info">Step 4</Badge>
        <h2 className="text-3xl lg:text-4xl font-bold">Sign the registration card</h2>
        <p className="text-xl text-muted-foreground">
          Use your finger to draw your signature below.
        </p>
      </div>

      {/* Drawing area placeholder */}
      <button
        onClick={onSign}
        className={cn(
          "w-full h-72 lg:h-80 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all relative overflow-hidden",
          signed
            ? "border-success bg-success/5"
            : "border-border bg-surface-sunken/40 hover:border-brand",
        )}
      >
        {signed ? (
          <div className="flex flex-col items-center gap-3">
            <svg
              viewBox="0 0 360 100"
              className="w-72 h-24 text-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 70 Q 40 10, 70 60 T 140 50 Q 180 20, 220 70 T 350 40" />
            </svg>
            <div className="text-lg text-muted-foreground">
              Akash Bhatt · Signed
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <PenLine className="w-12 h-12 text-muted-foreground" />
            <div className="text-2xl font-semibold">Tap and draw here</div>
            <div className="text-base text-muted-foreground">
              x ___________________________
            </div>
          </div>
        )}
      </button>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          size="lg"
          onClick={onClear}
          className="text-lg px-8 py-6 h-auto rounded-xl"
        >
          <Eraser className="w-5 h-5 mr-2" />
          Clear
        </Button>
        <Button
          size="lg"
          onClick={onDone}
          disabled={!signed}
          className="text-xl px-10 py-7 h-auto rounded-2xl"
        >
          Done
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

/* ───────────── Step 5: Room Allocation ───────────── */
function RoomStep({ onContinue }: { onContinue: () => void }) {
  return (
    <Card className="p-8 lg:p-12 space-y-8">
      <div className="space-y-2">
        <Badge tone="info">Step 5</Badge>
        <h2 className="text-3xl lg:text-4xl font-bold">Your room is ready</h2>
        <p className="text-xl text-muted-foreground">
          Take a moment to note your room and locker details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Assigned room */}
        <div className="p-8 rounded-2xl bg-gradient-to-br from-brand/10 to-accent/10 border border-brand/20 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 text-sm uppercase tracking-wider text-muted-foreground">
            <KeyRound className="w-4 h-4 text-brand" />
            Assigned room
          </div>
          <div className="text-7xl lg:text-8xl font-bold tabular text-brand">
            {BOOKING.assignedRoom}
          </div>
          <div className="flex items-center justify-center gap-2 text-2xl text-foreground">
            <MapPin className="w-6 h-6" />
            Floor {BOOKING.floor}
          </div>
          <div className="text-base text-muted-foreground">
            Take the lobby lift, turn left
          </div>
        </div>

        {/* Locker */}
        <div className="p-8 rounded-2xl bg-surface-sunken/60 border border-border space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background text-sm uppercase tracking-wider text-muted-foreground">
            <Lock className="w-4 h-4 text-accent" />
            Key Locker
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-semibold">{BOOKING.locker}</div>
            <div className="text-base text-muted-foreground">
              Located in the lobby alcove, left of reception
            </div>
          </div>
          <div className="p-5 rounded-xl bg-background border border-dashed border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Access code
            </div>
            <div className="text-5xl font-bold tabular tracking-[0.3em] text-foreground">
              {BOOKING.lockerCode}
            </div>
          </div>
          <Badge tone="warning">Code expires in 24 hours</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-base text-muted-foreground">
          A copy has also been sent to {BOOKING.phone}
        </div>
        <Button
          size="lg"
          onClick={onContinue}
          className="text-xl px-10 py-7 h-auto rounded-2xl"
        >
          See folio
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

/* ───────────── Step 6: Folio Preview ───────────── */
function FolioStep({ onAuthorize }: { onAuthorize: () => void }) {
  const cgst = Math.round(BOOKING.taxes / 2);
  const sgst = BOOKING.taxes - cgst;
  return (
    <Card className="p-8 lg:p-12 space-y-8">
      <div className="space-y-2">
        <Badge tone="info">Step 6</Badge>
        <h2 className="text-3xl lg:text-4xl font-bold">Folio preview</h2>
        <p className="text-xl text-muted-foreground">
          Review charges before we authorize your card.
        </p>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 bg-surface-sunken/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <Receipt className="w-4 h-4" />
            Folio · {BOOKING.bookingNo}
          </div>
          <Badge tone="neutral">Estimate</Badge>
        </div>
        <div className="divide-y divide-border">
          <FolioRow
            label={`Room nights (${BOOKING.nights} × ${money(
              BOOKING.roomCharge / BOOKING.nights,
            )})`}
            sub={`${BOOKING.roomType} · ${BOOKING.checkIn} → ${BOOKING.checkOut}`}
            value={money(BOOKING.roomCharge)}
          />
          <FolioRow label="CGST 6%" value={money(cgst)} muted />
          <FolioRow label="SGST 6%" value={money(sgst)} muted />
        </div>
        <div className="px-6 py-5 bg-surface-sunken/40 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Grand total
            </div>
            <div className="text-base text-muted-foreground">
              Inclusive of all taxes
            </div>
          </div>
          <div className="text-4xl font-bold tabular">{money(BOOKING.total)}</div>
        </div>
      </div>

      {/* Auto-charge card */}
      <div className="p-6 rounded-2xl border border-border bg-surface-sunken/40 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-background flex items-center justify-center text-brand">
          <CreditCard className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Auto-charge on file
          </div>
          <div className="text-2xl font-semibold tabular">{BOOKING.paymentCard}</div>
          <div className="text-base text-muted-foreground">
            Card will be charged at check-out
          </div>
        </div>
        <Badge tone="success">Authorized</Badge>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-base text-muted-foreground">
          Tap below to complete check-in.
        </div>
        <Button
          size="lg"
          onClick={onAuthorize}
          className="text-xl px-10 py-7 h-auto rounded-2xl"
        >
          Authorize and finish
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

function FolioRow({
  label,
  sub,
  value,
  muted,
}: {
  label: string;
  sub?: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="px-6 py-4 flex items-center justify-between">
      <div>
        <div
          className={cn(
            "text-lg",
            muted ? "text-muted-foreground" : "font-medium",
          )}
        >
          {label}
        </div>
        {sub && (
          <div className="text-sm text-muted-foreground tabular">{sub}</div>
        )}
      </div>
      <div className={cn("text-xl tabular", muted ? "text-muted-foreground" : "font-semibold")}>
        {value}
      </div>
    </div>
  );
}

/* ───────────── Step 7: Complete ───────────── */
function CompleteStep({
  onEmail,
  onPrint,
  onRestart,
}: {
  onEmail: () => void;
  onPrint: () => void;
  onRestart: () => void;
}) {
  return (
    <Card className="p-12 lg:p-16 text-center space-y-8">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="w-20 h-20 lg:w-24 lg:h-24 text-success" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full bg-success/10 animate-ping" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-4xl lg:text-6xl font-bold tracking-tight">
          You are checked in
        </h2>
        <div className="text-2xl lg:text-3xl text-muted-foreground">
          Welcome to The Pearl Marina, {BOOKING.guest}
        </div>
        <div className="text-xl text-muted-foreground">
          Room {BOOKING.assignedRoom} · {BOOKING.locker} · Code{" "}
          <span className="tabular font-semibold">{BOOKING.lockerCode}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Button
          size="lg"
          variant="outline"
          onClick={onEmail}
          className="text-xl px-10 py-7 h-auto rounded-2xl w-full sm:w-auto"
        >
          <Mail className="w-6 h-6 mr-2" />
          Email receipt
        </Button>
        <Button
          size="lg"
          onClick={onPrint}
          className="text-xl px-10 py-7 h-auto rounded-2xl w-full sm:w-auto"
        >
          <Printer className="w-6 h-6 mr-2" />
          Print receipt
        </Button>
      </div>

      <div className="pt-4">
        <button
          onClick={onRestart}
          className="text-base text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Start over for next guest
        </button>
      </div>
    </Card>
  );
}
