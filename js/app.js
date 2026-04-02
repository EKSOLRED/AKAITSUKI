import { authService } from './services/auth.service.js';
import { animeService, getEpisodesLabel } from './services/anime.service.js';
import { favoritesService } from './services/favorites.service.js';
import { themeService } from './services/theme.service.js';
import { getDataAdapter, getDb, resetDb, updateDb } from './api/db.js';
import { aboutService } from './services/about.service.js';
import { setupAuthModal } from './ui/auth-modal.js';
import { showToast } from './ui/toast.js';
import { getRoute, isTitleRoute, getTitleIdFromRoute } from './utils/route.utils.js';
import { escapeHtml as escapeHtmlUtil } from './utils/text.utils.js';
import { createAnimeCard as createAnimeCardComponent, renderGenreChips as renderGenreChipsComponent } from './components/anime-card.component.js';
import { renderFilters as renderFiltersComponent } from './components/filters.component.js';
import { createSelectControl } from './components/select-control.component.js';
import { validateAdminDraft } from './utils/validators.js';
import { renderHomePage } from './pages/home.page.js';
import { renderCatalogPage } from './pages/catalog.page.js';
import { renderFavoritesPage } from './pages/favorites.page.js';
import { renderAboutPage } from './pages/about.page.js';
import { renderTitlePage } from './pages/title.page.js';
import { renderAdminPage } from './pages/admin.page.js';
import { createInitialPageState } from './state/app-state.js';
import { createCatalogController } from './features/catalog/catalog.controller.js';
import {
  ensureAdminDraft,
  createEmptyDraft,
  addDraftEpisode,
  removeDraftEpisode,
  getEpisodeById,
  createEmptyVoiceover,
  createEmptyPlayer,
  normalizeDraftFromTitle,
} from './features/admin/admin.helpers.js';

const app = document.getElementById('app');
const userBox = document.getElementById('userBox');
const mainNav = document.getElementById('mainNav');
const adminLink = document.querySelector('[data-admin-link]');
const themeToggle = document.getElementById('themeToggle');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const scrollFab = document.getElementById('scrollFab');
const siteFooter = document.getElementById('siteFooter');
const animeCardTemplate = document.getElementById('animeCardTemplate');
const pageState = createInitialPageState();
let globalListenersBound = false;
let rerender = () => {};

const authModal = setupAuthModal({ onSuccess: () => rerender() });

function escapeHtml(value) {
  return escapeHtmlUtil(value);
}

function setThemeUi(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeToggleIcon) themeToggleIcon.textContent = theme === 'dark' ? '☾' : '☀';
  themeToggle?.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  themeToggle?.setAttribute('data-tooltip', theme === 'dark' ? 'Светлая тема' : 'Тёмная тема');
}

function isAdmin() {
  return authService.isAdmin();
}

function isSuperAdmin() {
  return authService.isSuperAdmin();
}

function canAccessAdminSection(section) {
  return authService.canAccessAdminSection(section);
}

function closeAllFloating() {
  document.querySelectorAll('[data-select-root].is-open,[data-detail-select-root].is-open').forEach((node) => {
    node.classList.remove('is-open');
    node.querySelector('[data-select-trigger]')?.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.rating-popover.is-visible').forEach((node) => node.classList.remove('is-visible'));
}

function createFavoriteButton(itemId, active, large = false) {
  const classes = [
    'favorite-button',
    large ? 'favorite-button--large' : '',
    active ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  const label = active ? 'В избранном' : 'В избранное';
  const ariaLabel = active ? 'Убрать из избранного' : 'Добавить в избранное';

  return `
    <button
      class="${classes}"
      type="button"
      data-action="favorite"
      data-id="${itemId}"
      aria-pressed="${String(active)}"
      aria-label="${ariaLabel}"
    >
      <span class="favorite-button__inner">
        <span class="favorite-button__label">${label}</span>
      </span>
    </button>
  `;
}

function renderUserBox() {
  const user = authService.getCurrentUser();
  if (adminLink) adminLink.toggleAttribute('hidden', !isAdmin());

  if (!user) {
    userBox.innerHTML = `
      <button class="button button--ghost" id="loginButton">Войти</button>
      <button class="button button--primary" id="registerButton">Регистрация</button>
    `;
    document.getElementById('loginButton')?.addEventListener('click', () => authModal.open());
    document.getElementById('registerButton')?.addEventListener('click', () => {
      document.querySelector('[data-auth-tab="register"]')?.click();
      authModal.open();
    });
    return;
  }

  userBox.innerHTML = `
    <div class="user-pill">
      <div class="user-pill__avatar">${escapeHtml(user.name.slice(0, 1).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <div class="help-text">${user.role === 'owner' ? 'Владелец' : user.role === 'admin' ? 'Админ' : 'Пользователь'}</div>
      </div>
    </div>
    <button class="button button--ghost" id="logoutButton">Выйти</button>
  `;

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    authService.logout();
    if (getRoute() === '/favorites' || getRoute() === '/admin') location.hash = '#/catalog';
    else rerender();
    showToast('Вы вышли из аккаунта');
  });
}

function renderNavActive() {
  const current = getRoute();
  mainNav.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href').replace('#', '');
    const active = href === '/' ? current === '/' : current.startsWith(href);
    link.classList.toggle('active', active);
  });
  if (adminLink) adminLink.classList.remove('active');
}

