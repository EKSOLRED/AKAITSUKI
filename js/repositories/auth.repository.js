import { getDb, updateDb } from '../api/db.js';

export const authRepository = {
  getSession() {
    return getDb().session || null;
  },

  setSession(userId) {
    return updateDb((state) => {
      state.session = {
        userId,
        loggedInAt: new Date().toISOString(),
      };
      return state;
    }).session;
  },

  clearSession() {
    updateDb((state) => {
      state.session = null;
      return state;
    });
  },

  listUsers() {
    return getDb().users || [];
  },

  getUserById(userId) {
    return this.listUsers().find((user) => user.id === userId) || null;
  },

  getUserByEmail(emailNormalized) {
    return this.listUsers().find((user) => String(user.email || '').trim().toLowerCase() === emailNormalized) || null;
  },

  createUser(user) {
    updateDb((state) => {
      state.users.push(user);
      state.favorites[user.id] = state.favorites[user.id] || [];
      return state;
    });
    return user;
  },

  updateUserRole(userId, role) {
    let updated = null;
    updateDb((state) => {
      const user = (state.users || []).find((item) => item.id === userId);
      if (!user) return state;
      user.role = role;
      updated = user;
      return state;
    });
    return updated;
  },
};
