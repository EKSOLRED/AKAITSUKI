import { authApi } from '../api/auth.api.js';
import { normalizeEmail, normalizeName } from '../utils/text.utils.js';

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export const authService = {
  getCurrentUser() {
    const session = authApi.getSession();
    if (!session?.userId) return null;
    const user = authApi.getUserById(session.userId);
    return sanitizeUser(user);
  },

  login(email, password) {
    const emailNormalized = normalizeEmail(email);
    const passwordNormalized = String(password);

    if (!emailNormalized || !passwordNormalized) {
      throw new Error('Введите email и пароль');
    }

    const user = authApi.getUserByEmail(emailNormalized);

    if (!user || user.password !== passwordNormalized) {
      throw new Error('Неверный email или пароль');
    }

    authApi.setSession(user.id);
    return sanitizeUser(user);
  },

  register({ name, email, password }) {
    const nameNormalized = normalizeName(name);
    const emailNormalized = normalizeEmail(email);
    const passwordNormalized = String(password);

    if (nameNormalized.length < 2) {
      throw new Error('Имя должно быть не короче 2 символов');
    }

    if (!emailNormalized.includes('@')) {
      throw new Error('Введите корректный email');
    }

    if (passwordNormalized.length < 8) {
      throw new Error('Пароль должен быть не короче 8 символов');
    }

    if (authApi.getUserByEmail(emailNormalized)) {
      throw new Error('Пользователь с таким email уже существует');
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: nameNormalized,
      email: emailNormalized,
      password: passwordNormalized,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    authApi.createUser(newUser);
    authApi.setSession(newUser.id);

    return sanitizeUser(newUser);
  },

  logout() {
    authApi.clearSession();
  },

  listUsers() {
    return authApi.listUsers().map((user) => sanitizeUser(user));
  },

  updateUserRole(userId, role) {
    if (!['user', 'admin', 'owner'].includes(role)) {
      throw new Error('Недопустимая роль');
    }

    const users = authApi.listUsers();
    const target = users.find((item) => item.id === userId);
    if (!target) throw new Error('Пользователь не найден');

    if (role === 'owner') {
      const currentOwner = users.find((item) => item.role === 'owner' && item.id !== userId);
      if (currentOwner) {
        throw new Error('В проекте может быть только один владелец');
      }
    }

    const currentUser = this.getCurrentUser();
    if (target.id === currentUser?.id && target.role === 'owner' && role !== 'owner') {
      throw new Error('Владелец не может снять роль сам у себя');
    }

    const user = authApi.updateUserRole(userId, role);
    return sanitizeUser(user);
  },

  hasRole(roles = []) {
    const role = this.getCurrentUser()?.role;
    return Boolean(role && roles.includes(role));
  },

  isAdmin() {
    return this.hasRole(['admin', 'owner']);
  },

  isSuperAdmin() {
    return this.hasRole(['owner']);
  },

  canAccessAdminSection(section) {
    if (!this.isAdmin()) return false;
    if (['anime', 'series'].includes(section)) return true;
    if (['about', 'roles'].includes(section)) return this.isSuperAdmin();
    return false;
  },
};
