const DB_KEY = 'akaitsuki_local_db_v4';

const now = () => new Date().toISOString();

const defaultDb = {
  users: [
    { id: 'user-admin', name: 'AKAITSUKI Admin', email: 'admin@akaitsuki.local', password: 'admin12345', role: 'owner', createdAt: now() },
    { id: 'user-editor', name: 'AKAITSUKI Editor', email: 'editor@akaitsuki.local', password: 'editor12345', role: 'admin', createdAt: now() },
    { id: 'user-demo', name: 'Demo Viewer', email: 'viewer@akaitsuki.local', password: 'viewer12345', role: 'user', createdAt: now() },
  ],
  anime: [
    {
      id: 'anime-1',
      contentType: 'anime',
      title: 'Sousou no Frieren',
      altTitles: ['Фрирен, провожающая в последний путь', "Frieren: Beyond Journey's End"],
      poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80',
      description: 'Трогательное фэнтези-путешествие о времени, памяти и дружбе после великой победы над Королём Демонов.',
      genres: ['Фэнтези', 'Приключения', 'Драма'],
      year: 2023,
      releaseLabel: '2023 Осень–2024 Зима',
      titleType: 'Сериал',
      ageRating: 'PG-13',
      studio: 'Madhouse',
      director: 'Кэйитиро Сайто',
      totalEpisodes: 28,
      episodes: Array.from({ length: 28 }, (_, index) => ({
        id: `anime-1-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'После великой победы' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `anime-1-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `anime-1-player-${index + 1}-1`, name: 'Sibnet', url: 'https://video.sibnet.ru/shell.php?videoid=1' }] },
        ],
      })),
      createdAt: now(),
    },
    {
      id: 'anime-2',
      contentType: 'anime',
      title: 'Oshi no Ko',
      altTitles: ['Звёздное дитя', "Star's Child", '【推しの子】'],
      poster: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80',
      description: 'Глянцевая и болезненно честная история о шоу-бизнесе, славе и скрытой стороне индустрии.',
      genres: ['Драма', 'Психология', 'Музыка'],
      year: 2023,
      releaseLabel: '2023 Весна–2024 Лето',
      titleType: 'Сериал',
      ageRating: 'PG-13',
      studio: 'Doga Kobo',
      director: 'Дайсукэ Хирамаки',
      totalEpisodes: 26,
      episodes: Array.from({ length: 24 }, (_, index) => ({
        id: `anime-2-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'Мама и дети' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `anime-2-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `anime-2-player-${index + 1}-1`, name: 'Sibnet', url: 'https://video.sibnet.ru/shell.php?videoid=4' }] },
          { id: `anime-2-voice-${index + 1}-2`, name: 'Studio Voice', players: [{ id: `anime-2-player-${index + 1}-2`, name: 'Rutube', url: 'https://rutube.ru/play/embed/9876543' }] },
        ],
      })),
      createdAt: now(),
    },
    {
      id: 'series-1',
      contentType: 'series',
      title: 'Arcane',
      altTitles: ['Аркейн'],
      poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
      description: 'Стильный анимационный сериал о двух сёстрах, технологиях и конфликте миров Пилтовера и Зауна.',
      genres: ['Фэнтези', 'Экшен', 'Драма'],
      year: 2021,
      releaseLabel: '2021',
      ageRating: 'PG-13',
      country: 'Франция / США',
      director: 'Паскаль Шаррю',
      totalEpisodes: 18,
      episodes: Array.from({ length: 12 }, (_, index) => ({
        id: `series-1-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'Добро пожаловать на игровую площадку' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `series-1-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `series-1-player-${index + 1}-1`, name: 'Sibnet', url: 'https://video.sibnet.ru/shell.php?videoid=5' }] },
        ],
      })),
      createdAt: now(),
    },
    {
      id: 'series-2',
      contentType: 'series',
      title: 'The Last of Us',
      altTitles: ['Одни из нас'],
      poster: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=900&q=80',
      description: 'Постапокалиптическое road-movie о выживании, доверии и потере.',
      genres: ['Драма', 'Приключения', 'Экшен'],
      year: 2023,
      releaseLabel: '2023',
      ageRating: 'R-17',
      country: 'США',
      director: 'Крэйг Мэйзин',
      totalEpisodes: 9,
      episodes: Array.from({ length: 9 }, (_, index) => ({
        id: `series-2-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'Когда ты потерялся во тьме' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `series-2-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `series-2-player-${index + 1}-1`, name: 'Rutube', url: 'https://rutube.ru/play/embed/12345678' }] },
        ],
      })),
      createdAt: now(),
    },
    {
      id: 'series-3',
      contentType: 'series',
      title: 'Severance',
      altTitles: ['Разделение'],
      poster: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80',
      description: 'Корпоративный триллер о памяти, контроле и странных рабочих ритуалах.',
      genres: ['Триллер', 'Драма', 'Фантастика'],
      year: 2022,
      releaseLabel: '2022',
      ageRating: 'PG-13',
      country: 'США',
      director: 'Бен Стиллер',
      totalEpisodes: 20,
      episodes: Array.from({ length: 10 }, (_, index) => ({
        id: `series-3-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'Хорошие новости про ад' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `series-3-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `series-3-player-${index + 1}-1`, name: 'Sibnet', url: 'https://video.sibnet.ru/shell.php?videoid=6' }] },
        ],
      })),
      createdAt: now(),
    },
    {
      id: 'series-4',
      contentType: 'series',
      title: 'Wednesday',
      altTitles: ['Уэнсдэй'],
      poster: 'https://images.unsplash.com/photo-1516131206008-dd041a9764fd?auto=format&fit=crop&w=900&q=80',
      description: 'Мистический подростковый детектив с язвительным юмором и готической атмосферой.',
      genres: ['Комедия', 'Мистика', 'Драма'],
      year: 2022,
      releaseLabel: '2022',
      ageRating: 'PG-13',
      country: 'США',
      director: 'Тим Бёртон',
      totalEpisodes: 8,
      episodes: Array.from({ length: 8 }, (_, index) => ({
        id: `series-4-ep-${index + 1}`,
        number: index + 1,
        title: index === 0 ? 'Дитя среды полно горя' : `Эпизод ${index + 1}`,
        voiceovers: [
          { id: `series-4-voice-${index + 1}-1`, name: 'AKAITSUKI', players: [{ id: `series-4-player-${index + 1}-1`, name: 'Sibnet', url: 'https://video.sibnet.ru/shell.php?videoid=7' }] },
        ],
      })),
      createdAt: now(),
    },
  ],
  favorites: {},
  ratings: {
    'anime-1': { 'user-admin': 10, 'user-demo': 10 },
    'anime-2': { 'user-admin': 9, 'user-demo': 8 },
    'series-1': { 'user-admin': 9, 'user-demo': 9 },
    'series-2': { 'user-admin': 8 },
  },
  about: {
    title: 'Кто мы такие',
    description: 'AKAITSUKI — команда озвучки, которая собирает вокруг себя людей, любящих хорошие истории, чистый звук и аккуратную подачу. Мы работаем над аниме и сериалами, следим за единым стилем и стараемся делать релизы так, чтобы их было приятно смотреть и слушать.',
    team: [
      { id: 'team-1', name: 'Akai', nick: 'Akai', role: 'даббер' },
      { id: 'team-2', name: 'Tsuki', nick: 'Tsuki', role: 'тайминг / QC' },
      { id: 'team-3', name: 'Ren', nick: 'Ren', role: 'монтаж и сборка плееров' },
      { id: 'team-4', name: 'Hoshi', nick: 'Hoshi', role: 'переводчик' },
    ],
    socials: [
      { id: 'social-yt', label: 'YouTube', icon: '', href: 'https://youtube.com/' },
      { id: 'social-discord', label: 'Discord', icon: '', href: 'https://discord.com/' },
      { id: 'social-vk', label: 'VK', icon: '', href: 'https://vk.com/' },
      { id: 'social-tg', label: 'Telegram', icon: '', href: 'https://t.me/' }
    ],
  },
  session: null,
  theme: 'dark',
};

