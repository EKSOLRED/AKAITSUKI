import { getDb, updateDb } from '../api/db.js';

export const titlesRepository = {
  list() {
    return getDb().anime || [];
  },

  getById(id) {
    return this.list().find((item) => item.id === id) || null;
  },

  create(title) {
    updateDb((state) => {
      state.anime.unshift(title);
      return state;
    });
    return title;
  },

  update(id, nextTitle) {
    updateDb((state) => {
      state.anime = state.anime.map((item) => (item.id === id ? nextTitle : item));
      return state;
    });
    return nextTitle;
  },

  remove(id) {
    updateDb((state) => {
      state.anime = state.anime.filter((item) => item.id !== id);
      Object.keys(state.favorites).forEach((userId) => {
        state.favorites[userId] = (state.favorites[userId] || []).filter((titleId) => titleId !== id);
      });
      delete state.ratings[id];
      return state;
    });
  },

  getRatings(titleId) {
    return getDb().ratings?.[titleId] || {};
  },

  setRating(titleId, userId, value) {
    updateDb((state) => {
      state.ratings[titleId] = state.ratings[titleId] || {};
      state.ratings[titleId][userId] = value;
      return state;
    });

    return this.getRatings(titleId);
  },
};
