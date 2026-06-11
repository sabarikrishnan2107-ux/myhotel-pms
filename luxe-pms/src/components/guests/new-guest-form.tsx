"use client";
import * as React from "react";
import { User, IdCard, Briefcase, Sparkles, ChevronLeft, Save, Camera, Pen } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhotoCapture } from "./photo-capture";
import { SignaturePad } from "./signature-pad";
import { DocumentUpload } from "./document-upload";
import { cn } from "@/lib/utils";

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
  name: "", phone: "+91 ", email: "", address: "", nationality: "India",
  dob: "", gender: "Prefer not to say",
  idType: "Aadhaar", idNumber: "",
  idFront: null, idBack: null, photo: null, signature: null,
  company: "", gst: "", vip: false, remarks: "",
};

const NATIONALITIES = ["India", "USA", "UK", "Japan", "UAE", "Singapore", "Australia", "Germany", "France", "Canada", "China", "Russia", "Saudi Arabia", "Spain", "Italy", "Other"];

interface Props {
  onCancel: () => void;
  onSave: (data: NewGuestData) => void;
}

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

export function NewGuestForm({ onCancel, onSave }: Props) {
  const [data, setData] = React.useState<NewGuestData>(EMPTY);
  const update = <K extends keyof NewGuestData>(k: K, v: NewGuestData[K]) =>
    setData(prev => ({ ...prev, [k]: v }));

  // DOB constraints — guest must be 18+ and not absurdly old
  const maxDob = React.useMemo(() => isoDateNYearsAgo(MIN_GUEST_AGE), []);
  const minDob = React.useMemo(() => isoDateNYearsAgo(MAX_GUEST_AGE), []);
  const dobAge = ageFromIso(data.dob);
  const dobValid = data.dob === "" || (dobAge !== null && dobAge >= MIN_GUEST_AGE && dobAge <= MAX_GUEST_AGE);

  // Required: name, phone, idNumber, idFront, photo + (if DOB entered) valid age
  const requiredOk = !!(data.name && data.phone && data.idNumber && data.idFront && data.photo) && dobValid;
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
            <Input value={data.phone} onChange={e => update("phone", e.target.value)} placeholder="+971 50 123 4567" type="tel" />
          </Field>
          <Field label="Email">
            <Input value={data.email} onChange={e => update("email", e.target.value)} placeholder="guest@example.com" type="email" />
          </Field>
          <Field label="Date of birth">
            <Input
              value={data.dob}
              onChange={e => update("dob", e.target.value)}
              type="date"
              min={minDob}
              max={maxDob}
              aria-invalid={!dobValid}
              className={!dobValid ? "border-danger focus-visible:border-danger focus-visible:ring-danger/30" : ""}
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
              <option>Male</option><option>Female</option><option>Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Input value={data.address} onChange={e => update("address", e.target.value)} placeholder="Street, Building, City, Country" />
          </Field>
        </div>
      </Section>

      {/* Identification + Photo + Signature */}
      <Section icon={IdCard} title="Identification & Captures" required>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ID details */}
          <div className="space-y-3">
            <Field label="ID type *">
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
            <Field label="ID number *">
              <Input value={data.idNumber} onChange={e => update("idNumber", e.target.value)} placeholder="A12345678" />
            </Field>
            <Field label={`${data.idType} — front *`}>
              <DocumentUpload label="ID Front" onChange={v => update("idFront", v)} />
            </Field>
            <Field label={`${data.idType} — back`}>
              <DocumentUpload label="ID Back" onChange={v => update("idBack", v)} />
            </Field>
          </div>

          {/* Guest face */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <Label>Guest face photo *</Label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Webcam capture (recommended) or upload</p>
            <PhotoCapture onChange={v => update("photo", v)} aspect="square" />
          </div>

          {/* Signature */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Pen className="h-4 w-4 text-muted-foreground" />
              <Label>Digital signature</Label>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Sign with mouse, stylus, or finger</p>
            <SignaturePad onChange={v => update("signature", v)} height={180} />
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
            className={cn(
              "w-full flex items-center justify-between gap-3 p-3 rounded-md border transition-colors",
              data.vip ? "border-brand bg-brand-soft" : "border-border hover:bg-surface-sunken"
            )}
          >
            <div className="text-left">
              <p className="text-sm font-medium">Mark as VIP</p>
              <p className="text-xs text-muted-foreground">Priority handling, complimentary upgrade if available</p>
            </div>
            <span className={cn(
              "h-5 w-9 rounded-full relative transition-colors shrink-0",
              data.vip ? "bg-brand" : "bg-surface-sunken border border-border"
            )}>
              <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform", data.vip ? "translate-x-4" : "translate-x-0.5")} />
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
            ? "All required captures complete · ready to save"
            : "Required: name · phone · ID number · ID front · guest photo"}
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
