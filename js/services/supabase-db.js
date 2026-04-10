import { getSupabaseClient, isSupabaseReady } from './supabase.js';

const REMOTE_UPDATED_ORDER_FALLBACK = 2147483647;

const defaultTables = {
  profiles: 'profiles',
  favorites: 'favorite_titles',
  ratings: 'title_ratings',
  siteContent: 'site_content',
  titles: 'titles',
  titleAltTitles: 'title_alt_titles',
  titleGenres: 'title_genres',
  titleCategories: 'title_categories',
  titleSeasons: 'title_seasons',
  titleEpisodes: 'title_episodes',
  episodeVoiceovers: 'episode_voiceovers',
  voiceoverPlayers: 'voiceover_players'
};

function getTableName(key) {
  return window.APP_CONFIG?.supabaseTables?.[key] || defaultTables[key];
}

function isSyncEnabled(key) {
  const sync = window.APP_CONFIG?.supabaseSync || {};
  if (sync.enabled === false) return false;
  return sync[key] !== false;
}

function getClient() {
  return isSupabaseReady() ? getSupabaseClient() : null;
}

async function runQuery(factory) {
  try {
    const client = getClient();
    if (!client) return { data: null, error: null };
    return await factory(client);
  } catch (error) {
    return { data: null, error };
  }
}

function toTrimmedString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sortByPosition(rows = [], fallbackKey = 'id') {
  return [...rows].sort((a, b) => {
    const positionDiff = toNumber(a?.position, 0) - toNumber(b?.position, 0);
    if (positionDiff) return positionDiff;
    return String(a?.[fallbackKey] ?? '').localeCompare(String(b?.[fallbackKey] ?? ''));
  });
}

function groupRowsBy(rows = [], key) {
  return rows.reduce((accumulator, row) => {
    const groupKey = row?.[key];
    if (groupKey === null || groupKey === undefined) return accumulator;
    if (!accumulator[groupKey]) accumulator[groupKey] = [];
    accumulator[groupKey].push(row);
    return accumulator;
  }, {});
}

function buildProjectMediaGraph({ project, seasonsByTitle, episodesBySeason, voiceoversByEpisode, playersByVoiceover }) {
  if (project.type === 'video' || project.type === 'trailer') {
    return { seasons: [] };
  }

  const seasons = sortByPosition(seasonsByTitle[project.id] || []).map((season, seasonIndex) => {
    const seasonEpisodes = sortByPosition(episodesBySeason[season.id] || []).map((episode, episodeIndex) => {
      const episodeVoiceovers = sortByPosition(voiceoversByEpisode[episode.id] || []).map((voiceover, voiceoverIndex) => ({
        id: voiceover.id,
        name: toTrimmedString(voiceover.name, `Озвучка ${voiceoverIndex + 1}`),
        players: sortByPosition(playersByVoiceover[voiceover.id] || []).map((player, playerIndex) => ({
          id: player.id,
          name: toTrimmedString(player.name, `Плеер ${playerIndex + 1}`),
          src: toTrimmedString(player.src)
        }))
      }));

      return {
        id: episode.id,
        number: toNumber(episode.number, episodeIndex + 1),
        title: toTrimmedString(episode.title),
        isDeleted: Boolean(episode.is_deleted),
        voiceovers: episodeVoiceovers
      };
    });

    return {
      id: season.id,
      number: toNumber(season.number, seasonIndex + 1),
      episodes: seasonEpisodes
    };
  });

  return { seasons };
}