function clone(data) { return JSON.parse(JSON.stringify(data)); }

function mergeLegacyAnime(item) {
  if (!item) return item;
  return {
    contentType: item.contentType || item.category || 'anime',
    country: item.country || '',
    altTitles: item.altTitles || [],
    addedEpisodes: Number(item.addedEpisodes ?? item.episodes?.length ?? 0),
    totalEpisodes: Number(item.totalEpisodes ?? item.episodes?.length ?? item.addedEpisodes ?? 0),
    year: Number(item.year || new Date().getFullYear()),
    releaseLabel: item.releaseLabel || `${item.year || new Date().getFullYear()}`,
    titleType: item.titleType || 'Сериал',
    ageRating: item.ageRating || 'PG-13',
    studio: item.studio || 'Не указана',
    director: item.director || 'Не указан',
    voiceovers: item.voiceovers || ['AKAITSUKI'],
    players: item.players || [],
    episodes: item.episodes || [],
    ...item,
  };
}


function ensureDemoUsers(users = []) {
  const required = [
    { id: 'user-admin', name: 'AKAITSUKI Admin', email: 'admin@akaitsuki.local', password: 'admin12345', role: 'owner', createdAt: now() },
    { id: 'user-editor', name: 'AKAITSUKI Editor', email: 'editor@akaitsuki.local', password: 'editor12345', role: 'admin', createdAt: now() },
    { id: 'user-demo', name: 'Demo Viewer', email: 'viewer@akaitsuki.local', password: 'viewer12345', role: 'user', createdAt: now() },
  ];

  const byEmail = new Map((users || []).map((user) => [String(user.email || '').trim().toLowerCase(), user]));
  required.forEach((demoUser) => {
    const email = String(demoUser.email).trim().toLowerCase();
    if (!byEmail.has(email)) {
      users.push({ ...demoUser });
      byEmail.set(email, users[users.length - 1]);
      return;
    }
    const target = byEmail.get(email);
    target.id = target.id || demoUser.id;
    target.name = target.name || demoUser.name;
    target.password = target.password || demoUser.password;
    target.role = demoUser.role;
  });

  return users;
}

