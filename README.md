# ParkingLog

This project now uses a Supabase-backed Express API (`/server`) and a Vite/React frontend (`/src`). Use Supabase Auth for sign-in plus Supabase Postgres/Storage for data.

## Frontend setup

```bash
npm install
cp .env.example .env        # set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_URL
npm run dev                 # starts Vite on http://localhost:5173
```

The React app now:
- Authenticates users with Supabase magic links
- Calls the Express API with the user’s access token via `src/api/httpClient.js`
- Uses React Query for data fetching/caching

## Backend setup

```bash
cd server
npm install
cp .env.example .env       # fill Supabase URL + service/anon keys and CORS origins
npm run dev                # starts Express on http://localhost:4000
```

Apply `server/migrations/001_init.sql` inside the Supabase SQL editor to create the `profiles`, `vehicles`, `parking_logs`, and `complaints` tables plus row-level security policies. Create a storage bucket (default `complaint-evidence`) for photo uploads.

## Environment variables

Frontend (`.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (e.g. `http://localhost:4000/api`)

Backend (`server/.env`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `CORS_ORIGIN`
- `PORT` (optional)

## Development workflow

1. Start the backend (`npm run dev` in `server/`).
2. Start the frontend (`npm run dev` at repo root).
3. Sign in via the login screen (Supabase sends a magic link).
4. Promote yourself to admin through `AdminSetup` to unlock admin-only routes.

## API reference

See `server/README.md` for full route documentation. Key endpoints live under `/api/*` for auth, vehicles, parking logs, complaints, uploads, and reports.
