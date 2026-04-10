import { projects as baseProjects } from './data/projects.js';
import { controlsMeta, sortOptions, mediaSortOptions } from './data/options.js';
import {
  createFragmentFromMarkup,
  createNodeFromHtml,
  debounce,
  escapeHtml,
  getFocusableElements,
  getTitleHash,
  isValidEmail,
  parseTitleHash,
  prefersReducedMotion,
  toMinutesText
} from './utils/helpers.js';
import { isVideoLike } from './utils/media.js';
import { sanitizeUrl } from './utils/url.js';
import {
  getStoredTheme,
  getNicknameCooldownHintRemaining,
  readJson,
  saveJson,
  saveNicknameCooldownHint,
  saveTheme
} from './utils/storage.js';
import {
  getSession,
  onAuthStateChange,
  signInWithPassword,
  signOut,
  signUp,
  updateUser
} from './services/supabase.js';
import { fetchRoleDirectory, searchRoleCandidates, updateRemoteUserRole } from './services/admin-roles.js';
import {
  getAdminPageMarkup,
  getCardMarkup,
  getControlsMarkup,
  getFeatureMarkup,
  getModalMarkup,
  getRatingDialogMarkup,
  getRecentUpdatesMarkup,
  getTitlePageMarkup,
  getVideoModalMarkup
} from './ui/templates.js';
import {
  createDefaultPlayer,
  createDefaultVoiceover,
  createEmptyMediaDraft,
  createEntityIdFactory,
  createProjectNormalizer,
  defaultAboutContent,
  getDraftSeasonById,
  getLatestEpisodeFromMedia,
  inferLatestEpisodeLabel,
  normalizeAboutContent
} from './features/content-model.js';
import { createDialogController } from './ui/dialogs.js';
import { createFavoritesController } from './features/favorites-controller.js';
import { createViewController } from './features/view-controller.js';
import { getLinkedTrailerForTitle as getLinkedTrailerForTitleFromController, getTitlePlayerViewModel as getTitlePlayerViewModelFromController, updateTitlePlayerSelection as updateTitlePlayerSelectionInController } from './features/title-player-controller.js';
import { createAppRepository } from './services/app-repository.js';
import { createContentRepository } from './services/content-repository.js';
import { applyAdminUiStateSnapshot, buildAdminUiStateSnapshot, cloneDeep } from './features/admin-ui-state.js';
import {
  canManageRoles as canManageRolesFromAuth,
  canOpenAdmin as canOpenAdminFromAuth,
  getCurrentUserRole as getCurrentUserRoleFromAuth,
  getUserNickname as getUserNicknameFromAuth,
  mapSupabaseMessage as mapSupabaseMessageFromAuth,
  syncKnownUserFromSession as syncKnownUserFromSessionHelper,
  upsertKnownUser as upsertKnownUserHelper
} from './features/auth-controller.js';

const collator = new Intl.Collator('ru');
const scopeList = ['catalog', 'favorites'];
const ADMIN_PROJECTS_KEY = 'akaitsuki-admin-projects';
const ADMIN_ABOUT_KEY = 'akaitsuki-admin-about';
const RATINGS_KEY = 'akaitsuki-ratings';
const ADMIN_UI_STATE_KEY = 'akaitsuki-admin-ui-state';

const UPDATED_ORDER_FALLBACK = 2147483647;

const state = {
  session: null,
  sessionResolved: false,
  favorites: [],
  theme: getStoredTheme(),
  currentView: 'home',
  lastBrowseView: 'catalog',
  currentTitleId: null,
  currentModalId: null,
  currentRatingId: null,
  currentVideoId: null,
  featuredAnimeId: null,
  authTab: 'login',
  titlePlayer: {},
  scrollPositions: { home: 0, catalog: 0, favorites: 0, about: 0, title: 0, admin: 0, account: 0 },
  search: { catalog: '', favorites: '' },
  pagination: { catalog: 1, favorites: 1 },
  filters: {
    catalog: { type: 'anime', genres: [], sort: 'rating_high' },
    favorites: { type: 'anime', genres: [], sort: 'rating_high' }
  },
  adminSectionTab: 'add',
  adminTypeTab: 'anime',
  adminSubtabs: { add: 'title', edit: 'title' },
  adminTitleSearch: '',
  adminRoleSearch: '',
  adminEditProjectId: null,
  adminEditTypeTab: null,
  adminDraftMedia: {
    add: { seasons: [] },
    edit: null
  },
  adminSeriesSelection: {
    add: { seasonId: null, episodeId: null, voiceoverId: null },
    edit: { seasonId: null, episodeId: null, voiceoverId: null }
  },
  adminTrailerLinks: { add: null, edit: null },
  adminTrailerLinkSearch: '',
  adminFormDrafts: { add: {}, edit: null, about: null },
  projects: [],
  ratings: readJson(RATINGS_KEY, {}),
  aboutContent: normalizeAboutContent(defaultAboutContent),
  roles: {},
  knownUsers: {},
  roleEntries: [],
  roleSearchResults: [],
  roleEntriesLoading: false,
  roleSearchLoading: false,
  roleEntriesLoaded: false,
  roleEntriesError: '',
  roleSearchError: '',
  roleSearchRequestSeq: 0,
  adminPending: {
    addTitle: false,
    editTitle: false,
    editSeries: false,
    about: false,
    rolesRefresh: false,
    roleUserId: null,
    deleteTitleId: null
  },
  contentStatus: {
    catalogSource: 'init',
    aboutSource: 'init',
    catalogWarning: '',
    aboutWarning: ''
  }
};

const elements = {
  body: document.body,
  viewLinks: [...document.querySelectorAll('[data-view-link]')],
  pageViews: [...document.querySelectorAll('.page-view')],
  counters: [...document.querySelectorAll('[data-counter]')],
  revealItems: [...document.querySelectorAll('.reveal')],
  controlsRoots: {
    catalog: document.getElementById('catalogControls'),
    favorites: document.getElementById('favoritesControls')
  },
  emptyStates: {
    catalog: document.getElementById('emptyState'),
    favorites: document.getElementById('favoritesEmptyState')
  },
  paginations: {
    catalog: document.getElementById('catalogPagination'),
    favorites: document.getElementById('favoritesPagination')
  },
  grids: {
    catalog: document.getElementById('cardsGrid'),
    favorites: document.getElementById('favoritesGrid')
  },
  heroFeature: document.getElementById('heroFeature'),
  heroShuffleBtn: document.getElementById('heroShuffleBtn'),
  recentUpdatesGrid: document.getElementById('recentUpdatesGrid'),
  newVideosGrid: document.getElementById('newVideosGrid'),
  titlePageContent: document.getElementById('titlePageContent'),
  backToCatalogBtn: document.getElementById('backToCatalogBtn'),
  adminPageContent: document.getElementById('adminPageContent'),
  themeToggle: document.getElementById('themeToggle'),
  topbarUser: document.querySelector('.topbar-user'),
  loginBtn: document.getElementById('login-btn'),
  userActionsBar: document.getElementById('userActionsBar'),
  authGate: [...document.querySelectorAll('.auth-only')],
  favoriteNavLinks: [...new Set([...document.querySelectorAll('[data-view-link="favorites"]'), ...document.querySelectorAll('a[href="#favorites"]')])],
  adminNavLink: document.querySelector('[data-view-link="admin"]'),
  detailsModal: document.getElementById('detailsModal'),
  modalContent: document.getElementById('modalContent'),
  authModal: document.getElementById('authModal'),
  videoModal: document.getElementById('videoModal'),
  videoModalContent: document.getElementById('videoModalContent'),
  trailerLinkModal: document.getElementById('trailerLinkModal'),
  trailerLinkSearchInput: document.getElementById('trailerLinkSearchInput'),
  trailerLinkResults: document.getElementById('trailerLinkResults'),
  authTabs: [...document.querySelectorAll('[data-auth-tab]')],
  authPanels: [...document.querySelectorAll('[data-auth-panel]')],
  authStatus: document.getElementById('authStatus'),
  loginForm: document.getElementById('authLoginPanel'),
  registerForm: document.getElementById('authRegisterPanel'),
  profileForm: document.getElementById('profileForm'),
  passwordForm: document.getElementById('passwordForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  registerNickname: document.getElementById('registerNickname'),
  registerEmail: document.getElementById('registerEmail'),
  registerPassword: document.getElementById('registerPassword'),
  registerPasswordRepeat: document.getElementById('registerPasswordRepeat'),
  profileNickname: document.getElementById('profileNickname'),
  profileEmail: document.getElementById('profileEmail'),
  profilePassword: document.getElementById('profilePassword'),
  profilePasswordRepeat: document.getElementById('profilePasswordRepeat'),
  pageScrollBtn: document.getElementById('pageScrollBtn'),
  pageScrollBtnIcon: document.querySelector('#pageScrollBtn .page-scroll-btn-icon'),
  siteToast: document.getElementById('siteToast'),
  aboutTitle: document.querySelector('.about-copy h3'),
  aboutParagraphs: [...document.querySelectorAll('.about-copy p')]
};

const scopeElements = { catalog: null, favorites: null };
let toastTimer = 0;
const nextEntityId = createEntityIdFactory();
const normalizeProject = createProjectNormalizer({ baseProjects, nextEntityId });
const repository = createAppRepository({ ratingsKey: RATINGS_KEY });
const contentRepository = createContentRepository({
  projectsCacheKey: ADMIN_PROJECTS_KEY,
  aboutCacheKey: ADMIN_ABOUT_KEY,
  titlesEntryKey: 'titles',
  aboutEntryKey: 'about'
});

function getContentFallbackMessage(source, error, area = 'catalog') {
  const target = area === 'about' ? 'блок «О нас»' : 'каталог';
  if (source === 'cache') return `Не удалось получить свежие данные из Supabase. Показана последняя сохранённая версия ${target}.`;
  if (source === 'legacy') return area === 'about' ? '' : 'Каталог загружен из старого content-layer. Лучше пересохранить тайтлы через админку, чтобы всё жило в новой схеме.';
  if (source === 'seed') return area === 'about' ? 'Не удалось загрузить актуальный блок «О нас». Показана базовая версия из проекта.' : 'Supabase пока не отдал каталог. Показана базовая версия из проекта.';
  if (source === 'empty' && error) return area === 'about' ? 'Не удалось загрузить блок «О нас». Попробуй обновить страницу позже.' : 'Не удалось загрузить каталог из Supabase. Попробуй обновить страницу позже.';
  return '';
}

async function loadContentState() {
  const [projectsResult, aboutResult] = await Promise.all([
    contentRepository.loadProjectsWithMeta(),
    contentRepository.loadAboutContentWithMeta({ fallbackAbout: defaultAboutContent })
  ]);

  state.projects = (Array.isArray(projectsResult?.data) ? projectsResult.data : []).map(normalizeProject);
  state.aboutContent = normalizeAboutContent(aboutResult?.data);
  state.contentStatus.catalogSource = projectsResult?.source || 'empty';
  state.contentStatus.aboutSource = aboutResult?.source || 'empty';
  state.contentStatus.catalogWarning = getContentFallbackMessage(projectsResult?.source, projectsResult?.error, 'catalog');
  state.contentStatus.aboutWarning = getContentFallbackMessage(aboutResult?.source, aboutResult?.error, 'about');
  state.adminDraftMedia.add = createEmptyMediaDraft();
  loadAdminUiState();
}

function getProjectsStoragePayload() {
  return state.projects.map(({ searchIndex, displayPosterUrl, ...project }) => project);
}

async function saveProjects() {
  return contentRepository.persistProjects(getProjectsStoragePayload());
}

async function saveProject(project) {
  if (!project) return { data: null, error: null };
  return contentRepository.persistProject(cloneDeep(project));
}

async function saveProjectsBatch(projects = []) {
  if (!Array.isArray(projects) || !projects.length) return { data: [], error: null };
  return contentRepository.persistProjectsBatch(projects.map(project => cloneDeep(project)));
}

async function removeProjectFromRemote(titleId) {
  if (!titleId) return { data: null, error: null };
  return contentRepository.removeProject(titleId);
}

function saveRatings() {
  repository.cacheRatings(state.ratings);
}

function getAdminUiStateSnapshot() {
  return buildAdminUiStateSnapshot(state);
}

function saveAdminUiState() {
  saveJson(ADMIN_UI_STATE_KEY, getAdminUiStateSnapshot());
}

const saveAdminUiStateDebounced = debounce(() => {
  saveAdminUiState();
}, 220);

function loadAdminUiState() {
  applyAdminUiStateSnapshot(state, readJson(ADMIN_UI_STATE_KEY, null));
}

async function saveAboutContent(aboutContent = state.aboutContent) {
  const payload = normalizeAboutContent(aboutContent);
  return contentRepository.persistAboutContent(payload);
}

function setAdminPendingState(patch = {}, { rerender = true } = {}) {
  state.adminPending = { ...state.adminPending, ...patch };
  if (rerender) renderAdminPage();
}

function isAdminActionPending(key) {
  return Boolean(state.adminPending?.[key]);
}

function getPendingRoleUserId() {
  return state.adminPending?.roleUserId || null;
}

function isRoleActionPending(userId = null) {
  if (state.adminPending?.rolesRefresh) return true;
  if (!userId) return Boolean(state.adminPending?.roleUserId);
  return state.adminPending?.roleUserId === userId;
}

function getRemoteActionErrorMessage(result, fallback) {
  return mapSupabaseMessage(result?.error, fallback);
}

function getAdminSeriesDraft(mode) {
  return mode === 'edit' ? state.adminDraftMedia.edit : state.adminDraftMedia.add;
}

function setAdminSeriesDraft(mode, draft) {
  state.adminDraftMedia[mode] = draft;
  saveAdminUiState();
}

function getAdminSeriesSelection(mode) {
  return state.adminSeriesSelection[mode];
}

function setAdminSeriesSelection(mode, selection) {
  state.adminSeriesSelection[mode] = selection;
  saveAdminUiState();
}

function syncAdminSeriesSelection(mode) {
  const draft = getAdminSeriesDraft(mode) || createEmptyMediaDraft();
  const selection = getAdminSeriesSelection(mode) || { seasonId: null, episodeId: null, voiceoverId: null };
  const seasons = draft.seasons || [];
  const season = seasons.find(item => item.id === selection.seasonId) || seasons[0] || null;
  const episode = season?.episodes.find(item => item.id === selection.episodeId) || season?.episodes[0] || null;
  const voiceover = episode?.voiceovers.find(item => item.id === selection.voiceoverId) || episode?.voiceovers[0] || null;
  const nextSelection = {
    seasonId: season?.id || null,
    episodeId: episode?.id || null,
    voiceoverId: voiceover?.id || null
  };
  setAdminSeriesSelection(mode, nextSelection);
  return { draft, selection: nextSelection, season, episode, voiceover };
}

function getSelectedDraftSeason(draft, mode) {
  const selection = getAdminSeriesSelection(mode) || { seasonId: null };
  return getDraftSeasonById(draft || createEmptyMediaDraft(), selection.seasonId, nextEntityId);
}

function upsertKnownUser(payload) {
  state.knownUsers = upsertKnownUserHelper(state.knownUsers, payload);
}

function syncKnownUserFromSession(session = state.session) {
  state.knownUsers = syncKnownUserFromSessionHelper(state.knownUsers, session);
}

function mergeKnownUsers(entries = []) {
  entries.forEach(entry => {
    upsertKnownUser({
      userId: entry.userId,
      email: entry.email || '',
      nickname: entry.nickname || ''
    });
  });
}

function applyRoleEntries(entries = []) {
  const normalizedEntries = Array.isArray(entries)
    ? entries
      .filter(entry => entry && entry.userId)
      .map(entry => ({
        userId: entry.userId,
        role: ['owner', 'admin', 'user'].includes(entry.role) ? entry.role : 'user',
        email: String(entry.email || '').trim(),
        nickname: String(entry.nickname || '').trim(),
        label: String(entry.nickname || entry.email || '').trim()
      }))
    : [];

  state.roleEntries = normalizedEntries;
  state.roles = normalizedEntries.reduce((accumulator, entry) => {
    accumulator[entry.userId] = entry.role;
    return accumulator;
  }, {});
  mergeKnownUsers(normalizedEntries);
}

function getRoleSearchResults() {
  return state.roleSearchResults;
}

function resetRoleManagementState() {
  state.roleEntries = [];
  state.roleSearchResults = [];
  state.roleEntriesLoading = false;
  state.roleSearchLoading = false;
  state.roleEntriesLoaded = false;
  state.roleEntriesError = '';
  state.roleSearchError = '';
  state.roles = {};
}

async function refreshRoleDirectory({ preserveSearch = true, silent = false, showFeedback = false } = {}) {
  if (!canManageRoles()) {
    resetRoleManagementState();
    return { data: null, error: null };
  }

  if (state.roleEntriesLoading) {
    return { data: { users: state.roleEntries }, error: null };
  }

  state.roleEntriesLoading = true;
  state.roleEntriesError = '';
  setAdminPendingState({ rolesRefresh: true }, { rerender: !silent && state.currentView === 'admin' });

  const result = await fetchRoleDirectory();

  state.roleEntriesLoaded = true;
  if (result?.error) {
    state.roleEntriesError = mapSupabaseMessage(
      result.error,
      'Не удалось загрузить список ролей. Обнови страницу и попробуй ещё раз.'
    );
  } else {
    applyRoleEntries(result?.data?.users || []);
    state.roleEntriesError = '';
  }

  state.roleEntriesLoading = false;
  setAdminPendingState({ rolesRefresh: false }, { rerender: false });
  if (state.currentView === 'admin') renderAdminPage();

  if (showFeedback) {
    if (result?.error) {
      showToast(state.roleEntriesError || 'Не удалось обновить список ролей.', 'error');
    } else {
      showToast('Список ролей обновлён.', 'success');
    }
  }

  if (!result?.error && preserveSearch && state.adminRoleSearch.trim()) {
    void refreshRoleSearch(state.adminRoleSearch, { silent: true });
  }

  return result;
}

async function refreshRoleSearch(query = state.adminRoleSearch, { silent = false } = {}) {
  if (!canManageRoles()) {
    state.roleSearchResults = [];
    state.roleSearchLoading = false;
    state.roleSearchError = '';
    return { data: null, error: null };
  }

  const normalizedQuery = String(query || '').trim();
  state.adminRoleSearch = normalizedQuery;

  if (!normalizedQuery) {
    state.roleSearchResults = [];
    state.roleSearchLoading = false;
    state.roleSearchError = '';
    if (!silent && state.currentView === 'admin') renderAdminPage();
    return { data: { users: [] }, error: null };
  }

  const requestSeq = state.roleSearchRequestSeq + 1;
  state.roleSearchRequestSeq = requestSeq;
  state.roleSearchLoading = true;
  state.roleSearchError = '';
  if (!silent && state.currentView === 'admin') renderAdminPage();

  const result = await searchRoleCandidates(normalizedQuery);
  if (requestSeq !== state.roleSearchRequestSeq) return result;

  if (result?.error) {
    state.roleSearchResults = [];
    state.roleSearchError = mapSupabaseMessage(result.error, 'Не удалось найти пользователей.');
  } else {
    state.roleSearchResults = Array.isArray(result?.data?.users) ? result.data.users : [];
    mergeKnownUsers(state.roleSearchResults);
    state.roleSearchError = '';
  }

  state.roleSearchLoading = false;
  if (state.currentView === 'admin') renderAdminPage();
  return result;
}

async function updateManagedUserRole(userId, role) {
  if (!canManageRoles() || !userId || isRoleActionPending()) return;

  setAdminPendingState({ roleUserId: userId }, { rerender: state.currentView === 'admin' });

  const result = await updateRemoteUserRole({ userId, role });
  if (result?.error) {
    setAdminPendingState({ roleUserId: null }, { rerender: state.currentView === 'admin' });
    showToast(mapSupabaseMessage(result.error, 'Не удалось обновить роль.'), 'error');
    return;
  }

  showToast(role === 'user' ? 'Роль пользователя обновлена.' : 'Роль обновлена.', 'success');
  await refreshRoleDirectory({ preserveSearch: true, silent: true });
  if (state.adminRoleSearch.trim()) await refreshRoleSearch(state.adminRoleSearch, { silent: true });
  setAdminPendingState({ roleUserId: null }, { rerender: false });
  if (state.currentView === 'admin') renderAdminPage();
  saveAdminUiState();
}

const triggerRoleSearch = debounce(query => {
  void refreshRoleSearch(query);
}, 260);

function isAuthed() {
  return Boolean(state.session?.user);
}

function getUserId() {
  return state.session?.user?.id || null;
}

function isGuestFavoritesEnabled() {
  return window.APP_CONFIG?.allowGuestFavorites !== false;
}

function getUserNickname(session = state.session) {
  return getUserNicknameFromAuth(session);
}

function getCurrentUserRole() {
  return getCurrentUserRoleFromAuth({
    session: state.session,
    roles: state.roles,
    enableLocalAdminFallback: window.APP_CONFIG?.enableLocalAdminFallback
  });
}

function canOpenAdmin() {
  return canOpenAdminFromAuth({
    session: state.session,
    roles: state.roles,
    enableLocalAdminFallback: window.APP_CONFIG?.enableLocalAdminFallback
  });
}

function canManageRoles() {
  return canManageRolesFromAuth({
    session: state.session,
    roles: state.roles,
    enableLocalAdminFallback: window.APP_CONFIG?.enableLocalAdminFallback
  });
}

function getProjectById(id) {
  return state.projects.find(project => project.id === id) || null;
}

function getLinkedTrailerForTitle(titleId) {
  return getLinkedTrailerForTitleFromController(state.projects, titleId);
}

function getTitlePlayerViewModel(project) {
  const model = getTitlePlayerViewModelFromController({ project, titlePlayerMap: state.titlePlayer });
  return {
    ...model,
    playerOptions: (model.playerOptions || []).map((item, index) => ({
      id: item.value,
      name: item.label || `Плеер ${index + 1}`,
      isActive: item.value === model.selectedPlayerId
    })),
    trailerId: getLinkedTrailerForTitle(project.id)?.id || null
  };
}

function updateTitlePlayerSelection(titleId, key, value) {
  const project = getProjectById(titleId);
  if (!project) return;
  const fieldMap = {
    season: 'seasonId',
    episode: 'episodeId',
    voiceover: 'voiceoverId',
    player: 'playerId'
  };
  updateTitlePlayerSelectionInController({
    project,
    titlePlayerMap: state.titlePlayer,
    titleId,
    key: fieldMap[key] || key,
    value
  });
  renderTitlePage(titleId);
}

function ensureAdminEditDraft(project = getProjectById(state.adminEditProjectId)) {
  if (!project) {
    state.adminDraftMedia.edit = null;
    setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
    return null;
  }

  if (!state.adminDraftMedia.edit || state.adminEditProjectId !== project.id) {
    state.adminDraftMedia.edit = isVideoLike(project) ? createEmptyMediaDraft() : cloneDeep(project.media || createEmptyMediaDraft());
    setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
  }

  return state.adminDraftMedia.edit;
}

function persistAdminSeriesEditorInputs(mode) {
  const root = document.querySelector(`[data-admin-series-editor="${mode}"]`);
  if (!root) return;
  const draft = getAdminSeriesDraft(mode);
  if (!draft) return;
  const context = syncAdminSeriesSelection(mode);
  const { episode, voiceover } = context;
  if (!episode) return;

  const titleInput = root.querySelector('[data-admin-episode-title]');
  if (titleInput) episode.title = titleInput.value.trim();

  if (voiceover) {
    const voiceoverInput = root.querySelector('[data-admin-voiceover-name]');
    if (voiceoverInput) voiceover.name = voiceoverInput.value.trim();

    voiceover.players = (voiceover.players || []).map(player => {
      const nameInput = root.querySelector(`[data-admin-player-name][data-player-id="${player.id}"]`);
      const srcInput = root.querySelector(`[data-admin-player-src][data-player-id="${player.id}"]`);
      return {
        ...player,
        name: nameInput ? nameInput.value.trim() : player.name,
        src: srcInput ? srcInput.value.trim() : (player.src || player.iframe || '')
      };
    });
  }
}

function reindexSeasonNumbers(draft) {
  (draft?.seasons || []).forEach((season, index) => {
    season.number = index + 1;
  });
}

function removeAdminSeason(mode, seasonId) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const index = draft.seasons.findIndex(item => item.id === seasonId);
  if (index === -1) return;
  draft.seasons.splice(index, 1);
  reindexSeasonNumbers(draft);
  const nextSeason = draft.seasons[index] || draft.seasons[index - 1] || draft.seasons[0] || null;
  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, {
    seasonId: nextSeason?.id || null,
    episodeId: nextSeason?.episodes?.[0]?.id || null,
    voiceoverId: nextSeason?.episodes?.[0]?.voiceovers?.[0]?.id || null
  });
  renderAdminPage();
  saveAdminUiState();
}


