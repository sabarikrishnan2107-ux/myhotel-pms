# Housekeeping Mobile App + Backend — Design

**Date:** 2026-07-04
**Status:** Approved, implementing

## Goal

A dedicated React Native (Expo) mobile app for **housekeeping employees**, wired to the existing hotel PMS backend, implementing the full room-cleaning lifecycle with before/after photo proof and time tracking. Admin assigns a room from the PMS → employee gets a task on their phone → acknowledge → before photos → start (timer) → after photos → complete → PMS receives a full report with photos + duration.

Spans **three codebases**:
1. `hotel-pms-api` (Laravel) — new task lifecycle endpoints + schema.
2. `luxe-pms` (Next.js admin) — upgrade the existing assign modal to create real, employee-targeted tasks.
3. `D:\housekeeping-app` (new Expo app) — the employee phone app.

## Decisions (locked)

- **Scope:** build backend + admin + mobile app now. Deploy to prod is a separate, ask-first step.
- **Push:** Expo Notifications scaffold + working *local* notification demo. Real remote FCM deferred to a dev build (Expo Go on SDK 54 can't receive remote push on Android).
- **Schema:** extend the existing `housekeeping_tasks` table (camelCase repo convention), do NOT create a parallel snake_case table.
- **Identity:** housekeepers are `users` with `role="Housekeeping"`; matched to tasks by `assignedToUserId`. No `employee_id` column exists.

## 1. Backend (`hotel-pms-api`)

### Schema changes
Migrations timestamped `2026_07_04_*`:

- `add_lifecycle_cols_to_housekeeping_tasks` — add to `housekeeping_tasks`: `roomId` (int, nullable), `floor` (int, nullable), `assignedToUserId` (int, nullable, indexed), `assignedByUserId` (int, nullable), `acknowledgedAt` (string, nullable).
- `create_housekeeping_task_photos_table` — `id, taskId (indexed), uploadedByUserId, photoType ('before'|'after'), photoUrl, company_id (nullable, indexed), timestamps`.
- `backfill_company_id_for_hk_photos` — `UPDATE ... SET company_id = (SELECT id FROM master_companies WHERE code='DEFAULT-HOTEL') WHERE company_id IS NULL` (multi-tenancy gotcha: seeded rows are otherwise invisible to scoped logins).

Column mapping from the original spec: `room_number`→`room`, `task_type`→`type`, `total_minutes`→`durationMin`, `assigned_to_employee_id`→`assignedToUserId`, `assigned_by_user_id`→`assignedByUserId`.

### Status vocabulary (strict flow)
`assigned → acknowledged → before_photos → in_progress → after_photos → completed`

### Models
- Extend `HousekeepingTask` (already exists, `BelongsToCompany`, `$guarded=['id']`): add casts for new int cols, a `photos()` hasMany.
- New `HousekeepingTaskPhoto` (`BelongsToCompany`, `$guarded=['id']`).

### Endpoints — `HousekeepingController`
Public:
- `POST /api/housekeeping/login` — validate credentials against `users`, require `role="Housekeeping"` (or department), create a Sanctum token (name `mobile`), return `{token, employee:{id,name,role,department}}`.

Authenticated (`auth:sanctum` + `company.active`, module `hk`):
- `GET /api/housekeeping/tasks` — tasks where `assignedToUserId = auth id`, not completed, newest first, each shaped with `photosBefore[]`/`photosAfter[]` url arrays.
- `POST /api/housekeeping/tasks/{id}/acknowledge` — set `acknowledgedAt`, status `acknowledged`.
- `POST /api/housekeeping/tasks/{id}/before-photos` — accept `photos[]` files → store to `public/uploads` → insert photo rows (`before`) → status `before_photos`.
- `POST /api/housekeeping/tasks/{id}/start` — set `startedAt`, status `in_progress`; flip room `hkStatus='cleaning'`, `hkAssignee`, `hkStartedAt`.
- `POST /api/housekeeping/tasks/{id}/after-photos` — like before-photos, `after`, status `after_photos`.
- `POST /api/housekeeping/tasks/{id}/complete` — set `completedAt`, `durationMin`, `notes`, status `completed`; flip room `hkStatus='dirty'→'clean'` per side-effect convention, clear `hkAssignee`.
- `GET /api/housekeeping/history` — completed tasks for the auth employee.

All authenticated task endpoints verify the task belongs to the auth employee (`assignedToUserId`) and to the company (global scope handles company). Guard the flow order server-side (e.g. can't `start` before `before_photos`; can't `complete` before `after_photos`).

### Seeder
`HousekeepingDemoSeeder` — a demo Housekeeping login user + a couple of `assigned`/`in_progress` sample tasks for that user, `company_id` set explicitly (seeding disables the auto-stamp hook).

### Tests
`HousekeepingFlowTest` (Feature) — login returns token; full lifecycle happy path advances status correctly; flow-order guards reject out-of-order calls; a task for another employee is not returned/updatable.

## 2. Admin frontend (`luxe-pms`)

Upgrade the existing `AssignModal` (`src/app/(app)/housekeeping/page.tsx`) so it:
- Lists **Housekeeping users** (login-capable) as the pick list (so the assignee can actually log into the app).
- On pick, **creates a task row** via the API (`assignedToUserId`, `room`, `roomId`, `floor`, `type`, `priority`, `status='assigned'`, `assignedAt`, `assignedBy`) in addition to the existing room `hkAssignee` stamp (keeps the board correct).
- Keeps the screenshot's layout + AI-insight banner unchanged.

Offline-fallback + optimistic-update patterns preserved (toast on save failure).

## 3. Mobile app (`D:\housekeeping-app`)

Expo SDK 54, TypeScript, React Navigation (native-stack + bottom-tabs), Axios, `expo-camera`, `expo-notifications`, AsyncStorage.

Folder structure (as specified):
```
src/
  assets, components/{RoomTaskCard,StatusBadge,TimerCard,PhotoPreviewGrid}.tsx
  screens/{Login,Dashboard,TaskDetail,CameraCapture,History,Profile}Screen.tsx
  navigation/AppNavigator.tsx
  services/{api.ts, notificationService.ts}
  storage/authStorage.ts
  utils/timeUtils.ts
  types/housekeeping.ts
```

- `services/api.ts`: `API_BASE_URL`, `USE_MOCK` flag (default true → runs offline), functions `loginEmployee, getAssignedTasks, acknowledgeTask, uploadBeforePhotos, startTask, uploadAfterPhotos, completeTask, getTaskHistory`. Axios instance with bearer-token interceptor.
- Strict client-side flow gating: Start disabled until before-photos captured+uploaded; Complete disabled until after-photos; timer starts only on Start; total minutes computed on Complete.
- UI: white background, rounded cards, big room-number cards, large status badge, large timer card; green Start, blue Acknowledge, orange pending badge, red urgent badge, green completed.
- Notifications: `notificationService.ts` requests permission, registers push token (scaffold), schedules a local demo notification that deep-links to the assigned task.

## Verification (single pass at end)
- Backend: `php -l` on new files, `artisan migrate --force`, `artisan db:seed --class=HousekeepingDemoSeeder`, `php artisan test --filter=HousekeepingFlowTest`.
- Frontend: `npx tsc --noEmit` in `luxe-pms`.
- Mobile: `npx tsc --noEmit` + `npx expo export --platform android` in `D:\housekeeping-app`.
