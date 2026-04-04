import { getDb, updateDb } from '../api/db.js';

export const aboutRepository = {
  get() {
    return getDb().about || {};
  },

  update(payload) {
    updateDb((state) => {
      state.about = payload;
      return state;
    });
    return this.get();
  },
};
