---
title: Smart Face Photo Pipeline
date: 2026-06-29
status: approved
---

# Smart Face Photo Pipeline

Enhance the guest face photo slot in `PhotoCapture` with a client-side pipeline: compress → validate → face crop → background removal. The result is a 512×512 passport-style JPEG on a white background, stored as a base64 data URL and sent to the existing backend unchanged.

---

## Scope

Applies **only** when `focus="face"` (the default). The ID document upload slots (`focus="none"`) are untouched.

---

## Files

| File | Action |
|---|---|
| `luxe-pms/src/lib/face-crop.ts` | New — face-api.js TinyFaceDetector wrapper |
| `luxe-pms/src/lib/background-removal.ts` | New — @imgly/background-removal wrapper |
| `luxe-pms/src/components/guests/photo-capture.tsx` | Enhanced — pipeline + new UI states |
| `luxe-pms/.env.local` | Add `NEXT_PUBLIC_FACE_VALIDATOR_URL` |
| `luxe-pms/public/models/` | New dir — model files downloaded manually |

No backend changes. `VerificationController.php` already accepts `guest_photo` as a base64 data URI.

---

## Dependencies

```
npm install face-api.js @imgly/background-removal
```

Model files (manual download from face-api.js GitHub releases, placed in `luxe-pms/public/models/`):
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

---

## Environment Variable

```
NEXT_PUBLIC_FACE_VALIDATOR_URL=https://your-validation-server.com
```

If not set, the validation step is silently skipped and the pipeline continues.

---

## Pipeline (face mode only)

Triggered by both file upload and webcam capture.

```
input image (dataUrl)
    1. compress       max 1000×1000, JPEG quality 0.8
    2. validate       POST /validate-passport { image_base64 }
                      → { status: bool, message: string }
                      abort + show error if status=false
                      (skipped if NEXT_PUBLIC_FACE_VALIDATOR_URL not set)
    3. face crop      face-api.js TinyFaceDetector
                      512×512 output, passport padding:
                        - face occupies ~60% of frame height
                        - face center at ~58% from top
                        - white fill for any out-of-bounds canvas area
                      fallback: keep compressed image (log warning)
    4. bg removal     @imgly/background-removal, model isnet_quint8
                      per-pixel: alpha > 24 → keep original pixel
                                 alpha ≤ 24 → pure white (255,255,255)
                      1px blur feather at mask edge
                      composited onto white canvas, output JPEG 0.95
                      fallback: keep cropped image (log warning)
    5. store          base64 data URL → passed to onChange()
```

---

## `face-crop.ts`

Single exported API:

```ts
export function prewarmFaceDetector(): void
export async function cropFaceWithPadding(
  source: HTMLImageElement | HTMLCanvasElement,
  targetSize?: number   // default 512
): Promise<string>      // returns JPEG data URL; throws never (logs + returns original)
```

- Models lazy-loaded once via a module-level promise (`loadFaceApiModels`)
- Model URL base: `/models`
- Returns the input unchanged if no face detected or model load fails

---

## `background-removal.ts`

Single exported API:

```ts
export function prewarmBackgroundRemoval(): Promise<void>
export async function replaceBackgroundWithWhite(
  dataUrl: string
): Promise<string>      // returns JPEG data URL; throws never (logs + returns original)
```

- Model loaded lazily, module-level promise (`bgRemovalReady`)
- Model: `isnet_quint8`
- Alpha threshold: 24
- Edge feather: 1px blur on mask before compositing

---

## `photo-capture.tsx` changes

### New mode states

Current: `"idle" | "live" | "processing" | "captured" | "error"`

Add: `"validating" | "removing-bg"`

### Processing overlay labels

| Mode | Overlay text |
|---|---|
| `processing` | "Focusing on face…" (unchanged) |
| `validating` | "Validating…" |
| `removing-bg` | "Removing background…" |

### Preview shape (face mode)

- Container becomes a **circle** (`rounded-full`, 160×160px) instead of the current square dashed box
- The dashed border becomes a solid ring when captured
- `aspect="square"` prop still accepted but overridden to circle in face mode

### Validation panel (face mode, shown below avatar)

Appears after any processing attempt (success or failure):

```
[ progress bar 0–100% ]
Score: 100%  ✓           ← green if ≥70%, red otherwise
[error reason if any]
```

- Score is derived from the validator response (`status=true` → 100%, `status=false` → 0%)
- Panel is hidden until the first upload/capture attempt

### Pre-warm on mount

```ts
useEffect(() => {
  if (!faceFocus) return;
  const id = setTimeout(() => {
    prewarmBackgroundRemoval().catch(() => {});
    prewarmFaceDetector();
  }, 800);
  return () => clearTimeout(id);
}, [faceFocus]);
```

### Edit / existing value

When `value` prop is set on mount (existing saved photo), skip the pipeline entirely — just display the image as-is. Do not re-run background removal on load.

---

## Error handling

| Failure | Behavior |
|---|---|
| Validation returns `status=false` | Show error message, clear preview, abort pipeline |
| Network error on validation | Show "Validation service offline — photo saved without check" (continue pipeline) |
| face-api.js model load fails | Log warning, skip face crop, continue with compressed image |
| No face detected | Log warning, skip face crop, continue with compressed image |
| @imgly model/processing fails | Log warning, skip bg removal, continue with cropped image |

---

## Constraints

- `@imgly/background-removal` loads a ~10 MB WASM model — only pre-warmed, never run on component load with an existing value
- face-api.js model files must be served from `public/models/` (static, no CDN dependency)
- Pipeline only runs once per capture — retake clears state and re-runs from scratch
