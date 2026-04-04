import { supabase, isSupabaseConfigured } from './supabase.client.js';
import { localDbAdapter } from './local-db.adapter.js';

const EMPTY_STATE = {
  users: [],
  anime: [],
  ratings: {},
  favorites: {},
  about: {
    title: 'Кто мы такие',
    description: '',
    team: [],
    socials: [],
  },
  session: null,
};

let cache = clone(EMPTY_STATE);
let initialized = false;
let initPromise = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function toTitleRecord(item = {}) {
  return {
    id: item.id,
    content_type: item.contentType || 'anime',
    title: item.title || '',
    alt_titles: item.altTitles || [],
    poster: item.poster || '',
    description: item.description || '',
    genres: item.genres || [],
    year: Number(item.year || new Date().getFullYear()),
    release_label: item.releaseLabel || '',
    title_type: item.titleType || '',
    age_rating: item.ageRating || '',
    studio: item.studio || '',
    country: item.country || '',
    director: item.director || '',
    total_episodes: Number(item.totalEpisodes || 0),
    added_episodes: Number(item.addedEpisodes || item.episodes?.length || 0),
    episodes: item.episodes || [],
    created_at: item.createdAt || nowIso(),
    updated_at: nowIso(),
  };
}

function fromTitleRecord(row = {}) {
  return {
    id: row.id,
    contentType: row.content_type || 'anime',
    title: row.title || '',
    altTitles: row.alt_titles || [],
    poster: row.poster || '',
    description: row.description || '',
    genres: row.genres || [],
    year: Number(row.year || new Date().getFullYear()),
    releaseLabel: row.release_label || '',
    titleType: row.title_type || '',
    ageRating: row.age_rating || '',
    studio: row.studio || '',
    country: row.country || '',
    director: row.director || '',
    totalEpisodes: Number(row.total_episodes || 0),
    addedEpisodes: Number(row.added_episodes || 0),
    episodes: row.episodes || [],
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || nowIso(),
  };
}

function groupFavorites(rows = []) {
  const result = {};
  rows.forEach((row) => {
    result[row.user_id] = result[row.user_id] || [];
    result[row.user_id].push(row.title_id);
  });
  return result;
}

function groupRatings(rows = []) {
  const result = {};
  rows.forEach((row) => {
    result[row.title_id] = result[row.title_id] || {};
    result[row.title_id][row.user_id] = Number(row.value);
  });
  return result;
}

