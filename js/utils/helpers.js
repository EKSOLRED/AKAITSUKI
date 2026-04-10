export const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createNodeFromHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function createFragmentFromMarkup(markupList) {
  const fragment = document.createDocumentFragment();

  markupList.forEach(markup => {
    const node = createNodeFromHtml(markup);
    if (node) fragment.appendChild(node);
  });

  return fragment;
}

function isElementHidden(element) {
  return Boolean(
    element.hidden ||
    element.closest('[hidden]') ||
    element.closest('[aria-hidden="true"]') ||
    element.getAttribute('aria-hidden') === 'true'
  );
}

export function getFocusableElements(container) {
  return [...container.querySelectorAll(focusableSelector)]
    .filter(element => !isElementHidden(element));
}

export function getTitleHash(id) {
  return `#title-${id}`;
}

export function parseTitleHash(hash) {
  if (!hash.startsWith('#title-')) return null;
  const id = Number(hash.replace('#title-', ''));
  return Number.isFinite(id) ? id : null;
}

export function toMinutesText(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes <= 1 ? 'меньше минуты' : `${minutes} мин.`;
}

export function debounce(callback, delay = 180) {
  let timerId = 0;

  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
