"use client";
import * as React from "react";
import {
  Search,
  Plus,
  Grid3x3,
  List,
  Filter,
  Star,
  MoreVertical,
  X,
  Camera,
  Upload,
  MapPin,
  Calendar,
  User,
  Package,
  Phone,
  Mail,
  Archive,
  CheckCircle2,
  Trash2,
  Edit3,
  Eye,
  Bell,
  ArrowRightLeft,
  Smartphone,
  Laptop,
  Tablet,
  Wallet,
  Banknote,
  Gem,
  Watch,
  BookOpen,
  Shirt,
  Briefcase,
  Cable,
  Pill,
  FileText,
  Baby,
  SprayCan,
  Key,
  UtensilsCrossed,
  Box,
  Image as ImageIcon,
  Clock,
  IndianRupee,
  Building2,
  ChevronRight,
  ChevronDown,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

type Status = "Waiting" | "Notified" | "Claimed" | "Returned" | "Storage" | "Disposed" | "Donated";
type Category =
  | "Mobile phone"
  | "Laptop"
  | "Tablet"
  | "Wallet"
  | "Cash"
  | "Jewellery"
  | "Watch"
  | "Passport/ID"
  | "Clothes"
  | "Bag/Luggage"
  | "Electronics"
  | "Medicine"
  | "Documents"
  | "Kids items"
  | "Toiletries"
  | "Keys"
  | "Food items"
  | "Miscellaneous";
type Condition = "Like new" | "Good" | "Fair" | "Damaged";

type FoundItem = {
  id: string;
  name: string;
  brand?: string;
  color?: string;
  size?: string;
  qty: number;
  category: Category;
  foundAt: string;
  foundLocation: string;
  foundDate: string;
  foundTime: string;
  foundBy: string;
  staffId: string;
  department: string;
  value: number;
  hvi: boolean;
  condition: Condition;
  description: string;
  storageLocation: string;
  storageShelf: string;
  status: Status;
  daysHeld: number;
  guestName?: string;
  reservation?: string;
  checkIn?: string;
  checkOut?: string;
  contact?: string;
  email?: string;
  remarks?: string;
  timeline: { date: string; text: string }[];
};

const CATEGORIES: Category[] = [
  "Mobile phone",
  "Laptop",
  "Tablet",
  "Wallet",
  "Cash",
  "Jewellery",
  "Watch",
  "Passport/ID",
  "Clothes",
  "Bag/Luggage",
  "Electronics",
  "Medicine",
  "Documents",
  "Kids items",
  "Toiletries",
  "Keys",
  "Food items",
  "Miscellaneous",
];

const STATUS_FILTERS: ("All" | Status)[] = [
  "All",
  "Waiting",
  "Notified",
  "Claimed",
  "Returned",
  "Storage",
  "Disposed",
  "Donated",
];

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  "Mobile phone": Smartphone,
  Laptop: Laptop,
  Tablet: Tablet,
  Wallet: Wallet,
  Cash: Banknote,
  Jewellery: Gem,
  Watch: Watch,
  "Passport/ID": BookOpen,
  Clothes: Shirt,
  "Bag/Luggage": Briefcase,
  Electronics: Cable,
  Medicine: Pill,
  Documents: FileText,
  "Kids items": Baby,
  Toiletries: SprayCan,
  Keys: Key,
  "Food items": UtensilsCrossed,
  Miscellaneous: Box,
};

const STATUS_TONE: Record<Status, "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent"> = {
  Waiting: "warning",
  Notified: "info",
  Claimed: "brand",
  Returned: "success",
  Storage: "neutral",
  Disposed: "danger",
  Donated: "accent",
};

