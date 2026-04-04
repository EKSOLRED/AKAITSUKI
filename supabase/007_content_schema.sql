create table if not exists public.titles (
  id text primary key,
  content_type text not null default 'anime',
  title text not null,
  alt_titles jsonb not null default '[]'::jsonb,
  poster text not null default '',
  description text not null default '',
  genres jsonb not null default '[]'::jsonb,
  year integer not null default extract(year from now()),
  release_label text not null default '',
  title_type text not null default '',
  age_rating text not null default '',
  studio text not null default '',
  country text not null default '',
  director text not null default '',
  total_episodes integer not null default 0,
  added_episodes integer not null default 0,
  episodes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.title_ratings (
  title_id text not null references public.titles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value integer not null check (value between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (title_id, user_id)
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.site_content (
  key text primary key,
  title text not null default '',
  description text not null default '',
  team jsonb not null default '[]'::jsonb,
  socials jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.titles enable row level security;
alter table public.title_ratings enable row level security;
alter table public.favorites enable row level security;
alter table public.site_content enable row level security;
