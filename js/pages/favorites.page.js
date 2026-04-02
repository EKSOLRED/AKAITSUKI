export function renderFavoritesPage(ctx) {
  const { app, authService, authModal, pageState, renderFilters, bindGridInteractions, updateGrid } = ctx;

  if (!authService.getCurrentUser()) {
    app.innerHTML = `
      <section class="page" data-page="favorites">
        <div class="empty-state glass">
          <h3>Нужен вход</h3>
          <p>Войди в аккаунт, чтобы сохранить и смотреть избранные тайтлы.</p>
          <button class="button button--primary" id="favoritesLoginButton">Войти</button>
        </div>
      </section>
    `;
    document.getElementById('favoritesLoginButton')?.addEventListener('click', () => authModal.open());
    return;
  }
  const kind = pageState.favoritesTab;
  app.innerHTML = `
    <section class="page" data-page="favorites">
      <section class="section-card glass">
        <div class="section-header section-header--catalog">
          <div>
            <h2 class="section-title">Избранное</h2>
            <p class="section-subtitle">Сохранённые аниме и сериалы.</p>
          </div>
          <span class="badge" id="favoritesCountBadge">0 тайтлов</span>
        </div>
        ${renderFilters('favorites', kind)}
        <div class="catalog-grid" id="favoritesGrid"></div>
      </section>
    </section>
  `;
  bindGridInteractions(app.querySelector('[data-page="favorites"]'), 'favorites');
  updateGrid('favorites');
}