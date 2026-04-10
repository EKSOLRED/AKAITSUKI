const THEME_KEY = 'akaitsuki-theme';
const GUEST_FAVORITES_KEY = 'akaitsuki-favorites:guest';
const NICKNAME_HINT_PREFIX = 'akaitsuki-nickname-change-hint:';
const NICKNAME_HINT_COOLDOWN = 5 * 60 * 1000;

export function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function readJson(key, fallback = null) {
  try {
    const raw = safeGetItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  return safeSetItem(key, JSON.stringify(value));
}

export function getStoredTheme() {
  return safeGetItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  safeSetItem(THEME_KEY, theme);
}

export function getFavoritesStorageKey(userId = null) {
  return userId ? `akaitsuki-favorites:${userId}` : GUEST_FAVORITES_KEY;
}

export function loadFavorites(userId = null) {
  return readJson(getFavoritesStorageKey(userId), []);
}

export function saveFavorites(userId = null, favorites = []) {
  saveJson(getFavoritesStorageKey(userId), favorites);
}

export function mergeGuestFavoritesIntoUser(userId) {
  if (!userId) return [];

  const guestFavorites = loadFavorites(null);
  const userFavorites = loadFavorites(userId);
  const merged = [...new Set([...userFavorites, ...guestFavorites])];

  saveFavorites(userId, merged);

  if (guestFavorites.length) {
    safeRemoveItem(GUEST_FAVORITES_KEY);
  }

  return merged;
}

export function getNicknameCooldownHintRemaining(userId) {
  if (!userId) return 0;

  const key = `${NICKNAME_HINT_PREFIX}${userId}`;
  const lastChange = Number(safeGetItem(key) || '0');
  const diff = Date.now() - lastChange;
  return Math.max(0, NICKNAME_HINT_COOLDOWN - diff);
}

export function saveNicknameCooldownHint(userId) {
  if (!userId) return;
  safeSetItem(`${NICKNAME_HINT_PREFIX}${userId}`, String(Date.now()));
}
