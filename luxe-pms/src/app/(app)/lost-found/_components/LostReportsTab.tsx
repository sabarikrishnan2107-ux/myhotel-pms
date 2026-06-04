"use client";
import * as React from "react";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Send,
  Bell,
  Activity,
  Hash,
  Sparkles,
  ShieldAlert,
  Hotel,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type ReportStatus =
  | "Reported"
  | "Searching"
  | "Possible match"
  | "Verification pending"
  | "Verified"
  | "Returned"
  | "Not found"
  | "Closed";

type Urgency = "Low" | "Medium" | "High" | "Urgent";

type ContactMode = "SMS" | "WhatsApp" | "Email" | "Phone call";

type ToneType = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";

const STATUS_TONE: Record<ReportStatus, ToneType> = {
  Reported: "warning",
  Searching: "info",
  "Possible match": "accent",
  "Verification pending": "warning",
  Verified: "brand",
  Returned: "success",
  "Not found": "danger",
  Closed: "neutral",
};

const URGENCY_TONE: Record<Urgency, ToneType> = {
  Low: "neutral",
  Medium: "info",
  High: "warning",
  Urgent: "danger",
};

type TimelineEvent = {
  ts: string;
  label: string;
  detail: string;
};

type PossibleMatch = {
  id: string;
  item: string;
  foundLocation: string;
  foundDate: string;
  confidence: number;
};

type Report = {
  id: string;
  reportNo: string;
  guest: string;
  phone: string;
  email: string;
  isWalkIn: boolean;
  room?: string;
  stayFrom?: string;
  stayTo?: string;
  itemCategory: string;
  itemName: string;
  brand?: string;
  color?: string;
  description: string;
  identification?: string;
  hasPhoto: boolean;
  lostDate: string;
  lostTime: string;
  lastSeen: string;
  reportedOn: string;
  urgency: Urgency;
  status: ReportStatus;
  contactMode: ContactMode;
  remarks?: string;
  estValue?: number;
  hvi?: boolean;
  timeline: TimelineEvent[];
  matches: PossibleMatch[];
};

