# Restaurant POS — Add new menu item

**Date:** 2026-06-20
**Scope:** Single-file frontend change to `luxe-pms/src/app/(app)/fb/pos/page.tsx`. Backend is already complete.

## Goal

Let a user create a new permanent menu item directly from the Restaurant POS page. The
item is saved to the catalog and appears in the menu grid immediately, ready to tap onto
an order ticket.

## Why now

The POS page loads the menu read-only via `apiGet("/menu-items")`. There is no way to add
an item without leaving the POS flow. The backend already exposes `POST /menu-items`
(generic `ResourceController`), so this is purely a frontend addition.

## Backend (already done — no changes)

`POST /menu-items` via `ResourceController`:

- Fields: `cat` (string), `name` (string, **required on create**), `price` (integer ≥ 0),
  `veg` (boolean), `spice` (string|null), `tag` (string|null).
- Returns the created row (HTTP 201) including its numeric `id`.
- Writes an audit-log entry (module "F&B", action "Created").

## Frontend change

All work is inside `fb/pos/page.tsx`, matching the file's existing conventions exactly.

### 1. Trigger button

Add a `+ New item` button in the **center MENU card header**, on the search row (to the
right of the `Search menu…` input). It opens the new modal. Placement keeps the action
where the menu lives, consistent with the page's layout.

### 2. `NewMenuItemModal` component

A new local component in the same file, mirroring the existing `ModifierModal` /
`PayModal` shell precisely:

- Overlay: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4`
- Panel: `<Card className="max-w-2xl w-full p-0 overflow-hidden">` with a
  `surface-elevated` header, title, and `X` close button.
- Escape-to-close + `document.body.style.overflow = "hidden"` lock (same `useEffect`
  pattern used by the other modals).
- Uses the shared `Input`, `Label`, `Select`, `Button` primitives.

Fields (mapped 1:1 to the backend schema):

| Field    | Control                                   | Notes                                              |
|----------|-------------------------------------------|----------------------------------------------------|
| Name     | `Input` (required)                        | Save disabled until non-empty.                     |
| Category | `Select` over the 8 `CATEGORIES`          | Defaults to the currently active `cat`.            |
| Price    | `Input type="number"` (₹)                 | Coerced to a non-negative integer.                 |
| Veg      | Veg / Non-veg toggle → `veg: boolean`     | Same toggle styling as the spice picker.           |
| Spice    | `Select`: none / mild / medium / hot      | `none` → omitted (sends no `spice`).               |
| Tag      | `Input` (optional)                        | e.g. "Chef's pick". Omitted when blank.            |

### 3. Save flow

On submit:

1. `apiPost<Item>("/menu-items", { cat, name, price, veg, spice?, tag? })`.
2. On success: prepend the returned row (normalized to the page's `Item` shape, `id`
   stringified) to the `menu` state so it appears instantly with no reload; set `cat` to
   the new item's category so it is visible; `showToast(\`${name} added to menu\`)`.
3. On failure (backend offline): `showToast("⚠ Couldn't save item — backend offline")`,
   matching the page's existing offline-fallback toasts. Modal stays open so the user can
   retry.
4. Close the modal on success.

## Out of scope (YAGNI)

- Editing or deleting menu items from the POS page (belongs in a menu-management screen).
- Photo upload (the grid already uses an icon placeholder).
- Auto-adding the new item to the current order ticket — it simply appears in the grid.

## Testing

- Manual: open POS, click `+ New item`, create an item, confirm it appears in the grid
  under its category and can be tapped onto the ticket; reload to confirm it persisted.
- Offline: stop the backend, attempt save, confirm the warning toast and that the modal
  stays open.
