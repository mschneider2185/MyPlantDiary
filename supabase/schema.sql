-- Enable UUIDs
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  username text unique,
  created_at timestamptz default now()
);

-- Species master data (reference)
create table if not exists public.species (
  id uuid primary key default uuid_generate_v4(),
  common_name text,
  scientific_name text,
  family text,
  origin text,
  water_needs text,
  light_needs text,
  soil text,
  humidity text,
  temperature text,
  about text,
  care_summary text,
  care_difficulty text,
  watering text,
  sunlight text,
  temperature_range text,
  temperature_notes text,
  soil_type text,
  soil_ph_min numeric,
  soil_ph_max numeric,
  soil_mix text[],
  care_tips text[],
  profile_generated_at timestamptz,
  profile_source text,
  created_at timestamptz default now()
);

-- Plants owned by a user
create table if not exists public.plants (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null,
  species_id uuid references public.species(id) on delete set null,
  nickname text,
  image_url text,
  created_at timestamptz default now()
);

-- Identification history
create table if not exists public.plant_identifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  species_id uuid references public.species(id) on delete set null,
  provider text not null,
  provider_confidence numeric,
  common_name text,
  scientific_name text,
  family text,
  genus text,
  notes text,
  alternatives jsonb default '[]'::jsonb,
  provider_payload jsonb not null,
  image_url text,
  created_at timestamptz default now()
);

-- Care reminders
create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references public.plants(id) on delete cascade,
  kind text check (kind in ('water','fertilize','repot')),
  schedule text, -- ISO RRULE or cron-like string
  next_at timestamptz,
  created_at timestamptz default now()
);

-- Journal entries
create table if not exists public.journal (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references public.plants(id) on delete cascade,
  body text,
  photo_url text,
  created_at timestamptz default now()
);
