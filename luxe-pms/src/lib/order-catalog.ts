// Pure catalog-building logic for the Room Rack "Order for Room" dialog —
// separated from rack/page.tsx so it's unit-testable without React/DOM.

export type OrderTab = "food" | "snacks" | "laundry" | "other";

export type OrderCatalogItem = {
  id: string;
  name: string;
  price: number;
  hint?: string;
};

export type MenuItemRow = { id: number | string; name: string; price: number };
export type ServiceItemRow = {
  id: number | string;
  kind: string;
  name: string;
  price: number;
  hint?: string | null;
  active?: boolean;
};

const SERVICE_TABS: Exclude<OrderTab, "food">[] = ["snacks", "laundry", "other"];

// Hardcoded catalog shown until the real /menu-items + /service-items fetch
// resolves (or if it fails) — the project's established offline-fallback
// pattern.
export const FALLBACK_ORDER_CATALOG: Record<OrderTab, OrderCatalogItem[]> = {
  food: [
    { id: "f1", name: "Continental Breakfast", price: 450, hint: "Eggs · juice · toast" },
    { id: "f2", name: "Eggs Benedict", price: 380 },
    { id: "f3", name: "Caesar Salad", price: 320 },
    { id: "f4", name: "Wagyu Burger", price: 850 },
    { id: "f5", name: "Grilled Salmon", price: 1200 },
    { id: "f6", name: "Margherita Pizza", price: 650 },
    { id: "f7", name: "Penne Arrabbiata", price: 480 },
    { id: "f8", name: "Tiramisu", price: 280 },
  ],
  snacks: [
    { id: "s1", name: "Bottled water (1L)", price: 100 },
    { id: "s2", name: "Coca-Cola 330ml", price: 150 },
    { id: "s3", name: "Lays / Chips pack", price: 120 },
    { id: "s4", name: "Snickers / Mars bar", price: 150 },
    { id: "s5", name: "Mixed nuts (200g)", price: 350 },
    { id: "s6", name: "Coffee pod (Nespresso)", price: 180 },
    { id: "s7", name: "Tea bags (assorted)", price: 80 },
    { id: "s8", name: "Beer · Kingfisher 330ml", price: 350 },
    { id: "s9", name: "Wine · House 187ml", price: 650 },
    { id: "s10", name: "Whiskey · Single peg 30ml", price: 450 },
  ],
  laundry: [
    { id: "l1", name: "Shirt · wash & press", price: 150 },
    { id: "l2", name: "Trousers / Jeans", price: 180 },
    { id: "l3", name: "Dress / Saree", price: 250 },
    { id: "l4", name: "Suit / Jacket (dry-clean)", price: 400 },
    { id: "l5", name: "Inner wear / Socks", price: 80 },
    { id: "l6", name: "Pyjamas / Nightwear", price: 150 },
    { id: "l7", name: "Bedsheet / Pillow cover", price: 200 },
    { id: "l8", name: "Express (same-day) — surcharge", price: 250, hint: "+ 50% on items" },
  ],
  other: [
    { id: "o1", name: "Wake-up call (set time below)", price: 0 },
    { id: "o2", name: "Newspaper delivery", price: 0, hint: "Free · daily" },
    { id: "o3", name: "Spa booking — 60 min", price: 3500 },
    { id: "o4", name: "Airport drop (sedan)", price: 1800 },
    { id: "o5", name: "Doctor on call", price: 2000 },
    { id: "o6", name: "Babysitting (per hour)", price: 800 },
    { id: "o7", name: "Iron + board to room", price: 0, hint: "Free" },
    { id: "o8", name: "Extra towels / amenities", price: 0, hint: "Free" },
  ],
};

// Builds the dialog's per-tab item lists from live API data. IDs are
// prefixed by source table ("menu-" / "svc-") because /menu-items and
// /service-items are separate auto-increment tables — without the prefix,
// a menu item and a service item could share the same numeric id and
// collide in the dialog's flat cart lookup (ALL_ITEMS.find(id)).
export function buildOrderCatalog(
  menuItems: MenuItemRow[],
  serviceItems: ServiceItemRow[],
): Record<OrderTab, OrderCatalogItem[]> {
  const food: OrderCatalogItem[] = menuItems.map(m => ({
    id: `menu-${m.id}`, name: m.name, price: m.price,
  }));

  const catalog: Record<OrderTab, OrderCatalogItem[]> = { food, snacks: [], laundry: [], other: [] };
  for (const tab of SERVICE_TABS) {
    catalog[tab] = serviceItems
      .filter(s => s.kind === tab && s.active !== false)
      .map(s => ({ id: `svc-${s.id}`, name: s.name, price: s.price, hint: s.hint ?? undefined }));
  }
  return catalog;
}