function buildProjectsFromRemoteGraph({
  titles = [],
  altTitles = [],
  genres = [],
  categories = [],
  seasons = [],
  episodes = [],
  voiceovers = [],
  players = []
} = {}) {
  const altTitlesByTitle = groupRowsBy(sortByPosition(altTitles, 'value'), 'title_id');
  const genresByTitle = groupRowsBy(sortByPosition(genres, 'value'), 'title_id');
  const categoriesByTitle = groupRowsBy(sortByPosition(categories, 'value'), 'title_id');
  const seasonsByTitle = groupRowsBy(sortByPosition(seasons), 'title_id');
  const episodesBySeason = groupRowsBy(sortByPosition(episodes), 'season_id');
  const voiceoversByEpisode = groupRowsBy(sortByPosition(voiceovers), 'episode_id');
  const playersByVoiceover = groupRowsBy(sortByPosition(players), 'voiceover_id');

  return [...titles]
    .sort((a, b) => toNumber(a.id, 0) - toNumber(b.id, 0))
    .map(row => ({
      id: toNumber(row.id, 0),
      title: toTrimmedString(row.title),
      type: toTrimmedString(row.type, 'anime'),
      year: toNumber(row.year, new Date().getFullYear()),
      season: toTrimmedString(row.season),
      status: toTrimmedString(row.status),
      rating: toNumber(row.rating, 0),
      duration: toTrimmedString(row.duration),
      team: toTrimmedString(row.team),
      voiceover: toTrimmedString(row.voiceover),
      description: toTrimmedString(row.description),
      longText: toTrimmedString(row.long_text),
      posterTheme: toTrimmedString(row.poster_theme, 'electric-violet'),
      posterUrl: toTrimmedString(row.poster_url),
      posterGradient: toTrimmedString(row.poster_gradient),
      videoUrl: toTrimmedString(row.video_url),
      channel: toTrimmedString(row.channel),
      releaseDate: toTrimmedString(row.release_date),
      linkedTitleId: row.linked_title_id === null || row.linked_title_id === undefined ? null : toNumber(row.linked_title_id, null),
      latestEpisode: toTrimmedString(row.latest_episode),
      updatedOrder: toNumber(row.updated_order, REMOTE_UPDATED_ORDER_FALLBACK),
      popularity: toNumber(row.popularity, toNumber(row.rating, 0)),
      altTitles: (altTitlesByTitle[row.id] || []).map(item => toTrimmedString(item.value)).filter(Boolean),
      genres: (genresByTitle[row.id] || []).map(item => toTrimmedString(item.value)).filter(Boolean),
      categories: (categoriesByTitle[row.id] || []).map(item => toTrimmedString(item.value)).filter(Boolean),
      media: buildProjectMediaGraph({
        project: row,
        seasonsByTitle,
        episodesBySeason,
        voiceoversByEpisode,
        playersByVoiceover
      })
    }));
}

