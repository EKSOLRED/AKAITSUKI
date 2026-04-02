export function renderCatalogPage(ctx) {
  const { app, pageState, renderFilters, bindGridInteractions, updateGrid } = ctx;

  const kind = pageState.catalogTab;
  app.innerHTML = `
    <section class="page" data-page="catalog">
      <section class="section-card glass">
        <div class="section-header section-header--catalog">
          <div>
            <h2 class="section-title">${kind === 'anime' ? 'Аниме' : 'Сериалы'}</h2>
            <p class="section-subtitle">Поиск, фильтрация и просмотр тайтлов.</p>
          </div>
        </div>
        ${renderFilters('catalog', kind)}
        <div class="catalog-grid" id="catalogGrid"></div>
      </section>
    </section>
  `;
  bindGridInteractions(app.querySelector('[data-page="catalog"]'), 'catalog');
  updateGrid('catalog');
}