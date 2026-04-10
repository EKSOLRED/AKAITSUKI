import {
  loadFavorites,
  mergeGuestFavoritesIntoUser,
  readJson,
  saveFavorites,
  saveJson
} from '../utils/storage.js';
import {
  ensureRemoteProfile,
  fetchRemoteFavorites,
  fetchRemoteRatings,
  replaceRemoteFavorites,
  upsertRemoteRating
} from './supabase-db.js';

function uniqueNumericList(items = []) {
  return [...new Set(items.map(Number).filter(Number.isFinite))];
}

function buildRatingsMapFromRows(rows = []) {
  return rows.reduce((acc, row) => {
    const titleId = String(row?.title_id || '');
    const userId = String(row?.user_id || '');
    const rating = Number(row?.rating || 0);
    if (!titleId || !userId || !rating) return acc;
    if (!acc[titleId]) acc[titleId] = { byUser: {} };
    acc[titleId].byUser[userId] = rating;
    return acc;
  }, {});
}

function mergeRatingsMaps(localMap = {}, remoteMap = {}) {
  const result = {};
  const titleIds = new Set([...Object.keys(localMap || {}), ...Object.keys(remoteMap || {})]);

  titleIds.forEach(titleId => {
    result[titleId] = {
      byUser: {
        ...(localMap?.[titleId]?.byUser || {}),
        ...(remoteMap?.[titleId]?.byUser || {})
      }
    };
  });

  return result;
}

export function createAppRepository({ ratingsKey }) {
  return {
    cacheRatings(ratings) {
      saveJson(ratingsKey, ratings || {});
    },

    async ensureUserProfile(session) {
      const user = session?.user;
      if (!user?.id) return;
      await ensureRemoteProfile({
        userId: user.id,
        email: user.email || '',
        nickname: user.user_metadata?.nickname || ''
      });
    },

    async loadFavoritesForSession({ userId = null, allowGuestFavorites = true } = {}) {
      if (!userId) return allowGuestFavorites ? loadFavorites(null) : [];

      const localFavorites = allowGuestFavorites ? mergeGuestFavoritesIntoUser(userId) : loadFavorites(userId);
      const { data, error } = await fetchRemoteFavorites(userId);
      if (error || !Array.isArray(data)) return uniqueNumericList(localFavorites);

      const remoteFavorites = uniqueNumericList(data.map(row => row?.title_id));
      const merged = uniqueNumericList([...localFavorites, ...remoteFavorites]);
      saveFavorites(userId, merged);

      if (merged.length !== remoteFavorites.length || merged.some(id => !remoteFavorites.includes(id))) {
        void replaceRemoteFavorites(userId, merged);
      }

      return merged;
    },

    async persistFavorites({ userId = null, favorites = [] } = {}) {
      const normalized = uniqueNumericList(favorites);
      saveFavorites(userId, normalized);
      if (userId) await replaceRemoteFavorites(userId, normalized);
      return normalized;
    },

    async loadRatings() {
      const localRatings = readJson(ratingsKey, {});
      const { data, error } = await fetchRemoteRatings();
      if (error || !Array.isArray(data)) return localRatings;

      const merged = mergeRatingsMaps(localRatings, buildRatingsMapFromRows(data));
      saveJson(ratingsKey, merged);
      return merged;
    },

    async persistRating({ userId = null, titleId, value, ratings }) {
      saveJson(ratingsKey, ratings);
      if (userId) await upsertRemoteRating({ userId, titleId, rating: value });
    }
  };
}