function addAdminSeason(mode) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const season = { id: nextEntityId('season'), number: (draft.seasons.at(-1)?.number || 0) + 1, episodes: [] };
  draft.seasons.push(season);
  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, { seasonId: season.id, episodeId: null, voiceoverId: null });
  renderAdminPage();
}

function getNextEpisodeNumber(season) {
  const numbers = (season?.episodes || []).map(item => Number(item.number) || 0);
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
}

function addAdminEpisode(mode) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const season = getSelectedDraftSeason(draft, mode);
  const number = getNextEpisodeNumber(season);
  const episode = {
    id: nextEntityId('episode'),
    number,
    title: `Серия ${number}`,
    isDeleted: false,
    voiceovers: [createDefaultVoiceover({ title: 'AKAITSUKI', voiceover: 'AKAITSUKI' }, season.number, number, '', nextEntityId)]
  };
  season.episodes.push(episode);
  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, { seasonId: season.id, episodeId: episode.id, voiceoverId: episode.voiceovers[0]?.id || null });
  renderAdminPage();
}

function removeAdminEpisode(mode, episodeId) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const season = getSelectedDraftSeason(draft, mode);
  if (!season) return;
  const index = season.episodes.findIndex(item => item.id === episodeId);
  if (index === -1) return;
  const episode = season.episodes[index];

  if (index === season.episodes.length - 1) {
    season.episodes.splice(index, 1);
  } else {
    season.episodes[index] = {
      ...episode,
      title: '',
      isDeleted: true,
      voiceovers: []
    };
  }

  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, {
    seasonId: season.id,
    episodeId: season.episodes[index]?.id || season.episodes[index - 1]?.id || season.episodes[0]?.id || null,
    voiceoverId: null
  });
  renderAdminPage();
}

function canRestoreEpisode(episode) {
  if (!episode) return false;
  if (!String(episode.title || '').trim()) return false;
  if (!Array.isArray(episode.voiceovers) || !episode.voiceovers.length) return false;
  return episode.voiceovers.every(voiceover => {
    if (!String(voiceover.name || '').trim()) return false;
    if (!Array.isArray(voiceover.players) || !voiceover.players.length) return false;
    return voiceover.players.every(player => String(player.name || '').trim() && String(player.src || player.iframe || '').trim());
  });
}

function restoreAdminEpisode(mode) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const selection = getAdminSeriesSelection(mode);
  const season = getSelectedDraftSeason(draft, mode);
  const episode = season?.episodes.find(item => item.id === selection.episodeId);
  if (!episode) return;
  if (!canRestoreEpisode(episode)) {
    showToast('Чтобы обновить серию, заполни название, добавь минимум одну озвучку и один плеер.', 'error');
    return;
  }
  episode.isDeleted = false;
  setAdminSeriesDraft(mode, draft);
  renderAdminPage();
  showToast('Серия снова активна.', 'success');
}

function addAdminVoiceover(mode) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const selection = getAdminSeriesSelection(mode);
  const season = getSelectedDraftSeason(draft, mode);
  const episode = season?.episodes.find(item => item.id === selection.episodeId);
  if (!episode) return;
  const voiceover = createDefaultVoiceover({ title: 'AKAITSUKI', voiceover: `Озвучка ${episode.voiceovers.length + 1}` }, season.number, episode.number, `Озвучка ${episode.voiceovers.length + 1}`, nextEntityId);
  episode.voiceovers.push(voiceover);
  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, { seasonId: season.id, episodeId: episode.id, voiceoverId: voiceover.id });
  renderAdminPage();
}

function removeAdminVoiceover(mode, voiceoverId) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const season = getSelectedDraftSeason(draft, mode);
  const episode = season?.episodes.find(item => (item.voiceovers || []).some(voiceover => voiceover.id === voiceoverId));
  if (!episode) return;
  episode.voiceovers = (episode.voiceovers || []).filter(item => item.id !== voiceoverId);
  setAdminSeriesDraft(mode, draft);
  setAdminSeriesSelection(mode, { seasonId: season.id, episodeId: episode.id, voiceoverId: episode.voiceovers[0]?.id || null });
  renderAdminPage();
}

function addAdminPlayer(mode) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const selection = getAdminSeriesSelection(mode);
  const season = getSelectedDraftSeason(draft, mode);
  const episode = season?.episodes.find(item => item.id === selection.episodeId);
  const voiceover = episode?.voiceovers.find(item => item.id === selection.voiceoverId);
  if (!voiceover) return;
  voiceover.players.push(createDefaultPlayer({ title: 'AKAITSUKI' }, season.number, episode.number, voiceover.name, voiceover.players.length + 1, nextEntityId));
  setAdminSeriesDraft(mode, draft);
  renderAdminPage();
}

function removeAdminPlayer(mode, playerId) {
  persistAdminSeriesEditorInputs(mode);
  const draft = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const selection = getAdminSeriesSelection(mode);
  const season = getSelectedDraftSeason(draft, mode);
  const episode = season?.episodes.find(item => item.id === selection.episodeId);
  const voiceover = episode?.voiceovers.find(item => item.id === selection.voiceoverId);
  if (!voiceover) return;
  voiceover.players = (voiceover.players || []).filter(item => item.id !== playerId);
  setAdminSeriesDraft(mode, draft);
  renderAdminPage();
}

async function saveAdminSeries(mode) {
  persistAdminSeriesEditorInputs(mode);
  if (mode === 'add') {
    showToast('Серии сохранены в черновик нового тайтла.', 'success');
    return;
  }

  if (isAdminActionPending('editSeries')) return;

  const project = getProjectById(state.adminEditProjectId);
  if (!project) return;
  const draft = cloneDeep(getAdminSeriesDraft('edit') || createEmptyMediaDraft());
  const updatedProject = normalizeProject({
    ...project,
    media: draft,
    latestEpisode: getLatestEpisodeFromMedia(draft) || project.latestEpisode
  });

  setAdminPendingState({ editSeries: true });
  const result = await saveProject(updatedProject);
  if (result?.error) {
    setAdminPendingState({ editSeries: false });
    showToast(getRemoteActionErrorMessage(result, 'Не удалось сохранить серии в Supabase.'), 'error');
    return;
  }

  state.projects = state.projects.map(item => item.id === project.id ? updatedProject : item);
  state.adminDraftMedia.edit = cloneDeep(draft);
  renderAllDynamic();
  setAdminPendingState({ editSeries: false });
  saveAdminUiState();
  showToast('Серии сохранены в Supabase.', 'success');
}

