"use client";
import * as React from "react";
import { User, IdCard, Briefcase, Sparkles, ChevronLeft, Save, Camera, Pen, Smartphone, CheckCircle2 } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { isValidEmail } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { PhotoCapture } from "./photo-capture";
import { SignaturePad } from "./signature-pad";
import { DocumentUpload } from "./document-upload";
import { apiGet } from "@/lib/api";
import { MobileSyncDialog } from "./mobile-sync-dialog";
import { cn } from "@/lib/utils";
import { validateId } from "@/lib/id";

export interface NewGuestData {
  name: string;
  phone: string;
  email: string;
  address: string;
  nationality: string;
  dob: string;
  gender: string;
  idType: string;
  idNumber: string;
  idFront: string | null;
  idBack: string | null;
  photo: string | null;
  signature: string | null;
  company: string;
  gst: string;
  vip: boolean;
  remarks: string;
}

const EMPTY: NewGuestData = {
  name: "", phone: "", email: "", address: "", nationality: "India",
  dob: "", gender: "Male",
  idType: "Aadhaar", idNumber: "",
  idFront: null, idBack: null, photo: null, signature: null,
  company: "", gst: "", vip: false, remarks: "",
};

const NATIONALITIES = ["India", "USA", "UK", "Japan", "UAE", "Singapore", "Australia", "Germany", "France", "Canada", "China", "Russia", "Saudi Arabia", "Spain", "Italy", "Other"];

interface Props {
  onCancel: () => void;
  onSave: (data: NewGuestData) => void;
  /**
   * When provided, shows a "Sync to mobile app" button in the Captures section.
   * `onRequest` creates the booking on the server (so the tablet can see it) and
   * returns its id + reference; the form then polls that booking until the app
   * uploads the documents, and fills the capture slots from the result.
   */
  mobileSync?: {
    onRequest: (data: NewGuestData) => Promise<{ bookingId: number; reference: string } | null>;
  };
}

/** Shape returned by GET /bookings/{id} (the fields this form needs). */
type SyncedBooking = {
  verification_status?: string;
  documents?: {
    guest_photo?: string | null;
    id_front?: string | null;
    id_back?: string | null;
    signature?: string | null;
  };
  identity?: {
    id_type?: string | null;
    id_number?: string | null;
  };
};

/** ISO date (YYYY-MM-DD) of today minus N years — used to cap the DOB picker so the guest is at least N years old. */
function isoDateNYearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

const MIN_GUEST_AGE = 18;
const MAX_GUEST_AGE = 110;

