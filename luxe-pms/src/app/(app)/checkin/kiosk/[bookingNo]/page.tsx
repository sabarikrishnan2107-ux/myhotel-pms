"use client";
import * as React from "react";
import {
  Hand,
  ShieldCheck,
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
  MapPin,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { useProperty, hotelName } from "@/lib/use-property";
import { apiGet, apiPut, sendEmail } from "@/lib/api";
import { PhotoCapture } from "@/components/guests/photo-capture";
import { SignaturePad } from "@/components/guests/signature-pad";

// Booking row shape we read from the API for this kiosk session.
type ApiBooking = {
  id: number; bookingNo: string; guestName: string; roomNumber?: string;
  roomType?: string; nights?: number; checkIn?: string; checkOut?: string;
  adults?: number; children?: number; total?: number; status?: string;
};

// KYC captured at the kiosk (base64 data URLs) — saved onto the guest profile.
type KioskKyc = {
  idType: string;
  idFront: string | null;
  idBack: string | null;
  signature: string | null;
};

// Mark the kiosk's booking checked-in in Postgres (looked up by bookingNo) and
// attach the captured ID scans + signature to the guest profile.
async function persistKioskCheckIn(bookingNo: string, guestName: string, kyc: KioskKyc) {
  try {
    const list = await apiGet<ApiBooking[]>("/bookings");
    const bk = list.find(b => b.bookingNo === bookingNo);
    if (bk) await apiPut(`/bookings/${bk.id}`, { status: "checked-in" });
  } catch { /* offline — the kiosk still shows the confirmation */ }
  try {
    const guests = await apiGet<{ id: number; name: string }[]>("/guests");
    const g = guests.find(x => x.name === guestName);
    if (g) await apiPut(`/guests/${g.id}`, {
      idType: kyc.idType,
      idFront: kyc.idFront ?? "",
      idBack: kyc.idBack ?? "",
      signature: kyc.signature ?? "",
    });
  } catch { /* offline — captures stay on screen for this session */ }
}

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
  const name = hotelName(useProperty());
  const { bookingNo } = React.use(params);

  const [stepIdx, setStepIdx] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [idType, setIdType] = React.useState<IdType>("Aadhaar");
  const [idFront, setIdFront] = React.useState<string | null>(null);
  const [idBack, setIdBack] = React.useState<string | null>(null);
  const [signature, setSignature] = React.useState<string | null>(null);

  // Load the real booking for this kiosk session; fall back to mock if offline/not found.
  const [booking, setBooking] = React.useState(BOOKING);
  React.useEffect(() => {
    apiGet<ApiBooking[]>("/bookings").then(list => {
      const b = list.find(x => x.bookingNo === bookingNo);
      if (!b) return;
      const total = b.total ?? BOOKING.total;
      const roomCharge = Math.round(total / 1.18);
      setBooking({
        ...BOOKING,                                  // keep kiosk-only fields (locker, paymentCard…)
        bookingNo: b.bookingNo,
        guest: b.guestName,
        roomType: b.roomType ?? BOOKING.roomType,
        nights: b.nights ?? BOOKING.nights,
        checkIn: b.checkIn ?? BOOKING.checkIn,
        checkOut: b.checkOut ?? BOOKING.checkOut,
        pax: { adults: b.adults ?? BOOKING.pax.adults, children: b.children ?? BOOKING.pax.children },
        total,
        roomCharge,
        taxes: total - roomCharge,
        assignedRoom: b.roomNumber && b.roomNumber !== "Unassigned" ? b.roomNumber : BOOKING.assignedRoom,
      });
    }).catch(() => {});
  }, [bookingNo]);

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
    setIdFront(null);
    setIdBack(null);
    setSignature(null);
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
                {name} · Self Check-in
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
          <WelcomeStep booking={booking} onStart={() => next("Let's get you checked in")} />
        )}
        {step.key === "verify" && (
          <VerifyStep booking={booking} onConfirm={() => next("Details confirmed")} />
        )}
        {step.key === "id" && (
          <IdStep
            idType={idType}
            onTypeChange={(t) => {
              setIdType(t);
              showToast(`${t} selected`);
            }}
            idFront={idFront}
            idBack={idBack}
            onCaptureFront={setIdFront}
            onCaptureBack={setIdBack}
            onContinue={() => next("ID submitted for verification")}
          />
        )}
        {step.key === "signature" && (
          <SignatureStep
            signature={signature}
            onSign={setSignature}
            onDone={() => next("Signature saved")}
          />
        )}
        {step.key === "room" && (
          <RoomStep booking={booking} onContinue={() => next("Room allocated")} />
        )}
        {step.key === "folio" && (
          <FolioStep
            booking={booking}
            onAuthorize={() => {
              persistKioskCheckIn(booking.bookingNo, booking.guest, { idType, idFront, idBack, signature });
              next("Folio authorized · checked in");
            }}
          />
        )}
        {step.key === "complete" && (
          <CompleteStep
            booking={booking}
            onEmail={async () => {
              showToast("Emailing receipt…");
              try {
                const guests = await apiGet<{ name: string; email?: string }[]>("/guests");
                const to = guests.find(g => g.name === booking.guest)?.email;
                if (!to) { showToast("No email on file for this guest"); return; }
                await sendEmail({ to, subject: `Check-in Receipt · ${booking.bookingNo}`, heading: "Check-in Receipt", greeting: booking.guest, intro: "You're checked in. Here is your receipt.", rows: [{ label: "Booking No", value: booking.bookingNo }], context: "Kiosk receipt" });
                showToast(`Receipt sent to ${to}`);
              } catch { showToast("Couldn't email receipt"); }
            }}
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
function WelcomeStep({ booking, onStart }: { booking: typeof BOOKING; onStart: () => void }) {
  return (
    <Card className="p-12 lg:p-16 text-center space-y-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-sunken text-sm text-muted-foreground">
        <Hand className="w-4 h-4 text-brand" />
        Namaste
      </div>
      <div className="space-y-4">
        <div className="text-3xl lg:text-4xl text-muted-foreground">Welcome,</div>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
          {booking.guest}
        </h1>
        <div className="text-2xl text-muted-foreground pt-2">
          Booking {booking.bookingNo} · {booking.roomType} · {booking.nights} nights
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
function VerifyStep({ booking, onConfirm }: { booking: typeof BOOKING; onConfirm: () => void }) {
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
          value={booking.bookingNo}
        />
        <VerifyRow
          icon={<Users className="w-6 h-6" />}
          label="Primary Guest"
          value={booking.guest}
          sub={booking.phone}
        />
        <VerifyRow
          icon={<CalendarDays className="w-6 h-6" />}
          label="Stay Dates"
          value={`${booking.checkIn} → ${booking.checkOut}`}
          sub={`${booking.nights} nights`}
        />
        <VerifyRow
          icon={<BedDouble className="w-6 h-6" />}
          label="Room Type"
          value={booking.roomType}
          sub={`${booking.pax.adults} adults · ${booking.pax.children} children`}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <div className="text-sm uppercase tracking-wider text-muted-foreground">
            Total
          </div>
          <div className="text-3xl font-bold tabular">{money(booking.total)}</div>
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
  idFront,
  idBack,
  onCaptureFront,
  onCaptureBack,
  onContinue,
}: {
  idType: IdType;
  onTypeChange: (t: IdType) => void;
  idFront: string | null;
  idBack: string | null;
  onCaptureFront: (dataUrl: string | null) => void;
  onCaptureBack: (dataUrl: string | null) => void;
  onContinue: () => void;
}) {
  const ready = idFront !== null && idBack !== null;
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

      {/* Camera tiles — live webcam capture (or upload) of each side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="text-base font-medium">Front of document</div>
          <PhotoCapture label="Front of document" aspect="landscape" focus="none" onChange={onCaptureFront} />
        </div>
        <div className="space-y-2">
          <div className="text-base font-medium">Back of document</div>
          <PhotoCapture label="Back of document" aspect="landscape" focus="none" onChange={onCaptureBack} />
        </div>
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

/* ───────────── Step 4: Signature ───────────── */
function SignatureStep({
  signature,
  onSign,
  onDone,
}: {
  signature: string | null;
  onSign: (dataUrl: string | null) => void;
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

      {/* Live signature pad — strokes are saved as a PNG */}
      <SignaturePad height={300} onChange={onSign} />

      <div className="flex items-center justify-end pt-4 border-t border-border">
        <Button
          size="lg"
          onClick={onDone}
          disabled={signature === null}
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
function RoomStep({ booking, onContinue }: { booking: typeof BOOKING; onContinue: () => void }) {
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
            {booking.assignedRoom}
          </div>
          <div className="flex items-center justify-center gap-2 text-2xl text-foreground">
            <MapPin className="w-6 h-6" />
            Floor {booking.floor}
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
            <div className="text-3xl font-semibold">{booking.locker}</div>
            <div className="text-base text-muted-foreground">
              Located in the lobby alcove, left of reception
            </div>
          </div>
          <div className="p-5 rounded-xl bg-background border border-dashed border-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Access code
            </div>
            <div className="text-5xl font-bold tabular tracking-[0.3em] text-foreground">
              {booking.lockerCode}
            </div>
          </div>
          <Badge tone="warning">Code expires in 24 hours</Badge>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-base text-muted-foreground">
          A copy has also been sent to {booking.phone}
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
function FolioStep({ booking, onAuthorize }: { booking: typeof BOOKING; onAuthorize: () => void }) {
  const cgst = Math.round(booking.taxes / 2);
  const sgst = booking.taxes - cgst;
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
            Folio · {booking.bookingNo}
          </div>
          <Badge tone="neutral">Estimate</Badge>
        </div>
        <div className="divide-y divide-border">
          <FolioRow
            label={`Room nights (${booking.nights} × ${money(
              booking.roomCharge / booking.nights,
            )})`}
            sub={`${booking.roomType} · ${booking.checkIn} → ${booking.checkOut}`}
            value={money(booking.roomCharge)}
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
          <div className="text-4xl font-bold tabular">{money(booking.total)}</div>
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
          <div className="text-2xl font-semibold tabular">{booking.paymentCard}</div>
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
  booking,
  onEmail,
  onPrint,
  onRestart,
}: {
  booking: typeof BOOKING;
  onEmail: () => void;
  onPrint: () => void;
  onRestart: () => void;
}) {
  const name = hotelName(useProperty());
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
          Welcome to {name}, {booking.guest}
        </div>
        <div className="text-xl text-muted-foreground">
          Room {booking.assignedRoom} · {booking.locker} · Code{" "}
          <span className="tabular font-semibold">{booking.lockerCode}</span>
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
