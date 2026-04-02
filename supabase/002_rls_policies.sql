-- AKAITSUKI row level security
-- Run after 001_core_schema.sql

alter table public.profiles enable row level security;
alter table public.titles enable row level security;
alter table public.title_alt_names enable row level security;
alter table public.genres enable row level security;
alter table public.title_genres enable row level security;
alter table public.episodes enable row level security;
alter table public.voiceovers enable row level security;
alter table public.players enable row level security;
alter table public.favorites enable row level security;
alter table public.ratings enable row level security;
alter table public.about_content enable row level security;
alter table public.team_members enable row level security;
alter table public.about_social_links enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- public read content
drop policy if exists "titles_public_read" on public.titles;
create policy "titles_public_read"
on public.titles
for select
using (is_published = true or public.is_admin());

drop policy if exists "title_alt_names_public_read" on public.title_alt_names;
create policy "title_alt_names_public_read"
on public.title_alt_names
for select
using (
  exists (
    select 1 from public.titles t
    where t.id = title_alt_names.title_id
      and (t.is_published = true or public.is_admin())
  )
);

drop policy if exists "genres_public_read" on public.genres;
create policy "genres_public_read"
on public.genres
for select
using (true);

drop policy if exists "title_genres_public_read" on public.title_genres;
create policy "title_genres_public_read"
on public.title_genres
for select
using (
  exists (
    select 1 from public.titles t
    where t.id = title_genres.title_id
      and (t.is_published = true or public.is_admin())
  )
);

drop policy if exists "episodes_public_read" on public.episodes;
create policy "episodes_public_read"
on public.episodes
for select
using (
  exists (
    select 1 from public.titles t
    where t.id = episodes.title_id
      and (t.is_published = true or public.is_admin())
  )
);

drop policy if exists "voiceovers_public_read" on public.voiceovers;
create policy "voiceovers_public_read"
on public.voiceovers
for select
using (
  exists (
    select 1
    from public.episodes e
    join public.titles t on t.id = e.title_id
    where e.id = voiceovers.episode_id
      and (t.is_published = true or public.is_admin())
  )
);

drop policy if exists "players_public_read" on public.players;
create policy "players_public_read"
on public.players
for select
using (
  exists (
    select 1
    from public.voiceovers v
    join public.episodes e on e.id = v.episode_id
    join public.titles t on t.id = e.title_id
    where v.id = players.voiceover_id
      and (t.is_published = true or public.is_admin())
  )
);

drop policy if exists "about_public_read" on public.about_content;
create policy "about_public_read"
on public.about_content
for select
using (true);

drop policy if exists "team_public_read" on public.team_members;
create policy "team_public_read"
on public.team_members
for select
using (true);

drop policy if exists "about_social_links_public_read" on public.about_social_links;
create policy "about_social_links_public_read"
on public.about_social_links
for select
using (true);

-- favorites
drop policy if exists "favorites_own_read" on public.favorites;
create policy "favorites_own_read"
on public.favorites
for select
using (auth.uid() = user_id);

drop policy if exists "favorites_own_insert" on public.favorites;
create policy "favorites_own_insert"
on public.favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "favorites_own_delete" on public.favorites;
create policy "favorites_own_delete"
on public.favorites
for delete
using (auth.uid() = user_id);

-- ratings
drop policy if exists "ratings_public_read" on public.ratings;
create policy "ratings_public_read"
on public.ratings
for select
using (true);

drop policy if exists "ratings_own_insert" on public.ratings;
create policy "ratings_own_insert"
on public.ratings
for insert
with check (auth.uid() = user_id);

drop policy if exists "ratings_own_update" on public.ratings;
create policy "ratings_own_update"
on public.ratings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "ratings_own_delete" on public.ratings;
create policy "ratings_own_delete"
on public.ratings
for delete
using (auth.uid() = user_id);

-- admin content management
drop policy if exists "titles_admin_write" on public.titles;
create policy "titles_admin_write"
on public.titles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "title_alt_names_admin_write" on public.title_alt_names;
create policy "title_alt_names_admin_write"
on public.title_alt_names
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "genres_admin_write" on public.genres;
create policy "genres_admin_write"
on public.genres
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "title_genres_admin_write" on public.title_genres;
create policy "title_genres_admin_write"
on public.title_genres
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "episodes_admin_write" on public.episodes;
create policy "episodes_admin_write"
on public.episodes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "voiceovers_admin_write" on public.voiceovers;
create policy "voiceovers_admin_write"
on public.voiceovers
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "players_admin_write" on public.players;
create policy "players_admin_write"
on public.players
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "about_admin_write" on public.about_content;
create policy "about_admin_write"
on public.about_content
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "team_admin_write" on public.team_members;
create policy "team_admin_write"
on public.team_members
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "about_social_links_admin_write" on public.about_social_links;
create policy "about_social_links_admin_write"
on public.about_social_links
for all
using (public.is_admin())
with check (public.is_admin());
