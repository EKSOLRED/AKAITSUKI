let container;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-wrap';
    document.body.append(container);
  }
}

export function showToast(message, type = 'success') {
  ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.append(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
}
