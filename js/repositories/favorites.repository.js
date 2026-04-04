import { getDb, updateDb } from '../api/db.js';

export const favoritesRepository = {
  getIdsByUser(userId) {
    if (!userId) return [];
    return getDb().favorites?.[userId] || [];
  },

  isFavorite(userId, titleId) {
    return this.getIdsByUser(userId).includes(titleId);
  },

  toggle(userId, titleId) {
    let active = false;

    updateDb((state) => {
      const current = new Set(state.favorites[userId] || []);
      if (current.has(titleId)) {
        current.delete(titleId);
        active = false;
      } else {
        current.add(titleId);
        active = true;
      }
      state.favorites[userId] = [...current];
      return state;
    });

    return active;
  },
};