async function getCurrentAuthUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function getCurrentProfile() {
  const authUser = await getCurrentAuthUser();
  if (!authUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function seedFromLocalIfEmpty() {
  const local = localDbAdapter.getState();
  const localTitles = local.anime || [];
  const localAbout = local.about || {};
  if (!localTitles.length && !localAbout?.description) return;

  const profile = await getCurrentProfile();
  if (!profile || !['admin', 'owner'].includes(profile.role)) return;

  const { count: titlesCount, error: countError } = await supabase
    .from('titles')
    .select('id', { count: 'exact', head: true });

  if (countError) throw countError;
  const hasTitles = Number(titlesCount || 0) > 0;

  const { data: aboutRows, error: aboutError } = await supabase
    .from('site_content')
    .select('key')
    .eq('key', 'about');

  if (aboutError) throw aboutError;
  const hasAbout = Array.isArray(aboutRows) && aboutRows.length > 0;

  if (!hasTitles && localTitles.length) {
    const payload = localTitles.map(toTitleRecord);
    const { error } = await supabase.from('titles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }

  if (!hasAbout && (localAbout.title || localAbout.description || (localAbout.team || []).length || (localAbout.socials || []).length)) {
    const { error } = await supabase.from('site_content').upsert({
      key: 'about',
      title: localAbout.title || 'Кто мы такие',
      description: localAbout.description || '',
      team: localAbout.team || [],
      socials: localAbout.socials || [],
      updated_at: nowIso(),
    }, { onConflict: 'key' });

    if (error) throw error;
  }
}

async function loadState() {
  if (!isSupabaseConfigured()) {
    cache = localDbAdapter.getState();
    return cache;
  }

  await seedFromLocalIfEmpty();

  const authUser = await getCurrentAuthUser();
  const currentUserId = authUser?.id || null;

  const titlesPromise = supabase
    .from('titles')
    .select('*')
    .order('created_at', { ascending: false });

  const ratingsPromise = supabase
    .from('title_ratings')
    .select('title_id, user_id, value');

  const aboutPromise = supabase
    .from('site_content')
    .select('*')
    .eq('key', 'about')
    .maybeSingle();

  const favoritesPromise = currentUserId
    ? supabase.from('favorites').select('user_id, title_id').eq('user_id', currentUserId)
    : Promise.resolve({ data: [], error: null });

  const profilesPromise = supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: true });

  const [titlesRes, ratingsRes, aboutRes, favoritesRes, profilesRes] = await Promise.all([
    titlesPromise,
    ratingsPromise,
    aboutPromise,
    favoritesPromise,
    profilesPromise,
  ]);

  if (titlesRes.error) throw titlesRes.error;
  if (ratingsRes.error) throw ratingsRes.error;
  if (aboutRes.error) throw aboutRes.error;
  if (favoritesRes.error) throw favoritesRes.error;
  if (profilesRes.error) throw profilesRes.error;

  cache = {
    users: (profilesRes.data || []).map((item) => ({
      id: item.id,
      email: item.email,
      name: item.name,
      role: item.role,
      createdAt: item.created_at,
    })),
    anime: (titlesRes.data || []).map(fromTitleRecord),
    ratings: groupRatings(ratingsRes.data || []),
    favorites: groupFavorites(favoritesRes.data || []),
    about: aboutRes.data ? {
      title: aboutRes.data.title || 'Кто мы такие',
      description: aboutRes.data.description || '',
      team: aboutRes.data.team || [],
      socials: aboutRes.data.socials || [],
    } : clone(EMPTY_STATE.about),
    session: currentUserId ? { userId: currentUserId } : null,
  };

  return clone(cache);
}

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function extractUserRatings(ratingsMap = {}, userId) {
  const result = {};
  Object.entries(ratingsMap || {}).forEach(([titleId, users]) => {
    if (users && typeof users === 'object' && users[userId] != null) {
      result[titleId] = Number(users[userId]);
    }
  });
  return result;
}

async function syncTitles(prevTitles = [], nextTitles = []) {
  const prevMap = new Map(prevTitles.map((item) => [item.id, item]));
  const nextMap = new Map(nextTitles.map((item) => [item.id, item]));

  const removedIds = [...prevMap.keys()].filter((id) => !nextMap.has(id));
  if (removedIds.length) {
    const { error } = await supabase.from('titles').delete().in('id', removedIds);
    if (error) throw error;
  }

  const changed = [...nextMap.values()].filter((item) => !prevMap.has(item.id) || !isEqual(prevMap.get(item.id), item));
  if (changed.length) {
    const payload = changed.map(toTitleRecord);
    const { error } = await supabase.from('titles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }
}

async function syncAbout(nextAbout = {}) {
  const { error } = await supabase.from('site_content').upsert({
    key: 'about',
    title: nextAbout.title || 'Кто мы такие',
    description: nextAbout.description || '',
    team: nextAbout.team || [],
    socials: nextAbout.socials || [],
    updated_at: nowIso(),
  }, { onConflict: 'key' });

  if (error) throw error;
}

async function syncFavorites(userId, ids = []) {
  const { error: deleteError } = await supabase.from('favorites').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (!ids.length) return;

  const payload = ids.map((titleId) => ({
    user_id: userId,
    title_id: titleId,
  }));

  const { error: insertError } = await supabase.from('favorites').insert(payload);
  if (insertError) throw insertError;
}

async function syncRatings(userId, prevRatings = {}, nextRatings = {}) {
  const removed = Object.keys(prevRatings).filter((titleId) => nextRatings[titleId] == null);
  if (removed.length) {
    const { error } = await supabase.from('title_ratings').delete().eq('user_id', userId).in('title_id', removed);
    if (error) throw error;
  }

  const payload = Object.entries(nextRatings).map(([titleId, value]) => ({
    title_id: titleId,
    user_id: userId,
    value: Number(value),
    updated_at: nowIso(),
  }));

  if (!payload.length) return;

  const { error } = await supabase.from('title_ratings').upsert(payload, { onConflict: 'title_id,user_id' });
  if (error) throw error;
}

async function syncUsers(prevUsers = [], nextUsers = []) {
  const prevMap = new Map(prevUsers.map((item) => [item.id, item]));
  const changed = nextUsers.filter((item) => {
    const prev = prevMap.get(item.id);
    return !prev || prev.role !== item.role || prev.name !== item.name || prev.email !== item.email;
  });

  for (const user of changed) {
    const { error } = await supabase
      .from('profiles')
      .update({
        email: user.email,
        name: user.name,
        role: user.role,
        updated_at: nowIso(),
      })
      .eq('id', user.id);

    if (error) throw error;
  }
}

async function persistDiff(prev, next) {
  if (!isSupabaseConfigured()) return;

  if (!isEqual(prev.anime, next.anime)) {
    await syncTitles(prev.anime || [], next.anime || []);
  }

  if (!isEqual(prev.about, next.about)) {
    await syncAbout(next.about || {});
  }

  const authUser = await getCurrentAuthUser();
  const userId = authUser?.id || null;
  if (userId) {
    const prevFavorites = (prev.favorites || {})[userId] || [];
    const nextFavorites = (next.favorites || {})[userId] || [];
    if (!isEqual(prevFavorites, nextFavorites)) {
      await syncFavorites(userId, nextFavorites);
    }

    const prevRatings = extractUserRatings(prev.ratings || {}, userId);
    const nextRatings = extractUserRatings(next.ratings || {}, userId);
    if (!isEqual(prevRatings, nextRatings)) {
      await syncRatings(userId, prevRatings, nextRatings);
    }
  }

  if (!isEqual(prev.users, next.users)) {
    await syncUsers(prev.users || [], next.users || []);
  }

  await loadState();
}

export const supabaseDbAdapter = {
  mode: 'supabase',

  async init(force = false) {
    if (!isSupabaseConfigured()) {
      cache = localDbAdapter.getState();
      initialized = true;
      return clone(cache);
    }

    if (initialized && !force) return clone(cache);
    if (initPromise && !force) return initPromise;

    initPromise = loadState()
      .then((state) => {
        initialized = true;
        initPromise = null;
        return clone(state);
      })
      .catch((error) => {
        initPromise = null;
        throw error;
      });

    return initPromise;
  },

  getState() {
    return clone(cache);
  },

  updateState(updater) {
    const prev = clone(cache);
    const next = updater(clone(cache));
    cache = clone(next);

    persistDiff(prev, next).catch((error) => {
      console.error('Supabase sync error', error);
    });

    return clone(cache);
  },

  resetState() {
    throw new Error('Сброс demo-данных в Supabase отключён. Используй SQL или локальный режим.');
  },
};
