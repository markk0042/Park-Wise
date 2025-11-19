-- Profiles table keeps user metadata synced with Supabase Auth
create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  full_name text,
  role text not null default 'user',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  enable row level security;

create policy "Profiles are readable by owner" on public.profiles
  for select
  using (auth.uid() = id);

-- Vehicles table
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_plate text not null,
  permit_number text,
  parking_type text not null default 'Green',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
create policy "Allow read for authenticated" on public.vehicles
  for select using (auth.role() = 'authenticated');

-- Parking logs table
create table if not exists public.parking_logs (
  id uuid primary key default gen_random_uuid(),
  registration_plate text not null,
  parking_type text not null,
  notes text,
  log_date date default current_date,
  log_time text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.parking_logs enable row level security;
create policy "Allow read for authenticated" on public.parking_logs
  for select using (auth.role() = 'authenticated');

-- Complaints table
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text not null,
  related_plate text,
  location text not null,
  status text not null default 'new',
  reported_date date default current_date,
  reported_time text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.complaints enable row level security;
create policy "Allow read for admins" on public.complaints
  for select using (EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "Allow insert for approved" on public.complaints
  for insert with check (EXISTS (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'
  ));
