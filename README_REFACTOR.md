# AKAITSUKI refactor stage 6

Что усилено на этом этапе:

- Роли в админке перестали быть локальной декорацией и теперь управляются через Supabase Edge Function.
- Каталог тайтлов больше не хранится в Supabase как один большой JSON в `public.site_content`.
- Для каталога добавлена нормализованная схема:
  - `titles`
  - `title_alt_titles`
  - `title_genres`
  - `title_categories`
  - `title_seasons`
  - `title_episodes`
  - `episode_voiceovers`
  - `voiceover_players`
- Блок `О нас` остаётся в `public.site_content`, потому что для него JSON-структура всё ещё удобна и достаточно проста.
- Появился обновлённый слой `js/services/content-repository.js`:
  - грузит тайтлы из нормализованных таблиц Supabase
  - умеет fallback'нуться на legacy `site_content.titles`, если stage 5 schema ещё не применена
  - сохраняет локальный cache как offline/fallback слой
- В `js/services/supabase-db.js` добавлены методы для чтения и полной пересборки графа тайтлов через нормализованные таблицы.
- `supabase/schema.sql` теперь создаёт не только stage 4 таблицы, но и нормализованный content-graph для каталога.
- В schema добавлена автоматическая миграция legacy `site_content.titles` -> нормализованные таблицы при первом запуске SQL, если таблицы каталога ещё пусты.
- В `js/config.runtime.js` отключены:
  - `enableLocalAdminFallback`
  - `allowGuestFavorites`
- Добавлен `supabase/functions/admin-roles/index.ts` для server-side выдачи ролей через service role внутри Edge Function.
- `profiles` теперь автоматически синхронизируется из `auth.users` через SQL trigger, чтобы owner мог находить новых пользователей по почте без локального кеша.

## Что это даёт теперь

Сайт уже работает в более взрослой схеме:

- плеер и админка читают каталог как нормальные сущности, а не как один giant JSON blob
- серии, озвучки и плееры можно хранить отдельно и расширять дальше без ломки всей структуры
- legacy stage 4 контент не теряется, потому что schema.sql умеет импортировать `site_content.titles` в новые таблицы
- about-блок остаётся простым и дешёвым в поддержке через `site_content`

## Структура JS

- `js/app.js` — точка входа и верхнеуровневая склейка UI и состояния.
- `js/config.runtime.js` — runtime-настройки Supabase, флаги синхронизации, strict remote-first каталог и production-режим без локального role fallback.
- `js/data/projects.js` — seed-данные каталога для первого запуска и fallback.
- `js/data/options.js` — опции сортировки и метаданные фильтров.
- `js/services/supabase.js` — browser-клиент Supabase Auth.
- `js/services/admin-roles.js` — вызовы Edge Function для списка ролей, поиска пользователей и смены роли.
- `js/services/supabase-db.js` — безопасные таблицы Supabase: profiles / favorites / ratings / normalized titles / about-content.
- `js/services/app-repository.js` — слой чтения и записи favorites / ratings / profiles.
- `js/services/content-repository.js` — слой чтения и записи normalized titles / about.
- `js/utils/helpers.js` — общие утилиты.
- `js/utils/storage.js` — безопасный localStorage.
- `js/utils/media.js` — media-утилиты.
- `js/utils/url.js` — sanitize URL и безопасный CSS `url(...)`.
- `js/ui/templates.js` — HTML-шаблоны карточек, тайтлов, модалок и админки.
- `js/ui/dialogs.js` — модалки и focus trap.
- `js/features/content-model.js` — нормализация тайтлов, медиаструктуры и about-content.
- `js/features/favorites-controller.js` — логика избранного и UI-синхронизация.
- `js/features/view-controller.js` — роутинг view и scroll state.
- `js/features/auth-controller.js` — auth helpers и чтение роли из JWT.
- `js/features/admin-ui-state.js` — снимок/восстановление состояния админки.
- `js/features/title-player-controller.js` — выбор серии/озвучки/плеера на странице тайтла.

## Что уже Supabase-ready

Сейчас проект уже умеет:

- брать роль пользователя только из `session.user.app_metadata.role` или `session.user.user_metadata.role`
- менять роль пользователя только через server-side Edge Function
- искать пользователей для ролей через Supabase `profiles`, а не через localStorage-кеш
- хранить избранное только для авторизованного пользователя
- синхронизировать профили через `profiles`
- синхронизировать избранное через `favorite_titles`
- синхронизировать рейтинги через `title_ratings`
- читать и сохранять каталог через нормализованные таблицы Supabase
- читать и сохранять блок `О нас` через `site_content` entry `about`

## Как включить реальную синхронизацию

1. В Supabase SQL Editor выполни `supabase/schema.sql`.
2. Проверь `supabaseUrl` и `supabaseKey` в `js/config.runtime.js`.
3. Оставь:

```js
supabaseSync: {
  enabled: true,
  profiles: true,
  favorites: true,
  ratings: true,
  content: true
}
```

4. Убедись, что у админа в JWT есть `app_metadata.role = 'owner'` или `app_metadata.role = 'admin'`.
5. После изменения роли перелогинься, чтобы JWT обновился.

## Что ещё пока локальное

Пока в localStorage остаются:

- UI-черновики админки
- тема
- временный local cache remote-content на случай офлайна

## Что ещё не на 100% remote-only

После stage 6 критичный хвост по ролям закрыт, но ещё можно усилить архитектуру:

1. заменить полную пересборку всего content-graph на точечные CRUD-операции по таблицам
2. добавить загрузку постеров в Supabase Storage
3. аварийный seed/fallback каталога уже отключён в runtime-конфиге, каталог теперь идёт из Supabase или из кеша удалённого контента
4. завести отдельные таблицы для команды, заметок редакторов и publish-статусов


## Stage 8

- Сохранение каталога переведено с полной перезаписи всего графа на точечные операции по одному тайтлу.
- При редактировании серий, создании, обновлении и удалении тайтла в Supabase синхронизируется только затронутая сущность.
- Массовая полная замена графа оставлена как резервный сервисный путь, но больше не используется основным admin-flow.

## Полировка админки: постеры и превью

- В полях `Постер` и `Превью` можно вставлять как абсолютные ссылки (`https://...`), так и относительные пути из папки сайта, например `assets/images/posters/naruto.webp`.
- Для ручного сценария рекомендуется хранить изображения в папках вроде `assets/images/posters/` и `assets/images/previews/`.
- Админка показывает живое превью изображения и сразу подсказывает, если путь выглядит некорректным или файл не открылся.