const SEED: Report[] = [
  {
    id: "lr1",
    reportNo: "LR/2026/0091",
    guest: "Mr. Rohit Sharma",
    phone: "+91 98201 22334",
    email: "rohit.sharma@example.com",
    isWalkIn: false,
    room: "508",
    stayFrom: "28 May",
    stayTo: "01 Jun",
    itemCategory: "Jewellery",
    itemName: "Wedding ring",
    brand: "Tanishq",
    color: "Gold",
    description: "22kt gold wedding ring with diamond cluster, engraved 'R&P 2018' inside band.",
    identification: "Engraving 'R&P 2018' inside the band",
    hasPhoto: true,
    lostDate: "2026-06-01",
    lostTime: "08:45",
    lastSeen: "Room 508 - Bathroom counter",
    reportedOn: "2026-06-01 10:12",
    urgency: "Urgent",
    status: "Searching",
    contactMode: "WhatsApp",
    remarks: "Guest very distressed - sentimental value. Wife's anniversary gift.",
    estValue: 185000,
    hvi: true,
    timeline: [
      { ts: "Jun 01 · 10:12", label: "Report filed", detail: "Logged at Front Desk by Anjali Iyer" },
      { ts: "Jun 01 · 10:15", label: "HK notified", detail: "Housekeeping floor 5 supervisor alerted" },
      { ts: "Jun 01 · 10:35", label: "Room searched", detail: "Bathroom, drawers, linen cart inspected" },
      { ts: "Jun 01 · 11:20", label: "Linen room search", detail: "Soiled linen from 508 being verified" },
    ],
    matches: [
      { id: "m1", item: "Gold ring", foundLocation: "Linen room - 5th floor", foundDate: "Jun 01", confidence: 78 },
    ],
  },
  {
    id: "lr2",
    reportNo: "LR/2026/0090",
    guest: "Ms. Anjali Iyer",
    phone: "+91 99102 88774",
    email: "anjali.iyer@example.com",
    isWalkIn: false,
    room: "302",
    stayFrom: "30 May",
    stayTo: "02 Jun",
    itemCategory: "Electronics",
    itemName: "iPhone 15 Pro",
    brand: "Apple",
    color: "Natural Titanium",
    description: "iPhone 15 Pro 256GB, leather case (brown), lock screen wallpaper of family photo.",
    identification: "IMEI: 35XXXXXXXXXX9821 (on file)",
    hasPhoto: true,
    lostDate: "2026-05-31",
    lostTime: "21:30",
    lastSeen: "Marina Restaurant - Table 14",
    reportedOn: "2026-05-31 22:05",
    urgency: "High",
    status: "Possible match",
    contactMode: "WhatsApp",
    remarks: "Guest had dinner with 4 others. Phone was on the table during dessert.",
    estValue: 145000,
    hvi: true,
    timeline: [
      { ts: "May 31 · 22:05", label: "Report filed", detail: "Reported by guest at restaurant POS" },
      { ts: "May 31 · 22:10", label: "F&B searched", detail: "Restaurant, kitchen, washroom checked" },
      { ts: "May 31 · 23:40", label: "Item found", detail: "Phone handed in by busser - awaiting verification" },
      { ts: "Jun 01 · 09:00", label: "Match flagged", detail: "Possible match pending guest confirmation" },
    ],
    matches: [
      { id: "m2", item: "iPhone (Apple)", foundLocation: "Marina Restaurant", foundDate: "May 31", confidence: 96 },
    ],
  },
  {
    id: "lr3",
    reportNo: "LR/2026/0089",
    guest: "Mr. Karan Mehta",
    phone: "+91 98765 43210",
    email: "karan.mehta@example.com",
    isWalkIn: false,
    room: "Reception",
    stayFrom: "29 May",
    stayTo: "03 Jun",
    itemCategory: "Documents",
    itemName: "Indian Passport",
    color: "Navy Blue",
    description: "Indian passport in maroon leather sleeve. Visa stickers for US, UK, Schengen.",
    identification: "Passport No: M76XXXX21",
    hasPhoto: false,
    lostDate: "2026-05-30",
    lostTime: "15:00",
    lastSeen: "Reception desk - during check-in",
    reportedOn: "2026-05-30 17:45",
    urgency: "Urgent",
    status: "Verification pending",
    contactMode: "Phone call",
    remarks: "Critical - guest has international flight tomorrow. FRRO informed.",
    estValue: 0,
    hvi: true,
    timeline: [
      { ts: "May 30 · 17:45", label: "Report filed", detail: "Reception unable to locate post check-in scan" },
      { ts: "May 30 · 18:00", label: "Reception searched", detail: "Counter, drawers, scanner area checked" },
      { ts: "May 31 · 09:30", label: "Found at Concierge", detail: "Likely match - found in concierge folder" },
      { ts: "May 31 · 14:00", label: "Verification pending", detail: "Guest to verify passport no in person" },
    ],
    matches: [
      { id: "m3", item: "Indian Passport (M76)", foundLocation: "Concierge desk", foundDate: "May 31", confidence: 92 },
    ],
  },
  {
    id: "lr4",
    reportNo: "LR/2026/0088",
    guest: "Mrs. Priya Krishnan",
    phone: "+91 99887 66554",
    email: "priya.k@example.com",
    isWalkIn: false,
    room: "412",
    stayFrom: "27 May",
    stayTo: "30 May",
    itemCategory: "Personal / Sentimental",
    itemName: "Child's teddy bear",
    brand: "Hamleys",
    color: "Brown",
    description: "Medium-sized brown teddy bear, missing left eye-button, red ribbon on neck. Name 'Bruno' stitched on left paw.",
    identification: "Name 'Bruno' on left paw",
    hasPhoto: true,
    lostDate: "2026-05-30",
    lostTime: "11:00",
    lastSeen: "Room 412 - during check-out / lobby",
    reportedOn: "2026-05-30 14:20",
    urgency: "High",
    status: "Returned",
    contactMode: "WhatsApp",
    remarks: "Daughter (4y) inconsolable. Couriered to guest's Bengaluru address.",
    estValue: 2200,
    hvi: false,
    timeline: [
      { ts: "May 30 · 14:20", label: "Report filed", detail: "Called from car en route to airport" },
      { ts: "May 30 · 14:50", label: "Room searched", detail: "Found under bed in Room 412" },
      { ts: "May 30 · 15:30", label: "Match verified", detail: "Photo confirmed by guest on WhatsApp" },
      { ts: "May 31 · 11:00", label: "Couriered", detail: "Bluedart AWB 35XXXXXXX21 - to Bengaluru" },
      { ts: "Jun 01 · 16:40", label: "Delivered", detail: "Signed by guest - case closed with thank-you" },
    ],
    matches: [],
  },
  {
    id: "lr5",
    reportNo: "LR/2026/0087",
    guest: "Mr. Vikram Singhania",
    phone: "+91 98456 11223",
    email: "vikram.s@example.com",
    isWalkIn: false,
    room: "Pearl Banquet",
    stayFrom: "29 May",
    stayTo: "29 May",
    itemCategory: "Electronics",
    itemName: "MacBook Air M3",
    brand: "Apple",
    color: "Midnight",
    description: "13-inch MacBook Air M3, midnight finish, navy leather sleeve, lots of stickers on lid.",
    identification: "Serial: C02XXXXXX (registered to vikram.s@)",
    hasPhoto: true,
    lostDate: "2026-05-29",
    lostTime: "23:15",
    lastSeen: "Pearl Banquet Hall - corporate conference",
    reportedOn: "2026-05-30 08:10",
    urgency: "Urgent",
    status: "Verified",
    contactMode: "Email",
    remarks: "Confidential business data. Guest will collect personally tomorrow.",
    estValue: 142000,
    hvi: true,
    timeline: [
      { ts: "May 30 · 08:10", label: "Report filed", detail: "Realised laptop missing at airport" },
      { ts: "May 30 · 08:35", label: "Banquet searched", detail: "Conference setup team alerted" },
      { ts: "May 30 · 10:15", label: "Found in AV room", detail: "Banquet team handed it to L&F desk" },
      { ts: "May 30 · 11:00", label: "Verified", detail: "Serial number cross-checked with guest" },
    ],
    matches: [
      { id: "m5", item: "MacBook Air (Midnight)", foundLocation: "Banquet AV room", foundDate: "May 30", confidence: 99 },
    ],
  },
  {
    id: "lr6",
    reportNo: "LR/2026/0086",
    guest: "Walk-in: Ms. Sneha Kapoor",
    phone: "+91 98910 33445",
    email: "sneha.k@example.com",
    isWalkIn: true,
    itemCategory: "Accessories",
    itemName: "Ray-Ban sunglasses",
    brand: "Ray-Ban",
    color: "Tortoise / brown",
    description: "Ray-Ban Wayfarer tortoise frame, prescription lenses, hard case missing.",
    hasPhoto: false,
    lostDate: "2026-05-28",
    lostTime: "16:00",
    lastSeen: "Pool deck - lounger 12",
    reportedOn: "2026-05-28 18:30",
    urgency: "Medium",
    status: "Reported",
    contactMode: "SMS",
    remarks: "Walk-in pool day-pass guest. No room.",
    estValue: 12500,
    hvi: false,
    timeline: [
      { ts: "May 28 · 18:30", label: "Report filed", detail: "Walk-in - logged at concierge" },
      { ts: "May 28 · 18:45", label: "Pool team alerted", detail: "Pool deck staff to scan loungers" },
    ],
    matches: [],
  },
  {
    id: "lr7",
    reportNo: "LR/2026/0085",
    guest: "Mr. Daniel Wong",
    phone: "+65 9123 4456",
    email: "daniel.w@example.com",
    isWalkIn: false,
    room: "705",
    stayFrom: "25 May",
    stayTo: "28 May",
    itemCategory: "Clothing",
    itemName: "Charging cable & adapter",
    brand: "Apple",
    color: "White",
    description: "USB-C to Lightning cable + 20W power adapter, both Apple, in zip pouch.",
    hasPhoto: false,
    lostDate: "2026-05-28",
    lostTime: "07:30",
    lastSeen: "Room 705 - bedside socket",
    reportedOn: "2026-05-28 12:10",
    urgency: "Low",
    status: "Closed",
    contactMode: "Email",
    remarks: "Guest declined courier - asked us to dispose. Item not located.",
    estValue: 3200,
    hvi: false,
    timeline: [
      { ts: "May 28 · 12:10", label: "Report filed", detail: "Reported after landing in Singapore" },
      { ts: "May 28 · 14:00", label: "Room searched", detail: "Not located in 705 or HK turnover" },
      { ts: "May 30 · 10:00", label: "Guest declined courier", detail: "Asked to close case - low value" },
      { ts: "May 30 · 10:05", label: "Closed", detail: "Marked Not found / Closed" },
    ],
    matches: [],
  },
  {
    id: "lr8",
    reportNo: "LR/2026/0084",
    guest: "Mr. Arjun Reddy",
    phone: "+91 99123 55667",
    email: "arjun.reddy@example.com",
    isWalkIn: false,
    room: "210",
    stayFrom: "26 May",
    stayTo: "27 May",
    itemCategory: "Bag / Luggage",
    itemName: "Black leather wallet",
    brand: "Hidesign",
    color: "Black",
    description: "Hidesign bifold wallet, contains driving licence, 3 credit cards, ~Rs 4,500 cash.",
    identification: "Driving Licence: TS09 20XXXXXX",
    hasPhoto: true,
    lostDate: "2026-05-27",
    lostTime: "13:45",
    lastSeen: "Coffee Lounge - sofa near window",
    reportedOn: "2026-05-27 15:00",
    urgency: "High",
    status: "Not found",
    contactMode: "WhatsApp",
    remarks: "All cards blocked by guest. Police FIR copy attached.",
    estValue: 8500,
    hvi: false,
    timeline: [
      { ts: "May 27 · 15:00", label: "Report filed", detail: "Guest noticed missing during checkout" },
      { ts: "May 27 · 15:30", label: "Lounge searched", detail: "Sofa, cushions, lost-bin checked - nil" },
      { ts: "May 28 · 11:00", label: "Camera review", detail: "CCTV reviewed 13:00-14:30 - inconclusive" },
      { ts: "May 30 · 16:00", label: "Marked Not found", detail: "FIR copy filed with police" },
    ],
    matches: [],
  },
  {
    id: "lr9",
    reportNo: "LR/2026/0083",
    guest: "Mrs. Latha Subramanian",
    phone: "+91 94445 22113",
    email: "latha.s@example.com",
    isWalkIn: false,
    room: "615",
    stayFrom: "24 May",
    stayTo: "26 May",
    itemCategory: "Jewellery",
    itemName: "Pearl earring (single)",
    color: "White",
    description: "Single south-sea pearl earring with gold post. Matching pair - other one with guest.",
    identification: "Matches guest's left ear - photo provided",
    hasPhoto: true,
    lostDate: "2026-05-26",
    lostTime: "20:00",
    lastSeen: "Room 615 / Spa massage room 2",
    reportedOn: "2026-05-26 22:00",
    urgency: "Medium",
    status: "Searching",
    contactMode: "WhatsApp",
    remarks: "Spa towels & linen still being sieved.",
    estValue: 32000,
    hvi: true,
    timeline: [
      { ts: "May 26 · 22:00", label: "Report filed", detail: "Reported post-spa session" },
      { ts: "May 26 · 22:30", label: "Spa searched", detail: "Massage room 2, towel basket - nil" },
      { ts: "May 27 · 09:00", label: "Linen sieve", detail: "All spa linen being hand-sieved" },
    ],
    matches: [],
  },
  {
    id: "lr10",
    reportNo: "LR/2026/0082",
    guest: "Walk-in: Mr. Faisal Khan",
    phone: "+91 98300 44556",
    email: "faisal.k@example.com",
    isWalkIn: true,
    itemCategory: "Documents",
    itemName: "Conference badge & cards",
    color: "Multicolour",
    description: "Lanyard with conference badge, 6 business cards, hotel key envelope (no key).",
    hasPhoto: false,
    lostDate: "2026-05-26",
    lostTime: "18:00",
    lastSeen: "Sapphire Hall - Tech Summit",
    reportedOn: "2026-05-27 09:00",
    urgency: "Low",
    status: "Reported",
    contactMode: "Email",
    remarks: "Day-delegate. Will pick up if found.",
    estValue: 0,
    hvi: false,
    timeline: [
      { ts: "May 27 · 09:00", label: "Report filed", detail: "Emailed conference organiser" },
      { ts: "May 27 · 09:20", label: "Banquet alerted", detail: "Sapphire Hall team to check post-event" },
    ],
    matches: [],
  },
];

