// Pure helpers for creating a menu item from the Restaurant POS "New item" dialog.
// Kept framework-free so they can be unit-tested in the node environment.

export type MenuSpice = "mild" | "medium" | "hot";

/** Raw dialog form state. `spice` carries a "none" sentinel for "no spice". */
export interface MenuItemFormState {
  name: string;
  cat: string;
  price: number;
  veg: boolean;
  spice: MenuSpice | "none";
  tag: string;
  photo: string;
}

/** Body sent to POST /menu-items. Optional fields are omitted when empty. */
export interface MenuItemPayload {
  name: string;
  cat: string;
  price: number;
  veg: boolean;
  spice?: MenuSpice;
  tag?: string;
  photo?: string;
}

/** A menu item needs at least a name. */
export function isValidMenuItemForm(form: MenuItemFormState): boolean {
  return form.name.trim().length > 0;
}

/** Normalise form state into the backend payload, dropping empty optionals. */
export function buildMenuItemPayload(form: MenuItemFormState): MenuItemPayload {
  const payload: MenuItemPayload = {
    name: form.name.trim(),
    cat: form.cat,
    price: Math.max(0, Math.round(form.price)),
    veg: form.veg,
  };
  if (form.spice !== "none") payload.spice = form.spice;
  const tag = form.tag.trim();
  if (tag) payload.tag = tag;
  const photo = form.photo.trim();
  if (photo) payload.photo = photo;
  return payload;
}

/** The fixed F&B menu categories used across the POS and Setup manager. */
export const MENU_CATEGORIES = [
  "Starters", "Mains", "Indian", "Continental", "Sides", "Desserts", "Bar", "Beverages",
] as const;
export type MenuCategory = typeof MENU_CATEGORIES[number];
