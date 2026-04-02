const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 2;

function isValidUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return false;
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function splitGenres(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEpisodeTitle(title = '', number = 1) {
  const text = String(title || '').trim();
  return text || `Эпизод ${number}`;
}

export function validateAdminDraft(draft = {}) {
  const title = String(draft.title || '').trim();
  const description = String(draft.description || '').trim();
  const poster = String(draft.poster || '').trim();
  const genres = splitGenres(draft.genres);
  const year = Number(draft.year);
  const totalEpisodes = Number(draft.totalEpisodes);
  const episodes = Array.isArray(draft.episodes) ? draft.episodes : [];

  if (title.length < 2) throw new Error('Название должно быть не короче 2 символов');
  if (description.length < 20) throw new Error('Описание должно быть не короче 20 символов');
  if (!isValidUrl(poster)) throw new Error('Укажи корректный URL постера');
  if (!genres.length) throw new Error('Добавь хотя бы один жанр');
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) throw new Error(`Год должен быть от ${MIN_YEAR} до ${MAX_YEAR}`);
  if (!Number.isInteger(totalEpisodes) || totalEpisodes < 1) throw new Error('Количество серий должно быть больше нуля');
  if (!episodes.length) throw new Error('Добавь хотя бы одну серию');
  if (totalEpisodes < episodes.length) throw new Error('Общее число серий не может быть меньше уже добавленных');

  const seenEpisodeNumbers = new Set();

  episodes.forEach((episode, index) => {
    const episodeNumber = Number(episode.number);
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      throw new Error(`У серии ${index + 1} некорректный номер`);
    }
    if (seenEpisodeNumbers.has(episodeNumber)) {
      throw new Error(`Номер серии ${episodeNumber} повторяется`);
    }
    seenEpisodeNumbers.add(episodeNumber);
    episode.title = normalizeEpisodeTitle(episode.title, episodeNumber);

    const voiceovers = Array.isArray(episode.voiceovers) ? episode.voiceovers : [];
    if (!voiceovers.length) throw new Error(`У серии ${episodeNumber} должна быть хотя бы одна озвучка`);

    voiceovers.forEach((voiceover, voiceIndex) => {
      const voiceName = String(voiceover?.name || '').trim();
      if (!voiceName) {
        throw new Error(`У серии ${episodeNumber} у озвучки ${voiceIndex + 1} нет названия`);
      }
      const players = Array.isArray(voiceover.players) ? voiceover.players : [];
      if (!players.length) throw new Error(`У озвучки «${voiceName}» в серии ${episodeNumber} нет плееров`);

      players.forEach((player, playerIndex) => {
        const playerName = String(player?.name || '').trim();
        const playerUrl = String(player?.url || '').trim();
        if (!playerName) throw new Error(`У серии ${episodeNumber} у плеера ${playerIndex + 1} нет названия`);
        if (!isValidUrl(playerUrl)) throw new Error(`У плеера «${playerName}» в серии ${episodeNumber} некорректная ссылка`);
      });
    });
  });

  return {
    ...draft,
    title,
    description,
    poster,
    genres: genres.join(', '),
    year,
    totalEpisodes,
    episodes,
  };
}

export { isValidUrl, splitGenres };
