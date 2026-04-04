# Supabase-ready plan

Проект пока остаётся локальным. Этот блок добавлен как безопасная подготовка, чтобы потом подключить Supabase без большого переписывания UI.

## Что уже подготовлено

- `js/config/app.config.js` — режим данных (`local` по умолчанию)
- `js/api/db.js` — выбирает адаптер по конфигу
- `js/api/supabase-db.adapter.js` — заглушка будущего адаптера
- `js/config/supabase.config.example.js` — пример конфига
- `js/api/supabase.client.example.js` — пример клиента
- `supabase/001_core_schema.sql` — базовая схема таблиц
- `supabase/002_rls_policies.sql` — политики доступа

## Почему это не ломает проект

Сейчас `appConfig.dataMode = 'local'`, поэтому приложение продолжает работать на локальном `localStorage`.

Пока ты не подключишь реальный Supabase, ничего переключать не нужно.

## Будущий порядок подключения

1. Создать проект в Supabase.
2. Выполнить `supabase/001_core_schema.sql`.
3. Выполнить `supabase/002_rls_policies.sql`.
4. Создать файл `js/config/supabase.config.js` на основе example-файла.
5. Реализовать `js/api/supabase-db.adapter.js` и нужные `*.api.js`.
6. Перенести локальные данные.
7. Только после проверки поменять `appConfig.dataMode` с `local` на `supabase`.

## Что переносить в первую очередь

1. `profiles`
2. `titles`
3. `genres`
4. `episodes`
5. `favorites`
6. `ratings`
7. `about_content`
8. `team_members`

## Что пока специально не трогалось

- UI
- роутинг
- текущая локальная авторизация
- локальный seed в `js/services/storage.js`

Это сделано специально, чтобы не ломать локальную разработку.
