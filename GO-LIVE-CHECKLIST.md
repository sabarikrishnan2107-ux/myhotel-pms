# myhotel PMS — Go-Live Checklist

Everything in the app works in development. This is the checklist to take it
**live for real users**. Work top to bottom; don't skip the 🔴 security items.

> Dev runs on your Windows machine with `start-dev.ps1`. **Production should run on a
> Linux server** (a VPS, or a managed host). Commands below assume a Linux server.

---

## 1. 🔴 Backend config (Laravel)

1. Copy the template and fill in real values:
   ```bash
   cp hotel-pms-api/.env.production.example hotel-pms-api/.env
   # edit every line marked  <-- CHANGE
   ```
   The non-negotiables: `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_URL`
   (https), real DB credentials, real mail credentials, and `FRONTEND_URL`.

2. Generate the app key (do this once, on the server):
   ```bash
   cd hotel-pms-api
   composer install --no-dev --optimize-autoloader
   php artisan key:generate
   ```

3. Cache config for speed:
   ```bash
   php artisan config:cache && php artisan route:cache
   ```

## 2. 🔴 Database — start clean (no demo data)

The dev DB is full of demo content ("Pearl Marina", fake guests/bookings).
For a real launch, create the tables empty and seed **only the admin login**:

```bash
php artisan migrate --force                       # structural tables only
php artisan db:seed --class=AdminUserSeeder --force   # creates the admin user
```

Then **change the admin password immediately** (default is `password123`):
- Log in once as `admin@hotel.com` / `password123`, then use the app's
  Change Password screen, **or** run `php artisan tinker` and update it.

Now configure *your* hotel through the **Setup** screen in the app (property
details, floors, rooms, room types, rate plans, GST/tax slabs, payment methods,
staff, users). Everything there saves to the database — verified working.

> Optional head start: `php artisan db:seed --force` loads the full demo dataset
> so you can see the app populated, but then you must delete the demo records
> before real guests arrive. Starting clean (above) is safer.

## 3. 🟠 Frontend build (Next.js)

```bash
cp luxe-pms/.env.production.example luxe-pms/.env.production
# set NEXT_PUBLIC_API_URL to your real https API URL (with /api)
cd luxe-pms
npm ci
npm run build      # production build — NOT `npm run dev`
npm start          # or deploy the build to Vercel / a Node host
```
The API URL is baked in at build time — if you change it, rebuild.

## 4. 🟠 Serve it properly (not the dev servers)

- **Backend:** `php artisan serve` is dev-only (single-threaded). Use a real web
  server — **nginx + PHP-FPM** pointing at `hotel-pms-api/public`, or a managed
  Laravel host (Laravel Forge, Render, Railway, etc.).
- **Frontend:** host the `npm run build` output on Vercel, or run `npm start`
  behind nginx on the same server.
- **HTTPS:** put both behind SSL (Let's Encrypt / your host's certs). Logins send
  passwords — they must not travel over plain http.

## 5. 🔴 Security verification (do all of these)

- [ ] `APP_DEBUG=false` (confirm: trigger a 404/500 in prod → you get a generic
      error page, **not** a stack trace).
- [ ] Admin password changed from `password123`.
- [ ] Site is served over **https** only.
- [ ] `FRONTEND_URL` set so CORS allows your domain (and nothing else).
- [ ] Mail sends from the hotel's address, not the demo Gmail.
- [ ] `.env` is present on the server but **not** in git (already git-ignored).

## 6. 🟡 After launch

- [ ] **Database backups** — enable automatic daily backups on your Postgres host.
- [ ] **File uploads** — guest photos/logos write to `public/uploads`. On a normal
      VPS that's fine; on ephemeral/serverless hosts set `FILESYSTEM_DISK=s3` so
      they survive deploys.
- [ ] Set up uptime/error monitoring.
- [ ] Note: the **AI assistant** and **Competitor rate-shop** pages are demos and
      need external services (an LLM / a rate-scraping feed) to become real.

---

### Quick reference — what's already production-safe
- All data endpoints require a valid login token (auth enforced).
- `.env` is git-ignored; no secrets are committed.
- Every feature saves to the database and displays correctly (full app audited).
