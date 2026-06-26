import { describe, it, expect } from "vitest";
import { buildWalkInSyncBooking } from "@/lib/walkin-sync";

const base = {
  bookingNo: "WK101234",
  guestName: "John Doe",
  roomNumber: "101",
  roomType: "Queen",
  checkIn: "2026-06-26T12:00:00.000Z",
  checkOut: "2026-06-27T11:00:00.000Z",
  nights: 1,
  adults: 1,
  children: 0,
  ratePlan: "EP",
  total: 6825,
  advance: 2678,
};

describe("buildWalkInSyncBooking", () => {
  it("creates a pending Walk-in draft keeping the reference", () => {
    const b = buildWalkInSyncBooking(base);
    expect(b.status).toBe("pending");
    expect(b.source).toBe("Walk-in");
    expect(b.bookingNo).toBe("WK101234");
  });

  it("derives balance and a partial payment status", () => {
    const b = buildWalkInSyncBooking(base);
    expect(b.balance).toBe(4147); // 6825 - 2678
    expect(b.paymentStatus).toBe("partial");
  });

  it("is unpaid with no advance and paid when fully covered", () => {
    expect(buildWalkInSyncBooking({ ...base, advance: 0 }).paymentStatus).toBe("unpaid");
    const paid = buildWalkInSyncBooking({ ...base, advance: 6825 });
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.balance).toBe(0);
  });

  it("falls back to Unassigned when no room is chosen", () => {
    expect(buildWalkInSyncBooking({ ...base, roomNumber: "" }).roomNumber).toBe("Unassigned");
  });
});
