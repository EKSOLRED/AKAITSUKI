import { getPosterUrl } from '../services/media.service.js';
import {
  getDetailState,
  renderAltTitles,
  renderPlayerSection,
  renderDetailMeta,
} from '../components/title-detail.component.js';

export function renderTitlePage(id, ctx) {
  const {
    app,
    animeService,
    pageState,
    escapeHtml,
    createFavoriteButton,
    createSelectControl,
    closeAllFloating,
    handleFavoriteToggle,
    authService,
    favoritesService,
    showToast,
    authModal,
    getEpisodesLabel,
  } = ctx;

  const item = animeService.getById(id);

  if (!item) {
    app.innerHTML = `
      <section class="page">
        <div class="empty-state glass">
          <h3>Тайтл не найден</h3>
          <button class="button button--primary" id="backCatalogButton">Назад в каталог</button>
        </div>
      </section>
    `;

    document.getElementById('backCatalogButton')?.addEventListener('click', () => {
      location.hash = '#/catalog';
    });
    return;
  }

  const state = getDetailState(item, pageState);
  const rating = animeService.getRatingData(item.id);
  const user = authService.getCurrentUser();
  const isFavorite = favoritesService.isFavorite(user?.id, item.id);
  const myRating = user ? rating.users[user.id] : null;

  app.innerHTML = `
    <section class="page anime-page" data-page="anime-detail" data-anime-id="${item.id}">
      <section class="section-card glass anime-detail-grid anime-detail-grid--new">
        <div class="detail-poster-card glass-soft">
          <div class="detail-poster-media detail-poster-media--clean">
            <img class="detail-poster-media__img" src="${escapeHtml(getPosterUrl(item))}" alt="${escapeHtml(item.title)}" loading="eager" decoding="async" referrerpolicy="no-referrer" />
            <div class="rating-badge rating-badge--soft">
              <button class="rating-badge__star" type="button" data-detail-action="toggle-rating" data-tooltip="Поставить оценку">★</button>
              <span class="rating-badge__value" data-tooltip="Средняя оценка пользователей">${rating.average ? rating.average.toFixed(1) : '—'}</span>
              <div class="rating-popover ${state.ratingOpen ? 'is-visible' : ''}">
                <div class="help-text">Поставить оценку</div>
                <div class="rating-options">
                  ${Array.from({ length: 10 }, (_, index) => index + 1).map((value) => `
                    <button class="rating-option ${Number(myRating) === value ? 'is-active' : ''}" type="button" data-detail-action="rate" data-value="${value}">${value}</button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="detail-poster-actions detail-poster-actions--stacked">
            ${createFavoriteButton(item.id, isFavorite, true)}
          </div>
        </div>

        <div class="detail-info-panel">
          <div>
            <div class="chips"><span class="chip">${escapeHtml(item.displayStatus)}</span></div>
            <h1 class="section-title detail-title">${escapeHtml(item.title)}</h1>
            ${renderAltTitles(item, state, escapeHtml)}
            <p class="section-subtitle detail-description">${escapeHtml(item.description)}</p>
          </div>
          <div class="detail-meta-list glass-soft">
            <div class="meta-grid meta-grid--detail meta-grid--list">
              ${renderDetailMeta(item, state, escapeHtml, getEpisodesLabel)}
            </div>
          </div>
        </div>

        <div class="detail-player-row detail-player-row--full">
          ${renderPlayerSection(item, state, escapeHtml, createSelectControl)}
        </div>

      </section>
    </section>
  `;

  const root = app.querySelector('[data-page="anime-detail"]');

  const detailFavoriteButton = root.querySelector('[data-action="favorite"]');
  detailFavoriteButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleFavoriteToggle(item.id);
  });

  root.addEventListener('click', (event) => {
    const detailAction = event.target.closest('[data-detail-action]');

    if (detailAction) {
      const action = detailAction.dataset.detailAction;

      if (action === 'toggle-alt') {
        state.altExpanded = !state.altExpanded;
        return renderTitlePage(id, ctx);
      }

      if (action === 'toggle-meta') {
        if (detailAction.dataset.key === 'genres') state.genresExpanded = !state.genresExpanded;
        if (detailAction.dataset.key === 'voiceovers') state.voiceoversExpanded = !state.voiceoversExpanded;
        return renderTitlePage(id, ctx);
      }

      if (action === 'toggle-rating') {
        state.ratingOpen = !state.ratingOpen;
        return renderTitlePage(id, ctx);
      }

      if (action === 'rate') {
        if (!user) {
          authModal.open();
          return;
        }

        animeService.setRating(id, user.id, Number(detailAction.dataset.value));
        state.ratingOpen = false;
        showToast('Оценка сохранена');
        return renderTitlePage(id, ctx);
      }

      if (action === 'voice') {
        state.selectedVoiceover = detailAction.dataset.name;
        state.selectedPlayerName = null;
        return renderTitlePage(id, ctx);
      }

      if (action === 'player') {
        state.selectedPlayerName = detailAction.dataset.name;
        return renderTitlePage(id, ctx);
      }

      if (action === 'episode-item') {
        state.selectedEpisodeId = detailAction.dataset.id;
        state.selectedVoiceover = null;
        state.selectedPlayerName = null;
        return renderTitlePage(id, ctx);
      }
    }

    const tab = event.target.closest('[data-detail-tab]');
    if (tab) {
      state.activeTab = tab.dataset.detailTab;
      return renderTitlePage(id, ctx);
    }

    const selectTrigger = event.target.closest('[data-select-trigger]');
    if (selectTrigger && selectTrigger.closest('[data-detail-select-root]')) {
      const rootSelect = selectTrigger.closest('[data-detail-select-root]');
      const isOpen = rootSelect.classList.contains('is-open');
      closeAllFloating();
      rootSelect.classList.toggle('is-open', !isOpen);
      selectTrigger.setAttribute('aria-expanded', String(!isOpen));
      return;
    }

    const option = event.target.closest('[data-select-option]');
    if (option && option.closest('[data-detail-select-root]')) {
      state.selectedEpisodeId = option.dataset.value;
      state.selectedVoiceover = null;
      state.selectedPlayerName = null;
      return renderTitlePage(id, ctx);
    }

    const favoriteButton = event.target.closest('[data-action="favorite"]');
    if (favoriteButton) return handleFavoriteToggle(item.id);

    if (event.target.closest('#backToCatalog')) {
      location.hash = '#/catalog';
    }
  });
}
