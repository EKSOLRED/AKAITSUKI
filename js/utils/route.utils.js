export function getRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  return hash === '' ? '/' : hash;
}

export function isTitleRoute(route) {
  return route.startsWith('/title/');
}

export function getTitleIdFromRoute(route) {
  return route.split('/').pop();
}