function renderFooter() {
  if (!siteFooter) return;

  const about = aboutService.get();
  const socials = (about.socials || []).filter((item) => item.href);
  const year = new Date().getFullYear();

  siteFooter.innerHTML = `
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <strong>AKAITSUKI</strong>
        <span>© ${year} · Anime Voice Library</span>
      </div>

      <div class="site-footer__socials">
        ${socials.map((social) => `
          <a
            class="site-footer__social"
            href="${escapeHtml(social.href || '#')}"
            target="_blank"
            rel="noreferrer noopener"
            data-tooltip="${escapeHtml(social.label || 'Соцсеть')}"
            aria-label="${escapeHtml(social.label || 'Соцсеть')}"
          >
            ${social.icon
              ? `<img class="site-footer__social-icon" src="${escapeHtml(social.icon)}" alt="" />`
              : `<span class="site-footer__social-fallback" aria-hidden="true">${escapeHtml((social.label || '•').slice(0, 1).toUpperCase())}</span>`}
          </a>
        `).join('')}
      </div>
    </div>
  `;

  siteFooter.classList.remove('is-visible');
  requestAnimationFrame(() => siteFooter.classList.add('is-visible'));
}

function saveDraftToService(options = {}) {
  const { preserveEditing = false } = options;
  const draft = ensureAdminDraft(pageState);
  const payload = validateAdminDraft({
    contentType: draft.contentType,
    title: draft.title,
    altTitles: draft.altTitles,
    poster: draft.poster,
    description: draft.description,
    genres: draft.genres,
    year: draft.year,
    releaseLabel: draft.contentType === 'series' ? String(draft.year || '') : draft.releaseLabel,
    titleType: draft.contentType === 'series' ? '' : draft.titleType,
    ageRating: draft.ageRating,
    studio: draft.contentType === 'series' ? '' : draft.studio,
    country: draft.contentType === 'series' ? draft.country : '',
    director: draft.director,
    totalEpisodes: draft.totalEpisodes,
    episodes: draft.episodes,
  });

  const saved = pageState.admin.editingId
    ? animeService.update(pageState.admin.editingId, payload)
    : animeService.create(payload);

  if (preserveEditing) {
    pageState.admin.editingId = saved.id;
    pageState.admin.draft = normalizeDraftFromTitle(saved);
    pageState.admin.activeVoiceTabs = Object.fromEntries((saved.episodes || []).map((episode) => [episode.id, episode.voiceovers?.[0]?.id || null]));
    pageState.admin.confirmRemoveVoice = null;
    return saved;
  }

  pageState.admin.editingId = null;
  pageState.admin.draft = createEmptyDraft(pageState.admin.section);
  pageState.admin.activeVoiceTabs = {};
  pageState.admin.confirmRemoveVoice = null;
  return saved;
}

const catalogController = createCatalogController({
  pageState,
  animeService,
  renderFiltersComponent,
  renderGenreChipsComponent,
  createAnimeCardComponent,
  authService,
  favoritesService,
  animeCardTemplate,
  createFavoriteButton,
  getEpisodesLabel,
  createSelectControl,
  escapeHtml,
  closeAllFloating,
  authModal,
  get rerender() {
    return rerender;
  },
});

function createSharedContext() {
  return {
    app,
    pageState,
    authService,
    authModal,
    animeService,
    favoritesService,
    aboutService,
    getDb,
    resetDb,
    updateDb,
    dataAdapter: getDataAdapter(),
    showToast,
    escapeHtml,
    createFavoriteButton,
    createSelectControl,
    createAnimeCard: catalogController.createAnimeCard,
    bindGridInteractions: catalogController.bindGridInteractions,
    updateGrid: catalogController.updateGrid,
    renderFilters: catalogController.renderFilters,
    closeAllFloating,
    handleFavoriteToggle: catalogController.handleFavoriteToggle,
    refreshTooltips,
    isAdmin,
    isSuperAdmin,
    canAccessAdminSection,
    getEpisodesLabel,
    ensureAdminDraft: () => ensureAdminDraft(pageState),
    createEmptyDraft,
    addDraftEpisode,
    removeDraftEpisode,
    getEpisodeById,
    createEmptyVoiceover,
    createEmptyPlayer,
    normalizeDraftFromTitle,
    saveDraftToService,
  };
}


