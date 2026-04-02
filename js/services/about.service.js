import { aboutApi } from '../api/about.api.js';


function normalizeSocials(input = []) {
  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        label: String(item.label || '').trim(),
        icon: String(item.icon || '').trim(),
        href: String(item.href || item.url || '').trim(),
      }))
      .filter((item) => item.label || item.icon || item.href);
  }

  return [];
}

function normalizeTeam(input = []) {
  if (Array.isArray(input)) {
    return input.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: String(item.name || '').trim(),
      nick: String(item.nick || '').trim(),
      role: String(item.role || '').trim(),
    })).filter((item) => item.name || item.nick || item.role);
  }

  return String(input || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, role = ''] = line.split('—');
      const match = left.trim().match(/^(.*?)\s*\((.*?)\)$/);
      return {
        id: crypto.randomUUID(),
        name: match ? match[1].trim() : left.trim(),
        nick: match ? match[2].trim() : '',
        role: role.trim(),
      };
    });
}

export const aboutService = {
  get() {
    const about = aboutApi.getAbout() || {};
    return {
      title: String(about.title || 'Кто мы такие').trim(),
      description: String(about.description || '').trim(),
      team: normalizeTeam(about.team || []),
      socials: normalizeSocials(about.socials || []),
    };
  },

  update(payload = {}) {
    const next = {
      title: String(payload.title || 'Кто мы такие').trim(),
      description: String(payload.description || '').trim(),
      team: normalizeTeam(payload.team || []),
      socials: normalizeSocials(payload.socials || []),
    };

    aboutApi.updateAbout(next);
    return this.get();
  },
};
