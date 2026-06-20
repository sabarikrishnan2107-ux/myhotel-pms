# Restaurant POS — Add New Menu Item (with dish photo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "New item" button + dialog to the Restaurant POS page that creates a permanent menu item — with an optional dish photo — via `POST /menu-items`, persisting to Postgres and showing it in the menu grid immediately.

**Architecture:** Backend gets a `photo` column on `menu_items` and a matching validation rule (the generic `ResourceController` already serves CRUD). A pure, unit-tested helper (`src/lib/menu-item.ts`) builds the validated POST payload from form state. The POS page (`fb/pos/page.tsx`) gets a `+ New item` button and a `NewMenuItemModal` that captures/uploads a photo via the existing `apiUpload`, posts via `apiPost`, and prepends the created row into the page's `menu` state. The grid renders the photo when present.

**Tech Stack:** Laravel 11 + Postgres 16 (backend), Next.js 16 / React 19 + TypeScript + Tailwind (frontend), vitest (node env).

## Global Constraints

- Frontend lives under `luxe-pms/`; backend under `hotel-pms-api/`. Paths below are relative to the repo root unless a task says otherwise.
- **Backend PHP must be `C:\php84\php.exe`** for any `artisan` command — the default herd-lite PHP cannot load the pgsql extension. (See memory: Postgres/PHP backend fix.)
- Frontend tests run in the **node** environment (`vitest.config.ts`): unit-test **pure functions only**, exactly like `src/lib/utils.test.ts`. Do **not** add jsdom / testing-library or render React in tests.
- Reuse existing primitives: `Input`, `Label`, `Select`, `Button`, `Card`, `Badge` from `@/components/ui/*`; `cn`, `money` from `@/lib/utils`; `apiGet`, `apiPost`, `apiUpload` from `@/lib/api`.
- The 8 menu categories are the `CATEGORIES` array already in `fb/pos/page.tsx`: Starters, Mains, Indian, Continental, Sides, Desserts, Bar, Beverages.
- Photo storage: `apiUpload(file)` POSTs to `/upload` and returns `{ url, path }`; save the `url` string as the item's `photo`.

---

### Task 1: Backend — add `photo` to menu items

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_20_100000_add_photo_to_menu_items.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (the `menu-items` entry in `RULES`, ~line 350-353)

**Interfaces:**
- Consumes: nothing.
- Produces: a `menu_items.photo` nullable string column and acceptance of a `photo` field on `POST/PUT /menu-items`.

- [ ] **Step 1: Write the migration**

Create `hotel-pms-api/database/migrations/2026_06_20_100000_add_photo_to_menu_items.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $t) {
            $t->string('photo')->nullable()->after('tag');
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $t) {
            $t->dropColumn('photo');
        });
    }
};
```

- [ ] **Step 2: Add the validation rule**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`, change the `menu-items` rules block from:

```php
        'menu-items' => [
            'cat' => 'string|max:100', 'name' => 'string|max:255', 'price' => 'integer|min:0',
            'veg' => 'boolean', 'spice' => 'string|max:50|nullable', 'tag' => 'string|max:100|nullable',
        ],
```

to:

```php
        'menu-items' => [
            'cat' => 'string|max:100', 'name' => 'string|max:255', 'price' => 'integer|min:0',
            'veg' => 'boolean', 'spice' => 'string|max:50|nullable', 'tag' => 'string|max:100|nullable',
            'photo' => 'string|max:2000|nullable',
        ],
```

(Leave `REQUIRED_ON_CREATE['menu-items']` as `['name']` — photo is optional.)

- [ ] **Step 3: Run the migration**

Run (from repo root):

```bash
C:/php84/php.exe hotel-pms-api/artisan migrate
```

Expected: `... add_photo_to_menu_items .......... DONE`.

- [ ] **Step 4: Verify the column and endpoint**

Confirm the column exists:

```bash
C:/php84/php.exe hotel-pms-api/artisan tinker --execute="echo implode(',', Schema::getColumnListing('menu_items'));"
```

Expected: output includes `photo`.

If the dev server is running, smoke-test the write (optional but recommended):

```bash
curl -s -X POST http://localhost:8000/api/menu-items -H "Accept: application/json" -H "Content-Type: application/json" -d "{\"name\":\"Photo Probe\",\"cat\":\"Sides\",\"price\":50,\"photo\":\"http://localhost:8000/uploads/x.png\"}"
```

Expected: HTTP 201 JSON containing `"photo":"http://localhost:8000/uploads/x.png"`.

- [ ] **Step 5: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_20_100000_add_photo_to_menu_items.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php
git commit -m "feat(api): add photo column + rule to menu items"
```