const SEED: FoundItem[] = [
  {
    id: "LF/2026/0421",
    name: "iPhone 15 Pro 256GB",
    brand: "Apple",
    color: "Natural Titanium",
    size: "6.1\"",
    qty: 1,
    category: "Mobile phone",
    foundAt: "Room",
    foundLocation: "Room 412 - Marina Suite",
    foundDate: "2026-05-30",
    foundTime: "11:25",
    foundBy: "Anjali Iyer",
    staffId: "HK-204",
    department: "Housekeeping",
    value: 134900,
    hvi: true,
    condition: "Like new",
    description: "Found on bedside table under newspaper. Passcode locked. Charging cable attached.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 12",
    status: "Notified",
    daysHeld: 3,
    guestName: "Mr. Rohit Sharma",
    reservation: "BK-88241",
    checkIn: "2026-05-27",
    checkOut: "2026-05-30",
    contact: "+91 98201 44521",
    email: "rohit.sharma@hexaworks.in",
    remarks: "Guest contacted via SMS + email. Awaiting courier address confirmation.",
    timeline: [
      { date: "2026-05-30 11:25", text: "Item logged by Anjali Iyer" },
      { date: "2026-05-30 11:40", text: "Moved to Front Desk Safe (HVI)" },
      { date: "2026-05-30 14:10", text: "Guest notified via SMS + email" },
      { date: "2026-06-01 10:00", text: "Reminder sent — awaiting reply" },
    ],
  },
  {
    id: "LF/2026/0420",
    name: "Gold Chain - 22kt 12gm",
    brand: "Tanishq",
    color: "Yellow Gold",
    size: "18 inch",
    qty: 1,
    category: "Jewellery",
    foundAt: "Public area",
    foundLocation: "Spa Locker #14 - Aurora Spa",
    foundDate: "2026-05-29",
    foundTime: "18:50",
    foundBy: "Priya Krishnan",
    staffId: "SPA-019",
    department: "Spa & Wellness",
    value: 78400,
    hvi: true,
    condition: "Like new",
    description: "Tanishq hallmarked chain with small flower pendant. Stored in spa pouch.",
    storageLocation: "Manager Office Safe",
    storageShelf: "Safe B · Slot 03",
    status: "Waiting",
    daysHeld: 4,
    remarks: "No CCTV match yet. Concierge cross-checking spa bookings 28-29 May.",
    timeline: [
      { date: "2026-05-29 18:50", text: "Found in locker post cleaning" },
      { date: "2026-05-29 19:15", text: "Sealed and moved to Manager Safe (HVI)" },
      { date: "2026-05-30 09:30", text: "Spa booking log review started" },
    ],
  },
  {
    id: "LF/2026/0419",
    name: "Asus ROG Strix G16",
    brand: "Asus",
    color: "Eclipse Grey",
    size: "16\" laptop",
    qty: 1,
    category: "Laptop",
    foundAt: "Public area",
    foundLocation: "Crystal Banquet Hall - Stage Left",
    foundDate: "2026-05-28",
    foundTime: "23:10",
    foundBy: "Karan Mehta",
    staffId: "BNQ-077",
    department: "Banquet Ops",
    value: 152000,
    hvi: true,
    condition: "Good",
    description: "Black ROG laptop bag with charger. Hexaworks Pvt Ltd sticker on lid.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 09",
    status: "Returned",
    daysHeld: 5,
    guestName: "Mr. Vivek Agarwal",
    reservation: "EV-71202",
    checkIn: "2026-05-28",
    checkOut: "2026-05-28",
    contact: "+91 99300 22118",
    email: "vivek@hexaworks.in",
    remarks: "Returned in person by guest on 31 May. KYC + signature captured.",
    timeline: [
      { date: "2026-05-28 23:10", text: "Found post AGM event" },
      { date: "2026-05-29 09:00", text: "Event company contacted" },
      { date: "2026-05-30 11:00", text: "Guest verified via ID" },
      { date: "2026-05-31 15:25", text: "Item returned to guest" },
    ],
  },
  {
    id: "LF/2026/0418",
    name: "Marketing Brochure Set",
    brand: "Bajaj Allianz",
    color: "Blue/White",
    size: "A4 x 12 pages",
    qty: 1,
    category: "Documents",
    foundAt: "Public area",
    foundLocation: "Lobby - Sofa near Concierge",
    foundDate: "2026-05-31",
    foundTime: "09:05",
    foundBy: "Meera Nair",
    staffId: "FO-031",
    department: "Front Office",
    value: 0,
    hvi: false,
    condition: "Good",
    description: "Folder with Bajaj Allianz Q2 marketing brochures and contact card of Shruti Pillai.",
    storageLocation: "Front Office Drawer",
    storageShelf: "Drawer 2 · Tray B",
    status: "Waiting",
    daysHeld: 2,
    remarks: "Calling number on contact card.",
    timeline: [
      { date: "2026-05-31 09:05", text: "Item logged" },
      { date: "2026-05-31 10:10", text: "Attempted call to contact card number" },
    ],
  },
  {
    id: "LF/2026/0417",
    name: "Black Leather Wallet",
    brand: "Hidesign",
    color: "Black",
    size: "Bi-fold",
    qty: 1,
    category: "Wallet",
    foundAt: "Public area",
    foundLocation: "Pool Deck - Cabana 04",
    foundDate: "2026-05-30",
    foundTime: "16:40",
    foundBy: "Suresh Patil",
    staffId: "POOL-012",
    department: "Pool & Recreation",
    value: 4800,
    hvi: false,
    condition: "Good",
    description: "Hidesign wallet with ₹3,200 cash, HDFC debit card, Aadhaar copy.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 18",
    status: "Claimed",
    daysHeld: 3,
    guestName: "Mr. Devansh Kapoor",
    reservation: "BK-88195",
    checkIn: "2026-05-28",
    checkOut: "2026-05-31",
    contact: "+91 98765 11231",
    email: "devansh.k@gmail.com",
    remarks: "Guest claimed at front desk. Pickup scheduled tomorrow morning.",
    timeline: [
      { date: "2026-05-30 16:40", text: "Found by pool attendant" },
      { date: "2026-05-30 17:15", text: "Cash sealed and counted: ₹3,200" },
      { date: "2026-05-31 10:20", text: "Guest identified via Aadhaar match" },
      { date: "2026-06-01 18:45", text: "Guest claimed — pickup pending" },
    ],
  },
  {
    id: "LF/2026/0416",
    name: "Rolex Submariner",
    brand: "Rolex",
    color: "Steel/Black",
    size: "40mm",
    qty: 1,
    category: "Watch",
    foundAt: "Room",
    foundLocation: "Room 1208 - Sky Suite",
    foundDate: "2026-05-27",
    foundTime: "10:15",
    foundBy: "Anjali Iyer",
    staffId: "HK-204",
    department: "Housekeeping",
    value: 925000,
    hvi: true,
    condition: "Like new",
    description: "Rolex Submariner in safe drawer. Serial logged. Guest checked out 27 May.",
    storageLocation: "GM Office Vault",
    storageShelf: "Vault 1 · Slot V-02",
    status: "Returned",
    daysHeld: 6,
    guestName: "Mr. Aditya Birla",
    reservation: "BK-88012",
    checkIn: "2026-05-24",
    checkOut: "2026-05-27",
    contact: "+91 98101 99012",
    email: "aditya@birlapvt.in",
    remarks: "Couriered via Blue Dart secured logistics. AWB: BD-882110045.",
    timeline: [
      { date: "2026-05-27 10:15", text: "Found in safe drawer post-checkout" },
      { date: "2026-05-27 11:00", text: "GM informed, moved to vault" },
      { date: "2026-05-27 14:20", text: "Guest reached via PA" },
      { date: "2026-05-29 16:00", text: "Couriered via Blue Dart secured" },
      { date: "2026-05-30 13:45", text: "Delivery confirmed — closed" },
    ],
  },
  {
    id: "LF/2026/0415",
    name: "Indian Passport Z9012345",
    brand: "Govt of India",
    color: "Navy Blue",
    size: "Standard",
    qty: 1,
    category: "Passport/ID",
    foundAt: "Public area",
    foundLocation: "Business Centre - Printer Tray 2",
    foundDate: "2026-05-29",
    foundTime: "20:00",
    foundBy: "Rahul Deshmukh",
    staffId: "BC-008",
    department: "Business Centre",
    value: 0,
    hvi: true,
    condition: "Good",
    description: "Passport of Ms. Sneha Iyer. Found behind printer near outgoing tray.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 22",
    status: "Notified",
    daysHeld: 4,
    guestName: "Ms. Sneha Iyer",
    reservation: "BK-88173",
    checkIn: "2026-05-27",
    checkOut: "2026-05-29",
    contact: "+91 90090 33421",
    email: "sneha.iyer@bcgindia.com",
    remarks: "Guest flying out from Mumbai 2 Jun. Urgent — DG informed.",
    timeline: [
      { date: "2026-05-29 20:00", text: "Found behind business centre printer" },
      { date: "2026-05-29 20:25", text: "Sealed, moved to FD safe" },
      { date: "2026-05-30 08:00", text: "Guest contacted — urgent flight 2 Jun" },
      { date: "2026-05-31 11:00", text: "Awaiting authorised pickup" },
    ],
  },
  {
    id: "LF/2026/0414",
    name: "Kids Plush Elephant",
    brand: "Hamleys",
    color: "Pink",
    size: "Medium",
    qty: 1,
    category: "Kids items",
    foundAt: "Public area",
    foundLocation: "Kids Play Zone - Ball Pit",
    foundDate: "2026-05-30",
    foundTime: "19:30",
    foundBy: "Latha Rao",
    staffId: "REC-022",
    department: "Recreation",
    value: 1400,
    hvi: false,
    condition: "Good",
    description: "Pink plush elephant with name tag 'Aarav' stitched inside.",
    storageLocation: "Recreation Office",
    storageShelf: "Cabinet 1 · Shelf B",
    status: "Waiting",
    daysHeld: 3,
    remarks: "Cross-checking 30 May kids zone register for parent contact.",
    timeline: [
      { date: "2026-05-30 19:30", text: "Found post evening play session" },
      { date: "2026-05-31 10:00", text: "Register check initiated" },
    ],
  },
  {
    id: "LF/2026/0413",
    name: "Prescription Medicine Pouch",
    brand: "Apollo Pharmacy",
    color: "White",
    size: "Small",
    qty: 1,
    category: "Medicine",
    foundAt: "Room",
    foundLocation: "Room 305 - Marina Deluxe",
    foundDate: "2026-05-31",
    foundTime: "12:15",
    foundBy: "Priya Krishnan",
    staffId: "HK-201",
    department: "Housekeeping",
    value: 2200,
    hvi: false,
    condition: "Good",
    description: "Pouch with Telmisartan + Metformin strips and prescription Rx slip.",
    storageLocation: "Front Desk Locker",
    storageShelf: "Locker C · Slot 11",
    status: "Notified",
    daysHeld: 2,
    guestName: "Mr. Suresh Iyer",
    reservation: "BK-88231",
    checkIn: "2026-05-29",
    checkOut: "2026-05-31",
    contact: "+91 99220 11005",
    email: "suresh.iyer@outlook.com",
    remarks: "Time-sensitive. Guest residing in Pune — Dunzo dispatch arranged.",
    timeline: [
      { date: "2026-05-31 12:15", text: "Found in bathroom shelf post-checkout" },
      { date: "2026-05-31 12:45", text: "Guest notified — time-sensitive" },
      { date: "2026-06-01 11:00", text: "Dunzo dispatch arranged to Pune" },
    ],
  },
  {
    id: "LF/2026/0412",
    name: "Samsung Galaxy Tab S9",
    brand: "Samsung",
    color: "Graphite",
    size: "11\"",
    qty: 1,
    category: "Tablet",
    foundAt: "Public area",
    foundLocation: "Marina Café - Window seat 6",
    foundDate: "2026-05-28",
    foundTime: "15:45",
    foundBy: "Kavita Joshi",
    staffId: "FB-053",
    department: "F&B",
    value: 68900,
    hvi: true,
    condition: "Good",
    description: "Graphite Samsung tablet with grey folio case. PIN locked.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 14",
    status: "Storage",
    daysHeld: 5,
    remarks: "30-day storage policy. No claimant yet.",
    timeline: [
      { date: "2026-05-28 15:45", text: "Found on café window seat" },
      { date: "2026-05-28 16:20", text: "Moved to FD safe (HVI)" },
      { date: "2026-05-30 10:00", text: "POS scan: 6 guests dined that hour — all contacted, no match" },
    ],
  },
  {
    id: "LF/2026/0411",
    name: "Welspun Bath Robe",
    brand: "Welspun",
    color: "Ivory",
    size: "L",
    qty: 1,
    category: "Clothes",
    foundAt: "Room",
    foundLocation: "Room 207 - Garden Wing",
    foundDate: "2026-05-26",
    foundTime: "11:00",
    foundBy: "Anjali Iyer",
    staffId: "HK-204",
    department: "Housekeeping",
    value: 3200,
    hvi: false,
    condition: "Like new",
    description: "Hotel-issue Welspun robe. Found packed in guest suitcase area — likely accidentally packed.",
    storageLocation: "Linen Room",
    storageShelf: "Rack 4 · Bay 2",
    status: "Donated",
    daysHeld: 7,
    remarks: "After 30-day hold, donated to Akshaya Trust Mumbai.",
    timeline: [
      { date: "2026-05-26 11:00", text: "Found in room" },
      { date: "2026-05-26 12:00", text: "Linen room logged" },
      { date: "2026-06-02 14:00", text: "Donated to Akshaya Trust" },
    ],
  },
  {
    id: "LF/2026/0410",
    name: "Sony WH-1000XM5 Headphones",
    brand: "Sony",
    color: "Silver",
    size: "Over-ear",
    qty: 1,
    category: "Electronics",
    foundAt: "Public area",
    foundLocation: "Fitness Studio - Treadmill 3",
    foundDate: "2026-05-31",
    foundTime: "07:50",
    foundBy: "Manoj Pillai",
    staffId: "GYM-014",
    department: "Recreation",
    value: 28900,
    hvi: false,
    condition: "Like new",
    description: "Silver Sony noise-cancelling headphones in carry case.",
    storageLocation: "Front Desk Locker",
    storageShelf: "Locker C · Slot 04",
    status: "Waiting",
    daysHeld: 2,
    remarks: "Gym log scanned. Awaiting guest reach-out.",
    timeline: [
      { date: "2026-05-31 07:50", text: "Found in fitness studio" },
      { date: "2026-05-31 08:30", text: "Locker stored" },
    ],
  },
  {
    id: "LF/2026/0409",
    name: "Cash - Indian Rupees",
    brand: "RBI",
    color: "Mixed denomination",
    size: "Bundle",
    qty: 14,
    category: "Cash",
    foundAt: "Public area",
    foundLocation: "Banquet Pre-function Area - Floor",
    foundDate: "2026-05-25",
    foundTime: "23:55",
    foundBy: "Karan Mehta",
    staffId: "BNQ-077",
    department: "Banquet Ops",
    value: 14000,
    hvi: true,
    condition: "Good",
    description: "Bundle of 14 x ₹1,000 notes wrapped in blue rubber band. Sealed witnessed.",
    storageLocation: "GM Office Vault",
    storageShelf: "Vault 1 · Slot V-08",
    status: "Storage",
    daysHeld: 8,
    remarks: "Sealed in tamper-proof envelope. 90-day hold per cash policy.",
    timeline: [
      { date: "2026-05-25 23:55", text: "Found post wedding reception" },
      { date: "2026-05-26 00:10", text: "Counted with FOM + Security witness" },
      { date: "2026-05-26 00:35", text: "Sealed and moved to GM vault" },
    ],
  },
  {
    id: "LF/2026/0408",
    name: "Tumi Carry-on Suitcase",
    brand: "Tumi",
    color: "Charcoal",
    size: "20\" cabin",
    qty: 1,
    category: "Bag/Luggage",
    foundAt: "Public area",
    foundLocation: "Lobby - Bell Desk Storage",
    foundDate: "2026-05-30",
    foundTime: "13:20",
    foundBy: "Ramesh Yadav",
    staffId: "BELL-009",
    department: "Bell Desk",
    value: 42000,
    hvi: true,
    condition: "Good",
    description: "Charcoal Tumi cabin suitcase. Luggage tag torn off. Lock TSA-coded.",
    storageLocation: "Bell Desk Secure Cage",
    storageShelf: "Cage 1 · Bay A",
    status: "Notified",
    daysHeld: 3,
    guestName: "Ms. Anaya Singh",
    reservation: "BK-88254",
    checkIn: "2026-05-29",
    checkOut: "2026-05-30",
    contact: "+91 99876 32109",
    email: "anaya.s@infomgr.in",
    remarks: "Guest realised on landing in Delhi. Return courier being arranged.",
    timeline: [
      { date: "2026-05-30 13:20", text: "Found unattended at bell desk" },
      { date: "2026-05-30 14:00", text: "Tagged and logged" },
      { date: "2026-05-30 18:30", text: "Guest contacted — confirmed ownership" },
    ],
  },
  {
    id: "LF/2026/0407",
    name: "Maruti Car Key Fob",
    brand: "Maruti Suzuki",
    color: "Black",
    size: "Standard fob",
    qty: 1,
    category: "Keys",
    foundAt: "Public area",
    foundLocation: "Valet Parking - Drop zone B",
    foundDate: "2026-05-31",
    foundTime: "21:10",
    foundBy: "Sandeep Kumar",
    staffId: "VAL-017",
    department: "Valet",
    value: 8500,
    hvi: false,
    condition: "Good",
    description: "Maruti Brezza key fob with red 'Hanuman' keychain. No plate match in valet log.",
    storageLocation: "Valet Office Cabinet",
    storageShelf: "Cabinet 2 · Hook 11",
    status: "Waiting",
    daysHeld: 1,
    remarks: "Checking with security CCTV for the time window.",
    timeline: [
      { date: "2026-05-31 21:10", text: "Found at valet drop zone" },
      { date: "2026-06-01 09:00", text: "CCTV review scheduled" },
    ],
  },
  {
    id: "LF/2026/0406",
    name: "Half-eaten Tiffin Box",
    brand: "Milton",
    color: "Steel",
    size: "3 compartment",
    qty: 1,
    category: "Food items",
    foundAt: "Public area",
    foundLocation: "Conference Hall 3 - Table 7",
    foundDate: "2026-05-24",
    foundTime: "18:00",
    foundBy: "Vidya Kulkarni",
    staffId: "FB-061",
    department: "F&B",
    value: 600,
    hvi: false,
    condition: "Fair",
    description: "Milton steel tiffin with leftover rotis. Disposed per food safety SOP after 24h.",
    storageLocation: "F&B Pantry (initial)",
    storageShelf: "—",
    status: "Disposed",
    daysHeld: 1,
    remarks: "Disposed per F&B SOP — perishable item.",
    timeline: [
      { date: "2026-05-24 18:00", text: "Found post conference" },
      { date: "2026-05-25 19:00", text: "Disposed — 24h perishable rule" },
    ],
  },
  {
    id: "LF/2026/0405",
    name: "Cartier Reading Glasses",
    brand: "Cartier",
    color: "Tortoise",
    size: "Medium frame",
    qty: 1,
    category: "Miscellaneous",
    foundAt: "Room",
    foundLocation: "Room 909 - Executive Suite",
    foundDate: "2026-05-29",
    foundTime: "10:50",
    foundBy: "Anjali Iyer",
    staffId: "HK-204",
    department: "Housekeeping",
    value: 54000,
    hvi: true,
    condition: "Like new",
    description: "Cartier tortoise frame in original case. Found on writing desk.",
    storageLocation: "Front Desk Safe",
    storageShelf: "Safe A · Slot 06",
    status: "Returned",
    daysHeld: 4,
    guestName: "Dr. Meera Sundaram",
    reservation: "BK-88102",
    checkIn: "2026-05-27",
    checkOut: "2026-05-29",
    contact: "+91 98450 21167",
    email: "meera.s@apolloblr.in",
    remarks: "Handed over to concierge of next hotel (ITC Bengaluru) via courier.",
    timeline: [
      { date: "2026-05-29 10:50", text: "Found post-checkout" },
      { date: "2026-05-29 13:00", text: "Guest reached at next hotel" },
      { date: "2026-06-01 17:30", text: "Couriered — confirmed received" },
    ],
  },
  {
    id: "LF/2026/0404",
    name: "Forest Essentials Toiletry Kit",
    brand: "Forest Essentials",
    color: "Brown pouch",
    size: "Travel",
    qty: 1,
    category: "Toiletries",
    foundAt: "Room",
    foundLocation: "Room 614 - Premium Deluxe",
    foundDate: "2026-05-30",
    foundTime: "11:30",
    foundBy: "Priya Krishnan",
    staffId: "HK-201",
    department: "Housekeeping",
    value: 4500,
    hvi: false,
    condition: "Good",
    description: "Forest Essentials travel kit — body lotion, face wash, perfume oil.",
    storageLocation: "Housekeeping Lost Bin",
    storageShelf: "Bin 3 · Slot 7",
    status: "Waiting",
    daysHeld: 3,
    remarks: "Standard 30-day hold then donate.",
    timeline: [
      { date: "2026-05-30 11:30", text: "Found in bathroom shelf" },
      { date: "2026-05-30 12:00", text: "Stored in HK lost bin" },
    ],
  },
];

