const FALLBACK_POSTER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#141414"/>
  <rect x="36" y="36" width="528" height="828" rx="28" fill="#1f1f1f" stroke="#3d3d3d" stroke-width="4"/>
  <text x="300" y="410" text-anchor="middle" fill="#f4f4f4" font-family="Arial, sans-serif" font-size="34">Постер</text>
  <text x="300" y="455" text-anchor="middle" fill="#9a9a9a" font-family="Arial, sans-serif" font-size="24">временно недоступен</text>
</svg>`)} `;

export function getPosterUrl(item = {}) {
  if (item.posterLocal && String(item.posterLocal).trim()) return String(item.posterLocal).trim();
  if (item.posterUrl && String(item.posterUrl).trim()) return String(item.posterUrl).trim();
  if (item.poster && String(item.poster).trim()) return String(item.poster).trim();
  return FALLBACK_POSTER;
}