function ensureTooltipRoot() {
  let tooltip = document.getElementById('appTooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'appTooltip';
    tooltip.className = 'app-tooltip';
    tooltip.hidden = true;
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function refreshTooltips(root = document) {
  root.querySelectorAll('[title]:not(iframe)').forEach((node) => {
    const value = node.getAttribute('title');
    if (value && !node.dataset.tooltip) node.dataset.tooltip = value;
    node.removeAttribute('title');
  });
}

function setupTooltipSystem() {
  const tooltip = ensureTooltipRoot();
  let activeNode = null;

  const positionTooltip = (event) => {
    if (!activeNode || tooltip.hidden) return;
    const offset = 16;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const maxLeft = window.innerWidth - width - 12;
    const left = Math.max(12, Math.min(event.clientX + offset, maxLeft));
    const top = Math.max(12, event.clientY - height - 14);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };

  const showTooltip = (node, event) => {
    const value = node?.dataset?.tooltip?.trim();
    if (!value) return;
    activeNode = node;
    tooltip.textContent = value;
    tooltip.hidden = false;
    tooltip.classList.add('is-visible');
    positionTooltip(event);
  };

  const hideTooltip = () => {
    activeNode = null;
    tooltip.classList.remove('is-visible');
    tooltip.hidden = true;
  };

  document.addEventListener('pointerover', (event) => {
    const node = event.target.closest('[data-tooltip]');
    if (!node) return hideTooltip();
    showTooltip(node, event);
  });

  document.addEventListener('pointermove', positionTooltip, { passive: true });
  document.addEventListener('pointerout', (event) => {
    if (!event.target.closest('[data-tooltip]')) return;
    if (event.relatedTarget?.closest?.('[data-tooltip]') === activeNode) return;
    hideTooltip();
  });

  document.addEventListener('focusin', (event) => {
    const node = event.target.closest('[data-tooltip]');
    if (!node) return;
    const rect = node.getBoundingClientRect();
    showTooltip(node, { clientX: rect.left + rect.width / 2, clientY: rect.top });
  });

  document.addEventListener('focusout', (event) => {
    if (event.target.closest('[data-tooltip]')) hideTooltip();
  });
}

function updateScrollFab() {
  if (!scrollFab) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  if (maxScroll <= 80) {
    scrollFab.classList.remove('is-visible');
    return;
  }

  scrollFab.classList.add('is-visible');

  const nearBottom = scrollTop > maxScroll * 0.55;
  scrollFab.textContent = nearBottom ? '↑' : '↓';
  scrollFab.setAttribute('aria-label', nearBottom ? 'Прокрутить страницу вверх' : 'Прокрутить страницу вниз');
}

function handleScrollFabClick() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const nearBottom = scrollTop > maxScroll * 0.55;

  window.scrollTo({
    top: nearBottom ? 0 : document.documentElement.scrollHeight,
    behavior: 'smooth',
  });
}

rerender = function rerenderApp() {
  renderUserBox();
  renderNavActive();
  renderFooter();

  const sharedContext = createSharedContext();
  const route = getRoute();

  if (isTitleRoute(route)) {
    const result = renderTitlePage(getTitleIdFromRoute(route), sharedContext);
    refreshTooltips(app);
    requestAnimationFrame(updateScrollFab);
    return result;
  }

  switch (route) {
    case '/catalog': {
      const result = renderCatalogPage(sharedContext);
      refreshTooltips(app);
      requestAnimationFrame(updateScrollFab);
      return result;
    }
    case '/favorites': {
      const result = renderFavoritesPage(sharedContext);
      refreshTooltips(app);
      requestAnimationFrame(updateScrollFab);
      return result;
    }
    case '/about': {
      const result = renderAboutPage(sharedContext);
      refreshTooltips(app);
      requestAnimationFrame(updateScrollFab);
      return result;
    }
    case '/admin': {
      const result = renderAdminPage(sharedContext);
      refreshTooltips(app);
      requestAnimationFrame(updateScrollFab);
      return result;
    }
    case '/':
    default: {
      const result = renderHomePage(sharedContext);
      refreshTooltips(app);
      requestAnimationFrame(updateScrollFab);
      return result;
    }
  }
};

themeToggle.addEventListener('click', () => {
  const nextTheme = themeService.toggleTheme();
  setThemeUi(nextTheme);
});

scrollFab?.addEventListener('click', handleScrollFabClick);
window.addEventListener('scroll', updateScrollFab, { passive: true });
window.addEventListener('resize', updateScrollFab);

if (!globalListenersBound) {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-select-root]') && !event.target.closest('[data-detail-select-root]') && !event.target.closest('.rating-badge')) {
      closeAllFloating();
      Object.values(pageState.detail).forEach((item) => { item.ratingOpen = false; });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllFloating();
      Object.values(pageState.detail).forEach((item) => { item.ratingOpen = false; });
      if (getRoute().startsWith('/title/')) rerender();
    }
  });

  globalListenersBound = true;
}

window.addEventListener('hashchange', rerender);
window.addEventListener('DOMContentLoaded', () => {
  setupTooltipSystem();
  refreshTooltips(document);
  setThemeUi(themeService.getTheme());
  rerender();
  updateScrollFab();
});
