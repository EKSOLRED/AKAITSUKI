export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function normalizeName(name = '') {
  return String(name).replace(/\s+/g, ' ').trim();
}

export function splitCommaList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toUrl(value = '') {
  const text = String(value || '').trim();
  if (!text) return null;

  try {
    return new URL(text, window.location.origin);
  } catch {
    return null;
  }
}

export function sanitizeHref(value, fallback = '#') {
  const url = toUrl(value);
  if (!url) return fallback;
  return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
}

export function sanitizeMediaSrc(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;

  if (/^data:image\//i.test(text)) return text;
  if (/^blob:/i.test(text)) return text;

  const url = toUrl(text);
  if (!url) return fallback;

  return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
}

export function sanitizeIframeSrc(value, fallback = '') {
  const url = toUrl(value);
  if (!url) return fallback;
  return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
}
