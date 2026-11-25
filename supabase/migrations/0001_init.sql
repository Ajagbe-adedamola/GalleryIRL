-- Lagos Street Culture Map — schema
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (
    category in ('fashion','art-studios','photography','music-venues','creative-spaces','galleries','street-art')
  ),
  subcategory text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  neighbourhood text not null,
  description text,
  instagram text,
  website text,
  images text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  verified boolean not null default false,
  approximate boolean not null default false,
  source text not null default 'community' check (source in ('community','osm','curated')),
  submitted_by uuid references auth.users(id) on delete set null,
  opening_hours text,
  osm_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists places_status_idx on public.places (status);
create index if not exists places_category_idx on public.places (category);
create index if not exists places_neighbourhood_idx on public.places (neighbourhood);
create index if not exists places_created_at_idx on public.places (created_at desc);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  stop_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists reports_place_idx on public.reports (place_id);

-- Admin allowlist. Managed with the service role (no client policies).
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Public bucket for place photography. 2 MB per object, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-images',
  'place-images',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