function resetAdminSeriesEditor(mode) {
  if (mode === 'add') {
    state.adminDraftMedia.add = createEmptyMediaDraft();
    setAdminSeriesSelection('add', { seasonId: null, episodeId: null, voiceoverId: null });
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  state.adminDraftMedia.edit = createEmptyMediaDraft();
  setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
  renderAdminPage();
  saveAdminUiState();
}

function getRatingAggregate(titleId) {
  const entry = state.ratings[String(titleId)] || { byUser: {} };
  const values = Object.values(entry.byUser || {}).map(Number).filter(Boolean);
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { average: Number(average.toFixed(1)), count: values.length };
}

function getCurrentViewerRateKey() {
  return getUserId() || 'guest';
}

function getUserRating(titleId) {
  const entry = state.ratings[String(titleId)] || { byUser: {} };
  return Number(entry.byUser[getCurrentViewerRateKey()] || 0);
}

function getProjectWithDisplayRating(project) {
  const aggregate = getRatingAggregate(project.id);
  return {
    ...project,
    displayRating: aggregate ? aggregate.average.toFixed(1) : Number(project.rating).toFixed(1)
  };
}

function updateRenderedRatingControls(titleId) {
  const project = getProjectById(titleId);
  if (!project) return;

  const displayRating = getProjectWithDisplayRating(project).displayRating;
  document.querySelectorAll(`[data-open-rating="${titleId}"]`).forEach(button => {
    button.innerHTML = `<span class="rating-star">★</span> ${escapeHtml(displayRating)}`;
  });

  scopeList.forEach(scope => {
    if (state.filters[scope].sort === 'rating_high' || state.filters[scope].sort === 'rating_low') renderGrid(scope);
  });
}

function setElementVisibility(element, isVisible) {
  if (element) element.hidden = !isVisible;
}

function mapSupabaseMessage(error, fallback) {
  return mapSupabaseMessageFromAuth(error, fallback);
}

function applyTheme() {
  const isLight = state.theme === 'light';
  elements.body.classList.toggle('light', isLight);
  elements.themeToggle.innerHTML = `<span>${isLight ? '☾' : '☼'}</span>`;
  saveTheme(state.theme);
}

function setAuthStatus(message = '', type = '') {
  elements.authStatus.textContent = message;
  elements.authStatus.dataset.state = type;
}

function showToast(message, type = 'info') {
  if (!elements.siteToast) return;
  elements.siteToast.textContent = message;
  elements.siteToast.dataset.state = type;
  elements.siteToast.hidden = false;
  elements.siteToast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.siteToast.classList.remove('is-visible');
    window.setTimeout(() => { elements.siteToast.hidden = true; }, 220);
  }, 3200);
}

const ADMIN_DRAFT_FIELD_NAMES = ['title', 'type', 'year', 'season', 'status', 'duration', 'voiceover', 'team', 'genres', 'categories', 'altTitles', 'description', 'longText', 'posterUrl', 'videoUrl', 'linkedTitleId'];
let pendingConfirmResolver = null;

function persistVisibleAdminEditors() {
  persistAdminTitleForm('add');
  persistAdminTitleForm('edit');
  persistAdminAboutForm();
  persistAdminSeriesEditorInputs('add');
  persistAdminSeriesEditorInputs('edit');
}

function areDeepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getAdminTypeForMode(mode) {
  if (mode === 'edit') return state.adminEditTypeTab || getProjectById(state.adminEditProjectId)?.type || 'anime';
  return state.adminTypeTab || 'anime';
}

function normalizeAdminDraftFields(draft, type = 'anime') {
  const source = { ...getEmptyProjectDraftFields(type), ...(draft || {}), type };
  return ADMIN_DRAFT_FIELD_NAMES.reduce((accumulator, field) => {
    const value = source[field];
    accumulator[field] = value === null || value === undefined ? '' : String(value).trim();
    return accumulator;
  }, {});
}

function getAdminTitleBaseline(mode) {
  const type = getAdminTypeForMode(mode);
  if (mode === 'edit') {
    const project = getProjectById(state.adminEditProjectId);
    if (!project) return null;
    return normalizeAdminDraftFields(getProjectDraftFields({ ...project, type }), type);
  }
  return normalizeAdminDraftFields(getEmptyProjectDraftFields(type), type);
}

function getAdminTitleCurrent(mode) {
  const type = getAdminTypeForMode(mode);
  return normalizeAdminDraftFields(state.adminFormDrafts[mode] || {}, type);
}

function hasUnsavedAdminTitleChanges(mode) {
  const baseline = getAdminTitleBaseline(mode);
  if (!baseline) return false;
  return !areDeepEqual(getAdminTitleCurrent(mode), baseline);
}

function hasUnsavedAdminSeriesChanges(mode) {
  const type = getAdminTypeForMode(mode);
  if (isVideoLike({ type })) return false;
  if (mode === 'edit' && !getProjectById(state.adminEditProjectId)) return false;
  const current = cloneDeep(getAdminSeriesDraft(mode) || createEmptyMediaDraft());
  const baseline = mode === 'edit'
    ? cloneDeep(getProjectById(state.adminEditProjectId)?.media || createEmptyMediaDraft())
    : createEmptyMediaDraft();
  return !areDeepEqual(current, baseline);
}

function hasUnsavedAdminChangesForMode(mode) {
  return hasUnsavedAdminTitleChanges(mode) || hasUnsavedAdminSeriesChanges(mode);
}

function hasUnsavedAboutChanges() {
  const current = normalizeAboutContent(state.adminFormDrafts.about || state.aboutContent);
  const baseline = normalizeAboutContent(state.aboutContent);
  return !areDeepEqual(current, baseline);
}

function getCurrentAdminUnsavedState() {
  if (state.adminSectionTab === 'about') {
    return {
      dirty: hasUnsavedAboutChanges(),
      title: 'Несохранённые изменения в разделе «О нас»',
      text: 'Изменения в разделе «О нас» ещё не сохранены. Продолжить и сбросить их?'
    };
  }

  if (state.adminSectionTab === 'edit') {
    const titleDirty = hasUnsavedAdminTitleChanges('edit');
    const seriesDirty = hasUnsavedAdminSeriesChanges('edit');
    const dirty = titleDirty || seriesDirty;
    return {
      dirty,
      title: 'Несохранённые изменения в редактировании',
      text: seriesDirty && !titleDirty
        ? 'Изменения в сериях ещё не сохранены. Продолжить и сбросить их?'
        : 'Изменения в тайтле ещё не сохранены. Продолжить и сбросить их?'
    };
  }

  const titleDirty = hasUnsavedAdminTitleChanges('add');
  const seriesDirty = hasUnsavedAdminSeriesChanges('add');
  const dirty = titleDirty || seriesDirty;
  return {
    dirty,
    title: 'Несохранённые изменения в новом тайтле',
    text: seriesDirty && !titleDirty
      ? 'Черновик серий ещё не сохранён. Продолжить и сбросить его?'
      : 'Черновик тайтла ещё не сохранён. Продолжить и сбросить его?'
  };
}

function ensureConfirmModal() {
  if (document.getElementById('confirmModal')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal" id="confirmModal" aria-hidden="true">
      <div class="modal-backdrop" data-close-confirm></div>
      <div class="modal-dialog glass confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle" tabindex="-1">
        <button class="modal-close" type="button" data-close-confirm aria-label="Закрыть">×</button>
        <div id="confirmModalContent"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
}

function renderConfirmDialog({ title = 'Подтверждение', text = 'Продолжить?', confirmText = 'Подтвердить', cancelText = 'Отмена', tone = 'danger' } = {}) {
  ensureConfirmModal();
  const content = document.getElementById('confirmModalContent');
  if (!content) return;
  content.innerHTML = `
    <div class="confirm-dialog-shell">
      <div class="confirm-dialog-copy">
        <span class="eyebrow">Подтверждение</span>
        <h3 id="confirmDialogTitle">${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
      </div>
      <div class="confirm-dialog-actions">
        <button class="btn btn-secondary" type="button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
        <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" type="button" data-confirm-accept>${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;
}

function settleConfirmDialog(result) {
  if (!pendingConfirmResolver) return;
  const resolver = pendingConfirmResolver;
  pendingConfirmResolver = null;
  resolver(Boolean(result));
}

function closeConfirmModal(result = false) {
  const modal = document.getElementById('confirmModal');
  if (modal) closeDialog(modal);
  settleConfirmDialog(result);
}

function requestConfirmation(options = {}) {
  ensureConfirmModal();
  if (pendingConfirmResolver) settleConfirmDialog(false);
  renderConfirmDialog(options);
  openDialog(document.getElementById('confirmModal'), '[data-confirm-cancel], [data-confirm-accept], [data-close-confirm]');
  return new Promise(resolve => {
    pendingConfirmResolver = resolve;
  });
}

const dialogController = createDialogController({
  body: elements.body,
  getDialogs: () => [elements.detailsModal, elements.videoModal, elements.authModal, document.getElementById('ratingModal'), elements.trailerLinkModal, document.getElementById('confirmModal')],
  getFocusableElements
});

const { openDialog, closeDialog, trapFocus } = dialogController;

function switchAuthTab(tab) {
  state.authTab = tab;
  elements.authTabs.forEach(button => {
    const isActive = button.dataset.authTab === tab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  elements.authPanels.forEach(panel => {
    const isActive = panel.dataset.authPanel === tab;
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', String(!isActive));
  });
}

function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  setAuthStatus('');
  openDialog(elements.authModal, `[data-auth-panel="${tab}"] input, [data-close-auth-modal]`);
}

function closeAuthModal() {
  closeDialog(elements.authModal);
}

function ensureRatingModal() {
  if (document.getElementById('ratingModal')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal" id="ratingModal" aria-hidden="true">
      <div class="modal-backdrop" data-close-rating></div>
      <div class="rating-dialog glass" role="dialog" aria-modal="true" aria-labelledby="ratingDialogTitle" tabindex="-1">
        <div id="ratingModalContent"></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
}

function renderModalContent(id) {
  const project = getProjectById(id);
  if (!project) return;
  state.currentModalId = id;
  elements.modalContent.innerHTML = getModalMarkup(getProjectWithDisplayRating(project), isFavorite(project.id));
}

function openDetailsModal(id) {
  const project = getProjectById(id);
  if (!project) return;
  renderModalContent(id);
  openDialog(elements.detailsModal, '[data-close-modal]');
}

function closeDetailsModal() {
  state.currentModalId = null;
  closeDialog(elements.detailsModal);
}

function renderVideoModal(id) {
  const project = getProjectById(id);
  if (!project) return;
  state.currentVideoId = id;
  elements.videoModalContent.innerHTML = getVideoModalMarkup(project);
}

function openVideoModal(id) {
  const project = getProjectById(id);
  if (!project) return;
  renderVideoModal(id);
  openDialog(elements.videoModal, '.video-modal-dialog');
}

function closeVideoModal() {
  state.currentVideoId = null;
  if (elements.videoModalContent) {
    elements.videoModalContent.querySelectorAll('iframe').forEach(frame => {
      frame.src = 'about:blank';
    });
  }
  closeDialog(elements.videoModal);
  if (elements.videoModalContent) elements.videoModalContent.innerHTML = '';
}

function renderRatingModal(id) {
  ensureRatingModal();
  const project = getProjectById(id);
  if (!project) return;
  state.currentRatingId = id;
  document.getElementById('ratingModalContent').innerHTML = getRatingDialogMarkup(project, getUserRating(id));
}

function openRatingModal(id) {
  renderRatingModal(id);
  openDialog(document.getElementById('ratingModal'), '[data-rate-value], [data-close-rating]');
}

function closeRatingModal() {
  state.currentRatingId = null;
  closeDialog(document.getElementById('ratingModal'));
}

function getTrailerLinkCandidates(query = '') {
  const normalized = String(query || '').trim().toLowerCase();
  return state.projects
    .filter(project => !isVideoLike(project))
    .filter(project => !normalized || project.title.toLowerCase().includes(normalized))
    .sort((a, b) => collator.compare(a.title, b.title))
    .slice(0, 20);
}

function renderTrailerLinkModal(mode) {
  if (!elements.trailerLinkModal || !elements.trailerLinkResults || !elements.trailerLinkSearchInput) return;
  elements.trailerLinkModal.dataset.mode = mode;
  elements.trailerLinkSearchInput.value = state.adminTrailerLinkSearch;
  const items = getTrailerLinkCandidates(state.adminTrailerLinkSearch);
  elements.trailerLinkResults.innerHTML = items.length
    ? items.map(project => `
      <div class="admin-user-search-row">
        <div class="admin-user-search-copy">
          <strong>${escapeHtml(project.title)}</strong>
          <small>${escapeHtml(project.type === 'anime' ? 'Аниме' : 'Сериал')}</small>
        </div>
        <button class="admin-plus-btn" type="button" data-admin-link-title-id="${project.id}" aria-label="Привязать ${escapeHtml(project.title)}">+</button>
      </div>
    `).join('')
    : '<p class="admin-empty">Ничего не найдено.</p>';
}

function openTrailerLinkModal(mode) {
  state.adminTrailerLinkSearch = '';
  renderTrailerLinkModal(mode);
  openDialog(elements.trailerLinkModal, '#trailerLinkSearchInput');
}

function closeTrailerLinkModal() {
  state.adminTrailerLinkSearch = '';
  closeDialog(elements.trailerLinkModal);
}

function syncTrailerLinkControls(mode) {
  const form = mode === 'edit' ? document.getElementById('adminEditTitleForm') : document.getElementById('adminAddTitleForm');
  if (!form) return;
  const linkedId = state.adminTrailerLinks[mode] || null;
  const linkedTitle = getProjectById(linkedId)?.title || '';
  const hiddenInput = form.querySelector('[name="linkedTitleId"]');
  const statusNode = form.querySelector('.admin-trailer-link-status');
  if (hiddenInput) hiddenInput.value = linkedId || '';
  if (statusNode) statusNode.textContent = linkedTitle ? `Привязан тайтл: ${linkedTitle}` : 'Тайтл пока не привязан';
}

function applyTrailerLink(mode, titleId) {
  state.adminTrailerLinks[mode] = Number(titleId) || null;
  syncTrailerLinkControls(mode);
  closeTrailerLinkModal();
}

function renderUserChrome() {
  const showUserBadge = state.sessionResolved && isAuthed();
  const showFavoritesSection = state.sessionResolved && isAuthed();
  elements.authGate.forEach(element => setElementVisibility(element, showUserBadge));
  elements.favoriteNavLinks.forEach(link => setElementVisibility(link, showFavoritesSection));
  if (elements.adminNavLink) setElementVisibility(elements.adminNavLink, false);
  setElementVisibility(elements.topbarUser, state.sessionResolved && !isAuthed());
  setElementVisibility(elements.loginBtn, state.sessionResolved && !isAuthed());
  document.body.classList.toggle('has-user-badge', showUserBadge);
  if (!showUserBadge) {
    elements.userActionsBar.innerHTML = '';
    return;
  }
  const nickname = getUserNickname();
  const email = state.session?.user?.email || '';
  const adminButtonMarkup = canOpenAdmin()
    ? `<a class="user-link ${state.currentView === 'admin' ? 'is-current' : ''}" href="#admin">Админка</a>`
    : '';

  elements.userActionsBar.innerHTML = `
    <span class="user-pill" title="${escapeHtml(email)}">${escapeHtml(nickname)}</span>
    ${adminButtonMarkup}
    <a class="user-link ${state.currentView === 'account' ? 'is-current' : ''}" href="#account">Кабинет</a>
    <button class="user-action-btn" type="button" data-action="logout">Выйти</button>
  `;
}

function renderAboutSection() {
  const aboutCopy = document.querySelector('.about-copy');
  const teamPanel = document.querySelector('.team-panel');
  if (!aboutCopy || !teamPanel) return;

  const paragraphs = (state.aboutContent.paragraphs || []).filter(Boolean);
  aboutCopy.innerHTML = `
    <h3>${escapeHtml(state.aboutContent.title)}</h3>
    ${paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')}
  `;

  teamPanel.innerHTML = `
    <h3 id="teamPanelHeading">${escapeHtml(state.aboutContent.teamTitle || 'Члены команды')}</h3>
    <ul class="team-list">
      ${(state.aboutContent.teamMembers || []).map(member => `
        <li><span>${escapeHtml(member.name)}</span><small>${escapeHtml(member.role)}</small></li>
      `).join('')}
    </ul>
  `;
}

function renderAccountPage() {
  if (!isAuthed()) {
    elements.profileForm.reset();
    elements.passwordForm.reset();
    return;
  }
  elements.profileNickname.value = getUserNickname();
  elements.profileEmail.value = state.session.user.email || '';
  elements.profilePassword.value = '';
  elements.profilePasswordRepeat.value = '';
}

function getRandomFeaturedProject(excludeId = null) {
  const source = state.projects.filter(project => project && !isVideoLike(project));
  const pool = source.filter(project => project.id !== excludeId);
  const items = pool.length ? pool : source;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function getFirstFeaturedEligibleProject() {
  return state.projects.find(project => project && !isVideoLike(project)) || null;
}

function renderHeroFeature(forceRandom = false) {
  const currentFeatured = getProjectById(state.featuredAnimeId);
  const shouldPickNewFeatured = forceRandom || !currentFeatured || isVideoLike(currentFeatured);

  if (shouldPickNewFeatured) {
    state.featuredAnimeId = getRandomFeaturedProject(state.featuredAnimeId)?.id || getFirstFeaturedEligibleProject()?.id || null;
  }

  const featured = getProjectById(state.featuredAnimeId);
  if (!featured || isVideoLike(featured)) {
    const text = state.projects.length
      ? 'Подходящий тайтл для этого блока пока не найден. Попробуй добавить обычный тайтл, не видео и не трейлер.'
      : (state.contentStatus.catalogWarning || 'Каталог пока пуст. Как только появятся тайтлы, здесь покажется случайная карточка.');
    elements.heroFeature.innerHTML = getCollectionPlaceholderMarkup('Случайный тайтл пока недоступен', text);
    return;
  }

  elements.heroFeature.innerHTML = getFeatureMarkup(getProjectWithDisplayRating(featured), isFavorite(featured.id));
}

function renderRecentUpdates() {
  if (!elements.recentUpdatesGrid) return;
  const items = [...state.projects]
    .filter(project => !isVideoLike(project))
    .sort((a, b) => a.updatedOrder - b.updatedOrder)
    .slice(0, 3)
    .map(getProjectWithDisplayRating);
  elements.recentUpdatesGrid.innerHTML = items.length
    ? getRecentUpdatesMarkup(items)
    : getCollectionPlaceholderMarkup('Пока нет свежих обновлений', state.projects.length ? 'Добавь обычные тайтлы или обнови эпизоды, и этот блок оживёт.' : (state.contentStatus.catalogWarning || 'Пока здесь пусто.'));
}

function renderNewVideos() {
  if (!elements.newVideosGrid) return;
  const items = [...state.projects]
    .filter(project => project.type === 'video' || project.type === 'trailer')
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || Number(b.updatedOrder || 0) - Number(a.updatedOrder || 0))
    .slice(0, 3)
    .map(project => getCardMarkup({ ...project, isFresh: true }, isFavorite(project.id)));
  elements.newVideosGrid.replaceChildren(createFragmentFromMarkup(items.length ? items : [getCollectionPlaceholderMarkup('Пока нет новых видео', 'Когда появятся видео или трейлеры, этот блок заполнится автоматически.') ]));
}

function getProjectsForScope(scope) {
  if (scope === 'favorites') {
    const favoriteIds = new Set(state.favorites);
    return state.projects.filter(project => favoriteIds.has(project.id));
  }

  return state.projects;
}

function getSelectedType(scope) {
  return state.filters[scope]?.type || 'anime';
}

function getSelectedGenres(scope) {
  const value = state.filters[scope]?.genres;
  if (Array.isArray(value)) return value;
  const legacyGenre = state.filters[scope]?.genre;
  return legacyGenre && legacyGenre !== 'all' ? [legacyGenre] : [];
}

function isVideoScopeType(type) {
  return type === 'video' || type === 'trailer';
}

function getFilterGroupLabel(scope) {
  return isVideoScopeType(getSelectedType(scope)) ? 'Категории' : 'Жанры';
}

function getFilterOptionsForScope(scope) {
  const type = getSelectedType(scope);
  const field = isVideoScopeType(type) ? 'categories' : 'genres';
  const baseLabel = isVideoScopeType(type) ? 'Все категории' : 'Все жанры';
  const values = [...new Set(
    state.projects
      .filter(project => type === 'all' ? !isVideoLike(project) : project.type === type)
      .flatMap(project => project[field] || [])
  )].sort((a, b) => collator.compare(a, b));
  return [{ value: 'all', label: baseLabel }, ...values.map(value => ({ value, label: value }))];
}

function getSortOptionsForScope(scope) {
  return isVideoScopeType(getSelectedType(scope)) ? mediaSortOptions : sortOptions;
}

function getFilteredProjects(scope) {

  const { sort } = state.filters[scope];
  const selectedType = getSelectedType(scope);
  const selectedGenres = getSelectedGenres(scope);
  const searchText = state.search[scope].trim().toLowerCase();
  const filterField = isVideoScopeType(selectedType) ? 'categories' : 'genres';
  const items = getProjectsForScope(scope).filter(project => {
    const matchesType = selectedType === 'all' || project.type === selectedType;
    const list = project[filterField] || [];
    const matchesGenres = !selectedGenres.length || selectedGenres.every(genre => list.includes(genre));
    return matchesType && matchesGenres && (!searchText || project.searchIndex.includes(searchText));
  });

  switch (sort) {
    case 'rating_low': items.sort((a, b) => Number(getProjectWithDisplayRating(a).displayRating) - Number(getProjectWithDisplayRating(b).displayRating) || collator.compare(a.title, b.title)); break;
    case 'year': items.sort((a, b) => b.year - a.year || collator.compare(a.title, b.title)); break;
    case 'title': items.sort((a, b) => collator.compare(a.title, b.title)); break;
    case 'popularity_high': items.sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0) || collator.compare(a.title, b.title)); break;
    case 'release_date': items.sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || collator.compare(a.title, b.title)); break;
    case 'rating_high':
    default: items.sort((a, b) => Number(getProjectWithDisplayRating(b).displayRating) - Number(getProjectWithDisplayRating(a).displayRating) || b.year - a.year);
  }

  return items;
}


function getPaginationMarkup(scope, currentPage, totalPages) {
  if (totalPages <= 1) return '';
  return Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="pagination-btn ${page === currentPage ? 'is-active' : ''}" type="button" data-page-scope="${scope}" data-page-number="${page}" aria-current="${page === currentPage ? 'page' : 'false'}">${page}</button>`;
  }).join('');
}

