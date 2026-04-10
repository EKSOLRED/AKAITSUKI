import { getSupabaseClient, getSupabaseUnavailableMessage, isSupabaseReady } from './supabase.js';

const defaultFunctionName = 'admin-roles';

function getFunctionName() {
  return window.APP_CONFIG?.supabaseFunctions?.adminRoles || defaultFunctionName;
}

function getFunctionUrl() {
  const baseUrl = String(window.APP_CONFIG?.supabaseUrl || '').replace(/\/+$/, '');
  return `${baseUrl}/functions/v1/${getFunctionName()}`;
}

async function getAccessToken() {
  const client = isSupabaseReady() ? getSupabaseClient() : null;
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token || null;
}

async function parseFunctionResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text ? { message: text } : {};
}

async function requestAdminRoles({ method = 'GET', query = null, body = null } = {}) {
  try {
    if (!isSupabaseReady()) {
      return { data: null, error: { message: getSupabaseUnavailableMessage() } };
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { data: null, error: { message: 'Нужна авторизация.' } };
    }

    const url = new URL(getFunctionUrl());
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      url.searchParams.set(key, String(value));
    });

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      apikey: String(window.APP_CONFIG?.supabaseKey || ''),
      'Content-Type': 'application/json'
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await parseFunctionResponse(response);
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: String(payload?.error || payload?.message || `HTTP ${response.status}`)
        }
      };
    }

    return { data: payload, error: null };
  } catch (error) {
    console.warn('admin-roles request failed', error);

    return {
      data: null,
      error: {
        message: 'Не удалось связаться с сервером ролей. Обнови страницу и попробуй ещё раз.'
      }
    };
  }
}

export async function fetchRoleDirectory() {
  return requestAdminRoles({ method: 'GET', query: { mode: 'list' } });
}

export async function searchRoleCandidates(query = '') {
  const normalized = String(query || '').trim();
  if (!normalized) return { data: { users: [] }, error: null };
  return requestAdminRoles({ method: 'GET', query: { mode: 'search', q: normalized } });
}

export async function updateRemoteUserRole({ userId, role }) {
  return requestAdminRoles({
    method: 'POST',
    body: {
      action: 'update-role',
      userId,
      role
    }
  });
}
