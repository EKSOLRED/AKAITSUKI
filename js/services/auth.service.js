import { authApi } from '../api/auth.api.js';
import { normalizeEmail, normalizeName } from '../utils/text.utils.js';
import { appConfig } from '../config/app.config.js';
import { supabaseConfig } from '../config/supabase.config.js';
import { supabase, isSupabaseConfigured } from '../api/supabase.client.js';

let currentUserCache = null;
let authInitialized = false;
let authSubscriptionBound = false;
const listeners = new Set();

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function emitChange() {
  listeners.forEach((listener) => {
    try {
      listener(currentUserCache);
    } catch (error) {
      console.error('Auth listener error', error);
    }
  });
}

function isSupabaseAuthEnabled() {
  return Boolean(appConfig.supabaseEnabled || supabaseConfig.enabled) && isSupabaseConfigured();
}

async function fetchSupabaseProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function mapSupabaseUser(authUser, profile = null) {
  if (!authUser) return null;

  return {
    id: authUser.id,
    email: String(profile?.email || authUser.email || '').trim().toLowerCase(),
    name: String(profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Пользователь').trim(),
    role: String(profile?.role || 'user').trim(),
    createdAt: profile?.created_at || authUser.created_at || new Date().toISOString(),
  };
}

async function syncCurrentSupabaseUser() {
  if (!supabase) {
    currentUserCache = null;
    emitChange();
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const authUser = data?.user || null;
  if (!authUser) {
    currentUserCache = null;
    emitChange();
    return null;
  }

  const profile = await fetchSupabaseProfile(authUser.id);
  currentUserCache = mapSupabaseUser(authUser, profile);
  emitChange();
  return currentUserCache;
}

async function ensureSupabaseProfile(authUser, fallbackName = '') {
  if (!supabase || !authUser?.id) return null;

  let profile = await fetchSupabaseProfile(authUser.id);
  if (profile) return profile;

  const payload = {
    id: authUser.id,
    email: String(authUser.email || '').trim().toLowerCase(),
    name: String(fallbackName || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Пользователь').trim(),
    role: 'user',
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  profile = await fetchSupabaseProfile(authUser.id);
  return profile;
}

export const authService = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async init(force = false) {
    if (!isSupabaseAuthEnabled()) {
      authInitialized = true;
      return this.getCurrentUser();
    }

    if (authInitialized && !force) {
      return this.getCurrentUser();
    }

    await syncCurrentSupabaseUser();

    if (!authSubscriptionBound) {
      supabase.auth.onAuthStateChange(async () => {
        try {
          await syncCurrentSupabaseUser();
        } catch (error) {
          console.error('Supabase auth sync error', error);
        }
      });
      authSubscriptionBound = true;
    }

    authInitialized = true;
    return this.getCurrentUser();
  },

  async refreshCurrentUser() {
    if (!isSupabaseAuthEnabled()) {
      return this.getCurrentUser();
    }
    return this.init(true);
  },

  getCurrentUser() {
    if (isSupabaseAuthEnabled()) {
      return currentUserCache;
    }

    const session = authApi.getSession();
    if (!session?.userId) return null;
    const user = authApi.getUserById(session.userId);
    return sanitizeUser(user);
  },

  async login(email, password) {
    const emailNormalized = normalizeEmail(email);
    const passwordNormalized = String(password || '');

    if (!emailNormalized || !passwordNormalized) {
      throw new Error('Введите email и пароль');
    }

    if (isSupabaseAuthEnabled()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password: passwordNormalized,
      });

      if (error) {
        if (error.code === 'email_not_confirmed') {
          throw new Error('Подтверди почту через письмо и попробуй войти снова');
        }
        throw new Error(error.message || 'Неверный email или пароль');
      }

      const authUser = data?.user || null;
      const profile = await ensureSupabaseProfile(authUser);
      currentUserCache = mapSupabaseUser(authUser, profile);
      emitChange();
      return currentUserCache;
    }

    const user = authApi.getUserByEmail(emailNormalized);

    if (!user) {
      throw new Error('Аккаунт с таким email не найден. Зарегистрируйтесь.');
    }

    if (user.password !== passwordNormalized) {
      throw new Error('Неверный пароль');
    }

    authApi.setSession(user.id);
    const safeUser = sanitizeUser(user);
    currentUserCache = safeUser;
    emitChange();
    return safeUser;
  },

  async register({ name, email, password }) {
    const nameNormalized = normalizeName(name);
    const emailNormalized = normalizeEmail(email);
    const passwordNormalized = String(password || '');

    if (nameNormalized.length < 2) {
      throw new Error('Имя должно быть не короче 2 символов');
    }

    if (!emailNormalized.includes('@')) {
      throw new Error('Введите корректный email');
    }

    if (passwordNormalized.length < 8) {
      throw new Error('Пароль должен быть не короче 8 символов');
    }

    if (isSupabaseAuthEnabled()) {
      const { data, error } = await supabase.auth.signUp({
        email: emailNormalized,
        password: passwordNormalized,
        options: {
          data: { name: nameNormalized },
          emailRedirectTo: supabaseConfig.redirectTo || window.location.origin,
        },
      });

      if (error) throw new Error(error.message);

      const authUser = data?.user || null;
      if (authUser?.id) {
        await ensureSupabaseProfile(authUser, nameNormalized);
      }

      const profile = authUser?.id ? await fetchSupabaseProfile(authUser.id) : null;
      currentUserCache = mapSupabaseUser(authUser, profile);
      emitChange();
      return currentUserCache;
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
    const safeUser = sanitizeUser(newUser);
    currentUserCache = safeUser;
    emitChange();
    return safeUser;
  },

  async resetPassword({ email, password, confirmPassword }) {
    const emailNormalized = normalizeEmail(email);
    const passwordNormalized = String(password || '');
    const confirmPasswordNormalized = String(confirmPassword || '');

    if (!emailNormalized.includes('@')) {
      throw new Error('Введите корректный email');
    }

    if (isSupabaseAuthEnabled()) {
      const { error } = await supabase.auth.resetPasswordForEmail(emailNormalized, {
        redirectTo: supabaseConfig.redirectTo || window.location.origin,
      });
      if (error) throw new Error(error.message);
      return true;
    }

    if (passwordNormalized.length < 8) {
      throw new Error('Новый пароль должен быть не короче 8 символов');
    }

    if (passwordNormalized !== confirmPasswordNormalized) {
      throw new Error('Пароли не совпадают');
    }

    const user = authApi.getUserByEmail(emailNormalized);
    if (!user) {
      throw new Error('Пользователь с таким email не найден');
    }

    authApi.updateUserPassword(user.id, passwordNormalized);
    return true;
  },

  async logout() {
    if (isSupabaseAuthEnabled()) {
      currentUserCache = null;
      emitChange();

      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);

      currentUserCache = null;
      emitChange();
      return;
    }

    authApi.clearSession();
    currentUserCache = null;
    emitChange();
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
