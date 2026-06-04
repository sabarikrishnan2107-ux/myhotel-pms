export type RoomStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "dirty"
  | "cleaning"
  | "inspected"
  | "ready"
  | "maintenance"
  | "blocked"
  | "checkout-pending";

export type PaymentStatus = "paid" | "partial" | "unpaid" | "refunded";

export type HKStatus = "clean" | "dirty" | "cleaning" | "inspected" | "out-of-order";

export type RoomType = "Queen" | "Deluxe" | "Suite" | "King" | "Family" | "Executive";

export type BookingSource =
  | "Walk-in"
  | "Website"
  | "Phone"
  | "OTA: Booking.com"
  | "OTA: Agoda"
  | "OTA: Expedia"
  | "Agent"
  | "Corporate";

export type RatePlan = "EP" | "CP" | "MAP" | "AP" | "Corporate" | "Agent" | "OTA" | "Non-refundable" | "Long Stay" | "Group";

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  hkStatus: HKStatus;
  guestName?: string;
  source?: BookingSource;
  checkIn?: string;
  checkOut?: string;
  paymentStatus?: PaymentStatus;
  vip?: boolean;
  rate: number;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  nationality: string;
  idType: string;
  idNumber: string;
  vip: boolean;
  blacklist: boolean;
  lifetimeNights: number;
  lifetimeSpend: number;
  lastStay?: string;
}

export interface Reservation {
  id: string;
  bookingNo: string;
  guestName: string;
  roomNumber: string;
  roomType: RoomType;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  paymentStatus: PaymentStatus;
  ratePlan: RatePlan;
  total: number;
  advance: number;
  balance: number;
  vip: boolean;
}

export interface FolioCharge {
  id: string;
  date: string;
  description: string;
  type: "Room" | "F&B" | "Tax" | "Extra" | "Discount" | "Service";
  qty: number;
  rate: number;
  tax: number;
  amount: number;
  paidBy: "Guest" | "Agent" | "Company";
}

export interface FolioPayment {
  id: string;
  date: string;
  mode: "Cash" | "Card" | "UPI" | "Bank" | "Online" | "Agent Credit" | "Company Credit";
  reference: string;
  amount: number;
}
