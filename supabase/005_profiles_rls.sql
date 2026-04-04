drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_owner_read_all" on public.profiles;
drop policy if exists "profiles_owner_update_all" on public.profiles;

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