function getScopeStatusHint(scope) {
  if (scope === 'catalog') return state.contentStatus.catalogWarning || '';
  return '';
}

function updateScopeStatusHint(scope) {
  const refs = scopeElements[scope];
  if (!refs?.statusHint) return;
  const message = getScopeStatusHint(scope);
  refs.statusHint.hidden = !message;
  refs.statusHint.textContent = message;
}

function getEmptyStateContent(scope, items) {
  const hasSearch = state.search[scope].trim().length > 0;
  const hasFilters = getSelectedGenres(scope).length > 0 || getSelectedType(scope) !== 'anime';
  if (scope === 'favorites') {
    if (!state.favorites.length) {
      return { title: 'Избранное пока пустое', text: 'Добавь тайтлы сердечком, и они появятся здесь.' };
    }
    return { title: 'Ничего не найдено', text: hasSearch || hasFilters ? 'Попробуй убрать часть запроса или сбросить фильтры.' : 'Попробуй выбрать другой тип или очистить фильтры.' };
  }

  if (!state.projects.length) {
    const text = state.contentStatus.catalogWarning || 'Каталог пока пуст. Добавь первый тайтл через админку, и он появится здесь.';
    return { title: 'Каталог пока пуст', text };
  }

  if (hasSearch || hasFilters) {
    return { title: 'Ничего не найдено', text: 'Попробуй сменить фильтр, выбрать другой тип или убрать часть поискового запроса.' };
  }

  const typeLabel = isVideoScopeType(getSelectedType(scope)) ? 'видео' : 'тайтлы';
  return { title: 'Пока пусто', text: `Для текущего режима пока не найдено подходящих элементов. Попробуй открыть другие ${typeLabel}.` };
}

function setEmptyStateContent(scope, content) {
  const refs = scopeElements[scope];
  const stateNode = refs?.emptyState;
  if (!stateNode || !content) return;
  const titleNode = stateNode.querySelector('h3');
  const textNode = stateNode.querySelector('p');
  if (titleNode) titleNode.textContent = content.title || '';
  if (textNode) textNode.textContent = content.text || '';
}

function getCollectionPlaceholderMarkup(title, text) {
  return `<article class="collection-placeholder glass"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></article>`;
}

function renderGrid(scope) {
  const refs = scopeElements[scope];
  const items = getFilteredProjects(scope);
  const totalPages = Math.max(1, Math.ceil(items.length / 12));
  const currentPage = Math.min(state.pagination[scope] || 1, totalPages);
  state.pagination[scope] = currentPage;
  const startIndex = (currentPage - 1) * 12;
  const pageItems = items.slice(startIndex, startIndex + 12);

  refs.grid.replaceChildren(createFragmentFromMarkup(pageItems.map(project => getCardMarkup(getProjectWithDisplayRating(project), isFavorite(project.id)))));
  refs.resultCount.textContent = `${scope === 'favorites' ? 'В списке' : 'Показано'}: ${items.length}`;
  updateScopeStatusHint(scope);
  setEmptyStateContent(scope, getEmptyStateContent(scope, items));
  refs.emptyState.hidden = items.length !== 0;
  if (refs.pagination) {
    refs.pagination.hidden = items.length <= 12;
    refs.pagination.innerHTML = items.length > 12 ? getPaginationMarkup(scope, currentPage, totalPages) : '';
  }
}


function renderTitlePage(id) {
  const project = getProjectById(id);
  if (!project) {
    state.currentTitleId = null;
    elements.titlePageContent.replaceChildren(createNodeFromHtml(getCollectionPlaceholderMarkup('Тайтл не найден', 'Похоже, этот тайтл больше не доступен или ссылка устарела. Вернись в каталог и выбери другой.')));
    return;
  }
  state.currentTitleId = id;
  const playerVm = getTitlePlayerViewModel(project);
  elements.titlePageContent.replaceChildren(createNodeFromHtml(getTitlePageMarkup(getProjectWithDisplayRating(project), isFavorite(id), playerVm)));
}

function renderControls() {
  scopeList.forEach(scope => {
    const root = elements.controlsRoots[scope];
    root.innerHTML = getControlsMarkup(scope, controlsMeta[scope]);
    scopeElements[scope] = {
      searchInput: root.querySelector(`[data-search-input="${scope}"]`),
      searchClearBtn: root.querySelector(`[data-clear-search="${scope}"]`),
      typeFilters: root.querySelector(`#${scope}TypeFilters`),
      genreSelect: root.querySelector(`#${scope}GenreSelect`),
      sortSelect: root.querySelector(`#${scope}SortSelect`),
      resultCount: root.querySelector(`#${scope}ResultCount`),
      statusHint: root.querySelector(`#${scope}StatusHint`),
      grid: elements.grids[scope],
      emptyState: elements.emptyStates[scope],
      pagination: elements.paginations[scope]
    };
  });
}

function getGenreSelectLabel(selectedGenres, scope) {
  const label = getFilterGroupLabel(scope);
  const allLabel = label === 'Категории' ? 'Все категории' : 'Все жанры';
  if (!selectedGenres.length) return allLabel;
  if (selectedGenres.length === 1) return selectedGenres[0];
  return `${label}: ${selectedGenres.length}`;
}


function renderCustomSelect(container, options, value, config = {}) {
  if (!container) return;
  const trigger = container.querySelector('.select-trigger');
  const valueElement = container.querySelector('.select-value');
  const inner = container.querySelector('.select-menu-inner');
  const selectedValues = Array.isArray(config.selectedValues) ? config.selectedValues : [];
  const isMulti = Boolean(config.isMulti);
  const current = options.find(option => option.value === value) || options[0];
  const scope = container.dataset.scope || '';
  valueElement.textContent = isMulti ? getGenreSelectLabel(selectedValues, scope) : current.label;
  trigger.setAttribute('aria-expanded', String(container.classList.contains('is-open')));
  inner.classList.toggle('is-scrollable', options.length > 5);
  inner.innerHTML = options.map(option => {
    const isSelected = isMulti
      ? (option.value === 'all' ? selectedValues.length === 0 : selectedValues.includes(option.value))
      : option.value === value;
    return `<button class="select-option ${isSelected ? 'is-selected' : ''}" type="button" role="option" aria-selected="${isSelected}" data-option-value="${option.value}"><span>${option.label}</span></button>`;
  }).join('');
}

function renderSelects() {

  scopeList.forEach(scope => {
    const refs = scopeElements[scope];
    const filterOptions = getFilterOptionsForScope(scope);
    const sortChoices = getSortOptionsForScope(scope);
    if (!sortChoices.some(option => option.value === state.filters[scope].sort)) {
      state.filters[scope].sort = sortChoices[0]?.value || 'rating_high';
    }
    renderCustomSelect(refs.genreSelect, filterOptions, 'all', { isMulti: true, selectedValues: getSelectedGenres(scope) });
    renderCustomSelect(refs.sortSelect, sortChoices, state.filters[scope].sort);
  });
}


