drop policy if exists "titles_public_read" on public.titles;
drop policy if exists "titles_admin_write" on public.titles;
drop policy if exists "ratings_public_read" on public.title_ratings;
drop policy if exists "ratings_own_write" on public.title_ratings;
drop policy if exists "favorites_own_read" on public.favorites;
drop policy if exists "favorites_own_write" on public.favorites;
drop policy if exists "site_content_public_read" on public.site_content;
drop policy if exists "site_content_admin_write" on public.site_content;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_owner_read_all" on public.profiles;
drop policy if exists "profiles_owner_update_all" on public.profiles;

create or replace function public.is_admin_or_owner(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role in ('admin', 'owner')
  );
$$;

revoke all on function public.is_admin_or_owner(uuid) from public;
grant execute on function public.is_admin_or_owner(uuid) to authenticated;

create or replace function public.is_owner(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'owner'
  );
$$;

revoke all on function public.is_owner(uuid) from public;
grant execute on function public.is_owner(uuid) to authenticated;

create policy "titles_public_read"
on public.titles
for select
to anon, authenticated
using (true);

create policy "titles_admin_write"
on public.titles
for all
to authenticated
using (public.is_admin_or_owner(auth.uid()))
with check (public.is_admin_or_owner(auth.uid()));

create policy "ratings_public_read"
on public.title_ratings
for select
to anon, authenticated
using (true);

create policy "ratings_own_write"
on public.title_ratings
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "favorites_own_read"
on public.favorites
for select
to authenticated
using (user_id = auth.uid());

create policy "favorites_own_write"
on public.favorites
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "site_content_public_read"
on public.site_content
for select
to anon, authenticated
using (true);

create policy "site_content_admin_write"
on public.site_content
for all
to authenticated
using (public.is_admin_or_owner(auth.uid()))
with check (public.is_admin_or_owner(auth.uid()));

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_owner_read_all"
on public.profiles
for select
to authenticated
using (public.is_owner(auth.uid()));

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_owner_update_all"
on public.profiles
for update
to authenticated
using (public.is_owner(auth.uid()))
with check (public.is_owner(auth.uid()));