function serializeProjectsToRemoteGraph(projects = []) {
  const graph = {
    titles: [],
    titleAltTitles: [],
    titleGenres: [],
    titleCategories: [],
    titleSeasons: [],
    titleEpisodes: [],
    episodeVoiceovers: [],
    voiceoverPlayers: []
  };

  const source = Array.isArray(projects) ? projects : [];

  source.forEach(project => {
    const titleId = toNumber(project?.id, 0);
    if (!titleId) return;

    graph.titles.push({
      id: titleId,
      title: toTrimmedString(project?.title),
      type: toTrimmedString(project?.type, 'anime'),
      year: toNumber(project?.year, new Date().getFullYear()),
      season: toTrimmedString(project?.season),
      status: toTrimmedString(project?.status),
      rating: toNumber(project?.rating, 0),
      duration: toTrimmedString(project?.duration),
      team: toTrimmedString(project?.team),
      voiceover: toTrimmedString(project?.voiceover),
      description: toTrimmedString(project?.description),
      long_text: toTrimmedString(project?.longText),
      poster_theme: toTrimmedString(project?.posterTheme, 'electric-violet'),
      poster_url: toTrimmedString(project?.posterUrl),
      poster_gradient: toTrimmedString(project?.posterGradient || project?.poster),
      video_url: toTrimmedString(project?.videoUrl),
      channel: toTrimmedString(project?.channel),
      release_date: toTrimmedString(project?.releaseDate),
      linked_title_id: project?.linkedTitleId ? toNumber(project.linkedTitleId, null) : null,
      latest_episode: toTrimmedString(project?.latestEpisode),
      updated_order: Math.min(REMOTE_UPDATED_ORDER_FALLBACK, Math.max(0, toNumber(project?.updatedOrder, REMOTE_UPDATED_ORDER_FALLBACK))),
      popularity: toNumber(project?.popularity, toNumber(project?.rating, 0))
    });

    (Array.isArray(project?.altTitles) ? project.altTitles : []).forEach((value, index) => {
      const normalized = toTrimmedString(value);
      if (!normalized) return;
      graph.titleAltTitles.push({ title_id: titleId, position: index + 1, value: normalized });
    });

    (Array.isArray(project?.genres) ? project.genres : []).forEach((value, index) => {
      const normalized = toTrimmedString(value);
      if (!normalized) return;
      graph.titleGenres.push({ title_id: titleId, position: index + 1, value: normalized });
    });

    (Array.isArray(project?.categories) ? project.categories : []).forEach((value, index) => {
      const normalized = toTrimmedString(value);
      if (!normalized) return;
      graph.titleCategories.push({ title_id: titleId, position: index + 1, value: normalized });
    });

    if (project?.type === 'video' || project?.type === 'trailer') return;

    const seasons = Array.isArray(project?.media?.seasons) ? project.media.seasons : [];
    seasons.forEach((season, seasonIndex) => {
      const seasonId = toTrimmedString(season?.id);
      if (!seasonId) return;

      graph.titleSeasons.push({
        id: seasonId,
        title_id: titleId,
        number: toNumber(season?.number, seasonIndex + 1),
        position: seasonIndex + 1
      });

      const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
      episodes.forEach((episode, episodeIndex) => {
        const episodeId = toTrimmedString(episode?.id);
        if (!episodeId) return;

        graph.titleEpisodes.push({
          id: episodeId,
          title_id: titleId,
          season_id: seasonId,
          number: toNumber(episode?.number, episodeIndex + 1),
          title: toTrimmedString(episode?.title),
          is_deleted: Boolean(episode?.isDeleted),
          position: episodeIndex + 1
        });

        const voiceovers = Array.isArray(episode?.voiceovers) ? episode.voiceovers : [];
        voiceovers.forEach((voiceover, voiceoverIndex) => {
          const voiceoverId = toTrimmedString(voiceover?.id);
          if (!voiceoverId) return;

          graph.episodeVoiceovers.push({
            id: voiceoverId,
            title_id: titleId,
            episode_id: episodeId,
            name: toTrimmedString(voiceover?.name, `Озвучка ${voiceoverIndex + 1}`),
            position: voiceoverIndex + 1
          });

          const players = Array.isArray(voiceover?.players) ? voiceover.players : [];
          players.forEach((player, playerIndex) => {
            const playerId = toTrimmedString(player?.id);
            if (!playerId) return;

            graph.voiceoverPlayers.push({
              id: playerId,
              title_id: titleId,
              voiceover_id: voiceoverId,
              name: toTrimmedString(player?.name, `Плеер ${playerIndex + 1}`),
              src: toTrimmedString(player?.src),
              position: playerIndex + 1
            });
          });
        });
      });
    });
  });

  return graph;
}

async function insertRowsInChunks(client, tableName, rows = [], chunkSize = 200) {
  if (!Array.isArray(rows) || !rows.length) return { data: [], error: null };

  for (let index = 0; index < rows.length; index += chunkSize) {
    const slice = rows.slice(index, index + chunkSize);
    const { error } = await client.from(tableName).insert(slice);
    if (error) return { data: null, error };
  }

  return { data: rows, error: null };
}

async function deleteRowsByTitleId(client, tableName, titleId) {
  return client.from(tableName).delete().eq('title_id', Number(titleId));
}

async function clearRemoteTitleChildren(client, titleId) {
  const childTableKeys = [
    'titleAltTitles',
    'titleGenres',
    'titleCategories',
    'voiceoverPlayers',
    'episodeVoiceovers',
    'titleEpisodes',
    'titleSeasons'
  ];

  for (const tableKey of childTableKeys) {
    const { error } = await deleteRowsByTitleId(client, getTableName(tableKey), titleId);
    if (error) return { data: null, error };
  }

  return { data: null, error: null };
}