function closeAllSelects(exception = null) {
  document.querySelectorAll('.custom-select.is-open').forEach(select => {
    if (select === exception) return;
    select.classList.remove('is-open');
    select.classList.remove('opens-upward');
    select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function positionSelectMenu(select) {
  if (!select) return;
  select.classList.remove('opens-upward');
  const menu = select.querySelector('.select-menu');
  if (!menu) return;
  const rect = select.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const gap = 10;
  const menuHeight = Math.min(menu.scrollHeight || menu.offsetHeight || 0, Math.max(0, viewportHeight - 24));
  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    select.classList.add('opens-upward');
  }
}

function repositionOpenSelectMenus() {
  document.querySelectorAll('.custom-select.is-open').forEach(positionSelectMenu);
}

function updateTypeButtons(scope) {
  const selectedType = getSelectedType(scope);
  scopeElements[scope].typeFilters.querySelectorAll('[data-type]').forEach(button => {
    const isActive = selectedType === button.dataset.type;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function toggleTypeFilter(scope, type) {
  if (getSelectedType(scope) === type) return;
  state.filters[scope].type = type;
  state.filters[scope].genres = [];
  const sortChoices = getSortOptionsForScope(scope);
  state.filters[scope].sort = sortChoices[0]?.value || 'rating_high';
}


function updateSearchClear(scope) {
  scopeElements[scope].searchClearBtn.hidden = state.search[scope].trim().length === 0;
}

function renderStats() {
  const tagUniverse = new Set(
    state.projects.flatMap(project => [
      ...(Array.isArray(project.genres) ? project.genres : []),
      ...(Array.isArray(project.categories) ? project.categories : [])
    ])
  );
  const values = [
    state.projects.length,
    new Set(state.projects.map(project => project.type)).size,
    tagUniverse.size
  ];
  elements.counters.forEach((counter, index) => {
    counter.dataset.counter = String(values[index] || 0);
    counter.textContent = '0';
  });
}

const favoritesController = createFavoritesController({
  documentRef: document,
  detailsModal: elements.detailsModal,
  getFavorites: () => state.favorites,
  setFavorites: value => { state.favorites = value; },
  getUserId,
  isAuthed,
  isGuestFavoritesEnabled,
  saveFavorites: (userId, favorites) => repository.persistFavorites({ userId, favorites }),
  getCurrentTitleId: () => state.currentTitleId,
  renderTitlePage,
  getCurrentModalId: () => state.currentModalId,
  renderModalContent,
  renderGrid,
  showToast
});

const { isFavorite, persistFavorites, toggleFavorite } = favoritesController;

function renderAdminPage() {
  if (!elements.adminPageContent) return;
  if (!canOpenAdmin()) {
    elements.adminPageContent.innerHTML = '<div class="admin-card glass"><p class="account-muted">Доступ к админке есть только у владельца и администратора.</p></div>';
    return;
  }

  const normalizedSearch = state.adminTitleSearch.trim().toLowerCase();
  const titleSearchResults = normalizedSearch
    ? state.projects
      .filter(item => item.title.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => collator.compare(a.title, b.title))
    : [];

  if (canManageRoles() && state.adminSectionTab === 'roles' && !state.roleEntriesLoaded && !state.roleEntriesLoading) {
    void refreshRoleDirectory({ preserveSearch: true, silent: true });
  }

  const roleEntries = [...state.roleEntries].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, user: 2 };
    const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;
    return collator.compare(a.email, b.email);
  });

  const allowedAdminSections = canManageRoles() ? ['add', 'edit', 'about', 'roles'] : ['add', 'edit'];
  if (!allowedAdminSections.includes(state.adminSectionTab)) state.adminSectionTab = 'add';

  let editingProject = state.adminEditProjectId ? getProjectById(state.adminEditProjectId) : null;
  if (state.adminEditProjectId && !editingProject) {
    state.adminEditProjectId = null;
    state.adminEditTypeTab = null;
    state.adminDraftMedia.edit = null;
    state.adminTrailerLinks.edit = null;
    state.adminFormDrafts.edit = null;
    editingProject = null;
  }
  if (editingProject && !state.adminEditTypeTab) state.adminEditTypeTab = editingProject.type;
  if (editingProject) ensureAdminEditDraft(editingProject);

  const addSeriesContext = syncAdminSeriesSelection('add');
  const editSeriesContext = editingProject ? syncAdminSeriesSelection('edit') : { draft: null, selection: { seasonId: null, episodeId: null, voiceoverId: null } };

  elements.adminPageContent.innerHTML = getAdminPageMarkup({
    canManageRoles: canManageRoles(),
    titleSearchResults,
    aboutContent: state.aboutContent,
    roleEntries,
    sectionTab: state.adminSectionTab,
    typeTab: state.adminTypeTab,
    titleSearch: state.adminTitleSearch,
    editingProject,
    editTypeTab: state.adminEditTypeTab,
    roleSearchQuery: state.adminRoleSearch,
    roleSearchResults: getRoleSearchResults(),
    roleEntriesLoading: state.roleEntriesLoading,
    roleEntriesError: state.roleEntriesError,
    roleSearchLoading: state.roleSearchLoading,
    roleSearchError: state.roleSearchError,
    rolesRefreshing: isAdminActionPending('rolesRefresh'),
    pendingRoleUserId: getPendingRoleUserId(),
    addSubtab: state.adminSubtabs.add,
    editSubtab: state.adminSubtabs.edit,
    addSeriesDraft: addSeriesContext.draft,
    editSeriesDraft: editSeriesContext.draft,
    addSeriesSelection: addSeriesContext.selection,
    editSeriesSelection: editSeriesContext.selection,
    addTrailerLinkedId: state.adminTrailerLinks.add || null,
    editTrailerLinkedId: state.adminTrailerLinks.edit || null,
    addTrailerLinkedTitle: getProjectById(state.adminTrailerLinks.add)?.title || '',
    editTrailerLinkedTitle: getProjectById(state.adminTrailerLinks.edit)?.title || '',
    addFormDraft: state.adminFormDrafts.add || {},
    editFormDraft: state.adminFormDrafts.edit || null,
    aboutDraft: state.adminFormDrafts.about || null,
    addTitleDirty: hasUnsavedAdminTitleChanges('add'),
    addSeriesDirty: hasUnsavedAdminSeriesChanges('add'),
    editTitleDirty: editingProject ? hasUnsavedAdminTitleChanges('edit') : false,
    editSeriesDirty: editingProject ? hasUnsavedAdminSeriesChanges('edit') : false,
    aboutDirty: hasUnsavedAboutChanges(),
    addTitleSaving: isAdminActionPending('addTitle'),
    editTitleSaving: isAdminActionPending('editTitle'),
    editSeriesSaving: isAdminActionPending('editSeries'),
    aboutSaving: isAdminActionPending('about'),
    deletingTitleId: state.adminPending.deleteTitleId || null
  });

  updateAdminPanels();
  hydrateAdminMediaPreviews();
}

function updateAdminPanels() {
  document.querySelectorAll('[data-admin-section-tab]').forEach(button => {
    const active = button.dataset.adminSectionTab === state.adminSectionTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-admin-section-panel]').forEach(panel => {
    panel.hidden = panel.dataset.adminSectionPanel !== state.adminSectionTab;
  });
  document.querySelectorAll('[data-admin-type-tab]').forEach(button => {
    const active = button.dataset.adminTypeTab === state.adminTypeTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-admin-edit-type-tab]').forEach(button => {
    const active = button.dataset.adminEditTypeTab === state.adminEditTypeTab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

const viewController = createViewController({
  state,
  pageViews: elements.pageViews,
  viewLinks: elements.viewLinks,
  onBeforeLeave: previousView => {
    if (previousView === 'admin') {
      persistAdminTitleForm('add');
      persistAdminTitleForm('edit');
      persistAdminAboutForm();
      persistAdminSeriesEditorInputs('add');
      persistAdminSeriesEditorInputs('edit');
      saveAdminUiState();
    }
  },
  renderUserChrome,
  renderAdminPage,
  updatePageScrollButton
});

const { showView } = viewController;

function resolveRoute() {
  const hash = window.location.hash || '#home';
  const titleId = parseTitleHash(hash);
  if (titleId !== null) {
    renderTitlePage(titleId);
    showView('title');
    return;
  }
  switch (hash) {
    case '#home': showView('home'); return;
    case '#catalog': showView('catalog'); return;
    case '#favorites':
      if (!state.sessionResolved) return;
      if (!isAuthed()) {
        showToast('Сначала войди в аккаунт, чтобы открыть избранное.', 'error');
        window.location.hash = '#catalog';
        return;
      }
      showView('favorites');
      return;
    case '#about': showView('about'); return;
    case '#account':
      if (!state.sessionResolved) return;
      if (!isAuthed()) {
        showToast('Сначала войди в аккаунт, чтобы открыть кабинет.', 'error');
        window.location.hash = '#catalog';
        return;
      }
      renderAccountPage();
      showView('account');
      return;
    case '#admin':
      if (!state.sessionResolved) return;
      if (!canOpenAdmin()) {
        showToast('Админка доступна только владельцу и администратору.', 'error');
        window.location.hash = isAuthed() ? '#account' : '#catalog';
        return;
      }
      showView('admin');
      return;
    default: showView('home');
  }
}

function runCounterAnimation() {
  if (prefersReducedMotion()) {
    elements.counters.forEach(counter => { counter.textContent = counter.dataset.counter || '0'; });
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      const target = Number(counter.dataset.counter || '0');
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 36));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        counter.textContent = String(current);
      }, 28);
      observer.unobserve(counter);
    });
  }, { threshold: 0.45 });
  elements.counters.forEach(counter => observer.observe(counter));
}

function runRevealObserver() {
  if (prefersReducedMotion()) {
    elements.revealItems.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16 });
  elements.revealItems.forEach(item => observer.observe(item));
}

function getMaxScrollTop() {
  return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
}

function updatePageScrollButton() {
  const button = elements.pageScrollBtn;
  if (!button) return;
  const maxScrollTop = getMaxScrollTop();
  const shouldShow = maxScrollTop > 180;
  if (!shouldShow) {
    button.hidden = true;
    button.classList.remove('is-visible', 'is-up');
    return;
  }
  button.hidden = false;
  button.classList.add('is-visible');
  const nearBottom = window.scrollY >= maxScrollTop - 80;
  button.classList.toggle('is-up', nearBottom);
  elements.pageScrollBtnIcon.textContent = nearBottom ? '↑' : '↓';
  button.setAttribute('aria-label', nearBottom ? 'Прокрутить страницу вверх' : 'Прокрутить страницу вниз');
}

function handlePageScrollButtonClick() {
  const maxScrollTop = getMaxScrollTop();
  const nearBottom = window.scrollY >= maxScrollTop - 80;
  window.scrollTo({ top: nearBottom ? 0 : maxScrollTop, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

async function syncSession(session) {
  state.session = session || null;
  state.sessionResolved = true;
  if (isAuthed()) {
    syncKnownUserFromSession(session);
    await repository.ensureUserProfile(session);
    state.favorites = await repository.loadFavoritesForSession({
      userId: getUserId(),
      allowGuestFavorites: isGuestFavoritesEnabled()
    });
    state.ratings = await repository.loadRatings();
    renderAccountPage();
  } else {
    state.favorites = await repository.loadFavoritesForSession({
      userId: null,
      allowGuestFavorites: isGuestFavoritesEnabled()
    });
    state.ratings = await repository.loadRatings();
    elements.profileForm.reset();
    elements.passwordForm.reset();
  }
  if (canManageRoles()) {
    void refreshRoleDirectory({ preserveSearch: true, silent: true });
  } else {
    resetRoleManagementState();
  }

  renderUserChrome();
  renderAllDynamic();
  if (state.currentView === 'admin') renderAdminPage();
  resolveRoute();
}

async function withPendingSubmit(form, callback) {
  const submitButton = form.querySelector('[type="submit"]');
  if (!submitButton || submitButton.disabled) return;
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Подождите...';
  try {
    await callback();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  setAuthStatus('');
  await withPendingSubmit(elements.loginForm, async () => {
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    if (!isValidEmail(email)) {
      setAuthStatus('Введите корректную почту.', 'error');
      return;
    }
    if (password.length < 6) {
      setAuthStatus('Пароль должен быть минимум 6 символов.', 'error');
      return;
    }
    const { error } = await signInWithPassword({ email, password });
    if (error) {
      setAuthStatus(mapSupabaseMessage(error, 'Не удалось выполнить вход. Попробуй ещё раз.'), 'error');
      return;
    }
    elements.loginForm.reset();
    closeAuthModal();
    showToast('Вход выполнен.', 'success');
  });
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  setAuthStatus('');
  await withPendingSubmit(elements.registerForm, async () => {
    const nickname = elements.registerNickname.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    const repeat = elements.registerPasswordRepeat.value;
    if (nickname.length < 2) return setAuthStatus('Никнейм должен быть минимум 2 символа.', 'error');
    if (!isValidEmail(email)) return setAuthStatus('Введите корректную почту.', 'error');
    if (password.length < 6) return setAuthStatus('Пароль должен быть минимум 6 символов.', 'error');
    if (password !== repeat) return setAuthStatus('Пароли не совпадают.', 'error');
    const { data, error } = await signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname, data: { nickname } }
    });
    if (error) {
      setAuthStatus(mapSupabaseMessage(error, 'Не удалось создать аккаунт. Попробуй ещё раз.'), 'error');
      return;
    }
    elements.registerForm.reset();
    const requiresEmailConfirmation = !data?.session;
    setAuthStatus(
      requiresEmailConfirmation
        ? 'Аккаунт создан. Проверьте входящие письма на вашей почте.'
        : 'Аккаунт создан. Вход выполнен.',
      'success'
    );
  });
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!isAuthed()) return showToast('Сначала войди в аккаунт.', 'error');
  await withPendingSubmit(elements.profileForm, async () => {
    const nickname = elements.profileNickname.value.trim();
    const email = elements.profileEmail.value.trim();
    const payload = {};
    const currentNickname = getUserNickname();
    const currentEmail = state.session.user.email || '';
    if (nickname && nickname !== currentNickname) {
      if (nickname.length < 2) return showToast('Никнейм должен быть минимум 2 символа.', 'error');
      const remaining = getNicknameCooldownHintRemaining(getUserId());
      if (remaining > 0) return showToast(`На этом устройстве ещё действует локальная подсказка по смене никнейма. Подожди примерно ${toMinutesText(remaining)}.`, 'error');
      payload.data = { nickname };
    }
    if (email && email !== currentEmail) {
      if (!isValidEmail(email)) return showToast('Введите корректную почту.', 'error');
      payload.email = email;
      payload.options = { emailRedirectTo: window.location.origin + window.location.pathname };
    }
    if (!Object.keys(payload).length) return showToast('Нет изменений для сохранения.', 'error');
    const { error } = await updateUser(payload);
    if (error) return showToast(mapSupabaseMessage(error, 'Не удалось обновить профиль.'), 'error');
    if (payload.data?.nickname) saveNicknameCooldownHint(getUserId());
    upsertKnownUser({ userId: getUserId(), email: payload.email || currentEmail, nickname: payload.data?.nickname || currentNickname });
    renderAdminPage();
    showToast(payload.email ? 'Профиль обновлён. Если ты сменил почту, подтверди её через письмо.' : 'Профиль обновлён.', 'success');
  });
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  if (!isAuthed()) return showToast('Сначала войди в аккаунт.', 'error');
  await withPendingSubmit(elements.passwordForm, async () => {
    const password = elements.profilePassword.value;
    const repeat = elements.profilePasswordRepeat.value;
    if (password.length < 6) return showToast('Пароль должен быть минимум 6 символов.', 'error');
    if (password !== repeat) return showToast('Пароли не совпадают.', 'error');
    const { error } = await updateUser({ password });
    if (error) return showToast(mapSupabaseMessage(error, 'Не удалось обновить пароль.'), 'error');
    elements.passwordForm.reset();
    showToast('Пароль обновлён.', 'success');
  });
}

async function rateCurrentTitle(value) {
  if (!state.currentRatingId) return;
  const key = String(state.currentRatingId);
  const userKey = getCurrentViewerRateKey();
  if (!state.ratings[key]) state.ratings[key] = { byUser: {} };
  state.ratings[key].byUser[userKey] = Number(value);
  await repository.persistRating({
    userId: getUserId(),
    titleId: state.currentRatingId,
    value: Number(value),
    ratings: state.ratings
  });

  const ratedId = state.currentRatingId;
  scopeList.forEach(scope => renderGrid(scope));
  updateRenderedRatingControls(ratedId);
  if (state.currentTitleId === ratedId) renderTitlePage(ratedId);
  if (state.currentModalId === ratedId && elements.detailsModal.classList.contains('is-open')) renderModalContent(ratedId);
  if (state.featuredAnimeId === ratedId) renderHeroFeature();
  renderRecentUpdates();
  renderNewVideos();
  if (state.currentView === 'admin') renderAdminPage();
  closeRatingModal();
  showToast(`Оценка ${value} сохранена.`, 'success');
}

