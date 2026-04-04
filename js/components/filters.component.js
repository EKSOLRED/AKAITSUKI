function renderPageTabs(active) {
  return `
    <div class="segment-switcher">
      <button class="segment-switcher__item ${active === 'anime' ? 'is-active' : ''}" type="button" data-page-tab="anime">Аниме</button>
      <button class="segment-switcher__item ${active === 'series' ? 'is-active' : ''}" type="button" data-page-tab="series">Сериалы</button>
      <span class="segment-switcher__thumb ${active === 'series' ? 'is-series' : ''}"></span>
    </div>
  `;
}

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
    }[value] || 'Сортировка';
  }
  return value;
}

export function renderFilters(page, kind, ctx) {
  const { makeFilterState, animeService, escapeHtml, createSelectControl } = ctx;
  const state = makeFilterState(page, kind);
  const meta = animeService.getMeta(kind);

  return `
    <div class="filters-wrap glass-soft">
      <div class="section-topline">
        ${renderPageTabs(kind)}
      </div>
      <div class="filters">
        <input class="input" data-page-search placeholder="Поиск по названию, описанию или жанру" value="${escapeHtml(state.search)}" />
        ${createSelectControl({ id: `${page}-${kind}-genre`, label: getFilterLabel('genre', state.genre), value: state.genre, scope: 'genre', options: [{ value: 'all', label: 'Все жанры' }, ...meta.genres.map((genre) => ({ value: genre, label: genre }))] })}
        ${createSelectControl({ id: `${page}-${kind}-status`, label: getFilterLabel('status', state.status), value: state.status, scope: 'status', options: [{ value: 'all', label: 'Все статусы' }, ...meta.statuses.map((status) => ({ value: status, label: status }))] })}
        ${createSelectControl({ id: `${page}-${kind}-year`, label: getFilterLabel('year', state.year), value: state.year, scope: 'year', options: [{ value: 'all', label: 'Все годы' }, ...meta.years.map((year) => ({ value: String(year), label: String(year) }))] })}
        ${createSelectControl({ id: `${page}-${kind}-sort`, label: getFilterLabel('sort', state.sort), value: state.sort, scope: 'sort', options: [
          { value: 'newest', label: 'Сначала новые' },
          { value: 'title', label: 'По названию' },
          { value: 'episodes', label: 'По сериям' },
          { value: 'rating', label: 'По рейтингу' },
        ] })}
      </div>
    </div>
  `;
}
