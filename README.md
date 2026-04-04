# AKAITSUKI — local MVP

Современный фронтенд-проект библиотеки аниме для команды озвучки AKAITSUKI.

## Что внутри
- Локальная авторизация через `localStorage`
- Роли пользователей (`user`, `admin`)
- Админ-панель: добавление и удаление аниме
- Каталог аниме с фильтрами
- Избранное, привязанное к пользователю
- Тёмная / светлая тема
- Архитектура с сервисным слоем под будущее подключение Supabase

## Демо-аккаунты
- Админ: `admin@akaitsuki.local` / `admin12345`
- Пользователь: `viewer@akaitsuki.local` / `viewer12345`

## Структура
```text
akaitsuki-site/
├─ index.html
├─ styles/
│  └─ main.css
├─ js/
│  ├─ app.js
│  ├─ services/
│  │  ├─ storage.js
│  │  ├─ auth.service.js
│  │  ├─ anime.service.js
│  │  ├─ favorites.service.js
│  │  └─ theme.service.js
│  └─ ui/
│     ├─ auth-modal.js
│     └─ toast.js
└─ README.md
```

## Как запустить
Достаточно открыть `index.html` через локальный сервер.

Примеры:
- VS Code + Live Server
- `npx serve .`
- `python -m http.server`

## Почему потом легко подключить Supabase
Сейчас UI работает не с `localStorage` напрямую, а через сервисы:
- `authService`
- `animeService`
- `favoritesService`

Позже можно заменить только реализацию сервисов:
- `authService.login/register/logout` → Supabase Auth
- `animeService.list/create/remove` → таблица `anime`
- `favoritesService.toggle/getUserFavorites` → таблица `favorites`

## Предлагаемая структура Supabase

### Таблицы
#### `profiles`
- `id uuid primary key` — `auth.users.id`
- `name text not null`
- `role text check (role in ('user', 'admin')) default 'user'`
- `avatar_url text null`
- `created_at timestamptz default now()`

#### `anime`
- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `poster_url text not null`
- `description text not null`
- `genres text[] not null default '{}'`
- `status text not null`
- `episodes integer not null default 0`
- `year integer not null`
- `video_url text null`
- `created_by uuid references profiles(id)`
- `created_at timestamptz default now()`

#### `favorites`
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references profiles(id) on delete cascade`
- `anime_id uuid references anime(id) on delete cascade`
- `created_at timestamptz default now()`
- `unique(user_id, anime_id)`

### RLS логика
- `profiles`: пользователь читает себя, админ читает всех
- `anime`: читать всем, изменять только `admin`
- `favorites`: пользователь управляет только своими записями

## План следующего этапа
1. Подключить Supabase project
2. Поднять таблицы и RLS policies
3. Перенести auth на Supabase Auth
4. Перенести каталог и избранное на реальные таблицы
5. Добавить загрузку постеров в Supabase Storage
6. Сделать отдельные страницы с SSR/SPA-роутингом при необходимости
