"use client";
import { redirect } from "next/navigation";

// /revenue has no standalone content — sub-pages hold the actual views.
// Redirect to the booking-pace dashboard as the default revenue entry point.
export default function RevenuePage() {
  redirect("/revenue/pace");
}
