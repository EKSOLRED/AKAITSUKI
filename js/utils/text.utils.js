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
