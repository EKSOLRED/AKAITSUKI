/// <reference path="./types.d.ts" />
// @ts-ignore: Supabase Edge Functions resolve npm: imports at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

type Role = 'owner' | 'admin' | 'user';

type AuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseClient = ReturnType<typeof createClient>;

type ProfileRow = {
  id: string;
  email: string | null;
  nickname: string | null;
};

type ManagedUser = {
  userId: string;
  email: string;
  nickname: string;
  role: Role;
};

type RequesterResult = {
  user: AuthUser | null;
  error: string | null;
};

type UpdateRolePayload = {
  action?: string;
  userId?: string;
  role?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SECRET_KEY') ?? '';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function normalizeRole(value: unknown): Role {
  const normalized = String(value ?? '').trim();
  return normalized === 'owner' || normalized === 'admin' || normalized === 'user'
    ? normalized
    : 'user';
}

function fallbackEmail(userId: string) {
  return `user-${String(userId).slice(0, 6)}@local`;
}

function fallbackNickname(userId: string) {
  return `Пользователь ${String(userId).slice(0, 6)}...`;
}

async function getRequester(req: Request): Promise<RequesterResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: error?.message || 'Invalid JWT' };
  }

  return { user: data.user, error: null };
}

function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function fetchProfilesByIds(adminClient: SupabaseClient, userIds: string[]): Promise<Record<string, ProfileRow>> {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (!uniqueIds.length) {
    return {};
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, nickname')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProfileRow[]).reduce<Record<string, ProfileRow>>((accumulator, row) => {
    accumulator[row.id] = row;
    return accumulator;
  }, {});
}

function shapeManagedUser(user: AuthUser | null, profile: ProfileRow | null = null): ManagedUser {
  const userId = String(user?.id || profile?.id || '');
  const email = String(profile?.email || user?.email || '').trim() || fallbackEmail(userId);
  const nickname = String(profile?.nickname || user?.user_metadata?.nickname || '').trim()
    || email.split('@')[0]
    || fallbackNickname(userId);

  return {
    userId,
    email,
    nickname,
    role: normalizeRole(user?.app_metadata?.role)
  };
}

async function listAllUsers(adminClient: SupabaseClient): Promise<AuthUser[]> {
  const pageSize = 200;
  const maxPages = 20;
  const users: AuthUser[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) {
      throw error;
    }

    const pageUsers = Array.isArray(data?.users) ? data.users : [];
    users.push(...pageUsers);

    if (pageUsers.length < pageSize) {
      break;
    }
  }

  return users;
}

async function listPrivilegedUsers(adminClient: SupabaseClient): Promise<ManagedUser[]> {
  const users = await listAllUsers(adminClient);
  const privileged = users.filter((user) => ['owner', 'admin'].includes(normalizeRole(user?.app_metadata?.role)));
  const profilesById = await fetchProfilesByIds(adminClient, privileged.map((user) => user.id));

  return privileged
    .map((user) => shapeManagedUser(user, profilesById[user.id] ?? null))
    .sort((a, b) => {
      const roleWeight: Record<Role, number> = { owner: 0, admin: 1, user: 2 };
      const roleDiff = roleWeight[a.role] - roleWeight[b.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return a.email.localeCompare(b.email, 'ru');
    });
}

async function searchUsers(adminClient: SupabaseClient, query: string): Promise<ManagedUser[]> {
  const normalized = String(query || '').trim();
  if (!normalized) {
    return [];
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, nickname')
    .ilike('email', `%${normalized}%`)
    .limit(12)
    .order('email', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (Array.isArray(data) ? data : []) as ProfileRow[];
  const detailedUsers = await Promise.all(
    rows.map(async (row): Promise<ManagedUser> => {
      const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(row.id);
      if (authError || !authData?.user) {
        throw authError ?? new Error('User not found.');
      }
      return shapeManagedUser(authData.user, row);
    })
  );

  return detailedUsers.sort((a, b) => a.email.localeCompare(b.email, 'ru'));
}

async function updateRole(
  adminClient: SupabaseClient,
  requester: AuthUser,
  payload: UpdateRolePayload
) {
  const userId = String(payload?.userId || '').trim();
  const nextRole = normalizeRole(payload?.role);

  if (!userId) {
    return json({ error: 'userId is required.' }, 400);
  }
  if (!['owner', 'admin', 'user'].includes(nextRole)) {
    return json({ error: 'Unsupported role.' }, 400);
  }
  if (requester.id === userId && nextRole !== 'owner') {
    return json({ error: 'Нельзя снять роль owner с самого себя.' }, 400);
  }

  const { data: targetData, error: targetError } = await adminClient.auth.admin.getUserById(userId);
  if (targetError || !targetData?.user) {
    return json({ error: targetError?.message || 'User not found.' }, 404);
  }

  const nextAppMetadata = {
    ...(targetData.user.app_metadata || {}),
    role: nextRole
  };

  const { data: updatedData, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: nextAppMetadata
  });

  if (updateError || !updatedData?.user) {
    return json({ error: updateError?.message || 'Failed to update role.' }, 500);
  }

  const profilesById = await fetchProfilesByIds(adminClient, [userId]);
  return json({ user: shapeManagedUser(updatedData.user, profilesById[userId] ?? null) });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Edge Function secrets are not configured.' }, 500);
  }

  const { user, error } = await getRequester(req);
  if (error || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (normalizeRole(user.app_metadata?.role) !== 'owner') {
    return json({ error: 'Недостаточно прав. Нужна роль owner.' }, 403);
  }

  const adminClient = createAdminClient();

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('mode') || 'list';

      if (mode === 'search') {
        const users = await searchUsers(adminClient, url.searchParams.get('q') || '');
        return json({ users });
      }

      const users = await listPrivilegedUsers(adminClient);
      return json({ users });
    }

    if (req.method === 'POST') {
      const payload = await req.json().catch(() => ({})) as UpdateRolePayload;
      if (payload?.action === 'update-role') {
        return await updateRole(adminClient, user, payload);
      }
      return json({ error: 'Unsupported action.' }, 400);
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (runtimeError) {
    console.error(runtimeError);
    return json({ error: runtimeError instanceof Error ? runtimeError.message : 'Unexpected error.' }, 500);
  }
});