function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FoundItemsTab({ onToast }: { onToast: (m: string) => void }) {
  const [items] = React.useState<FoundItem[]>(SEED);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"All" | Status>("All");
  const [categoryFilter, setCategoryFilter] = React.useState<"All" | Category>("All");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selected, setSelected] = React.useState<FoundItem | null>(null);
  const [registerOpen, setRegisterOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return items.filter((it) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !it.name.toLowerCase().includes(q) &&
          !it.id.toLowerCase().includes(q) &&
          !it.foundLocation.toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter !== "All" && it.status !== statusFilter) return false;
      if (categoryFilter !== "All" && it.category !== categoryFilter) return false;
      if (dateFrom && it.foundDate < dateFrom) return false;
      if (dateTo && it.foundDate > dateTo) return false;
      return true;
    });
  }, [items, search, statusFilter, categoryFilter, dateFrom, dateTo]);

  const totalValue = filtered.reduce((s, i) => s + i.value, 0);
  const hviCount = filtered.filter((i) => i.hvi).length;
  const waitingCount = filtered.filter((i) => i.status === "Waiting").length;
  const returnedCount = filtered.filter((i) => i.status === "Returned" || i.status === "Claimed").length;

  return (
    <div className="space-y-4">
      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center">
              <Package className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Items in log</div>
              <div className="text-xl font-semibold tabular">{filtered.length}</div>
              <div className="text-xs text-muted-foreground">filtered view</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-warning-soft text-warning flex items-center justify-center">
              <Clock className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Awaiting claim</div>
              <div className="text-xl font-semibold tabular">{waitingCount}</div>
              <div className="text-xs text-muted-foreground">Waiting status</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-success-soft text-success flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Returned/Claimed</div>
              <div className="text-xl font-semibold tabular">{returnedCount}</div>
              <div className="text-xs text-muted-foreground">resolved cases</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-md bg-linear-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
              <Star className="size-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">HVI value held</div>
              <div className="text-xl font-semibold tabular">{money(totalValue)}</div>
              <div className="text-xs text-muted-foreground">{hviCount} high-value items</div>
            </div>
          </div>
        </Card>
      </div>

      {/* TOOLBAR */}
      <Card className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, location..."
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "All" | Category)}
            className="w-48"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "h-8 px-3 text-xs inline-flex items-center gap-1.5 transition-colors",
                  view === "grid" ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground hover:bg-surface-sunken"
                )}
              >
                <Grid3x3 className="size-3.5" /> Grid
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "h-8 px-3 text-xs inline-flex items-center gap-1.5 transition-colors border-l border-border",
                  view === "list" ? "bg-brand text-brand-foreground" : "bg-surface text-muted-foreground hover:bg-surface-sunken"
                )}
              >
                <List className="size-3.5" /> List
              </button>
            </div>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="size-4" /> Register found item
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground mr-1" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "bg-surface-sunken text-muted-foreground hover:bg-surface-sunken/70"
              )}
            >
              {s}
              {s !== "All" && (
                <span className="ml-1.5 tabular opacity-70">
                  {items.filter((i) => i.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* CONTENT */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Box className="size-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-medium">No found items match these filters</div>
          <div className="text-sm text-muted-foreground mt-1">Try clearing filters or registering a new item.</div>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((it) => {
            const Icon = CATEGORY_ICON[it.category];
            return (
              <Card
                key={it.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => setSelected(it)}
              >
                {/* photo area */}
                <div
                  className={cn(
                    "relative h-32 flex items-center justify-center",
                    it.hvi
                      ? "bg-linear-to-br from-amber-400 to-orange-500"
                      : "bg-surface-sunken"
                  )}
                >
                  <Icon className={cn("size-10", it.hvi ? "text-white" : "text-muted-foreground")} />
                  {it.hvi && (
                    <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/90 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                      <Star className="size-3 fill-amber-500 text-amber-500" /> HVI
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToast(`Actions menu opened for ${it.id}`);
                    }}
                    className="absolute top-2 right-2 size-7 rounded-md bg-white/90 text-foreground inline-flex items-center justify-center hover:bg-white"
                  >
                    <MoreVertical className="size-3.5" />
                  </button>
                  <Badge tone={STATUS_TONE[it.status]} className="absolute bottom-2 left-2">
                    {it.status}
                  </Badge>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <div className="font-medium text-sm leading-tight line-clamp-1">{it.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {[it.brand, it.color, it.size].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="size-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{it.foundLocation}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="size-3" /> {fmtDate(it.foundDate)}
                    </span>
                    <span className="tabular font-medium">{money(it.value)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5 flex justify-between">
                    <span>{it.id}</span>
                    <span>{it.daysHeld}d held</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/40">
                <tr className="text-[10px] uppercase text-muted-foreground">
                  <th className="text-left py-2.5 px-3 font-medium">Photo</th>
                  <th className="text-left py-2.5 px-3 font-medium">ID</th>
                  <th className="text-left py-2.5 px-3 font-medium">Item</th>
                  <th className="text-left py-2.5 px-3 font-medium">Category</th>
                  <th className="text-left py-2.5 px-3 font-medium">Found at</th>
                  <th className="text-left py-2.5 px-3 font-medium">Found by</th>
                  <th className="text-left py-2.5 px-3 font-medium">Storage</th>
                  <th className="text-right py-2.5 px-3 font-medium">Value</th>
                  <th className="text-left py-2.5 px-3 font-medium">Status</th>
                  <th className="text-right py-2.5 px-3 font-medium">Days</th>
                  <th className="text-right py-2.5 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const Icon = CATEGORY_ICON[it.category];
                  return (
                    <tr
                      key={it.id}
                      onClick={() => setSelected(it)}
                      className="border-t border-border hover:bg-surface-sunken/40 cursor-pointer"
                    >
                      <td className="py-2 px-3">
                        <div
                          className={cn(
                            "size-9 rounded-md flex items-center justify-center",
                            it.hvi
                              ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                              : "bg-surface-sunken text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                      </td>
                      <td className="py-2 px-3 tabular text-xs">{it.id}</td>
                      <td className="py-2 px-3">
                        <div className="font-medium leading-tight flex items-center gap-1.5">
                          {it.name}
                          {it.hvi && <Star className="size-3 fill-amber-500 text-amber-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[it.brand, it.color].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs">{it.category}</td>
                      <td className="py-2 px-3 text-xs">
                        <div className="line-clamp-1 max-w-[220px]">{it.foundLocation}</div>
                        <div className="text-muted-foreground">{fmtDate(it.foundDate)}</div>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <div>{it.foundBy}</div>
                        <div className="text-muted-foreground">{it.department}</div>
                      </td>
                      <td className="py-2 px-3 text-xs">{it.storageLocation}</td>
                      <td className="py-2 px-3 text-right tabular text-xs font-medium">
                        {money(it.value)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge tone={STATUS_TONE[it.status]}>{it.status}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right tabular text-xs">{it.daysHeld}d</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToast(`Actions menu opened for ${it.id}`);
                          }}
                          className="size-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DETAIL DRAWER */}
      {selected && (
        <DetailDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onAction={(label) => {
            onToast(`${label} · ${selected.id}`);
            setSelected(null);
          }}
        />
      )}

      {/* REGISTER MODAL */}
      {registerOpen && (
        <RegisterModal
          onClose={() => setRegisterOpen(false)}
          onSubmit={() => {
            const next = `LF/2026/04${22 + items.length - SEED.length}`;
            onToast(`Item registered · ID generated ${next}`);
            setRegisterOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────  DETAIL DRAWER  ───────────── */

function DetailDrawer({
  item,
  onClose,
  onAction,
}: {
  item: FoundItem;
  onClose: () => void;
  onAction: (label: string) => void;
}) {
  const Icon = CATEGORY_ICON[item.category];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch justify-end"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl overflow-y-auto rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
              {item.hvi && (
                <span className="inline-flex items-center gap-1 bg-linear-to-br from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  <Star className="size-3 fill-white text-white" /> HVI
                </span>
              )}
              <span className="text-xs text-muted-foreground tabular">{item.id}</span>
            </div>
            <div className="text-lg font-semibold leading-tight mt-1">{item.name}</div>
            <div className="text-xs text-muted-foreground">
              {[item.brand, item.color, item.size].filter(Boolean).join(" · ")}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* photo gallery 3 */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className={cn(
                "aspect-square rounded-md flex items-center justify-center",
                item.hvi ? "bg-linear-to-br from-amber-400 to-orange-500 text-white" : "bg-surface-sunken text-muted-foreground"
              )}
            >
              <Icon className="size-10" />
            </div>
            <div className="aspect-square rounded-md bg-surface-sunken flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
            <div className="aspect-square rounded-md bg-surface-sunken flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          </div>

          {/* fields */}
          <FieldGroup title="Item details">
            <Field label="Category" value={item.category} />
            <Field label="Quantity" value={String(item.qty)} />
            <Field label="Estimated value" value={money(item.value)} mono />
            <Field label="Condition" value={item.condition} />
            <Field label="Description" value={item.description} full />
          </FieldGroup>

          <FieldGroup title="Found location">
            <Field label="Found at" value={item.foundAt} />
            <Field label="Location" value={item.foundLocation} />
            <Field label="Date" value={fmtDate(item.foundDate)} />
            <Field label="Time" value={item.foundTime} mono />
            <Field label="Found by" value={item.foundBy} />
            <Field label="Staff ID" value={item.staffId} mono />
            <Field label="Department" value={item.department} />
          </FieldGroup>

          {/* guest card */}
          {item.guestName && (
            <Card className="p-3 bg-brand-soft/30 border-brand-soft">
              <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5">Linked guest</div>
              <div className="font-medium text-sm">{item.guestName}</div>
              <div className="text-xs text-muted-foreground tabular">
                {item.reservation} · {fmtDate(item.checkIn)} → {fmtDate(item.checkOut)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {item.contact && (
                  <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3" />
                    <span className="tabular">{item.contact}</span>
                  </div>
                )}
                {item.email && (
                  <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="size-3" />
                    <span className="truncate">{item.email}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          <FieldGroup title="Storage">
            <Field label="Location" value={item.storageLocation} />
            <Field label="Shelf / Locker" value={item.storageShelf} mono />
            <Field label="Days held" value={`${item.daysHeld} days`} mono />
          </FieldGroup>

          {item.remarks && (
            <FieldGroup title="Remarks">
              <Field label="Notes" value={item.remarks} full />
            </FieldGroup>
          )}

          {/* timeline */}
          <div>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Activity timeline</div>
            <div className="space-y-2">
              {item.timeline.map((t, i) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <div className="size-2 rounded-full bg-brand mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div>{t.text}</div>
                    <div className="text-muted-foreground tabular text-[11px]">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer actions */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => onAction("Notification sent to guest")}>
            <Bell className="size-4" /> Notify guest
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction("Moved to storage")}>
            <Archive className="size-4" /> Move storage
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction("Marked as claimed")}>
            <CheckCircle2 className="size-4" /> Mark claimed
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAction("Item disposed")}>
            <Trash2 className="size-4" /> Dispose
          </Button>
          <Button size="sm" className="col-span-2" onClick={() => onAction("Edit form opened")}>
            <Edit3 className="size-4" /> Edit item
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={cn(full && "col-span-2")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm", mono && "tabular")}>{value}</div>
    </div>
  );
}

/* ─────────────  REGISTER MODAL  ───────────── */

const SECTIONS = [
  { id: "item", label: "Item details", icon: Package },
  { id: "location", label: "Found location", icon: MapPin },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "guest", label: "Guest link", icon: User },
  { id: "storage", label: "Storage", icon: Archive },
  { id: "remarks", label: "Remarks", icon: FileText },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function RegisterModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [section, setSection] = React.useState<SectionId>("item");
  const [category, setCategory] = React.useState<Category>("Mobile phone");
  const [condition, setCondition] = React.useState<Condition>("Good");
  const [hvi, setHvi] = React.useState(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold leading-tight">Register found item</div>
            <div className="text-xs text-muted-foreground">
              Item ID will be auto-generated on save · The Pearl Marina, Mumbai
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[220px_1fr]">
          {/* sidebar nav */}
          <div className="border-r border-border bg-surface-sunken/30 p-2 overflow-y-auto">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold px-2 py-1.5">
              Sections
            </div>
            {SECTIONS.map((s) => {
              const SIcon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-md text-sm inline-flex items-center gap-2 transition-colors",
                    section === s.id
                      ? "bg-brand-soft text-brand-soft-foreground"
                      : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
                  )}
                >
                  <SIcon className="size-4" />
                  <span className="flex-1">{s.label}</span>
                  <ChevronRight className="size-3.5 opacity-60" />
                </button>
              );
            })}

            <div className="mt-4 px-2">
              <div className="text-[10px] uppercase text-muted-foreground font-semibold mb-1.5">
                Auto-generated
              </div>
              <div className="text-xs text-muted-foreground">Item ID</div>
              <div className="text-sm font-medium tabular">LF/2026/0422</div>
            </div>
          </div>

          {/* form */}
          <div className="overflow-y-auto p-5">
            {section === "item" && (
              <div className="space-y-4">
                <SectionHeader title="Item details" subtitle="What was found, brand, size and value." />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="Item category">
                    <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </FieldInput>
                  <FieldInput label="Item name">
                    <Input placeholder="e.g. iPhone 15 Pro 256GB" />
                  </FieldInput>
                  <FieldInput label="Brand">
                    <Input placeholder="e.g. Apple / Hidesign / Welspun" />
                  </FieldInput>
                  <FieldInput label="Color">
                    <Input placeholder="e.g. Natural Titanium" />
                  </FieldInput>
                  <FieldInput label="Size">
                    <Input placeholder="e.g. 6.1 inch / Medium" />
                  </FieldInput>
                  <FieldInput label="Quantity">
                    <Input type="number" defaultValue={1} className="tabular" />
                  </FieldInput>
                  <FieldInput label="Estimated value (INR)">
                    <div className="relative">
                      <IndianRupee className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="number" placeholder="0" className="pl-8 tabular" />
                    </div>
                  </FieldInput>
                  <FieldInput label="Condition">
                    <Select value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
                      {(["Like new", "Good", "Fair", "Damaged"] as Condition[]).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </FieldInput>
                  <FieldInput label="Description" full>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                      placeholder="Where it was lying, any markings, serial number, packing..."
                    />
                  </FieldInput>
                  <FieldInput label="" full>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={hvi}
                        onChange={(e) => setHvi(e.target.checked)}
                        className="size-4 rounded border-border"
                      />
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="size-3.5 fill-amber-500 text-amber-500" />
                        Flag as High-Value Item (HVI) — moves to GM safe
                      </span>
                    </label>
                  </FieldInput>
                </div>
              </div>
            )}

            {section === "location" && (
              <div className="space-y-4">
                <SectionHeader title="Found location" subtitle="Where, when and which staff member found it." />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="Found date">
                    <Input type="date" />
                  </FieldInput>
                  <FieldInput label="Found time">
                    <Input type="time" />
                  </FieldInput>
                  <FieldInput label="Found by (staff name)">
                    <Input placeholder="e.g. Anjali Iyer" />
                  </FieldInput>
                  <FieldInput label="Staff ID">
                    <Input placeholder="HK-204" className="tabular" />
                  </FieldInput>
                  <FieldInput label="Department">
                    <Select defaultValue="Housekeeping">
                      <option>Housekeeping</option>
                      <option>Front Office</option>
                      <option>F&B</option>
                      <option>Banquet Ops</option>
                      <option>Bell Desk</option>
                      <option>Valet</option>
                      <option>Spa & Wellness</option>
                      <option>Recreation</option>
                      <option>Security</option>
                    </Select>
                  </FieldInput>
                  <FieldInput label="Found at">
                    <Select defaultValue="Room">
                      <option>Room</option>
                      <option>Public area</option>
                      <option>Back of house</option>
                    </Select>
                  </FieldInput>
                  <FieldInput label="Room / Floor / Area" full>
                    <Input placeholder="e.g. Room 412 - 4th floor / Lobby / Crystal Banquet" />
                  </FieldInput>
                </div>
              </div>
            )}

            {section === "photos" && (
              <div className="space-y-4">
                <SectionHeader title="Photos" subtitle="Capture or upload images — at least one photo is required." />
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-surface-sunken hover:border-brand transition-colors"
                  >
                    <Camera className="size-6" />
                    <span className="text-xs font-medium">Capture</span>
                  </button>
                  <button
                    type="button"
                    className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-surface-sunken hover:border-brand transition-colors"
                  >
                    <Upload className="size-6" />
                    <span className="text-xs font-medium">Upload file</span>
                  </button>
                  <button
                    type="button"
                    className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-surface-sunken hover:border-brand transition-colors"
                  >
                    <ImageIcon className="size-6" />
                    <span className="text-xs font-medium">Add more</span>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground bg-surface-sunken rounded-md p-3">
                  Tip: Capture all sides for HVI items. Include serial number, hallmark or any identifying marks.
                </div>
              </div>
            )}

            {section === "guest" && (
              <div className="space-y-4">
                <SectionHeader title="Guest link" subtitle="Search reservation log to link a guest (optional)." />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="Guest name (search)" full>
                    <div className="relative">
                      <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search guest list..." className="pl-8" />
                    </div>
                  </FieldInput>
                  <FieldInput label="Reservation #">
                    <Input placeholder="e.g. BK-88241" className="tabular" />
                  </FieldInput>
                  <FieldInput label="Contact number">
                    <Input placeholder="+91" className="tabular" />
                  </FieldInput>
                  <FieldInput label="Check-in date">
                    <Input type="date" />
                  </FieldInput>
                  <FieldInput label="Check-out date">
                    <Input type="date" />
                  </FieldInput>
                  <FieldInput label="Email" full>
                    <Input type="email" placeholder="guest@example.com" />
                  </FieldInput>
                </div>
                <Card className="p-3 bg-info-soft/40 text-xs text-info">
                  Auto-suggested matches based on room and check-out date will appear here after you save.
                </Card>
              </div>
            )}

            {section === "storage" && (
              <div className="space-y-4">
                <SectionHeader title="Storage" subtitle="Where it's stored, shelf/locker, and current status." />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="Storage location">
                    <Select defaultValue="Front Desk Safe">
                      <option>Front Desk Safe</option>
                      <option>Manager Office Safe</option>
                      <option>GM Office Vault</option>
                      <option>Housekeeping Lost Bin</option>
                      <option>Bell Desk Secure Cage</option>
                      <option>Valet Office Cabinet</option>
                      <option>Linen Room</option>
                    </Select>
                  </FieldInput>
                  <FieldInput label="Shelf / Locker">
                    <Input placeholder="e.g. Safe A · Slot 12" />
                  </FieldInput>
                  <FieldInput label="Item status">
                    <Select defaultValue="Waiting">
                      <option>Waiting</option>
                      <option>Notified</option>
                      <option>Claimed</option>
                      <option>Returned</option>
                      <option>Storage</option>
                      <option>Disposed</option>
                      <option>Donated</option>
                    </Select>
                  </FieldInput>
                  <FieldInput label="Hold period">
                    <Select defaultValue="30 days">
                      <option>15 days</option>
                      <option>30 days</option>
                      <option>60 days</option>
                      <option>90 days</option>
                    </Select>
                  </FieldInput>
                </div>
              </div>
            )}

            {section === "remarks" && (
              <div className="space-y-4">
                <SectionHeader title="Remarks" subtitle="Internal notes, witness names, and handover details." />
                <FieldInput label="Internal remarks" full>
                  <textarea
                    className="flex min-h-[140px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    placeholder="Witness name, CCTV time stamp, special handling notes, courier details..."
                  />
                </FieldInput>
                <FieldInput label="Witness name (optional)" full>
                  <Input placeholder="e.g. Karan Mehta (Security supervisor)" />
                </FieldInput>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="border-t border-border p-3 flex items-center justify-between gap-3 bg-surface">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Building2 className="size-3.5" /> The Pearl Marina, Mumbai
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="outline" onClick={onSubmit}>
              <Save className="size-4" /> Save draft
            </Button>
            <Button size="sm" onClick={onSubmit}>
              <CheckCircle2 className="size-4" /> Register item
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <div className="text-base font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function FieldInput({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      {label && <Label className="text-xs">{label}</Label>}
      {children}
    </div>
  );
}
