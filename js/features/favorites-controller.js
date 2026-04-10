export function createFavoritesController({
  documentRef,
  detailsModal,
  getFavorites,
  setFavorites,
  getUserId,
  isAuthed,
  isGuestFavoritesEnabled,
  saveFavorites,
  getCurrentTitleId,
  renderTitlePage,
  getCurrentModalId,
  renderModalContent,
  renderGrid,
  showToast
}) {
  function isFavorite(id) {
    return getFavorites().includes(id);
  }

  function updateRenderedFavoriteControls(id, active) {
    documentRef.querySelectorAll(`[data-favorite-id="${id}"]`).forEach(button => {
      const isIconButton = button.classList.contains('favorite-btn');
      const icon = button.querySelector('span');
      button.classList.toggle('is-favorite', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Убрать из избранного' : 'Добавить в избранное');
      if (isIconButton && icon) icon.textContent = active ? '♥' : '♡';
      else button.textContent = active ? 'В избранном' : 'В избранное';
    });

    documentRef.querySelectorAll(`[data-card-id="${id}"]`).forEach(card => {
      card.classList.remove('just-favorited', 'just-unfavorited');
      void card.offsetWidth;

      if (active) {
        card.classList.add('is-favorite-card', 'just-favorited');
        window.setTimeout(() => card.classList.remove('just-favorited'), 760);
        return;
      }

      card.classList.add('just-unfavorited');
      window.setTimeout(() => card.classList.remove('is-favorite-card', 'just-unfavorited'), 700);
    });
  }

  async function persistFavorites() {
    await saveFavorites(getUserId(), getFavorites());
  }

  function refreshFavoriteDrivenUi() {
    renderGrid('favorites');
    if (getCurrentTitleId()) renderTitlePage(getCurrentTitleId());
    if (getCurrentModalId() && detailsModal.classList.contains('is-open')) renderModalContent(getCurrentModalId());
  }

  function toggleFavorite(id) {
    if (!isAuthed() && !isGuestFavoritesEnabled()) {
      showToast('Войди в аккаунт, чтобы добавлять тайтлы в избранное.', 'error');
      return;
    }

    const active = !isFavorite(id);
    const nextFavorites = active
      ? [...new Set([...getFavorites(), id])]
      : getFavorites().filter(value => value !== id);
    setFavorites(nextFavorites);
    void persistFavorites();
    updateRenderedFavoriteControls(id, active);
    refreshFavoriteDrivenUi();
    showToast(active ? 'Тайтл добавлен в избранное.' : 'Тайтл убран из избранного.', active ? 'success' : 'info');
  }

  return {
    isFavorite,
    persistFavorites,
    toggleFavorite,
    refreshFavoriteDrivenUi,
    updateRenderedFavoriteControls
  };
}
