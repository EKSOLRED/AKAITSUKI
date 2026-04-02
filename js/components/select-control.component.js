import { escapeHtml } from '../utils/text.utils.js';

export function createSelectControl({ id, label, value, options, detail = false, scope = '' }) {
  const rootAttr = detail ? 'data-detail-select-root' : 'data-select-root';

  return `
    <div class="filter-select ${detail ? 'filter-select--detail' : ''}" ${rootAttr} data-scope="${escapeHtml(scope)}">
      <button class="filter-select__trigger" type="button" id="${escapeHtml(id)}" data-select-trigger data-value="${escapeHtml(value)}" aria-haspopup="listbox" aria-expanded="false">
        <span class="filter-select__label">${escapeHtml(label)}</span>
        <span class="filter-select__chevron" aria-hidden="true"></span>
      </button>
      <div class="filter-select__menu glass custom-scroll" data-select-menu role="listbox" tabindex="-1">
        ${options.map((option) => `
          <button class="filter-select__option ${String(option.value) === String(value) ? 'is-active' : ''}" type="button" role="option" data-select-option data-value="${escapeHtml(option.value)}" aria-selected="${String(option.value) === String(value)}">
            ${escapeHtml(option.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
