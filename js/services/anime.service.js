import { titlesApi } from '../api/titles.api.js';

function normalizeTextList(value, separator = ',') {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeId(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizePlayer(player) {
  if (!player) return null;
  const name = String(player.name || '').trim();
  const url = String(player.url ?? player.embedUrl ?? '').trim();
  return name && url ? { id: player.id || makeId('player'), name, url } : null;
}

function normalizeVoiceover(voiceover) {
  if (!voiceover) return null;
  const name = String(voiceover.name || voiceover.title || '').trim();
  const players = (voiceover.players || []).map(normalizePlayer).filter(Boolean);
  return name ? { id: voiceover.id || makeId('voice'), name, players: players.length ? players : [] } : null;
}

function normalizeEpisodes(episodesInput = []) {
  return (episodesInput || [])
    .map((episode, index) => ({
      id: episode.id || makeId('episode'),
      number: Number(episode.number || index + 1),
      title: String(episode.title || `Эпизод ${index + 1}`).trim(),
      voiceovers: (episode.voiceovers || []).map(normalizeVoiceover).filter(Boolean),
    }))
    .sort((a, b) => a.number - b.number);
}

export function getAnimeStatus(item) {
  const added = Number(item.addedEpisodes || item.episodes?.length || 0);
  const total = Number(item.totalEpisodes || 0);
  return added < total ? 'Онгоинг' : 'Завершён';
}

export function getEpisodesLabel(item) {
  return `${Number(item.addedEpisodes || item.episodes?.length || 0)}/${Number(item.totalEpisodes || 0)}`;
}

export function getDisplayStatus(item) {
  const status = getAnimeStatus(item);
  if ((item.contentType || 'anime') === 'series' && status === 'Онгоинг') return 'Выходит';
  return status;
}

function normalizeAnime(item) {
  const episodes = normalizeEpisodes(item.episodes || []);
  const addedEpisodes = Number(item.addedEpisodes ?? episodes.length ?? 0);
  const totalEpisodes = Number(item.totalEpisodes ?? addedEpisodes);
  const voiceovers = [...new Set(episodes.flatMap((episode) => (episode.voiceovers || []).map((voice) => voice.name)))];
  const players = [...new Map(episodes.flatMap((episode) => (episode.voiceovers || []).flatMap((voice) => (voice.players || []).map((player) => [player.name, { name: player.name, embedUrl: player.url }])))).values()];

  return {
    ...item,
    contentType: item.contentType || 'anime',
    altTitles: normalizeTextList(item.altTitles, '\n'),
    genres: normalizeTextList(item.genres),
    title: String(item.title || '').trim(),
    poster: String(item.poster || '').trim(),
    description: String(item.description || '').trim(),
    year: Number(item.year || new Date().getFullYear()),
    releaseLabel: String(item.releaseLabel || item.year || '').trim(),
    titleType: String(item.titleType || 'Сериал').trim(),
    ageRating: String(item.ageRating || '').trim(),
    studio: String(item.studio || 'Не указана').trim(),
    country: String(item.country || '').trim(),
    director: String(item.director || '').trim(),
    episodes,
    voiceovers,
    players,
    addedEpisodes,
    totalEpisodes,
    status: getAnimeStatus({ addedEpisodes, totalEpisodes }),
    displayStatus: getDisplayStatus({ ...item, addedEpisodes, totalEpisodes }),
    episodesLabel: getEpisodesLabel({ addedEpisodes, totalEpisodes }),
  };
}

function buildPayload(payload = {}, current = null) {
  const episodes = normalizeEpisodes(payload.episodes || current?.episodes || []);
  const addedEpisodes = Number(payload.addedEpisodes || episodes.length || 0);
  const totalEpisodes = Number(payload.totalEpisodes || addedEpisodes || 1);

  return normalizeAnime({
    id: current?.id || payload.id || makeId('title'),
    contentType: payload.contentType || current?.contentType || 'anime',
    title: payload.title,
    altTitles: payload.altTitles,
    poster: payload.poster,
    description: payload.description,
    genres: payload.genres,
    year: Number(payload.year || current?.year || new Date().getFullYear()),
    releaseLabel: payload.releaseLabel,
    titleType: payload.titleType,
    ageRating: payload.ageRating,
    studio: payload.studio,
    country: payload.country,
    director: payload.director,
    addedEpisodes,
    totalEpisodes,
    episodes,
    createdAt: current?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export const animeService = {
  list(filters = {}) {
    const db = { anime: titlesApi.listTitles() };
    const search = (filters.search || '').toLowerCase().trim();
    const genre = filters.genre || 'all';
    const status = filters.status || 'all';
    const year = filters.year || 'all';
    const sort = filters.sort || 'newest';
    const kind = filters.kind || 'anime';

    let items = db.anime.map(normalizeAnime).filter((item) => item.contentType === kind);

    if (search) {
      items = items.filter((item) => [item.title, item.description, ...item.altTitles, ...item.genres, ...item.voiceovers].join(' ').toLowerCase().includes(search));
    }
    if (genre !== 'all') items = items.filter((item) => item.genres.includes(genre));
    if (status !== 'all') items = items.filter((item) => item.displayStatus === status || item.status === status);
    if (year !== 'all') items = items.filter((item) => String(item.year) === String(year));

    items.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'ru');
      if (sort === 'episodes') return b.addedEpisodes - a.addedEpisodes;
      if (sort === 'rating') return this.getRatingData(b.id).average - this.getRatingData(a.id).average;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || b.year - a.year;
    });

    return items;
  },

  getById(id) {
    const anime = titlesApi.getTitleById(id);
    return anime ? normalizeAnime(anime) : null;
  },

  create(payload) {
    const anime = buildPayload(payload);
    titlesApi.createTitle(anime);
    return anime;
  },

  update(id, payload) {
    const current = titlesApi.getTitleById(id);
    if (!current) throw new Error('Тайтл не найден');
    const anime = buildPayload(payload, current);
    titlesApi.updateTitle(id, anime);
    return anime;
  },

  remove(id) {
    titlesApi.removeTitle(id);
  },

  getMeta(kind = 'anime') {
    const normalized = titlesApi.listTitles().map(normalizeAnime).filter((item) => item.contentType === kind);
    return {
      genres: [...new Set(normalized.flatMap((item) => item.genres))].sort((a, b) => a.localeCompare(b, 'ru')),
      years: [...new Set(normalized.map((item) => item.year))].sort((a, b) => b - a),
      statuses: [...new Set(normalized.map((item) => item.displayStatus))],
    };
  },

  getTopRated(kind = 'anime', limit = 4) {
    return this.list({ kind, sort: 'rating' })
      .filter((item) => this.getRatingData(item.id).average >= 7)
      .slice(0, limit);
  },

  getLatestReleased(limit = 4) {
    return titlesApi.listTitles()
      .map(normalizeAnime)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, limit);
  },

  getRatingData(animeId) {
    const ratingsMap = titlesApi.getRatings(animeId) || {};
    const values = Object.values(ratingsMap).map(Number).filter((value) => value >= 1 && value <= 10);
    const average = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;
    return { average, count: values.length, users: ratingsMap };
  },

  setRating(animeId, userId, value) {
    const rating = Number(value);
    if (!userId) throw new Error('Нужно войти в аккаунт, чтобы поставить оценку');
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) throw new Error('Оценка должна быть от 1 до 10');
    titlesApi.setRating(animeId, userId, rating);
    return this.getRatingData(animeId);
  },
};
