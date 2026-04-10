export function createDialogController({ body, getDialogs, getFocusableElements, requestAnimationFrameFn = window.requestAnimationFrame.bind(window) }) {
  const state = { activeDialog: null, lastFocusedElement: null };

  function syncBodyLock() {
    const dialogs = getDialogs().filter(Boolean);
    const shouldLock = dialogs.some(dialog => dialog.classList.contains('is-open'));
    body.classList.toggle('body-locked', shouldLock);
    body.classList.toggle('has-open-dialog', shouldLock);
  }

  function openDialog(dialogElement, initialFocusSelector) {
    state.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.activeDialog = dialogElement;
    dialogElement.classList.add('is-open');
    dialogElement.setAttribute('aria-hidden', 'false');
    syncBodyLock();
    const focusTarget = dialogElement.querySelector(initialFocusSelector) || getFocusableElements(dialogElement)[0];
    requestAnimationFrameFn(() => focusTarget?.focus());
  }

  function closeDialog(dialogElement) {
    if (!dialogElement) return;
    const wasActive = state.activeDialog === dialogElement;
    dialogElement.classList.remove('is-open');
    dialogElement.setAttribute('aria-hidden', 'true');
    if (wasActive) {
      const restoreTarget = state.lastFocusedElement;
      state.activeDialog = null;
      state.lastFocusedElement = null;
      requestAnimationFrameFn(() => restoreTarget?.focus?.());
    }
    syncBodyLock();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !state.activeDialog) return;
    const focusable = getFocusableElements(state.activeDialog);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    openDialog,
    closeDialog,
    trapFocus,
    syncBodyLock,
    getActiveDialog: () => state.activeDialog
  };
}