---

### Task 2: Pure payload-builder helper

**Files:**
- Create: `luxe-pms/src/lib/menu-item.ts`
- Test: `luxe-pms/src/lib/menu-item.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type MenuSpice = "mild" | "medium" | "hot"`
  - `interface MenuItemFormState { name: string; cat: string; price: number; veg: boolean; spice: MenuSpice | "none"; tag: string; photo: string }`
  - `interface MenuItemPayload { name: string; cat: string; price: number; veg: boolean; spice?: MenuSpice; tag?: string; photo?: string }`
  - `buildMenuItemPayload(form: MenuItemFormState): MenuItemPayload`
  - `isValidMenuItemForm(form: MenuItemFormState): boolean`

> All `npm` commands in this task run from `luxe-pms/`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/menu-item.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildMenuItemPayload, isValidMenuItemForm } from "@/lib/menu-item";

const base = { name: "X", cat: "Mains", price: 10, veg: true, spice: "none" as const, tag: "", photo: "" };

describe("buildMenuItemPayload", () => {
  it("trims the name and rounds price to a non-negative integer", () => {
    const p = buildMenuItemPayload({ ...base, name: "  Paneer Tikka  ", cat: "Starters", price: 380.7 });
    expect(p).toEqual({ name: "Paneer Tikka", cat: "Starters", price: 381, veg: true });
  });
  it("includes spice only when it is not 'none'", () => {
    const p = buildMenuItemPayload({ ...base, spice: "hot" });
    expect(p.spice).toBe("hot");
  });
  it("omits spice when 'none'", () => {
    expect("spice" in buildMenuItemPayload(base)).toBe(false);
  });
  it("includes a trimmed tag only when non-empty", () => {
    expect(buildMenuItemPayload({ ...base, tag: "  Signature " }).tag).toBe("Signature");
    expect("tag" in buildMenuItemPayload({ ...base, tag: "   " })).toBe(false);
  });
  it("includes a trimmed photo only when non-empty", () => {
    expect(buildMenuItemPayload({ ...base, photo: " http://h/uploads/a.png " }).photo).toBe("http://h/uploads/a.png");
    expect("photo" in buildMenuItemPayload({ ...base, photo: "" })).toBe(false);
  });
  it("clamps negative prices to 0", () => {
    expect(buildMenuItemPayload({ ...base, price: -5 }).price).toBe(0);
  });
});