const STATUS_FILTERS: { key: ReportStatus | "All"; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Reported", label: "Reported" },
  { key: "Searching", label: "Searching" },
  { key: "Possible match", label: "Possible match" },
  { key: "Verification pending", label: "Verif. pending" },
  { key: "Verified", label: "Verified" },
  { key: "Returned", label: "Returned" },
  { key: "Not found", label: "Not found" },
  { key: "Closed", label: "Closed" },
];

const URGENCY_FILTERS: (Urgency | "All")[] = ["All", "Low", "Medium", "High", "Urgent"];

const CATEGORIES = [
  "Jewellery",
  "Electronics",
  "Documents",
  "Accessories",
  "Personal / Sentimental",
  "Clothing",
  "Bag / Luggage",
  "Cash / Cards",
  "Other",
];

const EXISTING_GUESTS = [
  { id: "g1", name: "Mr. Rohit Sharma", room: "508", phone: "+91 98201 22334", stayFrom: "28 May", stayTo: "01 Jun" },
  { id: "g2", name: "Ms. Anjali Iyer", room: "302", phone: "+91 99102 88774", stayFrom: "30 May", stayTo: "02 Jun" },
  { id: "g3", name: "Mr. Karan Mehta", room: "121", phone: "+91 98765 43210", stayFrom: "29 May", stayTo: "03 Jun" },
  { id: "g4", name: "Mrs. Priya Krishnan", room: "412", phone: "+91 99887 66554", stayFrom: "27 May", stayTo: "30 May" },
];

