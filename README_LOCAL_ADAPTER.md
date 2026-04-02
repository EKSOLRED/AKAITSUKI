# Local data adapter (phase 4)

В проект добавлен промежуточный data-access слой, чтобы потом подключить Supabase без массового переписывания UI.

## Что появилось

- `js/api/db.js` — единая точка доступа к активному адаптеру данных
- `js/api/local-db.adapter.js` — текущий локальный адаптер поверх `localStorage`
- `js/api/*.api.js` — API-слой для auth / titles / favorites / about / theme
- `js/repositories/*.repository.js` — низкоуровневый доступ к данным

## Как это работает сейчас

Пока проект полностью локальный:

UI -> services -> api -> repositories -> local adapter -> localStorage

## Зачем это нужно

Когда придёт время подключать Supabase, можно будет:

- оставить UI почти без изменений;
- заменить локальный адаптер на supabase-адаптер;
- постепенно переносить auth, titles, favorites, ratings и about.

## Важно

- `js/services/storage.js` пока сохранён как низкоуровневая локальная база и seed-данные.
- UI и страницы не должны обращаться к localStorage напрямую.
- новые фичи лучше добавлять уже через `api/repositories/services`, а не через прямой доступ к `storage.js`.

## После phase 5

Добавлен supabase-ready scaffold, но активным режимом остаётся `local`.
