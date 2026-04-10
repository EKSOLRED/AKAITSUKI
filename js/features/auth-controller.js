export function getUserNickname(session) {
  return session?.user?.user_metadata?.nickname || session?.user?.email?.split('@')[0] || 'Пользователь';
}

export function upsertKnownUser(knownUsers = {}, { userId, email = '', nickname = '' }) {
  if (!userId) return { ...knownUsers };
  const next = {
    userId,
    email: String(email || '').trim() || `user-${String(userId).slice(0, 6)}@local`,
    nickname: String(nickname || '').trim() || `Пользователь ${String(userId).slice(0, 6)}...`
  };

  return {
    ...knownUsers,
    [userId]: next
  };
}

export function syncKnownUserFromSession(knownUsers = {}, session = null) {
  const user = session?.user;
  if (!user?.id) return { ...knownUsers };
  return upsertKnownUser(knownUsers, {
    userId: user.id,
    email: user.email || '',
    nickname: getUserNickname(session)
  });
}

export function getKnownUser(knownUsers = {}, userId) {
  return knownUsers?.[userId] || null;
}

export function getKnownUsersList(knownUsers = {}) {
  return Object.values(knownUsers || {});
}

export function getRoleSearchResults({ query = '', knownUsers = {}, roles = {}, collator = null }) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return [];

  return getKnownUsersList(knownUsers)
    .filter(item => {
      const email = String(item.email || '').toLowerCase();
      const nickname = String(item.nickname || '').toLowerCase();
      return email.includes(normalized) || nickname.includes(normalized);
    })
    .filter(item => roles[item.userId] !== 'owner' && roles[item.userId] !== 'admin')
    .sort((a, b) => {
      if (collator) return collator.compare(a.email, b.email);
      return String(a.email || '').localeCompare(String(b.email || ''), 'ru');
    });
}

export function getUserDisplayMeta(knownUsers = {}, userId) {
  const known = getKnownUser(knownUsers, userId);
  if (known) return known;

  return {
    userId,
    email: `user-${String(userId).slice(0, 6)}@local`,
    nickname: `Пользователь ${String(userId).slice(0, 6)}...`
  };
}

function normalizeRole(value) {
  return ['owner', 'admin', 'user'].includes(value) ? value : 'user';
}

export function getCurrentUserRole({ session = null, roles = {}, enableLocalAdminFallback = false } = {}) {
  if (!session?.user) return 'user';

  const metadataRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
  if (metadataRole) return normalizeRole(metadataRole);
  if (enableLocalAdminFallback) return normalizeRole(roles?.[session.user.id]);
  return 'user';
}

export function canOpenAdmin(context = {}) {
  const role = getCurrentUserRole(context);
  return Boolean(context.session?.user) && (role === 'owner' || role === 'admin');
}

export function canManageRoles(context = {}) {
  return Boolean(context.session?.user) && getCurrentUserRole(context) === 'owner';
}

export function mapSupabaseMessage(error, fallback) {
  const message = String(error?.message || '');
  if (!message) return fallback;
  if (message.includes('Invalid login credentials')) return 'Неверная почта или пароль.';
  if (message.includes('Email rate limit exceeded')) return 'Слишком много попыток. Попробуй позже.';
  if (message.includes('User already registered')) return 'Пользователь с такой почтой уже существует.';
  if (message.includes('Email not confirmed')) return 'Подтверди почту перед входом.';
  if (message.includes('Password should be at least 6 characters')) return 'Пароль должен быть минимум 6 символов.';
  if (message.includes('same password')) return 'Новый пароль должен отличаться от текущего.';
  if (message.includes('Unauthorized')) return 'Сессия устарела. Выйди и войди снова.';
  if (message.includes('Недостаточно прав')) return 'Для этого действия нужен доступ владельца.';
  return message || fallback;
}
