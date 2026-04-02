# Local -> Supabase mapping

Ниже прямое соответствие между текущей локальной структурой и будущей БД.

## users
Локально:
- `users[]`

В Supabase:
- `auth.users`
- `profiles` (`role`: user/admin/owner)

### Примечание
Пароль из локальной базы переносить нельзя. Пользователи в Supabase создаются через Auth.

## anime
Локально:
- `anime[]`

В Supabase:
- `titles`

### Поля
- `id` -> `titles.id`
- `contentType` -> `titles.content_type`
- `title` -> `titles.title`
- `description` -> `titles.description`
- `poster` -> `titles.poster_url`
- `year` -> `titles.year`
- `releaseLabel` -> `titles.release_label`
- `titleType` -> `titles.title_type`
- `ageRating` -> `titles.age_rating`
- `studio` -> `titles.studio`
- `country` -> `titles.country`
- `director` -> `titles.director`
- `totalEpisodes` -> `titles.total_episodes`

## altTitles
Локально:
- `anime[].altTitles[]`

В Supabase:
- `title_alt_names`

## genres
Локально:
- `anime[].genres[]`

В Supabase:
- `genres`
- `title_genres`

## episodes
Локально:
- `anime[].episodes[]`

В Supabase:
- `episodes`

## voiceovers
Локально:
- `anime[].episodes[].voiceovers[]`

В Supabase:
- `voiceovers`

## players
Локально:
- `anime[].episodes[].voiceovers[].players[]`

В Supabase:
- `players`

## favorites
Локально:
- `users[].favorites`

В Supabase:
- `favorites`

## ratings
Локально:
- `ratings[titleId][userId] = value`

В Supabase:
- `ratings`

## about
Локально:
- `about.title`
- `about.description`
- `about.team[]`
- `about.socials[]`

В Supabase:
- `about_content`
- `team_members`
- `about_social_links`
