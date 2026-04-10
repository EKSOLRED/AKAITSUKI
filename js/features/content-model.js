import { escapeHtml } from '../utils/helpers.js';
import { isVideoLike, getVideoSourceHost, getVideoThumbnailUrl } from '../utils/media.js';
import { sanitizeUrl } from '../utils/url.js';

const MAX_REMOTE_UPDATED_ORDER = 2147483647;

function normalizeUpdatedOrder(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return MAX_REMOTE_UPDATED_ORDER;
  return Math.min(MAX_REMOTE_UPDATED_ORDER, Math.trunc(parsed));
}

export const defaultAboutContent = {
  title: 'Мы собираем каталог, который выглядит как витрина, а не как таблица.',
  paragraphs: [
    'AKAITSUKI собирает аниме, сериалы и будущие релизы в одну аккуратную сцену, где каждый тайтл выглядит отдельно и запоминается не только названием, но и подачей.',
    'Сейчас это гибкая база для публикации, сортировки и быстрого просмотра проектов. Дальше сюда можно добавить полноценную админку на Supabase, роли, загрузку постеров, заметки команды и отдельные страницы релизов с контентом.'
  ],
  teamTitle: 'Члены команды',
  teamMembers: [
    { name: 'Аки', role: 'координатор релизов' },
    { name: 'Рэн', role: 'frontend и UI' },
    { name: 'Мэй', role: 'редактор каталога' },
    { name: 'Кай', role: 'тайтл-менеджер' },
    { name: 'Юна', role: 'оформление и постеры' }
  ]
};

export function normalizeAboutContent(value = defaultAboutContent) {
  const source = value && typeof value === 'object' ? value : defaultAboutContent;
  const title = String(source.title || defaultAboutContent.title).trim() || defaultAboutContent.title;
  const paragraphs = Array.isArray(source.paragraphs)
    ? source.paragraphs.map(item => String(item || '').trim()).filter(Boolean)
    : [];
  const teamTitle = String(source.teamTitle || defaultAboutContent.teamTitle).trim() || defaultAboutContent.teamTitle;
  const teamMembers = Array.isArray(source.teamMembers)
    ? source.teamMembers
      .map(item => ({
        name: String(item?.name || '').trim(),
        role: String(item?.role || '').trim()
      }))
      .filter(item => item.name || item.role)
    : [];

  return {
    title,
    paragraphs: paragraphs.length ? paragraphs : [...defaultAboutContent.paragraphs],
    teamTitle,
    teamMembers: teamMembers.length
      ? teamMembers
      : defaultAboutContent.teamMembers.map(item => ({ ...item }))
  };
}

export function createEntityIdFactory() {
  let entitySequence = 0;
  return function nextEntityId(prefix = 'entity') {
    entitySequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${entitySequence.toString(36)}`;
  };
}

export function inferLatestEpisodeLabel(duration, fallback = '') {
  const match = String(duration || '').match(/\d+/);
  if (!match) return fallback || '';
  return `Серия ${match[0]}`;
}

function inferEpisodeCount(project) {
  const episodeMatch = String(project.duration || '').match(/(\d+)\s*(эпизод|эпизода|эпизодов|серия|серии|серий)/i);
  if (episodeMatch) return Math.max(1, Number(episodeMatch[1] || 1));
  const latestMatch = String(project.latestEpisode || '').match(/(\d+)/);
  if (latestMatch) return Math.max(1, Number(latestMatch[1] || 1));
  return 1;
}

export function createEmptyMediaDraft() {
  return { seasons: [] };
}

export function ensureSeasonDraftCollection(draft, nextEntityId) {
  if (!draft.seasons) draft.seasons = [];
  if (!draft.seasons.length) {
    draft.seasons.push({ id: nextEntityId('season'), number: 1, episodes: [] });
  }
  draft.seasons = draft.seasons.map((season, index) => ({
    ...season,
    id: season?.id || nextEntityId('season'),
    number: index + 1,
    episodes: Array.isArray(season?.episodes) ? season.episodes : []
  }));
  return draft.seasons;
}

export function getDraftSeasonById(draft, seasonId, nextEntityId) {
  const seasons = ensureSeasonDraftCollection(draft || createEmptyMediaDraft(), nextEntityId);
  return seasons.find(season => season.id === seasonId) || seasons[0];
}

export function buildEmbedMarkup(src = '', title = 'AKAITSUKI') {
  const url = sanitizeUrl(src, { allowData: true });
  if (!url) return '';
  return `<iframe src="${escapeHtml(url)}" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function createPosterPreviewDataUrl(project = {}) {
  const seedSource = `${project.id || ''}-${project.title || ''}-${project.type || ''}`;
  const seed = [...seedSource].reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  const hueA = seed % 360;
  const hueB = (hueA + 42) % 360;
  const hueC = (hueA + 110) % 360;
  const initials = String(project.title || 'AK')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'AK';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hueA} 68% 34%)"/><stop offset="52%" stop-color="hsl(${hueB} 72% 48%)"/><stop offset="100%" stop-color="hsl(${hueC} 56% 22%)"/></linearGradient><linearGradient id="shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient></defs><rect width="800" height="1120" fill="url(#g)"/><rect x="36" y="36" width="728" height="1048" rx="42" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)"/><circle cx="640" cy="150" r="120" fill="rgba(255,255,255,0.18)"/><circle cx="120" cy="980" r="86" fill="rgba(255,255,255,0.14)"/><text x="400" y="580" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="180" font-family="Inter,Arial,sans-serif" font-weight="700">${escapeHtml(initials)}</text><rect x="36" y="36" width="728" height="1048" rx="42" fill="url(#shadow)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createPlaceholderIframe(projectTitle, seasonNumber, episodeNumber, voiceoverName, playerName) {
  const title = escapeHtml(projectTitle);
  const voice = escapeHtml(voiceoverName);
  const player = escapeHtml(playerName);
  const srcdoc = `<!doctype html><html lang="ru"><body style="margin:0;font-family:Inter,Arial,sans-serif;background:#0e1421;color:#fff;display:grid;place-items:center;min-height:100vh;background-image:radial-gradient(circle at top right, rgba(255,90,95,.18), transparent 30%), radial-gradient(circle at bottom left, rgba(74,163,255,.18), transparent 34%);"><div style="text-align:center;padding:32px"><div style="font-size:14px;opacity:.7;margin-bottom:12px">Плейсхолдер плеера</div><div style="font-size:28px;font-weight:700;margin-bottom:10px">${title}</div><div style="font-size:16px;opacity:.88;margin-bottom:8px">Серия ${episodeNumber}</div><div style="font-size:15px;opacity:.7">${voice} • ${player}</div></div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(srcdoc)}`;
}

