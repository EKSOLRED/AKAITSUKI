export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createEmptyPlayer() {
  return { id: uid('player'), name: '', url: '' };
}

export function createEmptyVoiceover(name = '') {
  return { id: uid('voice'), name, players: [createEmptyPlayer()] };
}

export function createEmptyEpisode(number = '') {
  return { id: uid('episode'), number, title: '', voiceovers: [createEmptyVoiceover('')] };
}

export function renumberEpisodes(episodes = []) {
  episodes.forEach((episode, index) => {
    const nextNumber = index + 1;
    episode.number = nextNumber;
    const title = String(episode.title || '').trim();
    if (!title || /^Эпизод\s+\d+$/i.test(title) || /^Серия\s+\d+$/i.test(title)) {
      episode.title = `Эпизод ${nextNumber}`;
    }
  });
  return episodes;
}

export function getEpisodeById(draft, episodeId) {
  return (draft.episodes || []).find((episode) => episode.id === episodeId) || null;
}

export function addDraftEpisode(draft) {
  const episode = createEmptyEpisode((draft.episodes?.length || 0) + 1);
  draft.episodes = [...(draft.episodes || []), episode];
  renumberEpisodes(draft.episodes);
  return episode;
}

export function removeDraftEpisode(draft, episodeId) {
  draft.episodes = (draft.episodes || []).filter((episode) => episode.id !== episodeId);
  renumberEpisodes(draft.episodes);
  return draft.episodes;
}

export function createEmptyDraft(kind = 'anime') {
  return {
    contentType: kind,
    title: '',
    altTitles: '',
    poster: '',
    description: '',
    genres: '',
    year: '',
    releaseLabel: '',
    titleType: '',
    ageRating: '',
    studio: '',
    country: '',
    director: '',
    totalEpisodes: '',
    episodes: [],
  };
}

export function ensureAdminDraft(pageState) {
  if (!pageState.admin.draft) {
    const kind = pageState.admin.section === 'series' ? 'series' : 'anime';
    pageState.admin.draft = createEmptyDraft(kind);
  }
  return pageState.admin.draft;
}

export function normalizeDraftFromTitle(item) {
  return {
    contentType: item.contentType || 'anime',
    title: item.title || '',
    altTitles: (item.altTitles || []).join('\n'),
    poster: item.poster || '',
    description: item.description || '',
    genres: (item.genres || []).join(', '),
    year: item.year || '',
    releaseLabel: item.releaseLabel || '',
    titleType: item.titleType || '',
    ageRating: item.ageRating || '',
    studio: item.studio || '',
    country: item.country || '',
    director: item.director || '',
    totalEpisodes: item.totalEpisodes || '',
    episodes: (item.episodes || []).map((episode) => ({
      id: episode.id || uid('episode'),
      number: episode.number || '',
      title: episode.title || '',
      voiceovers: (episode.voiceovers || []).map((voiceover) => ({
        id: voiceover.id || uid('voice'),
        name: voiceover.name || '',
        players: (voiceover.players || []).map((player) => ({
          id: player.id || uid('player'),
          name: player.name || '',
          url: player.url || '',
        })),
      })),
    })),
  };
}

export function resetAdminDraftState(pageState, kind, { keepDraft = false } = {}) {
  pageState.admin.editingId = null;
  if (!keepDraft) pageState.admin.draft = createEmptyDraft(kind);
  pageState.admin.activeVoiceTabs = {};
  pageState.admin.confirmRemoveVoice = null;
}
