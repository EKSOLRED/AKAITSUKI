import { buildEmbedMarkup, getVisibleEpisodes, getVisibleSeasons } from './content-model.js';

export function ensureTitlePlayerState(titlePlayerMap, titleId) {
  if (!titlePlayerMap[titleId]) {
    titlePlayerMap[titleId] = { seasonId: null, episodeId: null, voiceoverId: null, playerId: null };
  }
  return titlePlayerMap[titleId];
}

export function getLinkedTrailerForTitle(projects, titleId) {
  return [...projects]
    .filter(item => item.type === 'trailer' && Number(item.linkedTitleId || 0) === Number(titleId || 0))
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || Number(b.updatedOrder || 0) - Number(a.updatedOrder || 0))[0] || null;
}

function getSeasonLabel(season, index) {
  const number = Number(season?.number || index + 1) || index + 1;
  return `Сезон ${number}`;
}

function resolvePlayerSelection({ project, titlePlayerMap, titleId }) {
  const stored = ensureTitlePlayerState(titlePlayerMap, titleId);
  const seasons = getVisibleSeasons(project);
  const season = seasons.find(item => item.id === stored.seasonId) || seasons[0] || null;
  const episodes = season?.episodes || [];
  const episode = episodes.find(item => item.id === stored.episodeId) || episodes[0] || null;
  const voiceovers = episode?.voiceovers || [];
  const voiceover = voiceovers.find(item => item.id === stored.voiceoverId) || voiceovers[0] || null;
  const players = voiceover?.players || [];
  const player = players.find(item => item.id === stored.playerId) || players[0] || null;

  titlePlayerMap[titleId] = {
    seasonId: season?.id || null,
    episodeId: episode?.id || null,
    voiceoverId: voiceover?.id || null,
    playerId: player?.id || null
  };

  return { seasons, season, episodes, episode, voiceovers, voiceover, players, player };
}

export function getTitlePlayerViewModel({ project, titlePlayerMap }) {
  const visibleEpisodes = getVisibleEpisodes(project);
  if (!visibleEpisodes.length) {
    return {
      selectedSeasonId: '',
      selectedSeasonLabel: 'Сезон не выбран',
      seasonOptions: [],
      selectedEpisodeId: '',
      selectedEpisodeLabel: 'Серия не выбрана',
      episodeOptions: [{ value: '', label: 'Нет серий' }],
      selectedVoiceoverId: '',
      selectedVoiceoverLabel: 'Озвучка не выбрана',
      voiceoverOptions: [{ value: '', label: 'Нет озвучек' }],
      voiceoverWidthCh: 20,
      currentPlayerMarkup: '',
      playerOptions: []
    };
  }

  const { seasons, season, episodes, episode, voiceovers, voiceover, players, player } = resolvePlayerSelection({
    project,
    titlePlayerMap,
    titleId: project.id
  });

  return {
    selectedSeasonId: season?.id || '',
    selectedSeasonLabel: season ? getSeasonLabel(season, seasons.findIndex(item => item.id === season.id)) : 'Сезон не выбран',
    seasonOptions: seasons.length > 1 ? seasons.map((item, index) => ({ value: item.id, label: getSeasonLabel(item, index) })) : [],
    selectedEpisodeId: episode?.id || '',
    selectedEpisodeLabel: episode ? `Серия ${episode.number}` : 'Серия не выбрана',
    episodeOptions: episodes.map(item => ({ value: item.id, label: `Серия ${item.number}` })),
    selectedVoiceoverId: voiceover?.id || '',
    selectedVoiceoverLabel: voiceover?.name || 'Озвучка не выбрана',
    voiceoverOptions: voiceovers.map(item => ({ value: item.id, label: item.name })),
    voiceoverWidthCh: Math.max(18, ...voiceovers.map(item => String(item.name || '').length + 3), 20),
    currentPlayerMarkup: player ? buildEmbedMarkup(player.src, `${project.title} • ${voiceover?.name || 'Плеер'}`) : '',
    playerOptions: players.map(item => ({ value: item.id, label: item.name })),
    selectedPlayerId: player?.id || ''
  };
}

export function updateTitlePlayerSelection({ project, titlePlayerMap, titleId, key, value }) {
  const current = ensureTitlePlayerState(titlePlayerMap, titleId);
  const next = { ...current, [key]: value };

  if (key === 'seasonId') {
    next.episodeId = null;
    next.voiceoverId = null;
    next.playerId = null;
  }
  if (key === 'episodeId') {
    next.voiceoverId = null;
    next.playerId = null;
  }
  if (key === 'voiceoverId') {
    next.playerId = null;
  }

  titlePlayerMap[titleId] = next;
  resolvePlayerSelection({ project, titlePlayerMap, titleId });
}