export function createDefaultPlayer(project, seasonNumber, episodeNumber, voiceoverName, playerIndex = 1, nextEntityId) {
  const playerName = `Плеер ${playerIndex}`;
  return {
    id: nextEntityId('player'),
    name: playerName,
    src: createPlaceholderIframe(project.title || 'AKAITSUKI', seasonNumber, episodeNumber, voiceoverName, playerName)
  };
}

export function createDefaultVoiceover(project, seasonNumber, episodeNumber, voiceoverName = '', nextEntityId) {
  const name = String(voiceoverName || project.voiceover || project.team || 'AKAITSUKI').trim() || 'AKAITSUKI';
  return {
    id: nextEntityId('voiceover'),
    name,
    players: [createDefaultPlayer(project, seasonNumber, episodeNumber, name, 1, nextEntityId)]
  };
}

function createEmptyEpisode(project, seasonNumber, episodeNumber, nextEntityId) {
  return {
    id: nextEntityId('episode'),
    number: episodeNumber,
    title: `Серия ${episodeNumber}`,
    isDeleted: false,
    voiceovers: [createDefaultVoiceover(project, seasonNumber, episodeNumber, '', nextEntityId)]
  };
}

function createGeneratedMedia(project, nextEntityId) {
  const episodeCount = inferEpisodeCount(project);
  const season = { id: nextEntityId('season'), number: 1, episodes: [] };
  for (let episodeIndex = 0; episodeIndex < episodeCount; episodeIndex += 1) {
    season.episodes.push(createEmptyEpisode(project, 1, episodeIndex + 1, nextEntityId));
  }
  return { seasons: [season] };
}

function normalizePlayers(players, fallbackProject, seasonNumber, episodeNumber, voiceoverName, nextEntityId) {
  const source = Array.isArray(players) ? players : [];
  const mapped = source.map((player, index) => ({
    id: player?.id || nextEntityId('player'),
    name: String(player?.name || `Плеер ${index + 1}`).trim(),
    src: String(player?.src || player?.iframe || '').trim()
  })).filter(player => player.name || player.src);

  return mapped.length
    ? mapped.map((player, index) => ({
        ...player,
        name: player.name || `Плеер ${index + 1}`,
        src: player.src || createPlaceholderIframe(fallbackProject.title || 'AKAITSUKI', seasonNumber, episodeNumber, voiceoverName, player.name || `Плеер ${index + 1}`)
      }))
    : [createDefaultPlayer(fallbackProject, seasonNumber, episodeNumber, voiceoverName, 1, nextEntityId)];
}

function normalizeVoiceovers(voiceovers, fallbackProject, seasonNumber, episodeNumber, nextEntityId) {
  const source = Array.isArray(voiceovers) ? voiceovers : [];
  const mapped = source.map((voiceover, index) => {
    const name = String(voiceover?.name || fallbackProject.voiceover || fallbackProject.team || `Озвучка ${index + 1}`).trim();
    return {
      id: voiceover?.id || nextEntityId('voiceover'),
      name,
      players: normalizePlayers(voiceover?.players, fallbackProject, seasonNumber, episodeNumber, name, nextEntityId)
    };
  });

  return mapped.length ? mapped : [createDefaultVoiceover(fallbackProject, seasonNumber, episodeNumber, '', nextEntityId)];
}

