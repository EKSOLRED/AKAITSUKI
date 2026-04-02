-- AKAITSUKI core schema
-- Apply after enabling extensions:
-- create extension if not exists pgcrypto;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content_type text not null check (content_type in ('anime', 'series', 'movie', 'ova', 'other')),
  title text not null,
  description text not null,
  poster_url text,
  year int check (year between 1900 and 2100),
  release_label text,
  title_type text,
  age_rating text,
  studio text,
  country text,
  director text,
  total_episodes int not null default 0 check (total_episodes >= 0),
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.title_alt_names (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (title_id, name)
);

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.title_genres (
  title_id uuid not null references public.titles(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (title_id, genre_id)
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  number int not null check (number > 0),
  title text not null,
  created_at timestamptz not null default now(),
  unique (title_id, number)
);

create table if not exists public.voiceovers (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (episode_id, name)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  voiceover_id uuid not null references public.voiceovers(id) on delete cascade,
  name text not null,
  embed_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  value int not null check (value between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.about_content (
  id int primary key default 1 check (id = 1),
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nick text,
  role text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_titles_content_type on public.titles(content_type);
create index if not exists idx_titles_year on public.titles(year desc);
create index if not exists idx_titles_published on public.titles(is_published);
create index if not exists idx_episodes_title_id on public.episodes(title_id);
create index if not exists idx_voiceovers_episode_id on public.voiceovers(episode_id);
create index if not exists idx_players_voiceover_id on public.players(voiceover_id);
create index if not exists idx_favorites_title_id on public.favorites(title_id);
create index if not exists idx_ratings_title_id on public.ratings(title_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_titles_updated_at on public.titles;
create trigger trg_titles_updated_at
before update on public.titles
for each row execute function public.set_updated_at();

drop trigger if exists trg_ratings_updated_at on public.ratings;
create trigger trg_ratings_updated_at
before update on public.ratings
for each row execute function public.set_updated_at();

drop trigger if exists trg_team_members_updated_at on public.team_members;
create trigger trg_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

create or replace view public.title_rating_stats as
select
  t.id as title_id,
  coalesce(round(avg(r.value)::numeric, 2), 0) as average_rating,
  count(r.user_id) as ratings_count
from public.titles t
left join public.ratings r on r.title_id = t.id
group by t.id;
