# MYHOTEL PMS

Hotel Property Management System — a single repository containing both the frontend and the backend.

```
myhotel-pms-source/
├─ luxe-pms/        # Frontend — Next.js 16 + React 19 + Tailwind (the UI)
└─ hotel-pms-api/   # Backend  — Laravel 13 + PostgreSQL (the API)
```

## Frontend — `luxe-pms`
Next.js app with the full PMS UI (bookings, folio, housekeeping, F&B, revenue, setup & settings, etc.).

```bash
cd luxe-pms
npm install
npm run dev          # http://localhost:3000
```

Configure the API base in `luxe-pms/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Backend — `hotel-pms-api`
Laravel API backed by PostgreSQL (`hotel_pms`). Currently exposes the **Setup & Settings → Property & Branch** data; more sections are being migrated.

```bash
cd hotel-pms-api
composer install
cp .env.example .env      # then set DB_* for your local Postgres (database: hotel_pms)
php artisan key:generate
php artisan migrate --seed
php artisan serve         # http://localhost:8000
```

### Notes
- The backend requires PHP with the `pdo_pgsql` extension.
- `.env` files are git-ignored — never commit database credentials.