function normalizeEpisodes(episodes, fallbackProject, seasonNumber, nextEntityId) {
  const source = Array.isArray(episodes) ? episodes : [];
  if (!source.length) return [createEmptyEpisode(fallbackProject, seasonNumber, 1, nextEntityId)];

  return source.map((episode, index) => {
    const number = Number(episode?.number || index + 1);
    const isDeleted = Boolean(episode?.isDeleted);
    const rawVoiceovers = Array.isArray(episode?.voiceovers) ? episode.voiceovers : [];
    return {
      id: episode?.id || nextEntityId('episode'),
      number,
      title: isDeleted ? String(episode?.title || '').trim() : String(episode?.title || `Серия ${number}`).trim(),
      isDeleted,
      voiceovers: isDeleted && !rawVoiceovers.length ? [] : normalizeVoiceovers(rawVoiceovers, fallbackProject, seasonNumber, number, nextEntityId)
    };
  }).sort((a, b) => a.number - b.number);
}

function normalizeMedia(project, nextEntityId) {
  const source = project?.media?.seasons?.length ? project.media : createGeneratedMedia(project, nextEntityId);
  const seasonsSource = Array.isArray(source?.seasons) ? source.seasons : [];
  if (!seasonsSource.length) return createGeneratedMedia(project, nextEntityId);
  return {
    seasons: seasonsSource.map((season, index) => ({
      id: season?.id || nextEntityId('season'),
      number: index + 1,
      episodes: normalizeEpisodes(season?.episodes, project, index + 1, nextEntityId)
    }))
  };
}

export function getVisibleSeasons(project) {
  return (project.media?.seasons || [])
    .map(season => ({
      ...season,
      episodes: (season.episodes || []).filter(episode => !episode.isDeleted)
    }))
    .filter(season => season.episodes.length);
}

export function getVisibleEpisodes(project) {
  return getVisibleSeasons(project).flatMap(season => season.episodes || []);
}

export function getLatestEpisodeFromMedia(media) {
  const seasons = (media?.seasons || []).filter(Boolean);
  for (let seasonIndex = seasons.length - 1; seasonIndex >= 0; seasonIndex -= 1) {
    const visibleEpisodes = (seasons[seasonIndex].episodes || []).filter(episode => !episode.isDeleted);
    if (visibleEpisodes.length) {
      const lastEpisode = visibleEpisodes[visibleEpisodes.length - 1];
      return `Серия ${lastEpisode.number}`;
    }
  }
  return '';
}

export function createProjectNormalizer({ baseProjects, nextEntityId }) {
  return function normalizeProject(project) {
    const seedProject = baseProjects.find(item => Number(item.id) === Number(project?.id)) || {};
    const media = isVideoLike(project) ? createEmptyMediaDraft() : normalizeMedia(project, nextEntityId);
    const voiceoverNames = [...new Set(
      (media.seasons || [])
        .flatMap(season => season.episodes || [])
        .flatMap(episode => episode.voiceovers || [])
        .map(voiceover => voiceover.name)
        .filter(Boolean)
    )];
    const primaryVoiceover = String(project.voiceover || project.team || voiceoverNames[0] || '').trim();
    const categories = Array.isArray(project.categories) ? project.categories : [];
    const genres = Array.isArray(project.genres) ? project.genres : [];

    return {
      ...project,
      media,
      voiceover: primaryVoiceover,
      team: primaryVoiceover,
      altTitles: Array.isArray(project.altTitles) ? project.altTitles : [],
      genres,
      categories,
      latestEpisode: isVideoLike(project) ? '' : (project.latestEpisode || getLatestEpisodeFromMedia(media) || inferLatestEpisodeLabel(project.duration, '')),
      updatedOrder: normalizeUpdatedOrder(project.updatedOrder),
      rating: Number(project.rating || 0),
      popularity: Number(project.popularity || project.rating || 0),
      posterTheme: String(project.posterTheme || seedProject.posterTheme || 'electric-violet').trim(),
      posterUrl: sanitizeUrl(project.posterUrl || '', { allowData: true }),
      posterGradient: String(project.posterGradient || project.poster || seedProject.posterGradient || seedProject.poster || '').trim(),
      displayPosterUrl: sanitizeUrl(project.posterUrl || '', { allowData: true }) || getVideoThumbnailUrl(project.videoUrl || '') || (isVideoLike(project) ? createPosterPreviewDataUrl({ ...seedProject, ...project }) : ''),
      videoUrl: sanitizeUrl(project.videoUrl || ''),
      channel: String(project.channel || getVideoSourceHost(project.videoUrl || '') || '').trim(),
      releaseDate: String(project.releaseDate || '').trim(),
      linkedTitleId: project.linkedTitleId ? Number(project.linkedTitleId) : null,
      searchIndex: [
        project.title,
        project.description,
        project.longText,
        genres.join(' '),
        categories.join(' '),
        (project.altTitles || []).join(' '),
        primaryVoiceover,
        voiceoverNames.join(' '),
        project.season,
        project.status,
        project.channel
      ].join(' ').toLowerCase()
    };
  };
}
