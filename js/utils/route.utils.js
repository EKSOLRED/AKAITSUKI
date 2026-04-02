export function getRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash === '' ? '/' : hash;
}

export function isTitleRoute(route) {
  return route.startsWith('/title/');
}

export function getTitleIdFromRoute(route) {
  const raw = route.split('/').pop() || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
