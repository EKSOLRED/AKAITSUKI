export function sanitizeHttpUrl(value, fallback = '#') {
  const text = String(value || '').trim();
  if (!text) return fallback;

  if (text.startsWith('data:image/')) return text;
  if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../')) return text;

  try {
    const url = new URL(text, window.location.origin);
    if (['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch {
    return fallback;
  }

  return fallback;
}

export function isSafeExternalUrl(value) {
  return sanitizeHttpUrl(value, '') !== '';
}