export async function ensureRemoteProfile({ userId, email = '', nickname = '' }) {
  if (!userId || !isSyncEnabled('profiles')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('profiles'))
      .upsert(
        {
          id: userId,
          email: String(email || '').trim(),
          nickname: String(nickname || '').trim(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select('id')
      .maybeSingle()
  );
}

export async function fetchRemoteFavorites(userId) {
  if (!userId || !isSyncEnabled('favorites')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('favorites'))
      .select('title_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
}

export async function replaceRemoteFavorites(userId, favorites = []) {
  if (!userId || !isSyncEnabled('favorites')) return { data: null, error: null };

  return runQuery(async client => {
    const table = getTableName('favorites');
    const { error: deleteError } = await client.from(table).delete().eq('user_id', userId);
    if (deleteError) return { data: null, error: deleteError };
    if (!favorites.length) return { data: [], error: null };

    return client
      .from(table)
      .insert(
        favorites.map(titleId => ({
          user_id: userId,
          title_id: Number(titleId),
          created_at: new Date().toISOString()
        }))
      )
      .select('title_id');
  });
}

export async function fetchRemoteRatings() {
  if (!isSyncEnabled('ratings')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('ratings'))
      .select('title_id, user_id, rating')
  );
}

export async function upsertRemoteRating({ userId, titleId, rating }) {
  if (!userId || !titleId || !isSyncEnabled('ratings')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('ratings'))
      .upsert(
        {
          user_id: userId,
          title_id: Number(titleId),
          rating: Number(rating),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,title_id' }
      )
      .select('title_id, user_id, rating')
      .maybeSingle()
  );
}

export async function fetchRemoteTitlesGraph() {
  if (!isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(async client => {
    const titlesResult = await client
      .from(getTableName('titles'))
      .select('id, title, type, year, season, status, rating, duration, team, voiceover, description, long_text, poster_theme, poster_url, poster_gradient, video_url, channel, release_date, linked_title_id, latest_episode, updated_order, popularity')
      .order('id', { ascending: true });

    if (titlesResult.error) return { data: null, error: titlesResult.error };
    if (!Array.isArray(titlesResult.data)) return { data: [], error: null };
    if (!titlesResult.data.length) return { data: [], error: null };

    const titleIds = titlesResult.data.map(row => row.id).filter(value => value !== null && value !== undefined);

    const [altTitlesResult, genresResult, categoriesResult, seasonsResult, episodesResult, voiceoversResult, playersResult] = await Promise.all([
      client
        .from(getTableName('titleAltTitles'))
        .select('title_id, position, value')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('titleGenres'))
        .select('title_id, position, value')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('titleCategories'))
        .select('title_id, position, value')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('titleSeasons'))
        .select('id, title_id, number, position')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('titleEpisodes'))
        .select('id, title_id, season_id, number, title, is_deleted, position')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('episodeVoiceovers'))
        .select('id, title_id, episode_id, name, position')
        .in('title_id', titleIds)
        .order('position', { ascending: true }),
      client
        .from(getTableName('voiceoverPlayers'))
        .select('id, title_id, voiceover_id, name, src, position')
        .in('title_id', titleIds)
        .order('position', { ascending: true })
    ]);

    const childError = [altTitlesResult, genresResult, categoriesResult, seasonsResult, episodesResult, voiceoversResult, playersResult]
      .find(result => result?.error)?.error;
    if (childError) return { data: null, error: childError };

    return {
      data: buildProjectsFromRemoteGraph({
        titles: titlesResult.data,
        altTitles: altTitlesResult.data,
        genres: genresResult.data,
        categories: categoriesResult.data,
        seasons: seasonsResult.data,
        episodes: episodesResult.data,
        voiceovers: voiceoversResult.data,
        players: playersResult.data
      }),
      error: null
    };
  });
}