function normalizeUserRole(user = {}) {
  const email = String(user.email || '').trim().toLowerCase();
  if (email === 'admin@akaitsuki.local') return { ...user, role: 'owner' };
  if (email === 'editor@akaitsuki.local') return { ...user, role: 'admin' };
  if (email === 'viewer@akaitsuki.local') return { ...user, role: 'user' };
  return user.role ? user : { ...user, role: 'user' };
}

function normalizeDbShape(parsed) {
  const merged = { ...clone(defaultDb), ...parsed };
  merged.users = ensureDemoUsers((merged.users || clone(defaultDb.users)).map(normalizeUserRole));
  merged.anime = (merged.anime || []).map(mergeLegacyAnime);
  merged.ratings = merged.ratings || {};
  merged.favorites = merged.favorites || {};
  merged.about = { ...clone(defaultDb.about), ...(merged.about || {}) };
  return merged;
}

function ensureDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDb));
    return clone(defaultDb);
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeDbShape(parsed);
    localStorage.setItem(DB_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDb));
    return clone(defaultDb);
  }
}

export function getDb() { return ensureDb(); }

export function updateDb(updater) {
  const current = ensureDb();
  const nextState = updater(clone(current));
  localStorage.setItem(DB_KEY, JSON.stringify(nextState));
  return nextState;
}

export function resetDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(defaultDb));
  return clone(defaultDb);
}
