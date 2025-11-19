# ParkingLog Backend

Express API that powers the ParkingLog React frontend using Supabase for authentication, database, and storage.

## Features

- JWT-authenticated routes backed by Supabase Auth tokens
- CRUD endpoints for vehicles, parking logs, and complaints
- Admin utilities for bulk uploads, report metrics, and mass deletions
- File upload endpoint that proxies evidence images into Supabase Storage
- Zod-based validation, Helmet/CORS hardening, Pino logging

## Getting Started

```bash
cd server
npm install
cp .env.example .env   # populate with your Supabase project credentials
npm run dev            # starts http://localhost:4000
```

## Environment Variables

| Name | Description |
| --- | --- |
| `SUPABASE_URL` | Found in Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (keep secret) |
| `SUPABASE_ANON_KEY` | Public anon key (used to validate user tokens) |
| `SUPABASE_STORAGE_BUCKET` | Bucket for complaint evidence (default `complaint-evidence`) |
| `CORS_ORIGIN` | One or more comma-separated origins allowed to call the API |

## Database Schema

Apply `migrations/001_init.sql` inside Supabase SQL editor to create:

- `profiles` – mirrors Auth users with role/status flags
- `vehicles` – permit registry
- `parking_logs` – daily observation log
- `complaints` – non-compliance submissions

Remember to create a Storage bucket matching `SUPABASE_STORAGE_BUCKET` and make it publicly readable (or configure signed URLs if preferred).

## Routes Overview

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health probe |
| `GET` | `/api/auth/me` | Return current user profile |
| `PATCH` | `/api/auth/me` | Update own profile (name, role/status bootstrap) |
| `GET` | `/api/auth/users` | Admin list of all profiles |
| `PATCH` | `/api/auth/users/:id` | Admin update user role/status |
| `GET` | `/api/vehicles` | List vehicles |
| `POST` | `/api/vehicles` | Create vehicle (admin) |
| `PATCH` | `/api/vehicles/:id` | Update vehicle (admin) |
| `DELETE` | `/api/vehicles/:id` | Delete vehicle (admin) |
| `POST` | `/api/vehicles/bulk` | Bulk insert array (admin) |
| `DELETE` | `/api/vehicles` | Delete every vehicle (admin) |
| `GET` | `/api/parking-logs` | List logs |
| `POST` | `/api/parking-logs` | Create log (admin) |
| `DELETE` | `/api/parking-logs/:id` | Delete log (admin) |
| `GET` | `/api/complaints` | Admin list complaints |
| `POST` | `/api/complaints` | Submit new report (approved users) |
| `PATCH` | `/api/complaints/:id` | Update complaint (admin) |
| `DELETE` | `/api/complaints/:id` | Delete complaint (admin) |
| `POST` | `/api/complaints/bulk-delete` | Delete many complaints (admin) |
| `POST` | `/api/uploads/evidence` | Upload file -> Supabase Storage |
| `GET` | `/api/reports/dashboard-summary` | Aggregate counters |

All protected endpoints expect a Supabase access token in the `Authorization: Bearer <token>` header.