export async function upsertRemoteTitleGraph(project) {
  if (!isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(async client => {
    const graph = serializeProjectsToRemoteGraph([project]);
    const titleRow = graph.titles[0];
    if (!titleRow?.id) return { data: null, error: null };

    const titleResult = await client
      .from(getTableName('titles'))
      .upsert({
        ...titleRow,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('id')
      .maybeSingle();

    if (titleResult.error) return { data: null, error: titleResult.error };

    const clearChildrenResult = await clearRemoteTitleChildren(client, titleRow.id);
    if (clearChildrenResult.error) return clearChildrenResult;

    const childTables = [
      { key: 'titleAltTitles', rows: graph.titleAltTitles },
      { key: 'titleGenres', rows: graph.titleGenres },
      { key: 'titleCategories', rows: graph.titleCategories },
      { key: 'titleSeasons', rows: graph.titleSeasons },
      { key: 'titleEpisodes', rows: graph.titleEpisodes },
      { key: 'episodeVoiceovers', rows: graph.episodeVoiceovers },
      { key: 'voiceoverPlayers', rows: graph.voiceoverPlayers }
    ];

    for (const table of childTables) {
      const result = await insertRowsInChunks(client, getTableName(table.key), table.rows, 200);
      if (result.error) return result;
    }

    return { data: { id: titleRow.id }, error: null };
  });
}

export async function upsertRemoteTitlesBatch(projects = []) {
  if (!isSyncEnabled('content')) return { data: null, error: null };

  const source = Array.isArray(projects) ? projects : [];
  const results = [];

  for (const project of source) {
    const result = await upsertRemoteTitleGraph(project);
    if (result?.error) return result;
    if (result?.data) results.push(result.data);
  }

  return { data: results, error: null };
}

export async function deleteRemoteTitleGraph(titleId) {
  if (!titleId || !isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(async client => {
    const { error } = await client
      .from(getTableName('titles'))
      .delete()
      .eq('id', Number(titleId));

    if (error) return { data: null, error };
    return { data: { id: Number(titleId) }, error: null };
  });
}

export async function replaceRemoteTitlesGraph(projects = []) {
  if (!isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(async client => {
    const graph = serializeProjectsToRemoteGraph(projects);
    const titlesTable = getTableName('titles');

    const { error: deleteError } = await client
      .from(titlesTable)
      .delete()
      .gte('id', 0);

    if (deleteError) return { data: null, error: deleteError };
    if (!graph.titles.length) return { data: [], error: null };

    const titlesInsertResult = await insertRowsInChunks(client, titlesTable, graph.titles, 100);
    if (titlesInsertResult.error) return titlesInsertResult;

    const childTables = [
      { key: 'titleAltTitles', rows: graph.titleAltTitles },
      { key: 'titleGenres', rows: graph.titleGenres },
      { key: 'titleCategories', rows: graph.titleCategories },
      { key: 'titleSeasons', rows: graph.titleSeasons },
      { key: 'titleEpisodes', rows: graph.titleEpisodes },
      { key: 'episodeVoiceovers', rows: graph.episodeVoiceovers },
      { key: 'voiceoverPlayers', rows: graph.voiceoverPlayers }
    ];

    for (const table of childTables) {
      const result = await insertRowsInChunks(client, getTableName(table.key), table.rows, 200);
      if (result.error) return result;
    }

    return { data: graph.titles.map(item => ({ id: item.id })), error: null };
  });
}

export async function fetchRemoteContentEntry(key) {
  if (!key || !isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('siteContent'))
      .select('key, payload, updated_at')
      .eq('key', key)
      .maybeSingle()
  );
}

export async function upsertRemoteContentEntry({ key, payload }) {
  if (!key || !isSyncEnabled('content')) return { data: null, error: null };

  return runQuery(client =>
    client
      .from(getTableName('siteContent'))
      .upsert(
        {
          key,
          payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )
      .select('key, payload, updated_at')
      .maybeSingle()
  );
}
