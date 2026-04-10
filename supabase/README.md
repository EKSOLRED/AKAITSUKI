# Supabase setup

## Stage 6 roles via Edge Function

This stage keeps these parts in Supabase:
- profiles
- favorites
- ratings
- normalized titles content graph
- about page content
- real role management through an Edge Function

## How to enable it

1. Open Supabase SQL Editor.
2. Run `schema.sql`.
3. In `js/config.runtime.js` verify:
   - `supabaseUrl`
   - `supabaseKey`
4. Keep these sync flags enabled:
   - `profiles`
   - `favorites`
   - `ratings`
   - `content`
5. Deploy the Edge Function from `supabase/functions/admin-roles/index.ts`.
6. Sign in with a user whose `app_metadata.role` is `owner` if you want to manage roles from the UI.
7. Users with `app_metadata.role = owner` or `admin` can edit remote content.
8. Guest favorites are already disabled in runtime config.
9. Local admin role fallback is already disabled in runtime config.
10. Legacy `site_content.titles` browser fallback and local seed fallback for the catalog are disabled in runtime config.

## What happens during migration

`schema.sql` creates normalized catalog tables:
- `titles`
- `title_alt_titles`
- `title_genres`
- `title_categories`
- `title_seasons`
- `title_episodes`
- `episode_voiceovers`
- `voiceover_players`

If your old stage 4 database still has catalog data inside `public.site_content` under key `titles`, the SQL script automatically imports that JSON into the new normalized tables the first time it runs while the normalized tables are empty.

## Storage model

Catalog content is now stored in normalized tables.
About-page content is still stored in `public.site_content` as JSON under:
- `about`

The legacy `site_content.titles` row is kept only for backward compatibility / rollback safety and is no longer the primary source for the catalog in stage 5.

## What is still local

These remain local-first on purpose:
- admin draft UI state
- temporary form drafts
- theme
- cached remote content fallback

## Important note about roles

Write policies for catalog tables and `site_content` use the signed-in user's JWT `app_metadata.role`.
If you change a user's role in Supabase, sign out and sign in again so the refreshed JWT picks up the new claim.


## Deploying the Edge Function

### Dashboard way

1. Open **Edge Functions** in Supabase Dashboard.
2. Create a new function named `admin-roles`.
3. Paste the content of `supabase/functions/admin-roles/index.ts`.
4. Deploy it.

### CLI way

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-roles
```

The function runs server-side and uses `SUPABASE_SERVICE_ROLE_KEY`, which Supabase exposes to Edge Functions as an environment secret. Never put that key into the browser config.

## What changed in stage 6

- Admin role management no longer writes to `localStorage`.
- The Roles section now loads privileged users from Supabase through the `admin-roles` Edge Function.
- User search for role assignment now uses `profiles` on the server side.
- `profiles` is also synced automatically from `auth.users` by SQL trigger, so newly registered users become searchable without waiting for a manual profile save.

## What is still local

These remain local-first on purpose:
- admin draft UI state
- temporary form drafts
- theme
- cached remote content fallback

## Important note about roles

Write policies for catalog tables and `site_content` still use the signed-in user's JWT `app_metadata.role`.
The Edge Function only updates that server-side role safely.
If you change a user's role in Supabase, sign out and sign in again so the refreshed JWT picks up the new claim.


### Stage 8: point CRUD for catalog

Admin save flows now sync a single title graph instead of rewriting the entire catalog. Full graph replacement stays available as a fallback utility, but the main admin UI uses per-title upsert/delete operations.