function splitUniqueTokens(value, { delimiter = ',', minLength = 1 } = {}) {
  const chunks = String(value || '')
    .split(delimiter)
    .map(item => item.trim())
    .filter(Boolean);
  const seen = new Set();
  const result = [];
  chunks.forEach(item => {
    if (item.length < minLength) return;
    const key = item.toLocaleLowerCase('ru-RU');
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function clearAdminTitleValidation(form) {
  form?.querySelectorAll?.('[data-admin-field-name]').forEach(field => {
    field.classList.remove('is-invalid');
    const error = field.querySelector('[data-admin-field-error]');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
  });
}

function clearAdminFieldValidation(input) {
  const field = input?.closest?.('[data-admin-field-name]');
  if (!field) return;
  field.classList.remove('is-invalid');
  const error = field.querySelector('[data-admin-field-error]');
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
}

function applyAdminTitleValidation(form, issues) {
  clearAdminTitleValidation(form);
  if (!form || !Array.isArray(issues) || !issues.length) return;
  const touched = new Set();
  issues.forEach(issue => {
    if (!issue?.field) return;
    const field = form.querySelector(`[data-admin-field-name="${issue.field}"]`);
    if (!field) return;
    field.classList.add('is-invalid');
    if (!touched.has(issue.field)) {
      const error = field.querySelector('[data-admin-field-error]');
      if (error) {
        error.hidden = false;
        error.textContent = issue.message;
      }
      touched.add(issue.field);
    }
  });
  const firstFieldName = issues.find(issue => issue?.field)?.field;
  const firstInput = firstFieldName ? form.querySelector(`[name="${firstFieldName}"]`) : null;
  firstInput?.focus?.();
  firstInput?.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function getTitleValidationIssues(next, { currentProjects = state.projects, editingId = null } = {}) {
  const issues = [];
  const titleKey = String(next.title || '').trim().toLocaleLowerCase('ru-RU');
  const duplicateTitle = currentProjects.some(item => item.id !== editingId
    && String(item.title || '').trim().toLocaleLowerCase('ru-RU') === titleKey
    && String(item.type || '') === String(next.type || ''));

  if (!next.title || next.title.length < 2) {
    issues.push({ field: 'title', message: 'Название должно быть минимум 2 символа.' });
  } else if (duplicateTitle) {
    issues.push({ field: 'title', message: 'Тайтл с таким названием и типом уже есть.' });
  }

  if (isVideoLike(next)) {
    if (!next.videoUrl) {
      issues.push({ field: 'videoUrl', message: 'Добавь ссылку на видео.' });
    } else if (!sanitizeUrl(next.videoUrl)) {
      issues.push({ field: 'videoUrl', message: 'Ссылка на видео выглядит некорректно.' });
    }

    if (next.posterUrl && !sanitizeUrl(next.posterUrl, { allowData: true })) {
      issues.push({ field: 'posterUrl', message: 'Ссылка или путь к превью выглядят некорректно.' });
    }

    if (next.categories.length > 8) {
      issues.push({ field: 'categories', message: 'Оставь не больше 8 категорий.' });
    }

    return issues;
  }

  if (!Number.isFinite(next.year) || next.year < 1900 || next.year > 2100) {
    issues.push({ field: 'year', message: 'Укажи год в диапазоне 1900–2100.' });
  }
  if (next.type === 'anime' && !next.season) {
    issues.push({ field: 'season', message: 'Для аниме укажи сезон.' });
  }
  if (!next.status) {
    issues.push({ field: 'status', message: 'Заполни статус тайтла.' });
  }
  if (!next.duration) {
    issues.push({ field: 'duration', message: 'Укажи хронометраж или число эпизодов.' });
  }
  if (!next.voiceover) {
    issues.push({ field: 'voiceover', message: 'Укажи озвучку или команду.' });
  }
  if (!next.genres.length) {
    issues.push({ field: 'genres', message: 'Добавь хотя бы один жанр.' });
  } else if (next.genres.length > 12) {
    issues.push({ field: 'genres', message: 'Оставь не больше 12 жанров.' });
  }
  if (!next.description || next.description.length < 10) {
    issues.push({ field: 'description', message: 'Короткое описание должно быть чуть подробнее.' });
  }
  if (!next.longText || next.longText.length < 30) {
    issues.push({ field: 'longText', message: 'Полное описание должно быть минимум 30 символов.' });
  }
  if (next.posterUrl && !sanitizeUrl(next.posterUrl, { allowData: true })) {
    issues.push({ field: 'posterUrl', message: 'Ссылка или путь к постеру выглядят некорректно.' });
  }

  return issues;
}

function collectTitleFormData(form, fallbackType = state.adminTypeTab) {
  const data = Object.fromEntries(new FormData(form).entries());
  const currentType = String(data.type || fallbackType || 'anime');
  const isMediaType = currentType === 'video' || currentType === 'trailer';
  const categories = splitUniqueTokens(data.categories || '', { delimiter: ',', minLength: 2 });

  return {
    id: data.id ? Number(data.id) : null,
    title: String(data.title || '').trim(),
    type: currentType,
    year: Number(data.year || new Date().getFullYear()),
    season: currentType === 'anime' ? String(data.season || '').trim() : '',
    status: String(data.status || (isMediaType ? (currentType === 'video' ? 'Видео' : 'Трейлер') : '')).trim(),
    duration: String(data.duration || '').trim(),
    voiceover: String(data.voiceover || data.team || '').trim(),
    team: String(data.voiceover || data.team || '').trim(),
    genres: isMediaType ? [] : splitUniqueTokens(data.genres || '', { delimiter: ',', minLength: 2 }),
    categories: isMediaType ? categories : splitUniqueTokens(data.categories || '', { delimiter: ',', minLength: 2 }),
    altTitles: splitUniqueTokens(data.altTitles || '', { delimiter: '*', minLength: 2 }),
    description: String(data.description || '').trim() || (isMediaType ? 'Видео каталога AKAITSUKI.' : ''),
    longText: String(data.longText || '').trim() || (isMediaType ? 'Видео для каталога AKAITSUKI.' : ''),
    posterTheme: 'electric-violet',
    posterUrl: String(data.posterUrl || '').trim(),
    videoUrl: String(data.videoUrl || '').trim(),
    linkedTitleId: data.linkedTitleId ? Number(data.linkedTitleId) : null,
    updatedOrder: UPDATED_ORDER_FALLBACK,
    latestEpisode: inferLatestEpisodeLabel(data.duration, '')
  };
}



function setAdminMediaPreviewState(preview, rawValue, { status = 'empty', safeUrl = '' } = {}) {
  if (!preview) return;
  const image = preview.querySelector('[data-admin-media-preview-image]');
  const empty = preview.querySelector('[data-admin-media-preview-empty]');
  const title = preview.querySelector('[data-admin-media-preview-title]');
  const message = preview.querySelector('[data-admin-media-preview-message]');
  const path = preview.querySelector('[data-admin-media-preview-path]');
  const kind = preview.dataset.adminMediaKind === 'preview' ? 'preview' : 'poster';

  const emptyTitle = kind === 'preview' ? 'Превью пока не указано' : 'Постер пока не указан';
  const emptyMessage = kind === 'preview'
    ? 'Вставь ссылку или относительный путь из папки сайта, чтобы увидеть превью здесь.'
    : 'Вставь ссылку или относительный путь из папки сайта, чтобы увидеть постер здесь.';
  const invalidMessage = kind === 'preview'
    ? 'Путь выглядит некорректно или изображение не открылось. Проверь ссылку или путь вроде assets/images/previews/name.webp.'
    : 'Путь выглядит некорректно или изображение не открылось. Проверь ссылку или путь вроде assets/images/posters/name.webp.';

  preview.dataset.previewState = status;
  if (path) path.textContent = rawValue || 'Путь пока не указан';

  if (status === 'ready' && safeUrl) {
    if (image) {
      image.hidden = false;
      if (image.getAttribute('src') !== safeUrl) image.setAttribute('src', safeUrl);
    }
    if (empty) empty.hidden = true;
    return;
  }

  if (image) {
    image.hidden = true;
    image.removeAttribute('src');
  }
  if (empty) empty.hidden = false;
  if (title) title.textContent = emptyTitle;
  if (message) message.textContent = status === 'invalid' ? invalidMessage : emptyMessage;
}

function refreshAdminMediaPreviewForInput(input) {
  if (!input?.matches?.('[data-admin-media-input]')) return;
  const form = input.closest('[data-admin-title-form]');
  if (!form) return;
  const preview = form.querySelector(`[data-admin-media-preview="${input.name}"]`);
  if (!preview) return;
  const rawValue = String(input.value || '').trim();
  const safeUrl = sanitizeUrl(rawValue, { allowData: true });
  setAdminMediaPreviewState(preview, rawValue, safeUrl ? { status: 'ready', safeUrl } : { status: rawValue ? 'invalid' : 'empty' });
}

function hydrateAdminMediaPreviews(root = elements.adminPageContent) {
  root?.querySelectorAll?.('[data-admin-media-preview]').forEach(preview => {
    const name = preview.dataset.adminMediaPreview;
    const form = preview.closest('[data-admin-title-form]');
    const input = name ? form?.querySelector(`[name="${name}"]`) : null;
    const image = preview.querySelector('[data-admin-media-preview-image]');
    if (image && !image.dataset.previewBound) {
      image.dataset.previewBound = 'true';
      image.addEventListener('load', () => {
        if (preview.dataset.previewState === 'ready') return;
        const rawValue = String(input?.value || '').trim();
        const safeUrl = sanitizeUrl(rawValue, { allowData: true });
        setAdminMediaPreviewState(preview, rawValue, safeUrl ? { status: 'ready', safeUrl } : { status: rawValue ? 'invalid' : 'empty' });
      });
      image.addEventListener('error', () => {
        const rawValue = String(input?.value || '').trim();
        setAdminMediaPreviewState(preview, rawValue, { status: rawValue ? 'invalid' : 'empty' });
      });
    }
    if (input) refreshAdminMediaPreviewForInput(input);
  });
}

function persistAdminTitleForm(mode) {
  const form = document.querySelector(`[data-admin-title-form="${mode}"]`);
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  state.adminFormDrafts[mode] = { ...(state.adminFormDrafts[mode] || {}), ...data };
}

function persistAdminAboutForm() {
  const form = document.getElementById('adminAboutForm');
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const paragraphs = [...form.querySelectorAll('[data-about-paragraph]')].map(item => item.value).filter(Boolean);
  const teamRows = [...form.querySelectorAll('[data-team-member-row]')].map(row => ({
    name: row.querySelector('[data-team-member-name]')?.value || '',
    role: row.querySelector('[data-team-member-role]')?.value || ''
  })).filter(item => item.name || item.role);
  state.adminFormDrafts.about = {
    ...data,
    paragraphs,
    teamTitle: data.teamTitle || '',
    teamMembers: teamRows
  };
}

function resetAdminDraftForm(mode) {
  state.adminFormDrafts[mode] = mode === 'edit' ? null : {};
}

function getProjectDraftFields(project) {
  return { ...project, type: project.type, genres: (project.genres || []).join(', '), categories: (project.categories || []).join(', '), altTitles: (project.altTitles || []).join(' * ') };
}

function getEmptyProjectDraftFields(type = 'anime') {
  const isMediaType = type === 'video' || type === 'trailer';
  return {
    type,
    title: '',
    year: '',
    season: '',
    status: '',
    duration: '',
    voiceover: '',
    team: '',
    genres: '',
    categories: '',
    altTitles: '',
    description: '',
    longText: '',
    posterUrl: '',
    videoUrl: '',
    linkedTitleId: ''
  };
}

function getEmptyAboutDraft() {
  return {
    title: '',
    paragraphs: [''],
    teamTitle: '',
    teamMembers: [{ name: '', role: '' }]
  };
}

function resetAdminForm(mode) {
  if (mode === 'add') {
    state.adminFormDrafts.add = getEmptyProjectDraftFields(state.adminTypeTab);
    state.adminTrailerLinks.add = null;
    if (!isVideoLike({ type: state.adminTypeTab })) {
      state.adminDraftMedia.add = createEmptyMediaDraft();
      setAdminSeriesSelection('add', { seasonId: null, episodeId: null, voiceoverId: null });
    }
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  if (mode === 'edit') {
    if (state.adminEditProjectId) {
      const type = state.adminEditTypeTab || getProjectById(state.adminEditProjectId)?.type || 'anime';
      state.adminFormDrafts.edit = getEmptyProjectDraftFields(type);
      state.adminTrailerLinks.edit = null;
      if (!isVideoLike({ type })) {
        state.adminDraftMedia.edit = createEmptyMediaDraft();
        setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
      }
      renderAdminPage();
      saveAdminUiState();
      return;
    }
    state.adminEditProjectId = null;
    state.adminEditTypeTab = null;
    state.adminDraftMedia.edit = null;
    state.adminTrailerLinks.edit = null;
    state.adminFormDrafts.edit = null;
    setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
    renderAdminPage();
    saveAdminUiState();
  }
}

function cancelAdminChanges(mode) {
  if (mode === 'add') {
    state.adminFormDrafts.add = {};
    state.adminDraftMedia.add = createEmptyMediaDraft();
    state.adminTrailerLinks.add = null;
    setAdminSeriesSelection('add', { seasonId: null, episodeId: null, voiceoverId: null });
    state.adminSubtabs.add = 'title';
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const project = getProjectById(state.adminEditProjectId);
  if (!project) return;
  state.adminEditTypeTab = project.type;
  state.adminFormDrafts.edit = getProjectDraftFields(project);
  state.adminDraftMedia.edit = isVideoLike(project) ? createEmptyMediaDraft() : cloneDeep(project.media || createEmptyMediaDraft());
  state.adminTrailerLinks.edit = project.linkedTitleId || null;
  setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
  renderAdminPage();
  saveAdminUiState();
}

function cancelAdminSeriesChanges(mode) {
  if (mode === 'add') {
    state.adminDraftMedia.add = createEmptyMediaDraft();
    setAdminSeriesSelection('add', { seasonId: null, episodeId: null, voiceoverId: null });
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const project = getProjectById(state.adminEditProjectId);
  if (!project || isVideoLike(project)) return;
  state.adminDraftMedia.edit = cloneDeep(project.media || createEmptyMediaDraft());
  setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
  renderAdminPage();
  saveAdminUiState();
}

function cancelAdminAboutChanges() {
  state.adminFormDrafts.about = normalizeAboutContent(state.aboutContent);
  renderAdminPage();
  saveAdminUiState();
}

function resetAdminAboutChanges() {
  state.adminFormDrafts.about = getEmptyAboutDraft();
  renderAdminPage();
  saveAdminUiState();
}

function startEditingProject(project) {
  if (!project) return;
  state.adminSectionTab = 'edit';
  state.adminEditProjectId = project.id;
  state.adminEditTypeTab = project.type;
  state.adminDraftMedia.edit = isVideoLike(project) ? createEmptyMediaDraft() : cloneDeep(project.media || createEmptyMediaDraft());
  state.adminTrailerLinks.edit = project.linkedTitleId || null;
  state.adminFormDrafts.edit = getProjectDraftFields(project);
  if (isVideoLike(project)) state.adminSubtabs.edit = 'title';
  setAdminSeriesSelection('edit', { seasonId: null, episodeId: null, voiceoverId: null });
  renderAdminPage();
  saveAdminUiState();
  const target = document.getElementById('adminEditTitleForm') || document.querySelector('[data-admin-series-editor="edit"]');
  target?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function validateTitlePayload(form, next, options = {}) {
  const issues = getTitleValidationIssues(next, options);
  applyAdminTitleValidation(form, issues);
  if (!issues.length) return true;
  showToast(issues[0]?.message || 'Проверь поля формы.', 'error');
  return false;
}


async function saveAdminNewTitle(form) {
  if (!canOpenAdmin() || isAdminActionPending('addTitle')) return;
  const next = collectTitleFormData(form, state.adminTypeTab);
  if (!validateTitlePayload(form, next)) return;

  const nextId = Math.max(0, ...state.projects.map(item => item.id)) + 1;
  const media = isVideoLike(next) ? createEmptyMediaDraft() : cloneDeep(state.adminDraftMedia.add || createEmptyMediaDraft());
  const latestEpisode = isVideoLike(next) ? '' : (getLatestEpisodeFromMedia(media) || inferLatestEpisodeLabel(next.duration, ''));
  const createdProject = normalizeProject({ ...next, id: nextId, media, latestEpisode });

  setAdminPendingState({ addTitle: true });
  const result = await saveProject(createdProject);
  if (result?.error) {
    setAdminPendingState({ addTitle: false });
    showToast(getRemoteActionErrorMessage(result, 'Не удалось сохранить новый тайтл в Supabase.'), 'error');
    return;
  }

  state.projects.push(createdProject);
  resetAdminForm('add');
  state.adminDraftMedia.add = createEmptyMediaDraft();
  state.adminTrailerLinks.add = null;
  state.adminFormDrafts.add = {};
  setAdminSeriesSelection('add', { seasonId: null, episodeId: null, voiceoverId: null });
  state.adminSubtabs.add = 'title';
  renderAllDynamic();
  setAdminPendingState({ addTitle: false });
  saveAdminUiState();
  showToast('Тайтл добавлен и сохранён в Supabase.', 'success');
}

async function saveAdminEditedTitle(form) {
  if (!canOpenAdmin() || isAdminActionPending('editTitle')) return;
  const next = collectTitleFormData(form, state.adminEditTypeTab || state.adminTypeTab);
  if (!next.id) {
    showToast('Сначала выбери тайтл для редактирования.', 'error');
    return;
  }
  if (!validateTitlePayload(form, next, { editingId: next.id })) return;

  const currentProject = getProjectById(next.id);
  if (!currentProject) {
    showToast('Не удалось найти тайтл для редактирования.', 'error');
    return;
  }

  const updatedProject = normalizeProject({
    ...currentProject,
    ...next,
    latestEpisode: isVideoLike(next) ? '' : (currentProject.latestEpisode || inferLatestEpisodeLabel(next.duration, ''))
  });

  setAdminPendingState({ editTitle: true });
  const result = await saveProject(updatedProject);
  if (result?.error) {
    setAdminPendingState({ editTitle: false });
    showToast(getRemoteActionErrorMessage(result, 'Не удалось сохранить изменения в Supabase.'), 'error');
    return;
  }

  state.projects = state.projects.map(item => item.id === updatedProject.id ? updatedProject : item);
  state.adminEditProjectId = next.id;
  state.adminEditTypeTab = next.type;
  state.adminTrailerLinks.edit = next.linkedTitleId || null;
  state.adminFormDrafts.edit = getProjectDraftFields(updatedProject);
  renderAllDynamic();
  setAdminPendingState({ editTitle: false });
  saveAdminUiState();
  showToast('Изменения сохранены в Supabase.', 'success');
}

async function deleteAdminTitle(id) {
  if (!canOpenAdmin() || state.adminPending.deleteTitleId === id) return;

  const linkedProjectsToUpdate = [];
  const nextProjects = state.projects
    .filter(item => item.id !== id)
    .map(item => {
      if (item.linkedTitleId !== id) return item;
      const updatedLinkedProject = normalizeProject({ ...item, linkedTitleId: null });
      linkedProjectsToUpdate.push(updatedLinkedProject);
      return updatedLinkedProject;
    });

  setAdminPendingState({ deleteTitleId: id });

  if (linkedProjectsToUpdate.length) {
    const linkedResult = await saveProjectsBatch(linkedProjectsToUpdate);
    if (linkedResult?.error) {
      setAdminPendingState({ deleteTitleId: null });
      showToast(getRemoteActionErrorMessage(linkedResult, 'Не удалось обновить связанные тайтлы перед удалением.'), 'error');
      return;
    }
  }

  const deleteResult = await removeProjectFromRemote(id);
  if (deleteResult?.error) {
    setAdminPendingState({ deleteTitleId: null });
    showToast(getRemoteActionErrorMessage(deleteResult, 'Не удалось удалить тайтл из Supabase.'), 'error');
    return;
  }

  state.projects = nextProjects;
  state.favorites = state.favorites.filter(value => value !== id);
  delete state.titlePlayer[id];
  if (state.adminEditProjectId === id) {
    state.adminEditProjectId = null;
    state.adminEditTypeTab = null;
    state.adminDraftMedia.edit = null;
    state.adminTrailerLinks.edit = null;
    state.adminFormDrafts.edit = null;
  }
  if (state.currentTitleId === id) {
    state.currentTitleId = null;
    window.location.hash = '#catalog';
  }
  persistFavorites();
  renderAllDynamic();
  setAdminPendingState({ deleteTitleId: null });
  saveAdminUiState();
  showToast('Тайтл удалён из Supabase.', 'info');
}

async function handleDocumentClick(event) {
  const authTabButton = event.target.closest('[data-auth-tab]');
  if (authTabButton) return switchAuthTab(authTabButton.dataset.authTab);

  const clearButton = event.target.closest('[data-clear-search]');
  if (clearButton) {
    const scope = clearButton.dataset.clearSearch;
    scopeElements[scope].searchInput.value = '';
    state.search[scope] = '';
    updateSearchClear(scope);
    state.pagination[scope] = 1;
    renderGrid(scope);
    return;
  }

  const selectOption = event.target.closest('.select-option');
  if (selectOption) {
    const select = selectOption.closest('.custom-select');
    if (!select) return;

    if (select.dataset.roleUserId && selectOption.dataset.roleOptionValue && canManageRoles()) {
      closeAllSelects();
      void updateManagedUserRole(select.dataset.roleUserId, selectOption.dataset.roleOptionValue);
      return;
    }

    if (select.dataset.playerSelectKey && state.currentTitleId) {
      updateTitlePlayerSelection(state.currentTitleId, select.dataset.playerSelectKey, selectOption.dataset.optionValue);
      closeAllSelects();
      return;
    }

    const { scope, selectKey } = select.dataset;
    if (scope && selectKey) {
      if (selectKey === 'genre') {
        const optionValue = selectOption.dataset.optionValue;
        const currentGenres = getSelectedGenres(scope);
        state.pagination[scope] = 1;
        if (optionValue === 'all') {
          state.filters[scope].genres = [];
        } else {
          state.filters[scope].genres = currentGenres.includes(optionValue)
            ? currentGenres.filter(value => value !== optionValue)
            : [...currentGenres, optionValue];
        }
        renderSelects();
        renderGrid(scope);
        select.classList.add('is-open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'true');
        return;
      }

      state.filters[scope][selectKey] = selectOption.dataset.optionValue;
      state.pagination[scope] = 1;
      renderSelects();
      renderGrid(scope);
      closeAllSelects();
      return;
    }
  }

  const selectTrigger = event.target.closest('.select-trigger');
  if (selectTrigger) {
    const select = selectTrigger.closest('.custom-select');
    const isOpen = select.classList.contains('is-open');
    closeAllSelects(select);
    select.classList.toggle('is-open', !isOpen);
    selectTrigger.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) positionSelectMenu(select);
    else select.classList.remove('opens-upward');
    return;
  }

  if (!event.target.closest('.custom-select')) closeAllSelects();

  const typeButton = event.target.closest('[data-type]');
  if (typeButton) {
    const scope = typeButton.closest('[data-scope]')?.dataset.scope;
    if (!scope) return;
    toggleTypeFilter(scope, typeButton.dataset.type);
    state.pagination[scope] = 1;
    updateTypeButtons(scope);
    renderSelects();
    renderGrid(scope);
    return;
  }

  const paginationButton = event.target.closest('[data-page-scope][data-page-number]');
  if (paginationButton) {
    const scope = paginationButton.dataset.pageScope;
    state.pagination[scope] = Number(paginationButton.dataset.pageNumber) || 1;
    renderGrid(scope);
    const anchor = scopeElements[scope]?.typeFilters?.closest('.toolbar-tabs-badge') || elements.controlsRoots[scope];
    requestAnimationFrame(() => anchor?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
    return;
  }

  const openAltNames = event.target.closest('[data-expand-alt-names]');
  if (openAltNames) {
    const hiddenBlock = openAltNames.closest('.title-alt-names')?.querySelector('.alt-names-hidden');
    const expanded = openAltNames.getAttribute('aria-expanded') === 'true';
    if (hiddenBlock) hiddenBlock.hidden = expanded;
    openAltNames.setAttribute('aria-expanded', String(!expanded));
    openAltNames.textContent = expanded ? '. . .' : 'Скрыть';
    return;
  }

  const expandTags = event.target.closest('[data-expand-tags]');
  if (expandTags) {
    const wrapper = expandTags.closest('.title-tags');
    const tags = wrapper?.querySelectorAll('.hidden-title-tag') || [];
    const expanded = expandTags.getAttribute('aria-expanded') === 'true';
    tags.forEach(tag => { tag.hidden = expanded; });
    expandTags.setAttribute('aria-expanded', String(!expanded));
    expandTags.textContent = expanded ? '...' : 'Скрыть';
    return;
  }

  const expandVideoTags = event.target.closest('[data-expand-video-tags]');
  if (expandVideoTags) {
    const wrapper = expandVideoTags.closest('.video-card-tags');
    const tags = wrapper?.querySelectorAll('.hidden-video-tag') || [];
    const expanded = expandVideoTags.getAttribute('aria-expanded') === 'true';
    tags.forEach(tag => { tag.hidden = expanded; });
    expandVideoTags.setAttribute('aria-expanded', String(!expanded));
    expandVideoTags.textContent = expanded ? '. . .' : 'Скрыть';
    return;
  }

  if (!event.target.closest('.video-card')) {
    document.querySelectorAll('[data-expand-video-tags][aria-expanded="true"]').forEach(button => {
      const wrapper = button.closest('.video-card-tags');
      wrapper?.querySelectorAll('.hidden-video-tag').forEach(tag => { tag.hidden = true; });
      button.setAttribute('aria-expanded', 'false');
      button.textContent = '. . .';
    });
  }

  const openButton = event.target.closest('[data-open-id]');
  if (openButton) return openDetailsModal(Number(openButton.dataset.openId));

  const watchButton = event.target.closest('[data-watch-id]');
  if (watchButton) {
    const project = getProjectById(Number(watchButton.dataset.watchId));
    closeDetailsModal();
    if (project && isVideoLike(project)) {
      openVideoModal(project.id);
    } else {
      window.location.hash = getTitleHash(Number(watchButton.dataset.watchId));
    }
    return;
  }

  const favoriteButton = event.target.closest('[data-favorite-id]');
  if (favoriteButton) return toggleFavorite(Number(favoriteButton.dataset.favoriteId));

  const videoOpenButton = event.target.closest('[data-video-open-id]');
  if (videoOpenButton) {
    openVideoModal(Number(videoOpenButton.dataset.videoOpenId));
    return;
  }

  const playerItemButton = event.target.closest('[data-player-item-id]');
  if (playerItemButton && state.currentTitleId) {
    updateTitlePlayerSelection(state.currentTitleId, 'player', playerItemButton.dataset.playerItemId);
    return;
  }

  const ratingButton = event.target.closest('[data-open-rating]');
  if (ratingButton) return openRatingModal(Number(ratingButton.dataset.openRating));

  const scoreButton = event.target.closest('[data-rate-value]');
  if (scoreButton) return rateCurrentTitle(Number(scoreButton.dataset.rateValue));

  const openTrailerButton = event.target.closest('[data-open-trailer-id]');
  if (openTrailerButton) {
    openVideoModal(Number(openTrailerButton.dataset.openTrailerId));
    return;
  }

  if (event.target.closest('[data-close-modal]')) return closeDetailsModal();
  if (event.target.closest('[data-close-video-modal]')) return closeVideoModal();
  if (event.target.closest('[data-close-auth-modal]')) return closeAuthModal();
  if (event.target.closest('[data-close-rating]')) return closeRatingModal();
  if (event.target.closest('[data-close-trailer-link-modal]')) return closeTrailerLinkModal();
  if (event.target.closest('[data-close-confirm], [data-confirm-cancel]')) return closeConfirmModal(false);
  if (event.target.closest('[data-confirm-accept]')) return closeConfirmModal(true);
  if (event.target.closest('[data-action="logout"]')) return handleLogout();

  const adminSubtab = event.target.closest('[data-admin-subtab]');
  if (adminSubtab) {
    const [mode, tab] = String(adminSubtab.dataset.adminSubtab || '').split(':');
    if (mode && tab) {
      persistAdminSeriesEditorInputs(mode);
      const currentType = mode === 'edit' ? (state.adminEditTypeTab || getProjectById(state.adminEditProjectId)?.type || state.adminTypeTab) : state.adminTypeTab;
      state.adminSubtabs[mode] = (currentType === 'video' || currentType === 'trailer') ? 'title' : tab;
      renderAdminPage();
      saveAdminUiState();
      return;
    }
  }

  const adminSeasonAdd = event.target.closest('[data-admin-season-add]');
  if (adminSeasonAdd) return addAdminSeason(adminSeasonAdd.dataset.adminSeasonAdd);

  const adminSeasonButton = event.target.closest('[data-admin-season-id][data-admin-series-mode]');
  if (adminSeasonButton) {
    const mode = adminSeasonButton.dataset.adminSeriesMode;
    persistAdminSeriesEditorInputs(mode);
    setAdminSeriesSelection(mode, { seasonId: adminSeasonButton.dataset.adminSeasonId, episodeId: null, voiceoverId: null });
    renderAdminPage();
    return;
  }

  const adminSeasonRemove = event.target.closest('[data-admin-season-remove-id][data-admin-series-mode]');
  if (adminSeasonRemove) return removeAdminSeason(adminSeasonRemove.dataset.adminSeriesMode, adminSeasonRemove.dataset.adminSeasonRemoveId);

  const adminEpisodeAdd = event.target.closest('[data-admin-episode-add]');
  if (adminEpisodeAdd) return addAdminEpisode(adminEpisodeAdd.dataset.adminEpisodeAdd);

  const adminEpisodeButton = event.target.closest('[data-admin-episode-id][data-admin-series-mode]');
  if (adminEpisodeButton) {
    const mode = adminEpisodeButton.dataset.adminSeriesMode;
    persistAdminSeriesEditorInputs(mode);
    const selection = getAdminSeriesSelection(mode);
    setAdminSeriesSelection(mode, { seasonId: selection.seasonId, episodeId: adminEpisodeButton.dataset.adminEpisodeId, voiceoverId: null });
    renderAdminPage();
    return;
  }

  const adminEpisodeRemove = event.target.closest('[data-admin-episode-remove-id][data-admin-series-mode]');
  if (adminEpisodeRemove) return removeAdminEpisode(adminEpisodeRemove.dataset.adminSeriesMode, adminEpisodeRemove.dataset.adminEpisodeRemoveId);

  const adminEpisodeRestore = event.target.closest('[data-admin-episode-restore]');
  if (adminEpisodeRestore) return restoreAdminEpisode(adminEpisodeRestore.dataset.adminEpisodeRestore);

  const adminVoiceoverAdd = event.target.closest('[data-admin-voiceover-add]');
  if (adminVoiceoverAdd) return addAdminVoiceover(adminVoiceoverAdd.dataset.adminVoiceoverAdd);

  const adminVoiceoverButton = event.target.closest('[data-admin-voiceover-id][data-admin-series-mode]');
  if (adminVoiceoverButton) {
    const mode = adminVoiceoverButton.dataset.adminSeriesMode;
    persistAdminSeriesEditorInputs(mode);
    const selection = getAdminSeriesSelection(mode);
    setAdminSeriesSelection(mode, { seasonId: selection.seasonId, episodeId: selection.episodeId, voiceoverId: adminVoiceoverButton.dataset.adminVoiceoverId });
    renderAdminPage();
    return;
  }

  const adminVoiceoverRemove = event.target.closest('[data-admin-voiceover-remove-id][data-admin-series-mode]');
  if (adminVoiceoverRemove) return removeAdminVoiceover(adminVoiceoverRemove.dataset.adminSeriesMode, adminVoiceoverRemove.dataset.adminVoiceoverRemoveId);

  const adminPlayerAdd = event.target.closest('[data-admin-player-add]');
  if (adminPlayerAdd) return addAdminPlayer(adminPlayerAdd.dataset.adminPlayerAdd);

  const adminPlayerRemove = event.target.closest('[data-admin-player-remove-id][data-admin-series-mode]');
  if (adminPlayerRemove) return removeAdminPlayer(adminPlayerRemove.dataset.adminSeriesMode, adminPlayerRemove.dataset.adminPlayerRemoveId);

  const adminSeriesSave = event.target.closest('[data-admin-series-save]');
  if (adminSeriesSave) return saveAdminSeries(adminSeriesSave.dataset.adminSeriesSave);

  const adminSeriesReset = event.target.closest('[data-admin-series-reset]');
  if (adminSeriesReset) {
    const mode = adminSeriesReset.dataset.adminSeriesReset;
    persistVisibleAdminEditors();
    if (hasUnsavedAdminSeriesChanges(mode)) {
      const confirmed = await requestConfirmation({
        title: 'Очистить серии?',
        text: 'Несохранённые изменения в сериях будут удалены. Продолжить?',
        confirmText: 'Очистить',
        cancelText: 'Вернуться',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    return resetAdminSeriesEditor(mode);
  }

  const adminSectionTab = event.target.closest('[data-admin-section-tab]');
  if (adminSectionTab) {
    persistAdminSeriesEditorInputs('add');
    persistAdminSeriesEditorInputs('edit');
    state.adminSectionTab = adminSectionTab.dataset.adminSectionTab;
    renderAdminPage();
    if (state.adminSectionTab === 'roles' && canManageRoles()) void refreshRoleDirectory({ preserveSearch: true, silent: true });
    saveAdminUiState();
    return;
  }

  const adminTab = event.target.closest('[data-admin-type-tab]');
  if (adminTab) {
    persistAdminSeriesEditorInputs('add');
    state.adminTypeTab = adminTab.dataset.adminTypeTab;
    if (state.adminTypeTab === 'video' || state.adminTypeTab === 'trailer') state.adminSubtabs.add = 'title';
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminEditTypeTab = event.target.closest('[data-admin-edit-type-tab]');
  if (adminEditTypeTab) {
    persistAdminSeriesEditorInputs('edit');
    state.adminEditTypeTab = adminEditTypeTab.dataset.adminEditTypeTab;
    if (state.adminEditTypeTab === 'video' || state.adminEditTypeTab === 'trailer') state.adminSubtabs.edit = 'title';
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminEdit = event.target.closest('[data-admin-edit-id]');
  if (adminEdit) {
    persistVisibleAdminEditors();
    const nextProject = getProjectById(Number(adminEdit.dataset.adminEditId));
    const switchingProject = nextProject && nextProject.id !== state.adminEditProjectId;
    if (switchingProject && hasUnsavedAdminChangesForMode('edit')) {
      const confirmed = await requestConfirmation({
        title: 'Открыть другой тайтл?',
        text: 'Текущие изменения в редактировании не сохранены. Открыть другой тайтл и сбросить их?',
        confirmText: 'Открыть другой тайтл',
        cancelText: 'Остаться',
        tone: 'warn'
      });
      if (!confirmed) return;
    }
    return startEditingProject(nextProject);
  }

  const adminDelete = event.target.closest('[data-admin-delete-id]');
  if (adminDelete) {
    const project = getProjectById(Number(adminDelete.dataset.adminDeleteId));
    const confirmed = await requestConfirmation({
      title: 'Удалить тайтл?',
      text: `Тайтл «${project?.title || 'без названия'}» будет удалён из каталога. Это действие нельзя отменить автоматически.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      tone: 'danger'
    });
    if (!confirmed) return;
    return deleteAdminTitle(Number(adminDelete.dataset.adminDeleteId));
  }

  const adminAddAboutParagraph = event.target.closest('[data-admin-add-about-paragraph]');
  if (adminAddAboutParagraph) {
    const draft = normalizeAboutContent(state.adminFormDrafts.about || state.aboutContent);
    draft.paragraphs.push('');
    state.adminFormDrafts.about = draft;
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminRemoveAboutParagraph = event.target.closest('[data-admin-remove-about-paragraph]');
  if (adminRemoveAboutParagraph) {
    const index = Number(adminRemoveAboutParagraph.dataset.adminRemoveAboutParagraph || -1);
    const draft = normalizeAboutContent(state.adminFormDrafts.about || state.aboutContent);
    draft.paragraphs = draft.paragraphs.filter((_, idx) => idx !== index);
    state.adminFormDrafts.about = draft;
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminAddTeamMember = event.target.closest('[data-admin-add-team-member]');
  if (adminAddTeamMember) {
    const draft = normalizeAboutContent(state.adminFormDrafts.about || state.aboutContent);
    draft.teamMembers.push({ name: '', role: '' });
    state.adminFormDrafts.about = draft;
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminRemoveTeamMember = event.target.closest('[data-admin-remove-team-member]');
  if (adminRemoveTeamMember) {
    const index = Number(adminRemoveTeamMember.dataset.adminRemoveTeamMember || -1);
    const draft = normalizeAboutContent(state.adminFormDrafts.about || state.aboutContent);
    draft.teamMembers = draft.teamMembers.filter((_, idx) => idx !== index);
    state.adminFormDrafts.about = draft;
    renderAdminPage();
    saveAdminUiState();
    return;
  }

  const adminUnlinkTrailer = event.target.closest('[data-admin-unlink-trailer]');
  if (adminUnlinkTrailer) {
    const mode = adminUnlinkTrailer.dataset.adminUnlinkTrailer;
    state.adminTrailerLinks[mode] = null;
    syncTrailerLinkControls(mode);
    persistAdminTitleForm(mode);
    saveAdminUiState();
    return;
  }

  const adminGrantAdmin = event.target.closest('[data-admin-grant-admin-id]');
  if (adminGrantAdmin && canManageRoles()) {
    void updateManagedUserRole(adminGrantAdmin.dataset.adminGrantAdminId, 'admin');
    return;
  }

  const adminRefreshRoles = event.target.closest('[data-admin-refresh-roles]');
  if (adminRefreshRoles && canManageRoles()) {
    void refreshRoleDirectory({ preserveSearch: true, showFeedback: true });
    return;
  }

  const adminOpenTrailerLink = event.target.closest('[data-admin-open-trailer-link]');
  if (adminOpenTrailerLink) {
    openTrailerLinkModal(adminOpenTrailerLink.dataset.adminOpenTrailerLink);
    return;
  }

  const adminLinkTitle = event.target.closest('[data-admin-link-title-id]');
  if (adminLinkTitle) {
    const mode = elements.trailerLinkModal?.dataset.mode || 'add';
    applyTrailerLink(mode, adminLinkTitle.dataset.adminLinkTitleId);
    return;
  }

  const adminCancel = event.target.closest('[data-admin-form-cancel]');
  if (adminCancel) {
    const mode = adminCancel.dataset.adminFormCancel;
    persistVisibleAdminEditors();
    if (hasUnsavedAdminChangesForMode(mode)) {
      const confirmed = await requestConfirmation({
        title: 'Отменить изменения?',
        text: 'Несохранённые изменения в форме и сериях будут сброшены. Продолжить?',
        confirmText: 'Сбросить',
        cancelText: 'Вернуться',
        tone: 'warn'
      });
      if (!confirmed) return;
    }
    return cancelAdminChanges(mode);
  }

  const adminSeriesCancel = event.target.closest('[data-admin-series-cancel]');
  if (adminSeriesCancel) {
    const mode = adminSeriesCancel.dataset.adminSeriesCancel;
    persistVisibleAdminEditors();
    if (hasUnsavedAdminSeriesChanges(mode)) {
      const confirmed = await requestConfirmation({
        title: 'Отменить изменения в сериях?',
        text: 'Несохранённые изменения в сериях будут сброшены. Продолжить?',
        confirmText: 'Сбросить',
        cancelText: 'Вернуться',
        tone: 'warn'
      });
      if (!confirmed) return;
    }
    return cancelAdminSeriesChanges(mode);
  }

  const adminReset = event.target.closest('[data-admin-form-reset]');
  if (adminReset) {
    const mode = adminReset.dataset.adminFormReset;
    persistVisibleAdminEditors();
    if (hasUnsavedAdminChangesForMode(mode)) {
      const confirmed = await requestConfirmation({
        title: 'Очистить форму?',
        text: 'Несохранённые изменения в форме и сериях будут удалены. Продолжить?',
        confirmText: 'Очистить',
        cancelText: 'Вернуться',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    return resetAdminForm(mode);
  }

  const adminAboutReset = event.target.closest('[data-admin-about-reset]');
  if (adminAboutReset) {
    persistVisibleAdminEditors();
    if (hasUnsavedAboutChanges()) {
      const confirmed = await requestConfirmation({
        title: 'Очистить раздел «О нас»?',
        text: 'Несохранённые изменения в разделе будут удалены. Продолжить?',
        confirmText: 'Очистить',
        cancelText: 'Вернуться',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    return resetAdminAboutChanges();
  }

  const adminAboutCancel = event.target.closest('[data-admin-about-cancel]');
  if (adminAboutCancel) {
    persistVisibleAdminEditors();
    if (hasUnsavedAboutChanges()) {
      const confirmed = await requestConfirmation({
        title: 'Отменить изменения в разделе «О нас»?',
        text: 'Несохранённые изменения будут сброшены. Продолжить?',
        confirmText: 'Сбросить',
        cancelText: 'Вернуться',
        tone: 'warn'
      });
      if (!confirmed) return;
    }
    return cancelAdminAboutChanges();
  }
}


const handleSearchInput = debounce(input => {
  const scope = input.dataset.searchInput;
  state.search[scope] = input.value;
  state.pagination[scope] = 1;
  updateSearchClear(scope);
  renderGrid(scope);
}, 180);

function handleDocumentInput(event) {
  const input = event.target.closest('[data-search-input]');
  if (input) {
    handleSearchInput(input);
    return;
  }

  const adminTitleSearch = event.target.closest('[data-admin-title-search]');
  if (adminTitleSearch) {
    persistAdminSeriesEditorInputs('edit');
    state.adminTitleSearch = adminTitleSearch.value;
    const cursor = adminTitleSearch.selectionStart ?? state.adminTitleSearch.length;
    renderAdminPage();
    saveAdminUiStateDebounced();
    const restoredInput = document.querySelector('[data-admin-title-search]');
    if (restoredInput) {
      restoredInput.focus();
      restoredInput.setSelectionRange(cursor, cursor);
    }
    return;
  }

  const adminUserSearch = event.target.closest('[data-admin-user-search]');
  if (adminUserSearch) {
    state.adminRoleSearch = adminUserSearch.value;
    const cursor = adminUserSearch.selectionStart ?? state.adminRoleSearch.length;
    renderAdminPage();
    triggerRoleSearch(state.adminRoleSearch);
    saveAdminUiStateDebounced();
    const restoredInput = document.querySelector('[data-admin-user-search]');
    if (restoredInput) {
      restoredInput.focus();
      restoredInput.setSelectionRange(cursor, cursor);
    }
    return;
  }

  const adminTitleForm = event.target.closest('[data-admin-title-form]');
  if (adminTitleForm) {
    clearAdminFieldValidation(event.target);
    if (event.target.matches('[data-admin-media-input]')) refreshAdminMediaPreviewForInput(event.target);
    persistAdminTitleForm(adminTitleForm.dataset.adminTitleForm);
    saveAdminUiStateDebounced();
    return;
  }

  const adminAboutForm = event.target.closest('#adminAboutForm');
  if (adminAboutForm) {
    persistAdminAboutForm();
    saveAdminUiStateDebounced();
    return;
  }

  const adminSeriesRoot = event.target.closest('[data-admin-series-editor]');
  if (adminSeriesRoot) {
    persistAdminSeriesEditorInputs(adminSeriesRoot.dataset.adminSeriesEditor);
    saveAdminUiStateDebounced();
    return;
  }

  const trailerLinkSearch = event.target.closest('#trailerLinkSearchInput');
  if (trailerLinkSearch) {
    state.adminTrailerLinkSearch = trailerLinkSearch.value;
    renderTrailerLinkModal(elements.trailerLinkModal?.dataset.mode || 'add');
  }
}


async function handleDocumentSubmit(event) {
  const aboutForm = event.target.closest('#adminAboutForm');
  if (aboutForm) {
    event.preventDefault();
    if (!canOpenAdmin() || isAdminActionPending('about')) return;
    const data = Object.fromEntries(new FormData(aboutForm).entries());
    const paragraphs = [...aboutForm.querySelectorAll('[data-about-paragraph]')].map(item => String(item.value || '').trim()).filter(Boolean);
    const teamMembers = [...aboutForm.querySelectorAll('[data-team-member-row]')].map(row => ({
      name: String(row.querySelector('[data-team-member-name]')?.value || '').trim(),
      role: String(row.querySelector('[data-team-member-role]')?.value || '').trim()
    })).filter(item => item.name || item.role);
    const nextAboutContent = normalizeAboutContent({
      title: String(data.title || '').trim(),
      paragraphs,
      teamTitle: String(data.teamTitle || '').trim(),
      teamMembers
    });
    setAdminPendingState({ about: true });
    const result = await saveAboutContent(nextAboutContent);
    if (result?.error) {
      setAdminPendingState({ about: false });
      showToast(getRemoteActionErrorMessage(result, 'Не удалось сохранить раздел «О нас» в Supabase.'), 'error');
      return;
    }
    state.aboutContent = nextAboutContent;
    state.adminFormDrafts.about = null;
    renderAboutSection();
    setAdminPendingState({ about: false });
    saveAdminUiState();
    showToast('Раздел «О нас» обновлён в Supabase.', 'success');
    return;
  }
  const titleForm = event.target.closest('[data-admin-title-form]');
  if (titleForm) {
    event.preventDefault();
    if (titleForm.dataset.adminTitleForm === 'add') {
      saveAdminNewTitle(titleForm);
      return;
    }
    if (titleForm.dataset.adminTitleForm === 'edit') {
      saveAdminEditedTitle(titleForm);
    }
  }
}

async function handleLogout() {
  const { error } = await signOut();
  if (error) showToast(mapSupabaseMessage(error, 'Не удалось выйти из аккаунта.'), 'error');
}

function renderAllDynamic() {
  renderStats();
  renderSelects();
  scopeList.forEach(scope => {
    updateTypeButtons(scope);
    updateSearchClear(scope);
  });
  renderHeroFeature();
  renderGrid('catalog');
  renderGrid('favorites');
  renderRecentUpdates();
  renderNewVideos();
  renderAboutSection();
  if (state.currentTitleId) renderTitlePage(state.currentTitleId);
}

function bindEvents() {
  elements.heroShuffleBtn?.addEventListener('click', () => renderHeroFeature(true));
  elements.backToCatalogBtn?.addEventListener('click', () => {
    window.location.hash = state.lastBrowseView === 'favorites' ? '#favorites' : '#catalog';
  });
  elements.themeToggle?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });
  elements.loginBtn?.addEventListener('click', () => openAuthModal('login'));
  elements.loginForm?.addEventListener('submit', handleLoginSubmit);
  elements.registerForm?.addEventListener('submit', handleRegisterSubmit);
  elements.profileForm?.addEventListener('submit', handleProfileSubmit);
  elements.passwordForm?.addEventListener('submit', handlePasswordSubmit);
  elements.pageScrollBtn?.addEventListener('click', handlePageScrollButtonClick);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('input', handleDocumentInput);
  document.addEventListener('submit', handleDocumentSubmit);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAllSelects();
      closeDetailsModal();
      closeVideoModal();
      closeAuthModal();
      closeRatingModal();
      closeTrailerLinkModal();
      closeConfirmModal(false);
    }

    const watchCard = event.target.closest('[data-watch-id].update-card');
    if (watchCard && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const id = Number(watchCard.dataset.watchId || 0);
      if (id) {
        const project = getProjectById(id);
        if (project && isVideoLike(project)) openVideoModal(id);
        else window.location.hash = getTitleHash(id);
      }
      return;
    }

    const selectTrigger = event.target.closest('.custom-select .select-trigger');
    if (selectTrigger && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const select = selectTrigger.closest('.custom-select');
      const isOpen = select.classList.contains('is-open');
      closeAllSelects(select);
      select.classList.toggle('is-open', true);
      selectTrigger.setAttribute('aria-expanded', 'true');
      positionSelectMenu(select);
      const options = [...select.querySelectorAll('.select-option')];
      const selected = options.find(option => option.classList.contains('is-selected'));
      if (event.key === 'ArrowUp') {
        (selected || options[options.length - 1] || selectTrigger).focus();
      } else if (!isOpen || event.key !== 'Enter') {
        (selected || options[0] || selectTrigger).focus();
      }
      return;
    }

    const selectOption = event.target.closest('.custom-select .select-option');
    if (selectOption && ['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) {
      const select = selectOption.closest('.custom-select');
      const options = [...select.querySelectorAll('.select-option')];
      const currentIndex = options.index(selectOption);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAllSelects();
        select.querySelector('.select-trigger')?.focus();
        return;
      }
      event.preventDefault();
      const nextIndex = event.key === 'ArrowDown' ? Math.min(options.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
      options[nextIndex]?.focus();
      return;
    }

    const editForm = event.target.closest('[data-admin-edit-form]');
    if (editForm && event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      editForm.requestSubmit();
      return;
    }

    trapFocus(event);
  });
  window.addEventListener('scroll', updatePageScrollButton, { passive: true });
  window.addEventListener('resize', updatePageScrollButton);
  window.addEventListener('hashchange', resolveRoute);
  window.addEventListener('beforeunload', () => {
    if (state.currentView === 'admin') {
      persistVisibleAdminEditors();
    }
    saveAdminUiState();
  });
  onAuthStateChange?.((_event, session) => {
    void syncSession(session);
  });
}

function renderInitialState() {
  renderControls();
  renderAboutSection();
  renderStats();
  renderSelects();
  scopeList.forEach(scope => {
    updateTypeButtons(scope);
    updateSearchClear(scope);
  });
  renderHeroFeature(true);
  renderGrid('catalog');
  renderGrid('favorites');
  renderRecentUpdates();
  renderNewVideos();
  renderAccountPage();
  renderUserChrome();
}

async function initSession() {
  const { data, error } = await getSession();
  if (error) {
    console.error(error);
    await syncSession(null);
    return;
  }
  await syncSession(data.session);
}

async function init() {
  await loadContentState();
  applyTheme();
  ensureRatingModal();
  renderInitialState();
  bindEvents();
  resolveRoute();
  runCounterAnimation();
  runRevealObserver();
  updatePageScrollButton();
  await initSession();
}

window.addEventListener('resize', repositionOpenSelectMenus, { passive: true });
document.addEventListener('scroll', repositionOpenSelectMenus, true);

init();