describe("isValidMenuItemForm", () => {
  it("requires a non-empty trimmed name", () => {
    expect(isValidMenuItemForm({ ...base, name: "  " })).toBe(false);
    expect(isValidMenuItemForm({ ...base, name: "Tea" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- menu-item`
Expected: FAIL — cannot resolve `@/lib/menu-item` / functions not defined.

- [ ] **Step 3: Write the minimal implementation**

Create `luxe-pms/src/lib/menu-item.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- menu-item`
Expected: PASS (all cases in both describe blocks).

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/menu-item.ts luxe-pms/src/lib/menu-item.test.ts
git commit -m "feat(pos): add pure helper for building menu-item payloads"
```

---

### Task 3: "New item" dialog (with photo) + grid display

**Files:**
- Modify: `luxe-pms/src/app/(app)/fb/pos/page.tsx`

**Interfaces:**
- Consumes from Task 2: `buildMenuItemPayload`, `isValidMenuItemForm`, `type MenuItemFormState`.
- Consumes from Task 1: the `photo` field accepted by `POST /menu-items`.
- Produces: a `NewMenuItemModal` local component and an `addMenuItem` handler (no external consumers).

> All `npm` commands in this task run from `luxe-pms/`.

- [ ] **Step 1: Imports and the `Item` photo field**

In `luxe-pms/src/app/(app)/fb/pos/page.tsx`:

(a) Below `import type { Reservation } from "@/lib/types";` (~line 16) add:

```tsx
import { buildMenuItemPayload, isValidMenuItemForm, type MenuItemFormState } from "@/lib/menu-item";
```

(b) Add `apiUpload` to the existing api import. Change:

```tsx
import { apiGet, apiPost } from "@/lib/api";
```

to:

```tsx
import { apiGet, apiPost, apiUpload } from "@/lib/api";
```

(c) Add `photo` to the `Item` type. Change:

```tsx
type Item = { id: string; cat: Category; name: string; price: number; veg?: boolean; spice?: "mild" | "medium" | "hot"; tag?: string };
```

to:

```tsx
type Item = { id: string; cat: Category; name: string; price: number; veg?: boolean; spice?: "mild" | "medium" | "hot"; tag?: string; photo?: string };
```

- [ ] **Step 2: Add modal open-state and the create handler**

Inside `RestaurantPOSPage`, immediately after `const [modifierFor, setModifierFor] = React.useState<Item | null>(null);`, add:

```tsx
  // New-menu-item dialog
  const [newItemOpen, setNewItemOpen] = React.useState(false);

  const addMenuItem = async (form: MenuItemFormState) => {
    const payload = buildMenuItemPayload(form);
    try {
      const created = await apiPost<{ id: number | string }>("/menu-items", payload);
      const item: Item = { ...payload, id: String(created.id), cat: payload.cat as Category };
      setMenu(m => [item, ...m]);
      setCat(item.cat);
      setNewItemOpen(false);
      showToast(`${item.name} added to menu`);
    } catch {
      showToast("⚠ Couldn't save item — backend offline");
    }
  };
```

- [ ] **Step 3: Add the `+ New item` button to the menu search row**

In the CENTER — MENU card, replace:

```tsx
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="pl-9 h-9" />
            </div>
```

with:

```tsx
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu…" className="pl-9 h-9" />
              </div>
              <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setNewItemOpen(true)}>
                <Plus className="h-4 w-4" />New item
              </Button>
            </div>
```

- [ ] **Step 4: Render the dish photo in the grid card**

In the items grid, replace the placeholder line:

```tsx
                    <ImageIcon className="h-8 w-8 text-subtle-foreground/60" />
```

with:

```tsx
                    {item.photo ? (
                      <img src={item.photo} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-subtle-foreground/60" />
                    )}
```

- [ ] **Step 5: Render the modal**

In the MODALS section, immediately after the `modifierFor && (...)` block, add:

```tsx
      {newItemOpen && (
        <NewMenuItemModal
          initialCat={cat}
          onClose={() => setNewItemOpen(false)}
          onSave={addMenuItem}
        />
      )}
```

- [ ] **Step 6: Add the `NewMenuItemModal` component**

At the end of the file (after the `LoyaltyModal` function), append:

```tsx
// ============= NEW MENU ITEM MODAL =============
function NewMenuItemModal({ initialCat, onClose, onSave }: {
  initialCat: Category;
  onClose: () => void;
  onSave: (form: MenuItemFormState) => void;
}) {
  const [name, setName] = React.useState("");
  const [cat, setCat] = React.useState<Category>(initialCat);
  const [price, setPrice] = React.useState(0);
  const [veg, setVeg] = React.useState(true);
  const [spice, setSpice] = React.useState<"none" | "mild" | "medium" | "hot">("none");
  const [tag, setTag] = React.useState("");
  const [photo, setPhoto] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  const captureRef = React.useRef<HTMLInputElement>(null);
  const uploadRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      setPhoto(url);
    } catch {
      // Surfaced via the disabled state resetting; keep modal open.
    } finally {
      setUploading(false);
    }
  };

  const form: MenuItemFormState = { name, cat, price, veg, spice, tag, photo };
  const valid = isValidMenuItemForm(form);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><UtensilsCrossed className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold">New menu item</h3>
              <p className="text-xs text-muted-foreground">Saved to the catalog · appears on the POS menu</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Photo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dish photo (optional)</Label>
            <input ref={captureRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { void handleFile(e.target.files); e.target.value = ""; }} />
            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={e => { void handleFile(e.target.files); e.target.value = ""; }} />
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 rounded-md border border-border bg-surface-sunken overflow-hidden inline-flex items-center justify-center relative">
                {photo ? (
                  <>
                    <img src={photo} alt="Dish preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhoto("")} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-foreground/70 text-background inline-flex items-center justify-center"><X className="h-3 w-3" /></button>
                  </>
                ) : (
                  <ImageIcon className="h-7 w-7 text-subtle-foreground/60" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => captureRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Take photo"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => uploadRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5" />Upload
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Item name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Paneer Tikka" autoFocus className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={cat} onChange={e => setCat(e.target.value as Category)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (₹)</Label>
              <Input type="number" min={0} value={price} onChange={e => setPrice(Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {([["Veg", true], ["Non-veg", false]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setVeg(val)}
                    className={cn(
                      "h-10 rounded-md border text-xs font-medium transition-colors",
                      veg === val ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Spice</Label>
              <Select value={spice} onChange={e => setSpice(e.target.value as typeof spice)}>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="medium">Medium</option>
                <option value="hot">Hot</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tag (optional)</Label>
            <Input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Chef's pick" className="h-9" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || uploading} onClick={() => onSave(form)}>
            <Plus className="h-3.5 w-3.5" />Add to menu
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npm run lint`
Expected: no errors for `fb/pos/page.tsx` or `lib/menu-item.ts`.

Run: `npm run build`
Expected: build succeeds (confirms `Item`/`Category`/payload types line up).

- [ ] **Step 8: Manual verification**

Start the stack (`start-dev.ps1` from repo root), log in (`admin@hotel.com` / `password123`), open `/fb/pos`:
1. Click `+ New item` → modal opens, focus on name.
2. Click **Upload**, pick an image → preview shows; the × removes it.
3. Enter "Test Dosa", category Indian, price 250, Veg, spice Mild, tag "Chef's pick" → **Add to menu**.
4. Confirm: toast "Test Dosa added to menu", category switches to Indian, the card shows the photo, and the item can be tapped onto the order ticket.
5. Reload → item + photo still present (persisted to Postgres).
6. Stop the backend, repeat add → warning toast "⚠ Couldn't save item — backend offline" and the modal stays open.

- [ ] **Step 9: Commit**

```bash
git add "luxe-pms/src/app/(app)/fb/pos/page.tsx"
git commit -m "feat(pos): New item dialog with dish photo on Restaurant POS"
```

---

## Self-Review

**Spec coverage:**
- DB `photo` column → Task 1 Steps 1, 3. ✓
- `photo` validation rule → Task 1 Step 2. ✓
- Photo upload via existing `apiUpload` / `/upload` → Task 3 Step 6 (`handleFile`). ✓
- Trigger button in menu card header → Task 3 Step 3. ✓
- `NewMenuItemModal` mirroring existing modal shell (overlay, Card, surface-elevated header, X, Escape + body-overflow lock) → Task 3 Step 6. ✓
- Fields Photo/Name/Category/Price/Veg/Spice/Tag mapped to backend schema → Task 2 (payload) + Task 3 Step 6 (controls). ✓
- Camera-capture + upload + preview + remove → Task 3 Step 6. ✓
- Save via `apiPost("/menu-items")`, prepend to `menu`, switch `cat`, success toast → Task 3 Step 2. ✓
- Offline-fallback warning toast, modal stays open → Task 3 Step 2 (`catch` does not close). ✓
- Grid renders photo with icon fallback; `Item` gains `photo?` → Task 3 Steps 1c, 4. ✓
- Out of scope (no edit/delete, single photo, no auto-add to ticket) → respected. ✓

**Placeholder scan:** No TBD/TODO/"handle errors" stand-ins; all code is complete. The photo-upload `catch` is intentionally silent (modal stays open, upload button re-enables) — documented inline. ✓

**Type consistency:** `MenuItemFormState`/`buildMenuItemPayload`/`isValidMenuItemForm` defined in Task 2 and used with identical names/shapes in Task 3. `MenuItemFormState` includes `photo: string`; the modal's `form` provides all seven fields. `Item` gains `photo?: string` (Task 3 Step 1c) consumed by the grid (Step 4). `apiPost<{ id }>` matches the backend's returned row; `apiUpload` returns `{ url, path }` and only `url` is used. Backend rule `photo => string|max:2000|nullable` accepts the uploaded URL. ✓
