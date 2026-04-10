export function createViewController({
  state,
  pageViews,
  viewLinks,
  onBeforeLeave,
  renderUserChrome,
  renderAdminPage,
  updatePageScrollButton,
  windowRef = window,
  requestAnimationFrameFn = window.requestAnimationFrame.bind(window)
}) {
  function showView(view) {
    const previousView = state.currentView;
    if (previousView) {
      state.scrollPositions[previousView] = windowRef.scrollY || windowRef.pageYOffset || 0;
      onBeforeLeave?.(previousView);
    }
    state.currentView = view;
    if (view === 'catalog' || view === 'favorites') state.lastBrowseView = view;

    pageViews.forEach(page => {
      const active = page.dataset.view === view;
      page.classList.toggle('is-active', active);
      page.hidden = !active;
    });

    viewLinks.forEach(link => {
      const active = link.dataset.viewLink === view;
      link.classList.toggle('is-current', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    renderUserChrome();
    if (view === 'admin') renderAdminPage();

    const targetScroll = view === 'title' ? 0 : (state.scrollPositions[view] || 0);
    requestAnimationFrameFn(() => {
      windowRef.scrollTo({ top: targetScroll, behavior: 'auto' });
      updatePageScrollButton();
    });
  }

  return { showView };
}
