const defaultFilterSet = () => ({
  search: '',
  genre: 'all',
  status: 'all',
  year: 'all',
  sort: 'newest',
});

export function createInitialPageState() {
  return {
    catalogTab: 'anime',
    favoritesTab: 'anime',
    filters: {
      catalog: { anime: defaultFilterSet(), series: defaultFilterSet() },
      favorites: { anime: defaultFilterSet(), series: defaultFilterSet() },
    },
    expandedCardGenres: new Set(),
    detail: {},
    admin: {
      section: 'anime',
      animeSearch: '',
      seriesSearch: '',
      editingId: null,
      draft: null,
      activeVoiceTabs: {},
      confirmRemoveVoice: null,
      aboutDraft: null,
      roleSearch: '',
    },
  };
}

export function ensureFilterState(pageState, page, kind) {
  if (!pageState.filters[page]) pageState.filters[page] = {};
  if (!pageState.filters[page][kind]) pageState.filters[page][kind] = defaultFilterSet();
  return pageState.filters[page][kind];
}

export function getCurrentKind(pageState, page) {
  return page === 'catalog' ? pageState.catalogTab : pageState.favoritesTab;
}