export default function LostReportsTab({ onToast }: { onToast: (m: string) => void }) {
  const [reports, setReports] = React.useState<Report[]>(SEED);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<ReportStatus | "All">("All");
  const [urgency, setUrgency] = React.useState<Urgency | "All">("All");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [openReport, setOpenReport] = React.useState<Report | null>(null);
  const [showNewModal, setShowNewModal] = React.useState(false);

  // New report form
  const [guestMode, setGuestMode] = React.useState<"existing" | "walkin">("existing");
  const [selectedGuestId, setSelectedGuestId] = React.useState("g1");
  const [walkinName, setWalkinName] = React.useState("");
  const [walkinPhone, setWalkinPhone] = React.useState("");
  const [walkinEmail, setWalkinEmail] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("Jewellery");
  const [newItem, setNewItem] = React.useState("");
  const [newBrand, setNewBrand] = React.useState("");
  const [newColor, setNewColor] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newIdent, setNewIdent] = React.useState("");
  const [newLostDate, setNewLostDate] = React.useState("2026-06-02");
  const [newLostTime, setNewLostTime] = React.useState("12:00");
  const [newLocation, setNewLocation] = React.useState("");
  const [newUrgency, setNewUrgency] = React.useState<Urgency>("Medium");
  const [newContact, setNewContact] = React.useState<ContactMode>("WhatsApp");
  const [newRemarks, setNewRemarks] = React.useState("");

  const filtered = reports.filter((r) => {
    if (status !== "All" && r.status !== status) return false;
    if (urgency !== "All" && r.urgency !== urgency) return false;
    if (dateFrom && r.lostDate < dateFrom) return false;
    if (dateTo && r.lostDate > dateTo) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${r.reportNo} ${r.guest} ${r.phone} ${r.itemName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const distrib = {
    Reported: reports.filter((r) => r.status === "Reported").length,
    Searching: reports.filter((r) => r.status === "Searching").length,
    Match: reports.filter((r) => r.status === "Possible match").length,
    Returned: reports.filter((r) => r.status === "Returned").length,
    NotFound: reports.filter((r) => r.status === "Not found").length,
  };

  const resetForm = () => {
    setGuestMode("existing");
    setSelectedGuestId("g1");
    setWalkinName("");
    setWalkinPhone("");
    setWalkinEmail("");
    setNewCategory("Jewellery");
    setNewItem("");
    setNewBrand("");
    setNewColor("");
    setNewDesc("");
    setNewIdent("");
    setNewLostDate("2026-06-02");
    setNewLostTime("12:00");
    setNewLocation("");
    setNewUrgency("Medium");
    setNewContact("WhatsApp");
    setNewRemarks("");
  };

  const submitNew = () => {
    if (!newItem.trim()) {
      onToast("Please enter an item name");
      return;
    }
    if (guestMode === "walkin" && !walkinName.trim()) {
      onToast("Please enter walk-in guest name");
      return;
    }
    const guestInfo = guestMode === "existing"
      ? EXISTING_GUESTS.find((g) => g.id === selectedGuestId) || EXISTING_GUESTS[0]
      : null;

    const nextNo = `LR/2026/0${92 + reports.length - SEED.length}`;
    const rec: Report = {
      id: `lrn-${Date.now()}`,
      reportNo: nextNo,
      guest: guestMode === "existing" ? guestInfo!.name : `Walk-in: ${walkinName}`,
      phone: guestMode === "existing" ? guestInfo!.phone : walkinPhone,
      email: guestMode === "existing" ? "" : walkinEmail,
      isWalkIn: guestMode === "walkin",
      room: guestMode === "existing" ? guestInfo!.room : undefined,
      stayFrom: guestMode === "existing" ? guestInfo!.stayFrom : undefined,
      stayTo: guestMode === "existing" ? guestInfo!.stayTo : undefined,
      itemCategory: newCategory,
      itemName: newItem,
      brand: newBrand || undefined,
      color: newColor || undefined,
      description: newDesc,
      identification: newIdent || undefined,
      hasPhoto: false,
      lostDate: newLostDate,
      lostTime: newLostTime,
      lastSeen: newLocation || "Unspecified",
      reportedOn: "2026-06-02 12:00",
      urgency: newUrgency,
      status: "Reported",
      contactMode: newContact,
      remarks: newRemarks || undefined,
      timeline: [
        { ts: "Jun 02 · 12:00", label: "Report filed", detail: "Logged at Front Desk" },
        { ts: "Jun 02 · 12:01", label: "HK notified", detail: "Housekeeping team alerted via SMS" },
      ],
      matches: [],
    };
    setReports([rec, ...reports]);
    setShowNewModal(false);
    resetForm();
    onToast(`Report received - ${nextNo} - Housekeeping notified`);
  };

  const updateStatus = (id: string, next: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
    if (openReport?.id === id) setOpenReport({ ...openReport, status: next });
  };

  return (
    <div className="space-y-4">
      {/* Status distribution strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiMini
          label="Reported"
          value={distrib.Reported}
          icon={<FileText className="h-4 w-4" />}
          tone="warning"
        />
        <KpiMini
          label="Searching"
          value={distrib.Searching}
          icon={<Search className="h-4 w-4" />}
          tone="info"
        />
        <KpiMini
          label="Possible match"
          value={distrib.Match}
          icon={<Sparkles className="h-4 w-4" />}
          tone="accent"
        />
        <KpiMini
          label="Returned"
          value={distrib.Returned}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <KpiMini
          label="Not found"
          value={distrib.NotFound}
          icon={<XCircle className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      {/* Toolbar */}
      <Card className="p-3 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by report#, guest name or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Lost between</span>
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
            <Select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency | "All")}
              className="h-9 w-[140px] text-sm"
            >
              {URGENCY_FILTERS.map((u) => (
                <option key={u} value={u}>
                  Urgency: {u}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowNewModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              New lost report
            </Button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => {
            const active = status === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  active
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Reports table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase text-muted-foreground tracking-wider">
                <th className="px-4 py-2.5 font-medium">Report #</th>
                <th className="px-4 py-2.5 font-medium">Guest</th>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium">Last seen</th>
                <th className="px-4 py-2.5 font-medium">Lost</th>
                <th className="px-4 py-2.5 font-medium">Stay</th>
                <th className="px-4 py-2.5 font-medium">Urgency</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-surface-sunken/30 cursor-pointer"
                  onClick={() => setOpenReport(r)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular text-foreground">{r.reportNo}</span>
                      {r.hvi && (
                        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-linear-to-br from-amber-400 to-orange-500 text-white">
                          HVI
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {r.reportedOn}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.guest}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span className="tabular">{r.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1 max-w-[200px]">
                      {r.itemName}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {r.itemCategory}
                      {r.brand ? ` · ${r.brand}` : ""}
                      {r.color ? ` · ${r.color}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-foreground">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs line-clamp-1 max-w-[160px]">{r.lastSeen}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs tabular text-foreground">
                    <div>{r.lostDate}</div>
                    <div className="text-muted-foreground">{r.lostTime}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.isWalkIn ? (
                      <span className="text-muted-foreground italic">Walk-in</span>
                    ) : (
                      <>
                        <div className="text-foreground">{r.stayFrom} - {r.stayTo}</div>
                        <div className="text-muted-foreground">Room {r.room}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={URGENCY_TONE[r.urgency]}>
                      {r.urgency === "Urgent" && <AlertTriangle className="h-3 w-3" />}
                      {r.urgency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenReport(r)}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToast(`Searching found items for ${r.reportNo}`)}
                        title="Search found items"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateStatus(r.id, "Verified");
                          onToast(`Marked ${r.reportNo} as found - verification queued`);
                        }}
                        title="Mark as found"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToast(`Contacting ${r.guest} via ${r.contactMode}`)}
                        title="Contact guest"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateStatus(r.id, "Closed");
                          onToast(`Report ${r.reportNo} closed`);
                        }}
                        title="Close"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No lost reports match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Drawer */}
      {openReport && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
          onClick={() => setOpenReport(null)}
        >
          <Card
            className="w-full max-w-xl overflow-y-auto rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold tabular text-foreground">
                      {openReport.reportNo}
                    </span>
                    {openReport.hvi && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-linear-to-br from-amber-400 to-orange-500 text-white">
                        High-value
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[openReport.status]}>{openReport.status}</Badge>
                    <Badge tone={URGENCY_TONE[openReport.urgency]}>
                      {openReport.urgency === "Urgent" && <AlertTriangle className="h-3 w-3" />}
                      {openReport.urgency}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOpenReport(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Item details */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Item details
                </div>
                <div className="flex gap-3">
                  <div className="h-24 w-24 rounded-md bg-surface-sunken border border-border flex items-center justify-center shrink-0">
                    {openReport.hasPhoto ? (
                      <Camera className="h-7 w-7 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-foreground">{openReport.itemName}</div>
                    <div className="text-xs text-muted-foreground">
                      {openReport.itemCategory}
                      {openReport.brand ? ` · ${openReport.brand}` : ""}
                      {openReport.color ? ` · ${openReport.color}` : ""}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {openReport.description}
                    </p>
                    {openReport.identification && (
                      <div className="text-[11px] text-foreground/70 mt-1 p-1.5 bg-surface-sunken rounded">
                        <span className="font-medium">ID marks:</span> {openReport.identification}
                      </div>
                    )}
                    {typeof openReport.estValue === "number" && openReport.estValue > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Est. value:{" "}
                        <span className="tabular font-medium text-foreground">
                          {money(openReport.estValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Incident */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Lost incident
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-muted-foreground">Lost date / time</div>
                      <div className="text-foreground tabular font-medium">
                        {openReport.lostDate} · {openReport.lostTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-muted-foreground">Last seen at</div>
                      <div className="text-foreground font-medium">{openReport.lastSeen}</div>
                    </div>
                  </div>
                </div>
                {openReport.remarks && (
                  <div className="text-xs text-foreground/80 p-2 bg-surface-sunken rounded">
                    <span className="font-medium">Remarks:</span> {openReport.remarks}
                  </div>
                )}
              </section>

              {/* Guest mini-card */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Guest profile
                </div>
                <div className="p-3 bg-surface-sunken rounded-md space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-soft text-brand-soft-foreground flex items-center justify-center font-semibold text-sm">
                      {openReport.guest
                        .replace("Walk-in:", "")
                        .trim()
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm">{openReport.guest}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="tabular">{openReport.phone}</span>
                        {openReport.email && <span>· {openReport.email}</span>}
                      </div>
                    </div>
                  </div>
                  {!openReport.isWalkIn && (
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-border">
                      <div>
                        <div className="text-muted-foreground">Room</div>
                        <div className="font-medium text-foreground tabular">{openReport.room}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Check-in</div>
                        <div className="font-medium text-foreground tabular">{openReport.stayFrom}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Check-out</div>
                        <div className="font-medium text-foreground tabular">{openReport.stayTo}</div>
                      </div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => onToast(`Opening full guest profile for ${openReport.guest}`)}
                  >
                    <User className="h-3.5 w-3.5 mr-1" />
                    View stay history
                  </Button>
                </div>
              </section>

              {/* Activity timeline */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  Activity timeline
                </div>
                <ol className="relative space-y-3 pl-4 border-l border-border">
                  {openReport.timeline.map((t, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-brand ring-4 ring-surface" />
                      <div className="text-[11px] text-muted-foreground tabular">{t.ts}</div>
                      <div className="text-sm font-medium text-foreground">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.detail}</div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Possible matches */}
              {openReport.matches.length > 0 && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Possible matches ({openReport.matches.length})
                  </div>
                  <div className="space-y-2">
                    {openReport.matches.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 border border-border rounded-md flex items-center gap-3"
                      >
                        <div className="h-10 w-10 rounded bg-accent-soft text-accent flex items-center justify-center">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{m.item}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.foundLocation} · {m.foundDate}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-muted-foreground">Match</div>
                          <div className="font-semibold tabular text-accent">{m.confidence}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onToast("Switching to Matching tab")}
                  >
                    Open in Matching tab
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </section>
              )}

              {/* Contact actions */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Contact guest
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToast(`SMS sent to ${openReport.phone}`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    SMS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToast(`WhatsApp opened for ${openReport.guest}`)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToast(`Email drafted to ${openReport.email || openReport.guest}`)}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToast(`Calling ${openReport.phone}`)}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Call
                  </Button>
                </div>
              </section>

              {/* Bottom actions */}
              <section className="pt-3 border-t border-border flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    updateStatus(openReport.id, "Verified");
                    onToast(`${openReport.reportNo} marked as found`);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Mark as found
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateStatus(openReport.id, "Searching");
                    onToast(`${openReport.reportNo} - search reopened`);
                  }}
                >
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Continue search
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToast(`Re-notified HK & F&B for ${openReport.reportNo}`)}
                >
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  Re-notify teams
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateStatus(openReport.id, "Closed");
                    onToast(`${openReport.reportNo} closed`);
                    setOpenReport(null);
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Close report
                </Button>
              </section>
            </div>
          </Card>
        </div>
      )}

      {/* New report modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowNewModal(false)}
        >
          <Card
            className="max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">New lost item report</h3>
                  <p className="text-xs text-muted-foreground">
                    Capture guest, item & incident - HK & F&B teams will be notified
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowNewModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Guest section */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Guest
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestMode("existing")}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      guestMode === "existing"
                        ? "bg-brand-soft border-brand text-brand-soft-foreground"
                        : "bg-surface border-border text-muted-foreground hover:bg-surface-sunken"
                    )}
                  >
                    <Hotel className="h-3.5 w-3.5 inline mr-1.5" />
                    In-house guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestMode("walkin")}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      guestMode === "walkin"
                        ? "bg-brand-soft border-brand text-brand-soft-foreground"
                        : "bg-surface border-border text-muted-foreground hover:bg-surface-sunken"
                    )}
                  >
                    <User className="h-3.5 w-3.5 inline mr-1.5" />
                    Walk-in / visitor
                  </button>
                </div>

                {guestMode === "existing" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Select guest</Label>
                    <Select
                      value={selectedGuestId}
                      onChange={(e) => setSelectedGuestId(e.target.value)}
                    >
                      {EXISTING_GUESTS.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} · Room {g.room} · {g.phone}
                        </option>
                      ))}
                    </Select>
                    {(() => {
                      const g = EXISTING_GUESTS.find((x) => x.id === selectedGuestId);
                      if (!g) return null;
                      return (
                        <div className="grid grid-cols-3 gap-2 p-3 bg-surface-sunken rounded text-xs">
                          <div>
                            <div className="text-muted-foreground">Room</div>
                            <div className="font-medium tabular text-foreground">{g.room}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Check-in</div>
                            <div className="font-medium tabular text-foreground">{g.stayFrom}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Check-out</div>
                            <div className="font-medium tabular text-foreground">{g.stayTo}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Name</Label>
                      <Input
                        placeholder="Full name"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="+91 ..."
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        placeholder="name@email.com"
                        value={walkinEmail}
                        onChange={(e) => setWalkinEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Item details */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Lost item details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Item name</Label>
                    <Input
                      placeholder="e.g. Wedding ring"
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Brand</Label>
                    <Input
                      placeholder="e.g. Tanishq"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input
                      placeholder="e.g. Gold"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Describe the item in detail"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Identification marks</Label>
                    <Input
                      placeholder="Engravings, serial number, scratches, etc."
                      value={newIdent}
                      onChange={(e) => setNewIdent(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Photo</Label>
                    <button
                      type="button"
                      onClick={() => onToast("Photo upload picker opened")}
                      className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken/40 px-3 py-4 text-sm text-muted-foreground hover:bg-surface-sunken"
                    >
                      <Upload className="h-4 w-4" />
                      Upload item photo (JPG / PNG)
                    </button>
                  </div>
                </div>
              </section>

              {/* Incident */}
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Lost incident
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Lost date</Label>
                    <Input
                      type="date"
                      value={newLostDate}
                      onChange={(e) => setNewLostDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lost time</Label>
                    <Input
                      type="time"
                      value={newLostTime}
                      onChange={(e) => setNewLostTime(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Last seen location</Label>
                    <Input
                      placeholder="Room / Restaurant / Pool / Lobby etc."
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Urgency + Contact */}
              <section className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Urgency</Label>
                  <Select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as Urgency)}
                  >
                    {(["Low", "Medium", "High", "Urgent"] as Urgency[]).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Preferred contact</Label>
                  <Select
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value as ContactMode)}
                  >
                    {(["SMS", "WhatsApp", "Email", "Phone call"] as ContactMode[]).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Remarks</Label>
                  <Input
                    placeholder="Any additional notes"
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                  />
                </div>
              </section>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitNew}>
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                  File report
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: ToneType;
}) {
  const toneMap: Record<ToneType, string> = {
    neutral: "bg-surface-sunken text-muted-foreground",
    brand: "bg-brand-soft text-brand-soft-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
            toneMap[tone]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-xl font-bold tabular text-foreground leading-tight">{value}</div>
          <div className="text-[10px] text-muted-foreground">reports</div>
        </div>
      </div>
    </Card>
  );
}
