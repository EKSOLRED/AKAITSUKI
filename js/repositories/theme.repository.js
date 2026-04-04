import { getDb, updateDb } from '../api/db.js';

export const themeRepository = {
  get() {
    return getDb().theme || 'dark';
  },

  set(theme) {
    updateDb((state) => {
      state.theme = theme;
      return state;
    });
    return theme;
  },
};
