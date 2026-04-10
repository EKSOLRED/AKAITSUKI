const DEFAULT_SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function sanitizeUrl(raw, { allowData = false, allowedProtocols = DEFAULT_SAFE_PROTOCOLS } = {}) {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (allowData && value.startsWith('data:')) {
    return value;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (allowedProtocols.has(url.protocol)) return url.href;
  } catch {}

  return '';
}

export function sanitizeCssGradient(raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > 420) return '';
  return /^(linear-gradient|radial-gradient)\(/i.test(value) ? value : '';
}

export function toInlineCssUrl(url) {
  const safeUrl = sanitizeUrl(url, { allowData: true });
  if (!safeUrl) return '';
  const escaped = safeUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\n\r\t]/g, '');
  return `url('${escaped}')`;
}
