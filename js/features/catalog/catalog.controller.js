import { debounce } from '../../utils/debounce.utils.js';

function getFilterLabel(type, value) {
  if (type === 'genre') return value === 'all' ? 'Все жанры' : value;
  if (type === 'status') return value === 'all' ? 'Все статусы' : value;
  if (type === 'year') return value === 'all' ? 'Все годы' : String(value);
  if (type === 'sort') {
    return {
      newest: 'Сначала новые',
      title: 'По названию',
      episodes: 'По сериям',
      rating: 'По рейтингу',
    }[value] || 'Сначала новые';
  }
  return value;
}

function filterFavoriteItems(ctx, filters, kind) {
  const { authService, favoritesService } = ctx;
  const user = authService.getCurrentUser();
  const items = favoritesService.getUserFavorites(user?.id).filter((item) => item.contentType === kind);
  const search = filters.search.toLowerCase().trim();

  return items
    .filter((item) => (!search || [item.title, item.description, ...item.altTitles, ...item.genres].join(' ').toLowerCase().includes(search)))
    .filter((item) => filters.genre === 'all' || item.genres.includes(filters.genre))
    .filter((item) => filters.status === 'all' || item.displayStatus === filters.status)
    .filter((item) => filters.year === 'all' || String(item.year) === String(filters.year))
    .sort((a, b) => {
      if (filters.sort === 'title') return a.title.localeCompare(b.title, 'ru');
      if (filters.sort === 'episodes') return b.addedEpisodes - a.addedEpisodes;
      if (filters.sort === 'rating') return ctx.animeService.getRatingData(b.id).average - ctx.animeService.getRatingData(a.id).average;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
}

export function createCatalogController(ctx) {
  const {
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
  } = ctx;

  function renderGenreChips(root, item) {
    return renderGenreChipsComponent(root, item, { pageState });
  }

  function createAnimeCard(item) {
    return createAnimeCardComponent(item, {
      pageState,
      authService,
      favoritesService,
      animeCardTemplate,
      createFavoriteButton,
      getEpisodesLabel,
    });
  }

  function renderFilters(page, kind) {
    return renderFiltersComponent(page, kind, {
      makeFilterState,
      animeService,
      escapeHtml,
      createSelectControl,
    });
  }

  function makeFilterState(page, kind) {
    if (!pageState.filters[page]) pageState.filters[page] = {};
    if (!pageState.filters[page][kind]) {
      pageState.filters[page][kind] = { search: '', genre: 'all', status: 'all', year: 'all', sort: 'newest' };
    }
    return pageState.filters[page][kind];
  }

  function getItemsForPage(page, kind) {
    const filters = makeFilterState(page, kind);
    if (page === 'favorites') return filterFavoriteItems(ctx, filters, kind);
    return animeService.list({ ...filters, kind });
  }

  function updateGrid(page) {
    const kind = page === 'catalog' ? pageState.catalogTab : pageState.favoritesTab;
    const grid = document.getElementById(`${page}Grid`);
    if (!grid) return;
    const items = getItemsForPage(page, kind);
    grid.innerHTML = '';

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state glass"><h3>Здесь пока пусто</h3><p>Когда тайтлы появятся, они будут отображаться здесь.</p></div>';
    } else {
      items.forEach((item) => grid.append(createAnimeCard(item)));
    }

    if (page === 'favorites') {
      const badge = document.getElementById('favoritesCountBadge');
      if (badge) badge.textContent = `${items.length} тайтлов`;
    }
  }

  function bindGridInteractions(root, page) {
    const handleSearchInput = debounce((value) => {
      const kind = page === 'catalog' ? pageState.catalogTab : pageState.favoritesTab;
      makeFilterState(page, kind).search = value;
      updateGrid(page);
    }, 120);

    root.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-page-tab]');
      if (tab) {
        if (page === 'catalog') pageState.catalogTab = tab.dataset.pageTab;
        else pageState.favoritesTab = tab.dataset.pageTab;
        ctx.rerender();
        return;
      }

      const trigger = event.target.closest('[data-select-trigger]');
      if (trigger && trigger.closest('[data-select-root]')) {
        const selectRoot = trigger.closest('[data-select-root]');
        const isOpen = selectRoot.classList.contains('is-open');
        closeAllFloating();
        selectRoot.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
        return;
      }

      const option = event.target.closest('[data-select-option]');
      if (option && option.closest('[data-select-root]')) {
        const key = option.closest('[data-select-root]').dataset.scope;
        const kind = page === 'catalog' ? pageState.catalogTab : pageState.favoritesTab;
        makeFilterState(page, kind)[key] = option.dataset.value;
        updateGrid(page);
        const triggerButton = option.closest('[data-select-root]').querySelector('[data-select-trigger]');
        triggerButton.querySelector('.filter-select__label').textContent = getFilterLabel(key, option.dataset.value);
        option.closest('[data-select-root]').classList.remove('is-open');
        triggerButton.setAttribute('aria-expanded', 'false');
        option.closest('[data-select-root]').querySelectorAll('[data-select-option]').forEach((item) => {
          const active = item === option;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', String(active));
        });
        return;
      }

      const favoriteButton = event.target.closest('[data-action="favorite"]');
      if (favoriteButton) {
        handleFavoriteToggle(favoriteButton.dataset.id);
        return;
      }

      const detailsButton = event.target.closest('[data-action="details"]');
      if (detailsButton) {
        location.hash = `#/title/${detailsButton.dataset.id}`;
        return;
      }

      const toggleGenres = event.target.closest('[data-action="toggle-genres"]');
      if (toggleGenres) {
        const itemId = toggleGenres.dataset.id;
        if (pageState.expandedCardGenres.has(itemId)) pageState.expandedCardGenres.delete(itemId);
        else pageState.expandedCardGenres.add(itemId);
        const item = animeService.getById(itemId);
        const card = toggleGenres.closest('.anime-card');
        if (item && card) renderGenreChips(card, item);
      }
    });

    root.addEventListener('input', (event) => {
      if (event.target.matches('[data-page-search]')) {
        handleSearchInput(event.target.value);
      }
    });
  }

  function handleFavoriteToggle(itemId) {
    const user = authService.getCurrentUser();
    if (!user) {
      authModal.open();
      return;
    }

    const safeId = window.CSS?.escape ? CSS.escape(itemId) : itemId;
    const buttons = [...document.querySelectorAll(`[data-action="favorite"][data-id="${safeId}"]`)];
    if (!buttons.length) return;

    const nextActive = !favoritesService.isFavorite(user.id, itemId);
    favoritesService.toggle(user.id, itemId);

    buttons.forEach((button) => {
      button.classList.remove('is-pressing', 'is-activating', 'is-deactivating');
      void button.offsetWidth;
      button.classList.add('is-pressing');
      button.classList.add(nextActive ? 'is-activating' : 'is-deactivating');
      button.classList.toggle('is-active', nextActive);
      button.setAttribute('aria-pressed', String(nextActive));
      button.setAttribute('aria-label', nextActive ? 'Убрать из избранного' : 'Добавить в избранное');
      delete button.dataset.tooltip;

      const labelNode = button.querySelector('.favorite-button__label');
      if (labelNode) labelNode.textContent = nextActive ? 'В избранном' : 'В избранное';

      setTimeout(() => {
        button.classList.remove('is-pressing', 'is-activating', 'is-deactivating');
      }, 260);
    });

    if (window.location.hash === '#/favorites') updateGrid('favorites');
    if (window.location.hash.startsWith('#/title/')) ctx.rerender();
  }

  return {
    makeFilterState,
    renderFilters,
    createAnimeCard,
    bindGridInteractions,
    updateGrid,
    handleFavoriteToggle,
  };
}
