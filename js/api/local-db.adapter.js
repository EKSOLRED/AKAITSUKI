import { getDb as getStoredDb, updateDb as updateStoredDb, resetDb as resetStoredDb } from '../services/storage.js';

export const localDbAdapter = {
  mode: 'local',

  getState() {
    return getStoredDb();
  },

  updateState(updater) {
    return updateStoredDb(updater);
  },

  resetState() {
    return resetStoredDb();
  },
};
