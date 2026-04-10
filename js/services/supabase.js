function createUnavailableResult(message) {
  return {
    data: null,
    error: { message }
  };
}

function createSupabaseSafeClient() {
  try {
    if (!window.supabase) return null;
    if (!window.APP_CONFIG?.supabaseUrl || !window.APP_CONFIG?.supabaseKey) return null;

    const { createClient } = window.supabase;
    return createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: window.APP_CONFIG?.supabaseAuthStorageKey || 'akaitsuki-auth'
      }
    });
  } catch (error) {
    console.error('Supabase init error:', error);
    return null;
  }
}

const client = createSupabaseSafeClient();

export function getSupabaseClient() {
  return client;
}

export function isSupabaseReady() {
  return Boolean(client);
}

export function getSupabaseUnavailableMessage() {
  return 'Авторизация временно недоступна. Проверь подключение к Supabase CDN, схему таблиц и файл js/config.runtime.js.';
}

export async function getSession() {
  if (!client) return { data: { session: null }, error: null };
  return client.auth.getSession();
}

export async function getUser() {
  if (!client) return { data: { user: null }, error: null };
  return client.auth.getUser();
}

export function onAuthStateChange(callback) {
  if (!client) return null;
  return client.auth.onAuthStateChange(callback);
}

export async function signInWithPassword(credentials) {
  if (!client) return createUnavailableResult(getSupabaseUnavailableMessage());
  return client.auth.signInWithPassword(credentials);
}

export async function signUp(payload) {
  if (!client) return createUnavailableResult(getSupabaseUnavailableMessage());
  return client.auth.signUp(payload);
}

export async function signOut() {
  if (!client) return createUnavailableResult(getSupabaseUnavailableMessage());
  return client.auth.signOut();
}

export async function updateUser(payload) {
  if (!client) return createUnavailableResult(getSupabaseUnavailableMessage());
  return client.auth.updateUser(payload);
}