function ageFromIso(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// Shared "invalid field" styling so DOB / phone / email all flag errors the same way.
const DANGER_INPUT = "border-danger focus-visible:border-danger focus-visible:ring-danger/30";

export function NewGuestForm({ onCancel, onSave, mobileSync }: Props) {
  const [data, setData] = React.useState<NewGuestData>(EMPTY);
  const update = <K extends keyof NewGuestData>(k: K, v: NewGuestData[K]) =>
    setData(prev => ({ ...prev, [k]: v }));

  // --- Mobile capture sync ------------------------------------------------
  const [syncState, setSyncState] = React.useState<"idle" | "creating" | "waiting" | "done" | "error">("idle");
  const [syncRef, setSyncRef] = React.useState<string | null>(null);
  const [syncBookingId, setSyncBookingId] = React.useState<number | null>(null);
  const [syncErr, setSyncErr] = React.useState<string | null>(null);
  const [syncDocs, setSyncDocs] = React.useState<SyncedBooking["documents"]>(undefined);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const startSync = async () => {
    if (!mobileSync) return;
    // A sync is already running or finished — just re-open the dialog.
    if (syncState === "creating" || syncState === "waiting" || syncState === "done") {
      setDialogOpen(true);
      return;
    }
    if (!data.name || !data.phone) {
      setSyncErr("Enter the guest's name and phone first.");
      return;
    }
    setSyncErr(null);
    setSyncDocs(undefined);
    setDialogOpen(true);
    setSyncState("creating");
    const res = await mobileSync.onRequest(data);
    if (!res) {
      setSyncErr("Couldn't create the booking. Check your connection and try again.");
      setSyncState("error");
      return;
    }
    setSyncBookingId(res.bookingId);
    setSyncRef(res.reference);
    setSyncState("waiting");
  };

  const cancelSync = () => {
    setSyncState("idle");
    setSyncBookingId(null);
    setSyncRef(null);
    setSyncErr(null);
    setSyncDocs(undefined);
    setDialogOpen(false);
  };

  // While waiting, poll the booking until the app uploads the documents.
  React.useEffect(() => {
    if (syncState !== "waiting" || !syncBookingId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const b = await apiGet<SyncedBooking>(`/bookings/${syncBookingId}`);
        if (stopped) return;
        setSyncDocs(b?.documents);
        const d = b?.documents;
        // Done as soon as all four documents are present — don't depend on the
        // backend's verification_status string (which can lag at "in_progress").
        const allPresent = !!(d?.guest_photo && d?.id_front && d?.id_back && d?.signature);
        if (d && (allPresent || b?.verification_status === "synced")) {
          setData(prev => ({
            ...prev,
            photo: d.guest_photo ?? prev.photo,
            idFront: d.id_front ?? prev.idFront,
            idBack: d.id_back ?? prev.idBack,
            signature: d.signature ?? prev.signature,
            // Structured ID captured on the tablet — keep the form default if absent.
            idType: b.identity?.id_type || prev.idType,
            idNumber: b.identity?.id_number || prev.idNumber,
          }));
          setSyncState("done");
          setDialogOpen(true);
        }
      } catch {
        /* keep polling — transient network error */
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [syncState, syncBookingId]);

  // DOB constraints — guest must be 18+ and not absurdly old
  const maxDob = React.useMemo(() => isoDateNYearsAgo(MIN_GUEST_AGE), []);
  const minDob = React.useMemo(() => isoDateNYearsAgo(MAX_GUEST_AGE), []);
  const dobAge = ageFromIso(data.dob);
  const dobValid = data.dob === "" || (dobAge !== null && dobAge >= MIN_GUEST_AGE && dobAge <= MAX_GUEST_AGE);

  const phoneValid = isValidPhone(data.phone);
  const emailValid = isValidEmail(data.email);
  // Field-level errors only surface after the guest has left that field, so a
  // pristine form isn't littered with red.
  const [touched, setTouched] = React.useState<{ phone?: boolean; email?: boolean }>({});
  const markTouched = (k: "phone" | "email") => setTouched(t => ({ ...t, [k]: true }));

  // Required to save: a name plus a valid phone, a valid email if one was typed,
  // and a valid DOB if one was entered. ID number / scans / face photo stay
  // optional — they can be captured at check-in — so basic details always save.
  // A non-empty ID number must be valid for its type; empty stays allowed so a
  // no-ID draft is still savable (ID can be captured later at check-in).
  const idCheck = validateId(data.idType, data.idNumber, data.nationality);
  const idValid = data.idNumber.trim() === "" || idCheck.ok;
  const requiredOk = !!data.name && phoneValid && emailValid && dobValid && idValid;
  const issues: string[] = [];
  if (!data.name) issues.push("name");
  if (!phoneValid) issues.push("valid phone");
  if (!emailValid) issues.push("valid email");
  if (!dobValid) issues.push("valid date of birth");
  if (!idValid) issues.push("valid ID number");
  const completionPct = (() => {
    const fields: (keyof NewGuestData)[] = ["name", "phone", "email", "address", "nationality", "idType", "idNumber", "idFront", "idBack", "photo", "signature"];
    const filled = fields.filter(f => !!data[f]).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <div className="space-y-5">
      {/* Sticky toolbar */}
      <div className="flex items-center justify-between py-1">
        <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />Back to search
        </button>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground tabular">Profile {completionPct}%</span>
          <div className="h-1.5 w-28 bg-surface-sunken rounded-full overflow-hidden">
            <div className={cn("h-full transition-all", completionPct >= 70 ? "bg-success" : "bg-brand")} style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Personal */}
      <Section icon={User} title="Personal Details" required>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full name *">
            <Input value={data.name} onChange={e => update("name", e.target.value)} placeholder="Mr. John Doe" autoFocus />
          </Field>
          <Field label="Phone *">
            <PhoneInput
              value={data.phone}
              onChange={v => update("phone", v)}
              onBlur={() => markTouched("phone")}
              invalid={touched.phone && !phoneValid}
            />
            {touched.phone && !phoneValid && (
              <p className="text-[11px] text-danger mt-1">Pick a country and enter a valid phone number</p>
            )}
          </Field>
          <Field label="Email">
            <Input
              value={data.email}
              onChange={e => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              placeholder="guest@example.com"
              type="email"
              inputMode="email"
              aria-invalid={touched.email && !emailValid}
              className={touched.email && !emailValid ? DANGER_INPUT : ""}
            />
            {touched.email && !emailValid && (
              <p className="text-[11px] text-danger mt-1">Enter a valid email address (e.g. guest@example.com)</p>
            )}
          </Field>
          <Field label="Date of birth">
            <Input
              value={data.dob}
              onChange={e => update("dob", e.target.value)}
              type="date"
              min={minDob}
              max={maxDob}
              aria-invalid={!dobValid}
              className={!dobValid ? DANGER_INPUT : ""}
            />
            {data.dob && dobAge !== null && dobValid && (
              <p className="text-[11px] text-muted-foreground mt-1 tabular">
                Age <span className="font-medium text-foreground">{dobAge}</span> · OK
              </p>
            )}
            {data.dob && !dobValid && (
              <p className="text-[11px] text-danger mt-1 inline-flex items-center gap-1">
                Guest must be at least {MIN_GUEST_AGE} years old
                {dobAge !== null && <span className="text-muted-foreground">({dobAge} computed)</span>}
              </p>
            )}
            {!data.dob && (
              <p className="text-[11px] text-muted-foreground mt-1">Must be {MIN_GUEST_AGE}+ to check in</p>
            )}
          </Field>
          <Field label="Nationality">
            <Select value={data.nationality} onChange={e => update("nationality", e.target.value)}>
              {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="Gender">
            <Select value={data.gender} onChange={e => update("gender", e.target.value)}>
              <option>Male</option><option>Female</option>
            </Select>
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Input value={data.address} onChange={e => update("address", e.target.value)} placeholder="Street, Building, City, Country" />
          </Field>
        </div>
      </Section>

      {/* Identification + Photo + Signature */}
      <Section icon={IdCard} title="Identification & Captures" optional>
        {mobileSync && syncState !== "done" && (
          <div className="rounded-md border border-border bg-surface-sunken/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Capture on the mobile app</p>
                  <p className="text-xs text-muted-foreground">Send this booking to the tablet — staff capture the face photo, ID &amp; signature there, and they flow back into this form.</p>
                  {syncErr && <p className="text-[11px] text-danger mt-1">{syncErr}</p>}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={startSync}>
                <Smartphone className="h-4 w-4" />
                {syncState === "creating" || syncState === "waiting" ? "View sync status" : "Sync to mobile app"}
              </Button>
            </div>
          </div>
        )}
        {mobileSync && syncState === "done" && (
          <div className="rounded-md border border-success/40 bg-success-soft/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">Captured from tablet</span>
                {syncRef && <span className="text-muted-foreground">· booking {syncRef}</span>}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>View</Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              {idValid && data.idNumber.trim() !== "" ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data.idType} · {data.idNumber} verified
                </span>
              ) : data.idNumber.trim() !== "" ? (
                <span className="text-danger">{data.idType} number looks invalid — check it below.</span>
              ) : (
                <span className="text-muted-foreground">No ID number captured — add one below.</span>
              )}
            </div>
          </div>
        )}

        {mobileSync && dialogOpen && syncState !== "idle" && (
          <MobileSyncDialog
            state={syncState}
            reference={syncRef}
            docs={syncDocs}
            errorMessage={syncErr}
            onCancel={cancelSync}
            onHide={() => setDialogOpen(false)}
            onDone={() => setDialogOpen(false)}
          />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ID details */}
          <div className="space-y-3">
            <Field label="ID type">
              <Select value={data.idType} onChange={e => update("idType", e.target.value)}>
                {data.nationality === "India" ? (
                  <>
                    <option>Aadhaar</option>
                    <option>PAN</option>
                    <option>Driving License</option>
                    <option>Voter ID</option>
                    <option>Passport</option>
                  </>
                ) : (
                  <>
                    <option>Passport</option>
                    <option>OCI Card</option>
                    <option>PIO Card</option>
                    <option>Driving License</option>
                  </>
                )}
              </Select>
            </Field>
            <Field label="ID number">
              <Input value={data.idNumber} onChange={e => update("idNumber", e.target.value)} placeholder="A12345678" />
            </Field>
            <Field label={`${data.idType} — front`}>
              <DocumentUpload label="ID Front" value={data.idFront} onChange={v => update("idFront", v)} />
            </Field>
            <Field label={`${data.idType} — back`}>
              <DocumentUpload label="ID Back" value={data.idBack} onChange={v => update("idBack", v)} />
            </Field>
          </div>

          {/* Guest face */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <Label>Guest face photo</Label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Webcam capture (recommended) or upload</p>
            <PhotoCapture value={data.photo} onChange={v => update("photo", v)} aspect="square" />
          </div>

          {/* Signature */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Pen className="h-4 w-4 text-muted-foreground" />
              <Label>Digital signature</Label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Sign with mouse, stylus, or finger</p>
            <SignaturePad value={data.signature} onChange={v => update("signature", v)} height={180} />
          </div>
        </div>
      </Section>

      {/* Business */}
      <Section icon={Briefcase} title="Business / GST Details" optional>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Company name">
            <Input value={data.company} onChange={e => update("company", e.target.value)} placeholder="ACME Pvt. Ltd." />
          </Field>
          <Field label="GSTIN (15-character)">
            <Input
              value={data.gst}
              onChange={e => update("gst", e.target.value.toUpperCase())}
              placeholder="27AAACR5055K1Z5"
              maxLength={15}
              className="font-mono uppercase"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Required for B2B input tax credit · Format: 2-digit state + 10-digit PAN + 1 entity + Z + checksum
            </p>
          </Field>
        </div>
      </Section>

      {/* Form C alert for foreign nationals */}
      {data.nationality && data.nationality !== "India" && (
        <div className="rounded-md border border-warning/40 bg-warning-soft/30 p-4">
          <div className="flex items-start gap-3">
            <span className="h-8 w-8 rounded-md bg-warning text-white flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Form C — Foreigner Registration Required</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Under <span className="font-medium text-foreground">Section 14 of the Foreigners Act, 1946</span>, all foreign nationals staying at hotels must be reported to the FRRO within <span className="font-medium text-foreground">24 hours</span> of arrival. Additional fields will appear after save: visa type, visa number, port of arrival. Form C will be auto-submitted to <span className="font-mono">indianfrro.gov.in</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <Section icon={Sparkles} title="Preferences & Flags" optional>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => update("vip", !data.vip)}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-medium">Mark as VIP</p>
              <p className="text-xs text-muted-foreground">Priority handling, complimentary upgrade if available</p>
            </div>
            <span className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
              data.vip ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start"
            )}>
              <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
            </span>
          </button>
          <Field label="Remarks">
            <textarea
              value={data.remarks}
              onChange={e => update("remarks", e.target.value)}
              rows={2}
              placeholder="Dietary needs, room preferences, allergies, accessibility, etc."
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-none"
            />
          </Field>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {requiredOk
            ? "Ready to save · ID & photo can be captured at check-in"
            : `Needs: ${issues.join(" · ")}`}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="button" disabled={!requiredOk} onClick={() => onSave(data)}>
            <Save className="h-4 w-4" />Save Guest & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, required, optional }: { icon: typeof User; title: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border">
        <span className="h-7 w-7 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
        {required && <span className="text-[10px] uppercase tracking-wider font-semibold text-danger">Required</span>}
        {optional && <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Optional</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
