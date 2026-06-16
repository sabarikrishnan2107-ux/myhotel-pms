"use client";
import * as React from "react";
import { apiGet } from "@/lib/api";
import { GUESTS, ROOMS } from "@/lib/mock-data";
import type { Guest, Room } from "@/lib/types";

// Shared, module-cached fetches for the guest directory and the room board, so
// multiple components can read live Postgres data without prop-drilling or
// refetching. Seeds from the mock lists as an offline fallback until the API
// resolves (then the result is cached for the rest of the session).
let guestCache: Guest[] | null = null;
let roomCache: Room[] | null = null;

export function useGuests(): Guest[] {
  const [guests, setGuests] = React.useState<Guest[]>(guestCache ?? GUESTS);
  React.useEffect(() => {
    if (guestCache) return;
    apiGet<Guest[]>("/guests")
      .then(rows => { if (rows.length) { guestCache = rows; setGuests(rows); } })
      .catch(() => {});
  }, []);
  return guests;
}

export function useRooms(): Room[] {
  const [rooms, setRooms] = React.useState<Room[]>(roomCache ?? ROOMS);
  React.useEffect(() => {
    if (roomCache) return;
    apiGet<Room[]>("/room-board")
      .then(rows => { if (rows.length) { roomCache = rows; setRooms(rows); } })
      .catch(() => {});
  }, []);
  return rooms;
}
