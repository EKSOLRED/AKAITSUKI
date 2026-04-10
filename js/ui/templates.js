import { escapeHtml } from '../utils/helpers.js';
import { isVideoLike, getVideoSourceHost } from '../utils/media.js';
import { sanitizeCssGradient, sanitizeUrl, toInlineCssUrl } from '../utils/url.js';

const typeLabel = {
  anime: 'Аниме',
  series: 'Сериал',
  video: 'Видео',
  trailer: 'Трейлер'
};

const countryLabel = {
  anime: 'Япония',
  series: 'Америка'
};

const contentTypeTabs = [
  { value: 'anime', label: 'Аниме' },
  { value: 'series', label: 'Сериалы' },
  { value: 'video', label: 'Видео' },
  { value: 'trailer', label: 'Трейлеры' }
];

const adminRoleLabel = {
  owner: 'Владелец',
  admin: 'Администратор',
  user: 'Пользователь'
};

const posterThemeClassSet = new Set([
  'electric-violet',
  'midnight-pink',
  'amber-sunset',
  'tangerine-bloom',
  'jade-mist',
  'cyber-blue',
  'steel-aqua',
  'ember-copper',
  'royal-gold',
  'moss-light',
  'ocean-gold',
  'crimson-play',
  'acid-ink',
  'lagoon-spark'
]);

function getPosterClass(variant) {
  if (variant === 'card') return 'card-poster';
  if (variant === 'modal') return 'modal-poster';
  if (variant === 'title') return 'title-poster';
  return 'feature-poster';
}

function getPosterCopyClass(variant) {
  if (variant === 'title') return 'poster-copy poster-copy-title';
  if (variant === 'feature') return 'poster-copy poster-copy-feature';
  if (variant === 'card') return 'poster-copy poster-copy-card';
  return 'poster-copy';
}

function getPosterThemeClass(posterTheme) {
  return posterThemeClassSet.has(posterTheme) ? `poster-theme-${posterTheme}` : 'poster-theme-electric-violet';
}


function getPosterMediaStyle(project) {
  const image = sanitizeUrl(project?.displayPosterUrl || project?.posterUrl || '', { allowData: true });
  const gradient = sanitizeCssGradient(project?.posterGradient || '');
  const parts = [];
  if (image) parts.push(`--poster-image:${toInlineCssUrl(image)}`);
  if (gradient) parts.push(`--poster-gradient:${gradient}`);
  return parts.length ? ` style="${escapeHtml(parts.join(';'))}"` : '';
}

function renderAdminFieldShell({ label, name, full = false, helperMarkup = '', inputMarkup = '' }) {
  return `
    <label class="admin-form-field ${full ? 'admin-form-full' : ''}" data-admin-field-name="${escapeHtml(name)}">
      <span>${escapeHtml(label)}</span>
      ${inputMarkup}
      ${helperMarkup}
      <small class="admin-field-error" data-admin-field-error hidden></small>
    </label>
  `;
}

function getAdminInputField({ label, name, value = '', placeholder = '', type = 'text', required = false, full = false, attrs = '' }) {
  return renderAdminFieldShell({
    label,
    name,
    full,
    inputMarkup: `<input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(String(value || ''))}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} ${attrs}>`
  });
}

function getAdminMediaInputField({ label, name, value = '', placeholder = '', required = false, full = false, helperText = '', kind = 'poster' }) {
  const rawValue = String(value || '').trim();
  const safeImage = sanitizeUrl(rawValue, { allowData: true });
  const defaultHelperText = kind === 'poster'
    ? 'Можно вставить ссылку или путь из папки сайта, например assets/images/posters/naruto.webp'
    : 'Можно вставить ссылку или путь из папки сайта, например assets/images/previews/naruto-preview.webp';
  const previewAlt = kind === 'poster' ? 'Предпросмотр постера' : 'Предпросмотр изображения';
  const emptyTitle = kind === 'poster' ? 'Постер пока не указан' : 'Изображение пока не указано';
  const emptyText = kind === 'poster'
    ? 'Вставь ссылку или относительный путь из папки сайта, чтобы увидеть постер здесь.'
    : 'Вставь ссылку или относительный путь из папки сайта, чтобы увидеть превью здесь.';

  return renderAdminFieldShell({
    label,
    name,
    full,
    helperMarkup: `<small class="admin-field-hint">${escapeHtml(helperText || defaultHelperText)}</small>`,
    inputMarkup: `
      <input name="${escapeHtml(name)}" type="text" value="${escapeHtml(rawValue)}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} data-admin-media-input="${escapeHtml(name)}" data-admin-media-kind="${escapeHtml(kind)}">
      <div class="admin-media-preview" data-admin-media-preview="${escapeHtml(name)}" data-admin-media-kind="${escapeHtml(kind)}">
        <div class="admin-media-preview-frame">
          <img class="admin-media-preview-image" data-admin-media-preview-image alt="${escapeHtml(previewAlt)}" ${safeImage ? `src="${escapeHtml(safeImage)}"` : ''} ${safeImage ? '' : 'hidden'} />
          <div class="admin-media-preview-empty" data-admin-media-preview-empty ${safeImage ? 'hidden' : ''}>
            <strong data-admin-media-preview-title>${escapeHtml(emptyTitle)}</strong>
            <span data-admin-media-preview-message>${escapeHtml(emptyText)}</span>
          </div>
        </div>
        <code class="admin-media-preview-path" data-admin-media-preview-path>${escapeHtml(rawValue || 'Путь пока не указан')}</code>
      </div>
    `
  });
}

function getAdminTextareaField({ label, name, value = '', placeholder = '', rows = 4, required = false, full = false, attrs = '' }) {
  return renderAdminFieldShell({
    label,
    name,
    full,
    inputMarkup: `<textarea name="${escapeHtml(name)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}" ${required ? 'required' : ''} ${attrs}>${escapeHtml(String(value || ''))}</textarea>`
  });
}

function getAdminTitleFormFields(project = {}, currentType = project.type || 'anime') {
  const adminMode = project.adminMode || 'add';
  if (currentType === 'video' || currentType === 'trailer') {
    const linkedTitleText = project.linkedTitleTitle
      ? `Привязан тайтл: ${escapeHtml(project.linkedTitleTitle)}`
      : 'Тайтл пока не привязан';

    return `
      <div class="admin-form-grid admin-form-grid-media">
        ${getAdminInputField({ label: 'Название', name: 'title', value: project.title || '', placeholder: 'Название', required: true })}
        ${getAdminInputField({ label: 'Ссылка на видео', name: 'videoUrl', value: project.videoUrl || '', placeholder: 'Вставь ссылку из iframe', required: true })}
        ${getAdminMediaInputField({ label: 'Превью', name: 'posterUrl', value: project.posterUrl || '', placeholder: 'Вставь ссылку или путь к превью', helperText: 'Можно вставить ссылку или путь из папки сайта, например assets/images/previews/video-cover.webp', kind: 'preview' })}
        ${getAdminInputField({ label: 'Категории', name: 'categories', value: Array.isArray(project.categories) ? project.categories.join(', ') : String(project.categories || ''), placeholder: 'Игры, Музыка, Юмор' })}
        ${currentType === 'trailer' ? `
          <input type="hidden" name="linkedTitleId" value="${escapeHtml(String(project.linkedTitleId || ''))}" />
          <div class="admin-trailer-link-row admin-form-full">
            <button class="btn btn-secondary" type="button" data-admin-open-trailer-link="${adminMode}">Привязать</button>
            <button class="btn btn-secondary" type="button" data-admin-unlink-trailer="${adminMode}">Отвязать</button>
            <div class="admin-trailer-link-status">${linkedTitleText}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <div class="admin-form-grid ${currentType === 'series' ? 'is-series-type' : ''}">
      ${getAdminInputField({ label: 'Название', name: 'title', value: project.title || '', placeholder: 'Название', required: true })}
      ${getAdminInputField({ label: 'Год', name: 'year', type: 'number', value: project.year || '', placeholder: '2026', required: true, attrs: 'min="1900" max="2100"' })}
      ${currentType === 'anime' ? renderAdminFieldShell({
        label: 'Сезон',
        name: 'season',
        helperMarkup: '<small class="admin-field-hint">Если у одного тайтла несколько сезонов на одной странице, добавь их во вкладке «Серии».</small>',
        inputMarkup: `<input name="season" type="text" value="${escapeHtml(String(project.season || ''))}" placeholder="Осень" required>`
      }) : ''}
      ${getAdminInputField({ label: 'Статус', name: 'status', value: project.status || '', placeholder: 'Выходит, Завершен, Онгоинг', required: true })}
      ${getAdminInputField({ label: 'Хронометраж', name: 'duration', value: project.duration || '', placeholder: '12 эпизодов, 24 эпизода', required: true })}
      ${getAdminInputField({ label: 'Озвучка', name: 'voiceover', value: project.voiceover !== undefined ? project.voiceover : (project.team || ''), placeholder: 'AKAITSUKI', required: true })}
      ${getAdminMediaInputField({ label: 'Постер', name: 'posterUrl', value: project.posterUrl || '', placeholder: 'Вставь ссылку или путь к постеру', helperText: 'Можно вставить ссылку или путь из папки сайта, например assets/images/posters/naruto.webp', kind: 'poster' })}
      ${getAdminInputField({ label: 'Жанры', name: 'genres', value: Array.isArray(project.genres) ? project.genres.join(', ') : String(project.genres || ''), placeholder: 'Драма, Комедия, Сёнен', required: true, full: true })}
      ${getAdminInputField({ label: 'Альтернативные названия', name: 'altTitles', value: Array.isArray(project.altTitles) ? project.altTitles.join(' * ') : String(project.altTitles || ''), placeholder: 'Название * Title * タイトル', full: true })}
      ${getAdminTextareaField({ label: 'Короткое описание', name: 'description', value: project.description || '', placeholder: 'Короткое описание тайтла', rows: 4, required: true, full: true })}
      ${getAdminTextareaField({ label: 'Полное описание', name: 'longText', value: project.longText || '', placeholder: 'Полное описание тайтла', rows: 6, required: true, full: true })}
    </div>
  `;
}

function getAdminTypeTabsMarkup(typeTab, dataAttribute = 'data-admin-type-tab', ariaLabel = 'Типы тайтлов для админки') {
  return `
    <div class="admin-tabs" role="tablist" aria-label="${escapeHtml(ariaLabel)}">
      ${contentTypeTabs.map(tab => `
        <button class="admin-tab ${typeTab === tab.value ? 'is-active' : ''}" type="button" ${dataAttribute}="${tab.value}" aria-selected="${typeTab === tab.value}">${tab.label}</button>
      `).join('')}
    </div>
  `;
}

function getAdminInnerTabsMarkup(mode, activeTab, currentType = 'anime') {
  const isVideoLikeType = currentType === 'video' || currentType === 'trailer';
  return `
    <div class="admin-inner-tabs" role="tablist" aria-label="${mode === 'add' ? 'Добавление тайтла или серий' : 'Редактирование тайтла или серий'}">
      <button class="admin-inner-tab ${activeTab === 'title' ? 'is-active' : ''}" type="button" data-admin-subtab="${mode}:title" aria-selected="${activeTab === 'title'}">${mode === 'add' ? 'Добавление тайтла' : 'Редактирование тайтла'}</button>
      ${isVideoLikeType ? '' : `<button class="admin-inner-tab ${activeTab === 'episodes' ? 'is-active' : ''}" type="button" data-admin-subtab="${mode}:episodes" aria-selected="${activeTab === 'episodes'}">${mode === 'add' ? 'Добавление серии' : 'Редактирование серии'}</button>`}
    </div>
  `;
}

function getAdminDraftStatusMarkup(isDirty, text = 'Есть несохранённые изменения') {
  return `<p class="admin-dirty-hint ${isDirty ? 'is-visible' : ''}"${isDirty ? '' : ' hidden'} data-admin-dirty-hint>${escapeHtml(text)}</p>`;
}

function getAdminRoleControlMarkup(entry, canManageRoles, { pendingRoleUserId = null, rolesRefreshing = false } = {}) {
  if (!canManageRoles) {
    return `<strong>${escapeHtml(adminRoleLabel[entry.role] || 'Пользователь')}</strong>`;
  }

  const roleOptions = [
    { value: 'owner', label: 'Владелец' },
    { value: 'admin', label: 'Администратор' },
    { value: 'user', label: 'Пользователь' }
  ];
  const isBusy = rolesRefreshing || pendingRoleUserId === entry.userId;

  return `
    <div class="custom-select admin-role-select ${isBusy ? 'is-busy' : ''}" data-role-select data-role-user-id="${escapeHtml(entry.userId)}">
      <button class="select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"${getBusyAttributes(isBusy)}>
        <span class="select-value">${escapeHtml(adminRoleLabel[entry.role] || 'Пользователь')}</span>
        <span class="select-arrow" aria-hidden="true"></span>
      </button>
      <div class="select-menu" role="listbox">
        <div class="select-menu-inner">
          ${roleOptions.map(option => `
            <button class="select-option ${entry.role === option.value ? 'is-selected' : ''}" type="button" role="option" aria-selected="${entry.role === option.value}" data-role-option-value="${option.value}"${getBusyAttributes(isBusy)}>
              <span>${option.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function getAltTitlesMarkup(project) {
  const titles = Array.isArray(project.altTitles) ? project.altTitles.filter(Boolean) : [];
  if (!titles.length) return '';

  const visible = titles.slice(0, 3);
  const hidden = titles.slice(3);

  return `
    <div class="title-alt-names">
      <strong>Альтернативные названия</strong>
      <div class="alt-names-inline">
        ${visible.map(value => `<span>${escapeHtml(value)}</span>`).join('<span class="alt-separator">*</span>')}
        ${hidden.length ? `<button class="alt-names-more" type="button" data-expand-alt-names aria-expanded="false">. . .</button>` : ''}
      </div>
      ${hidden.length ? `
        <div class="alt-names-hidden" hidden>
          ${hidden.map(value => `<span>${escapeHtml(value)}</span>`).join('<span class="alt-separator">*</span>')}
        </div>
      ` : ''}
    </div>
  `;
}

function getPlayerSelectMarkup({ key, label, valueLabel, options, selectedValue, style = '', wide = false }) {
  return `
    <div class="custom-select title-player-select ${wide ? 'title-player-select-wide' : ''}" data-player-select-key="${key}" ${style ? `style="${style}"` : ''}>
      <button class="select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="player-select-copy">
          <small>${escapeHtml(label)}</small>
          <span class="select-value">${escapeHtml(valueLabel)}</span>
        </span>
        <span class="select-arrow" aria-hidden="true"></span>
      </button>
      <div class="select-menu" role="listbox">
        <div class="select-menu-inner ${options.length > 6 ? 'is-scrollable' : ''}">
          ${options.map(option => `
            <button class="select-option ${String(option.value) === String(selectedValue) ? 'is-selected' : ''}" type="button" role="option" aria-selected="${String(option.value) === String(selectedValue)}" data-option-value="${escapeHtml(String(option.value))}">
              <span>${escapeHtml(option.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function getPlayerBlockMarkup(playerVm) {
  const hasPlayer = Boolean(playerVm.currentPlayerMarkup);

  return `
    <section class="title-player-shell">
      <div class="title-player-layout title-player-layout-single">
        <div class="title-player-stage glass">
          <div class="title-player-filters title-player-filters-embedded">
            ${playerVm.seasonOptions?.length ? getPlayerSelectMarkup({
              key: 'season',
              label: 'Сезон',
              valueLabel: playerVm.selectedSeasonLabel,
              options: playerVm.seasonOptions,
              selectedValue: playerVm.selectedSeasonId
            }) : ''}

            ${getPlayerSelectMarkup({
              key: 'episode',
              label: 'Серия',
              valueLabel: playerVm.selectedEpisodeLabel,
              options: playerVm.episodeOptions,
              selectedValue: playerVm.selectedEpisodeId
            })}

            ${getPlayerSelectMarkup({
              key: 'voiceover',
              label: 'Озвучка',
              valueLabel: playerVm.selectedVoiceoverLabel,
              options: playerVm.voiceoverOptions,
              selectedValue: playerVm.selectedVoiceoverId,
              style: playerVm.voiceoverWidthCh ? `--title-player-select-width:${playerVm.voiceoverWidthCh}ch;` : '',
              wide: true
            })}

            ${playerVm.trailerId ? `<button class="btn btn-secondary title-player-trailer-btn is-prominent" type="button" data-open-trailer-id="${escapeHtml(String(playerVm.trailerId))}">Трейлер</button>` : ''}
          </div>

          ${hasPlayer ? `
            <div class="player-frame-shell">${playerVm.currentPlayerMarkup}</div>
          ` : `
            <div class="player-empty-state">
              <strong>Плеер пока не добавлен</strong>
              <p>Для выбранной серии и озвучки пока нет доступного видео.</p>
            </div>
          `}
        </div>

        <aside class="title-player-list glass">
          <div class="title-player-list-head title-player-list-head-centered">
            <h3>Плеер</h3>
          </div>
          <div class="title-player-items">
            ${playerVm.playerOptions.length
              ? playerVm.playerOptions.map(player => `
                <button class="player-source-btn ${player.isActive ? 'is-active' : ''}" type="button" data-player-item-id="${escapeHtml(player.id)}" aria-pressed="${player.isActive}">
                  <strong>${escapeHtml(player.name)}</strong>
                </button>
              `).join('')
              : '<p class="player-empty-list">Нет доступных плееров для этого набора.</p>'}
          </div>
        </aside>
      </div>
    </section>
  `;
}



function getAdminSeasonStripMarkup(mode, seasons, selection) {
  return `
    <div class="admin-series-group">
      <div class="admin-series-head">
        <h4>Сезоны</h4>
      </div>
      <div class="admin-series-strip">
        ${seasons.length ? seasons.map((season, index) => `
          <div class="admin-series-chip-shell ${selection.seasonId === season.id ? 'is-selected' : ''}">
            <button class="admin-series-chip" type="button" data-admin-season-id="${season.id}" data-admin-series-mode="${mode}">
              Сезон ${season.number || index + 1}
            </button>
            ${seasons.length > 1 ? `<button class="admin-series-chip-remove" type="button" data-admin-season-remove-id="${season.id}" data-admin-series-mode="${mode}" aria-label="Удалить сезон ${season.number || index + 1}">×</button>` : ''}
          </div>
        `).join('') : ''}
        <button class="admin-series-add-btn admin-series-add-btn-inline" type="button" data-admin-season-add="${mode}" aria-label="Добавить сезон">+</button>
      </div>
    </div>
  `;
}

function getAdminSeriesEpisodeStripMarkup(mode, season, selection) {
  const episodes = season?.episodes || [];

  return `
    <div class="admin-series-group">
      <div class="admin-series-head">
        <h4>Серии</h4>
      </div>
      <div class="admin-series-strip">
        ${episodes.length ? episodes.map(episode => `
          <div class="admin-series-chip-shell ${episode.isDeleted ? 'is-muted' : ''} ${selection.episodeId === episode.id ? 'is-selected' : ''}">
            <button class="admin-series-chip" type="button" data-admin-episode-id="${episode.id}" data-admin-series-mode="${mode}">
              Серия ${episode.number}
            </button>
            <button class="admin-series-chip-remove" type="button" data-admin-episode-remove-id="${episode.id}" data-admin-series-mode="${mode}" aria-label="Удалить серию ${episode.number}">×</button>
          </div>
        `).join('') : ''}
        <button class="admin-series-add-btn admin-series-add-btn-inline" type="button" data-admin-episode-add="${mode}" aria-label="Добавить серию">+</button>
      </div>
    </div>
  `;
}

function getAdminVoiceoverStripMarkup(mode, episode, selection) {
  const voiceovers = episode?.voiceovers || [];

  return `
    <div class="admin-series-group">
      <div class="admin-series-head">
        <h4>Озвучки</h4>
      </div>
      <div class="admin-series-strip">
        ${voiceovers.length ? voiceovers.map((voiceover, index) => `
          <div class="admin-series-chip-shell ${selection.voiceoverId === voiceover.id ? 'is-selected' : ''}">
            <button class="admin-series-chip" type="button" data-admin-voiceover-id="${voiceover.id}" data-admin-series-mode="${mode}">
              ${escapeHtml(voiceover.name || `Озвучка ${index + 1}`)}
            </button>
            <button class="admin-series-chip-remove" type="button" data-admin-voiceover-remove-id="${voiceover.id}" data-admin-series-mode="${mode}" aria-label="Удалить озвучку ${escapeHtml(voiceover.name || `Озвучка ${index + 1}`)}">×</button>
          </div>
        `).join('') : ''}
        <button class="admin-series-add-btn admin-series-add-btn-inline" type="button" data-admin-voiceover-add="${mode}" aria-label="Добавить озвучку">+</button>
      </div>
    </div>
  `;
}

function getAdminPlayersMarkup(mode, voiceover) {
  const players = voiceover?.players || [];

  return `
    <div class="admin-players-stack">
      ${players.map((player, index) => `
        <article class="admin-player-card">
          <div class="admin-player-card-head">
            <strong>Плеер ${index + 1}</strong>
            <button class="admin-series-chip-remove" type="button" data-admin-player-remove-id="${player.id}" data-admin-series-mode="${mode}" aria-label="Удалить плеер ${index + 1}">×</button>
          </div>
          <div class="admin-player-fields">
            <label class="admin-series-inline-field">
              <span>Название плеера</span>
              <input type="text" value="${escapeHtml(player.name || '')}" data-admin-player-name data-player-id="${player.id}" placeholder="Название плеера" aria-label="Название плеера" />
            </label>
            <label class="admin-series-inline-field">
              <span>Ссылка на видео</span>
              <input type="text" value="${escapeHtml(player.src || player.iframe || '')}" data-admin-player-src data-player-id="${player.id}" placeholder="Вставь ссылку из iframe" aria-label="Ссылка из iframe" />
            </label>
          </div>
        </article>
      `).join('')}
      <button class="btn btn-secondary admin-series-plus-row" type="button" data-admin-player-add="${mode}">+ Добавить плеер</button>
    </div>
  `;
}

function getBusyButtonLabel(defaultLabel, busyLabel, isBusy) {
  return isBusy ? busyLabel : defaultLabel;
}

function getBusyAttributes(isBusy) {
  return isBusy ? ' disabled aria-busy="true"' : '';
}

function getAdminSeriesEditorMarkup(mode, draft, selection, currentType, isDirty = false, isSaving = false) {
  const seasons = draft?.seasons || [];
  const season = seasons.find(item => item.id === selection.seasonId) || seasons[0] || null;
  const episode = season?.episodes.find(item => item.id === selection.episodeId) || null;
  const voiceover = episode?.voiceovers.find(item => item.id === selection.voiceoverId) || null;
  const restoreVisible = Boolean(episode?.isDeleted);

  return `
    <div class="admin-series-editor" data-admin-series-editor="${mode}">
      ${getAdminSeasonStripMarkup(mode, seasons, selection)}
      ${getAdminSeriesEpisodeStripMarkup(mode, season, selection)}

      ${episode ? `
        <div class="admin-series-editor-panel glass ${episode.isDeleted ? 'is-muted' : ''}">
          <div class="admin-form-grid admin-series-form-grid">
            <label class="admin-form-full admin-series-inline-field">
              <span>Название серии</span>
              <input type="text" value="${escapeHtml(episode.title || '')}" data-admin-episode-title placeholder="Название серии" aria-label="Название серии" />
            </label>
          </div>

          ${getAdminVoiceoverStripMarkup(mode, episode, selection)}

          ${voiceover ? `
            <div class="admin-series-editor-subpanel">
              <label class="admin-series-inline-field">
                <span>Название озвучки</span>
                <input type="text" value="${escapeHtml(voiceover.name || '')}" data-admin-voiceover-name placeholder="Название озвучки" aria-label="Название озвучки" />
              </label>
              ${getAdminPlayersMarkup(mode, voiceover)}
            </div>
          ` : ''}

          ${getAdminDraftStatusMarkup(isDirty, 'Есть несохранённые изменения в сериях.')}
          <div class="admin-form-actions">
            ${restoreVisible ? `<button class="btn btn-primary" type="button" data-admin-episode-restore="${mode}">Обновить</button>` : ''}
            <button class="btn btn-primary" type="button" data-admin-series-save="${mode}"${getBusyAttributes(mode === 'edit' && isSaving)}>${getBusyButtonLabel(mode === 'add' ? 'Сохранить серии в черновик' : 'Сохранить серии', 'Сохраняю серии...', mode === 'edit' && isSaving)}</button>
            <button class="btn btn-secondary" type="button" data-admin-series-reset="${mode}"${getBusyAttributes(mode === 'edit' && isSaving)}>${mode === 'add' ? 'Очистить серии' : 'Очистить поля'}</button>
            <button class="btn btn-secondary" type="button" data-admin-series-cancel="${mode}"${getBusyAttributes(mode === 'edit' && isSaving)}>Отменить изменения</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function getControlsMarkup(scope, meta) {
  const scopeLabel = scope === 'favorites' ? 'избранному' : 'каталогу';

  return `
    <div class="controls-top">
      <div class="controls-heading-copy">
        <span class="eyebrow">${escapeHtml(meta.eyebrow)}</span>
        <h2>${escapeHtml(meta.title)}</h2>
        <p class="catalog-status-hint" id="${scope}StatusHint" hidden></p>
      </div>
      <div class="result-pill glass" id="${scope}ResultCount">Показано: 0</div>
    </div>

    <div class="toolbar-shell">
      <div class="toolbar glass">
        <div class="toolbar-main">
          <label class="search-box" for="${scope}SearchInput">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <span class="visually-hidden">${escapeHtml(meta.searchLabel)}</span>
            <input
              id="${scope}SearchInput"
              data-search-input="${scope}"
              type="text" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false"
              aria-label="${escapeHtml(meta.searchLabel)}"
              placeholder="${escapeHtml(meta.searchPlaceholder)}"
            />
            <button class="search-clear-badge" id="${scope}SearchClearBtn" data-clear-search="${scope}" type="button" hidden aria-label="Очистить поиск по ${scopeLabel}">×</button>
          </label>

          <div class="toolbar-group toolbar-group-selects">
            <div class="custom-select" id="${scope}GenreSelect" data-scope="${scope}" data-select-key="genre">
              <button class="select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                <span class="select-value" data-filter-value="${scope}">Все жанры</span>
                <span class="select-arrow" aria-hidden="true"></span>
              </button>
              <div class="select-menu" role="listbox">
                <div class="select-menu-inner"></div>
              </div>
            </div>

            <div class="custom-select" id="${scope}SortSelect" data-scope="${scope}" data-select-key="sort">
              <button class="select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                <span class="select-value">Высокий рейтинг</span>
                <span class="select-arrow" aria-hidden="true"></span>
              </button>
              <div class="select-menu" role="listbox">
                <div class="select-menu-inner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar-tabs-badge glass">
        <div class="toolbar-tabs" id="${scope}TypeFilters" data-scope="${scope}" role="group" aria-label="Фильтр по типу контента">
          ${contentTypeTabs.map(({ value, label }) => `
            <button class="toolbar-tab" data-type="${value}" type="button" aria-pressed="false">
              ${label}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function getPosterMarkup(project, variant = 'feature') {
  const showCopy = variant !== 'modal';
  return `
    <div class="${getPosterClass(variant)} ${getPosterThemeClass(project.posterTheme)}"${getPosterMediaStyle(project)}>
      <div class="poster-layer"></div>
      <div class="poster-content">
        <div class="poster-top">
          <span class="type-badge">${typeLabel[project.type]}</span>
          ${(project.type === 'anime' || project.type === 'series') ? `<button class="badge badge-rating-trigger" type="button" data-open-rating="${project.id}" aria-label="Оценить тайтл ${escapeHtml(project.title)}"><span class="rating-star">★</span><span class="rating-value">${escapeHtml(project.displayRating || project.rating)}</span></button>` : ''}
        </div>
        ${showCopy ? `
          <div class="${getPosterCopyClass(variant)}">
            <div class="poster-logo">${escapeHtml(project.title)}</div>
            <p class="poster-subtitle">${escapeHtml(project.status)} • ${escapeHtml(project.year)}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function getFavoriteIconMarkup(id, active) {
  return `
    <button
      class="favorite-btn card-favorite-btn ${active ? 'is-favorite' : ''}"
      type="button"
      data-favorite-id="${id}"
      aria-label="${active ? 'Убрать из избранного' : 'Добавить в избранное'}"
      aria-pressed="${active}"
    >
      <span aria-hidden="true">${active ? '♥' : '♡'}</span>
    </button>
  `;
}

export function getFavoriteTextMarkup(id, active) {
  const label = active ? 'Убрать из избранного' : 'Добавить в избранное';

  return `
    <button class="btn btn-secondary favorite-btn-text ${active ? 'is-favorite' : ''}" type="button" data-favorite-id="${id}" aria-label="${label}" aria-pressed="${active}">
      ${active ? 'В избранном' : 'В избранное'}
    </button>
  `;
}

export function getTagsMarkup(genres) {
  return genres.map(genre => `<span class="tag">${escapeHtml(genre)}</span>`).join('');
}

function getExpandableTagsMarkup(tags = [], { visibleCount = 3, rootClass = 'card-tags', hiddenClass = 'hidden-card-tag', buttonAttr = 'data-expand-card-tags' } = {}) {
  const visibleTags = tags.slice(0, visibleCount);
  const hiddenTags = tags.slice(visibleCount);

  return `
    <div class="${rootClass}">
      ${visibleTags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      ${hiddenTags.map(tag => `<span class="tag ${hiddenClass}" hidden>${escapeHtml(tag)}</span>`).join('')}
      ${hiddenTags.length ? `<button class="tag tag-more-btn" type="button" ${buttonAttr} aria-expanded="false">. . .</button>` : ''}
    </div>
  `;
}

export function getTitleTagsMarkup(genres) {
  const visibleGenres = genres.slice(0, 5);
  const hiddenGenres = genres.slice(5);

  return `
    <div class="title-tags">
      ${visibleGenres.map(genre => `<span class="tag">${escapeHtml(genre)}</span>`).join('')}
      ${hiddenGenres.map(genre => `<span class="tag hidden-title-tag" hidden>${escapeHtml(genre)}</span>`).join('')}
      ${hiddenGenres.length ? `<button class="tag tag-more-btn" type="button" data-expand-tags aria-expanded="false" aria-label="Показать остальные жанры">...</button>` : ''}
    </div>
  `;
}


function getVideoFavoriteMarkup(id, active) {
  return `
    <button class="favorite-btn video-favorite-btn ${active ? 'is-favorite' : ''}" type="button" data-favorite-id="${id}" aria-label="${active ? 'Убрать из избранного' : 'Добавить в избранное'}" aria-pressed="${active}">
      <span aria-hidden="true">${active ? '♥' : '♡'}</span>
    </button>
  `;
}

function getInfoIconButtonMarkup(targetId, extraClass = '') {
  return `
    <button class="icon-btn card-info-btn ${extraClass}" type="button" data-open-id="${targetId}" aria-label="Подробнее" data-tooltip="Подробнее">
      <span aria-hidden="true">i</span>
    </button>
  `;
}

function getVideoCardMarkup(project, active) {
  const channel = escapeHtml(project.channel || getVideoSourceHost(project.videoUrl || ''));
  const image = escapeHtml(sanitizeUrl(project.displayPosterUrl || project.posterUrl || '', { allowData: true }));
  const categories = Array.isArray(project.categories) ? project.categories : [];
  return `
    <article class="card glass video-card ${active ? 'is-favorite-card' : ''}" data-card-id="${project.id}">
      <button class="video-card-media" type="button" data-video-open-id="${project.id}" aria-label="Открыть ${escapeHtml(project.title)}">
        <img src="${image}" alt="${escapeHtml(project.title)}" loading="lazy" />
        <span class="video-card-overlay">
          <span class="video-card-play"><span class="video-card-play-triangle"></span></span>
        </span>
        <span class="video-card-top-row">
          ${project.isFresh ? '<span class="tag tag-fresh video-card-fresh-tag">Новинка</span>' : ''}
        </span>
      </button>
      <div class="video-card-copy">
        <div class="video-card-head">
          <div>
            <h3 class="video-card-title">${escapeHtml(project.title)}</h3>
            <small class="video-card-channel">${channel}</small>
          </div>
          ${getVideoFavoriteMarkup(project.id, active)}
        </div>
        ${getExpandableTagsMarkup(categories, { rootClass: 'card-tags video-card-tags', hiddenClass: 'hidden-video-tag', buttonAttr: 'data-expand-video-tags' })}
      </div>
    </article>
  `;
}

export function getFeatureMarkup(project, active) {
  if (isVideoLike(project)) {
    return `
      <article class="feature-card feature-card-video">
        <div class="feature-poster ${getPosterThemeClass(project.posterTheme)}"${getPosterMediaStyle(project)}>
          <div class="poster-layer"></div>
          <div class="poster-content poster-content-video">
            <span class="type-badge">${typeLabel[project.type]}</span>
            <button class="feature-video-play" type="button" data-video-open-id="${project.id}" aria-label="Открыть ${escapeHtml(project.title)}"><span class="video-card-play-triangle"></span></button>
          </div>
        </div>
        <div class="feature-info">
          <div class="feature-title-row">
            <div class="feature-heading-copy">
              <h3>${escapeHtml(project.title)}</h3>
              <div class="meta-row">
                <span>${escapeHtml(project.channel || getVideoSourceHost(project.videoUrl || ''))}</span>
                <span>${escapeHtml(project.duration || '')}</span>
                <span>${escapeHtml(project.status || typeLabel[project.type])}</span>
              </div>
            </div>
            ${getFavoriteIconMarkup(project.id, active)}
          </div>
          <p class="card-description">${escapeHtml(project.description)}</p>
          <div class="card-tags">${getTagsMarkup(project.categories || [])}</div>
          <div class="feature-actions">
            <button class="btn btn-primary feature-watch-btn" type="button" data-video-open-id="${project.id}">Смотреть</button>
          </div>
        </div>
      </article>
    `;
  }
  return `
    <article class="feature-card">
      ${getPosterMarkup(project, 'feature')}
      <div class="feature-info">
        <div class="feature-title-row">
          <div class="feature-heading-copy">
            <h3>${escapeHtml(project.title)}</h3>
            <div class="meta-row">
              <span>${typeLabel[project.type]}</span>
              <span>${escapeHtml(project.duration)}</span>
              <span>${escapeHtml(project.status)}</span>
            </div>
          </div>
          ${getFavoriteIconMarkup(project.id, active)}
        </div>
        <p class="card-description">${escapeHtml(project.description)}</p>
        <div class="card-tags">${getTagsMarkup(project.genres)}</div>
        <div class="feature-actions feature-actions-floating">
          ${getInfoIconButtonMarkup(project.id, 'feature-info-btn')}
          <button class="btn btn-primary feature-watch-btn" type="button" data-watch-id="${project.id}">Смотреть</button>
        </div>
      </div>
    </article>
  `;
}

export function getCardMarkup(project, active) {
  if (isVideoLike(project)) return getVideoCardMarkup(project, active);
  return `
    <article class="card glass ${active ? 'is-favorite-card' : ''}" data-card-id="${project.id}">
      ${getPosterMarkup(project, 'card')}
      <div class="card-head">
        <div class="card-heading-copy">
          <h3 class="card-title">${escapeHtml(project.title)}</h3>
          <div class="meta-row">
            <span>${escapeHtml(project.year)}</span>
            <span>${escapeHtml(project.duration)}</span>
            <span>${escapeHtml(project.status)}</span>
          </div>
        </div>
        ${getFavoriteIconMarkup(project.id, active)}
      </div>
      <p class="card-description">${escapeHtml(project.description)}</p>
      <div class="card-tags">${getTagsMarkup(project.genres)}</div>
      <div class="card-footer">
        <button class="btn btn-primary card-open-btn" type="button" data-watch-id="${project.id}">Смотреть</button>
      </div>
    </article>
  `;
}

export function getRecentUpdatesMarkup(items = []) {
  return items.map(project => `
    <article class="update-card glass ${getPosterThemeClass(project.posterTheme)}"${getPosterMediaStyle(project)} data-watch-id="${project.id}" role="link" tabindex="0" aria-label="Открыть ${escapeHtml(project.title)}">
      <div class="update-card-head">
        <span class="type-badge">${typeLabel[project.type]}</span>
        <div class="update-badges"><span class="tag tag-fresh">Новинка</span><span class="update-episode">${escapeHtml(project.latestEpisode || 'Новая серия')}</span></div>
      </div>
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.description)}</p>
      <div class="update-card-actions">
        ${getInfoIconButtonMarkup(project.id, 'update-info-btn')}
      </div>
    </article>
  `).join('');
}

export function getTitlePageMarkup(project, active, playerVm) {
  return `
    <article class="title-page-layout">
      <section class="title-shell">
        <div class="title-sidebar">
          <div class="title-hero glass">${getPosterMarkup(project, 'title')}</div>
          <div class="title-poster-actions glass">${getFavoriteTextMarkup(project.id, active)}</div>
        </div>

        <div class="title-copy glass">
          <h1 class="title-page-title">${escapeHtml(project.title)}</h1>
          ${getAltTitlesMarkup(project)}

          <ul class="title-meta-list">
            <li><strong>Год</strong><span>${escapeHtml(project.year)}</span></li>
            ${project.type === 'anime' ? `<li><strong>Сезон</strong><span>${escapeHtml(project.season || 'Не указан')}</span></li>` : ''}
            <li><strong>Страна</strong><span>${countryLabel[project.type] || 'Не указана'}</span></li>
            <li><strong>Статус</strong><span>${escapeHtml(project.status)}</span></li>
            <li><strong>Формат</strong><span>${typeLabel[project.type]}</span></li>
            <li><strong>Хронометраж</strong><span>${escapeHtml(project.duration)}</span></li>
            <li><strong>Озвучка</strong><span>${escapeHtml(project.voiceover || project.team || 'Не указана')}</span></li>
          </ul>

          <p class="title-description">${escapeHtml(project.longText)}</p>
          ${getTitleTagsMarkup(project.genres)}
        </div>
      </section>

      ${getPlayerBlockMarkup(playerVm)}
    </article>
  `;
}

export function getModalMarkup(project, active) {
  return `
    <div class="modal-grid">
      ${getPosterMarkup(project, 'modal')}
      <div class="modal-info">
        <span class="eyebrow">${project.type === 'anime' ? 'Аниме релиз' : 'Сериальный релиз'}</span>
        <h2 id="modalTitle">${escapeHtml(project.title)}</h2>
        <div class="modal-meta">
          <div><strong>Год:</strong> ${escapeHtml(project.year)}</div>
          ${project.type === 'anime' ? `<div><strong>Сезон:</strong> ${escapeHtml(project.season || 'Не указан')}</div>` : ''}
          <div><strong>Страна:</strong> ${countryLabel[project.type] || 'Не указана'}</div>
          <div><strong>Статус:</strong> ${escapeHtml(project.status)}</div>
          <div><strong>Хронометраж:</strong> ${escapeHtml(project.duration)}</div>
          <div><strong>Озвучка:</strong> ${escapeHtml(project.voiceover || project.team || 'Не указана')}</div>
        </div>
        <p class="modal-text">${escapeHtml(project.longText)}</p>
        <div class="modal-tags">${getTagsMarkup(project.genres)}</div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="button" data-watch-id="${project.id}">Смотреть</button>
          ${getFavoriteTextMarkup(project.id, active)}
          <button class="btn btn-secondary" type="button" data-close-modal>Закрыть</button>
        </div>
      </div>
    </div>
  `;
}


export function getVideoModalMarkup(project) {
  return `
    <h2 id="videoModalTitle" class="visually-hidden">${escapeHtml(project.title)}</h2>
    <div class="video-modal-player video-modal-player-clean">${sanitizeUrl(project.videoUrl || '') ? `<iframe src="${escapeHtml(sanitizeUrl(project.videoUrl || ''))}" title="${escapeHtml(project.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>` : '<div class="player-empty-state"><strong>Видео пока недоступно</strong></div>'}</div>
  `;
}

export function getRatingDialogMarkup(project, currentUserRating = 0) {
  return `
    <div class="rating-dialog-shell">
      <span class="eyebrow">Оценка тайтла</span>
      <h2 id="ratingDialogTitle">${escapeHtml(project.title)}</h2>
      <p class="rating-dialog-text">Выбери оценку от 1 до 10. Средняя оценка считается по сохранённым оценкам пользователей.</p>
      <div class="rating-scale" role="listbox" aria-label="Выбор оценки">
        ${Array.from({ length: 10 }, (_, index) => index + 1).map(value => `
          <button class="rating-score-btn ${value === currentUserRating ? 'is-active' : ''}" type="button" data-rate-value="${value}" aria-pressed="${value === currentUserRating}">${value}</button>
        `).join('')}
      </div>
      <button class="btn btn-secondary" type="button" data-close-rating>Закрыть</button>
    </div>
  `;
}

export function getAdminPageMarkup({
  canManageRoles,
  titleSearchResults,
  aboutContent,
  roleEntries,
  sectionTab,
  typeTab,
  titleSearch,
  editingProject,
  editTypeTab,
  roleSearchQuery,
  roleSearchResults,
  roleEntriesLoading,
  roleEntriesError,
  roleSearchLoading,
  roleSearchError,
  rolesRefreshing = false,
  pendingRoleUserId = null,
  addSubtab,
  editSubtab,
  addSeriesDraft,
  editSeriesDraft,
  addSeriesSelection,
  editSeriesSelection,
  addTrailerLinkedId,
  editTrailerLinkedId,
  addTrailerLinkedTitle,
  editTrailerLinkedTitle,
  addFormDraft,
  editFormDraft,
  aboutDraft,
  addTitleDirty,
  addSeriesDirty,
  editTitleDirty,
  editSeriesDirty,
  aboutDirty,
  addTitleSaving = false,
  editTitleSaving = false,
  editSeriesSaving = false,
  aboutSaving = false,
  deletingTitleId = null
}) {
  const visibleItems = titleSearch.trim() ? titleSearchResults : [];
  const sectionTabs = [
    { value: 'add', label: 'Добавление тайтла' },
    { value: 'edit', label: 'Редактирование' },
    ...(canManageRoles ? [
      { value: 'about', label: 'О нас' },
      { value: 'roles', label: 'Роли' }
    ] : [])
  ];

  return `
    <div class="admin-shell">
      <div class="admin-section-tabs" role="tablist" aria-label="Разделы админки">
        ${sectionTabs.map(tab => `
          <button class="admin-section-tab ${sectionTab === tab.value ? 'is-active' : ''}" type="button" data-admin-section-tab="${tab.value}" aria-selected="${sectionTab === tab.value}">${tab.label}</button>
        `).join('')}
      </div>

      <div class="admin-panels">
        <section class="admin-section-panel" data-admin-section-panel="add" ${sectionTab !== 'add' ? 'hidden' : ''}>
          <article class="admin-card glass">
            <div class="admin-card-head admin-card-head-stack">
              <div>
                <h3>Добавление тайтла</h3>
                <p class="account-muted">Сначала выбери тип, потом добавь сам тайтл и его серии.</p>
              </div>
            </div>

            ${getAdminTypeTabsMarkup(typeTab)}
            ${getAdminInnerTabsMarkup('add', addSubtab, typeTab)}

            ${addSubtab === 'title' ? `
              <form class="admin-title-form" id="adminAddTitleForm" data-admin-title-form="add">
                <input type="hidden" name="type" value="${typeTab}" />
                ${getAdminTitleFormFields({ ...(addFormDraft || {}), adminMode: 'add', linkedTitleId: addTrailerLinkedId || '', linkedTitleTitle: addTrailerLinkedTitle }, typeTab)}
                ${getAdminDraftStatusMarkup(addTitleDirty)}
                <div class="admin-form-actions">
                  <button class="btn btn-primary" type="submit"${getBusyAttributes(addTitleSaving)}>${getBusyButtonLabel('Сохранить тайтл', 'Сохраняю...', addTitleSaving)}</button>
                  <button class="btn btn-secondary" type="button" data-admin-form-reset="add"${getBusyAttributes(addTitleSaving)}>Очистить форму</button>
                  <button class="btn btn-secondary" type="button" data-admin-form-cancel="add"${getBusyAttributes(addTitleSaving)}>Отменить изменения</button>
                </div>
              </form>
            ` : getAdminSeriesEditorMarkup('add', addSeriesDraft, addSeriesSelection, typeTab, addSeriesDirty, false)}
          </article>
        </section>

        <section class="admin-section-panel" data-admin-section-panel="edit" ${sectionTab !== 'edit' ? 'hidden' : ''}>
          <div class="admin-shell-stack">
            <article class="admin-card glass admin-list-card admin-list-card-edit">
              <label class="search-box admin-search-box" for="adminTitleSearchInput">
                <span class="search-icon" aria-hidden="true">⌕</span>
                <span class="visually-hidden">Поиск по тайтлам</span>
                <input id="adminTitleSearchInput" data-admin-title-search type="text" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Поиск по тайтлам" value="${escapeHtml(titleSearch)}" />
              </label>
              <div class="admin-list-scroll admin-list-scroll-standalone">
                <div class="admin-list">
                  ${titleSearch.trim()
                    ? (visibleItems.length
                      ? visibleItems.map(item => `
                        <div class="admin-list-row">
                          <span class="admin-list-title">${escapeHtml(item.title)}</span>
                          <div class="admin-list-actions">
                            <button class="admin-icon-btn admin-icon-btn-edit" type="button" data-admin-edit-id="${item.id}" aria-label="Редактировать ${escapeHtml(item.title)}"${deletingTitleId === item.id ? ' disabled' : ''}>✎</button>
                            <button class="admin-icon-btn admin-icon-btn-delete" type="button" data-admin-delete-id="${item.id}" aria-label="Удалить ${escapeHtml(item.title)}"${deletingTitleId === item.id ? ' disabled aria-busy="true"' : ''}>${deletingTitleId === item.id ? '⋯' : '🗑'}</button>
                          </div>
                        </div>
                      `).join('')
                      : '<p class="admin-empty">Ничего не найдено.</p>')
                    : ''}
                </div>
              </div>
            </article>

            <article class="admin-card glass">
              <div class="admin-card-head admin-card-head-stack">
                <div>
                  <h3>Редактирование</h3>
                  
                </div>
              </div>

              ${editingProject ? `
                ${getAdminTypeTabsMarkup(editTypeTab || editingProject.type, 'data-admin-edit-type-tab', 'Тип редактируемого тайтла')}
                ${getAdminInnerTabsMarkup('edit', editSubtab, editTypeTab || editingProject.type)}
                ${editSubtab === 'title' ? `
                  <form class="admin-title-form" id="adminEditTitleForm" data-admin-title-form="edit" data-admin-edit-form>
                    <input type="hidden" name="id" value="${editingProject.id}" />
                    <input type="hidden" name="type" value="${escapeHtml(editTypeTab || editingProject.type)}" />
                    ${getAdminTitleFormFields({ ...editingProject, ...(editFormDraft || {}), type: editTypeTab || editingProject.type, adminMode: 'edit', linkedTitleId: editTrailerLinkedId || '', linkedTitleTitle: editTrailerLinkedTitle }, editTypeTab || editingProject.type)}
                    ${getAdminDraftStatusMarkup(editTitleDirty)}
                    <div class="admin-form-actions">
                      <button class="btn btn-primary" type="submit"${getBusyAttributes(editTitleSaving)}>${getBusyButtonLabel('Сохранить изменения', 'Сохраняю...', editTitleSaving)}</button>
                      <button class="btn btn-secondary" type="button" data-admin-form-reset="edit"${getBusyAttributes(editTitleSaving)}>Очистить поля</button>
                      <button class="btn btn-secondary" type="button" data-admin-form-cancel="edit"${getBusyAttributes(editTitleSaving)}>Отменить изменения</button>
                    </div>
                  </form>
                ` : getAdminSeriesEditorMarkup('edit', editSeriesDraft, editSeriesSelection, editTypeTab || editingProject.type, editSeriesDirty, editSeriesSaving)}
              ` : `
                <div class="admin-edit-placeholder">Введи в поиск <strong>название</strong> тайтла и нажми на <strong>карандаш</strong> для его редактирования.</div>
              `}
            </article>
          </div>
        </section>

        ${canManageRoles ? `
          <section class="admin-section-panel" data-admin-section-panel="about" ${sectionTab !== 'about' ? 'hidden' : ''}>
            <article class="admin-card glass">
              <div class="admin-card-head admin-card-head-stack">
                <div>
                  <h3>Раздел «О нас»</h3>
                  <p class="account-muted">Редактируется отдельно и не расширяет карточку по ширине.</p>
                </div>
              </div>
              <form class="admin-about-form" id="adminAboutForm">
                <label><span>Заголовок</span><input name="title" value="${escapeHtml((aboutDraft || aboutContent).title)}" placeholder="О команде AKAITSUKI" /></label>
                <label class="admin-about-field admin-about-team-title-field"><span>Заголовок состава команды</span><input name="teamTitle" value="${escapeHtml((aboutDraft || aboutContent).teamTitle || 'Члены команды')}" placeholder="Члены команды" /></label>
                <div class="admin-about-text-stack">
                  ${((aboutDraft || aboutContent).paragraphs || []).map((text, index) => `
                    <div class="admin-about-dynamic-row">
                      <textarea name="paragraph-${index}" rows="5" data-about-paragraph placeholder="Текст ${index + 1}">${escapeHtml(text)}</textarea>
                      <button class="admin-icon-btn admin-icon-btn-delete" type="button" data-admin-remove-about-paragraph="${index}" aria-label="Удалить текст">🗑</button>
                    </div>
                  `).join('')}
                  <button class="btn btn-secondary" type="button" data-admin-add-about-paragraph>+ Добавить текст</button>
                </div>
                <div class="admin-team-editor">
                  <h4>Состав команды</h4>
                  <div class="admin-team-editor-list">
                    ${((aboutDraft || aboutContent).teamMembers || []).map((member, index) => `
                      <div class="admin-team-member-row" data-team-member-row>
                        <input data-team-member-name type="text" value="${escapeHtml(member.name || '')}" placeholder="Имя" />
                        <input data-team-member-role type="text" value="${escapeHtml(member.role || '')}" placeholder="Роль" />
                        <button class="admin-icon-btn admin-icon-btn-delete" type="button" data-admin-remove-team-member="${index}" aria-label="Удалить участника">🗑</button>
                      </div>
                    `).join('')}
                  </div>
                  <button class="btn btn-secondary" type="button" data-admin-add-team-member>+ Добавить участника</button>
                </div>
                ${getAdminDraftStatusMarkup(aboutDirty)}
                <div class="admin-form-actions">
                  <button class="btn btn-primary" type="submit"${getBusyAttributes(aboutSaving)}>${getBusyButtonLabel('Сохранить раздел', 'Сохраняю...', aboutSaving)}</button>
                  <button class="btn btn-secondary" type="button" data-admin-about-reset${getBusyAttributes(aboutSaving)}>Очистить поля</button>
                  <button class="btn btn-secondary" type="button" data-admin-about-cancel${getBusyAttributes(aboutSaving)}>Отменить изменения</button>
                </div>
              </form>
            </article>
          </section>

          <section class="admin-section-panel" data-admin-section-panel="roles" ${sectionTab !== 'roles' ? 'hidden' : ''}>
            <article class="admin-card glass">
              <div class="admin-card-head admin-card-head-stack admin-card-head-roles">
                <div>
                  <h3>Роли пользователей</h3>
                  <p class="account-muted">Здесь показаны владельцы и администраторы. После смены роли пользователю нужно выйти и войти заново.</p>
                </div>
                <button class="btn btn-secondary admin-roles-refresh-btn" type="button" data-admin-refresh-roles${getBusyAttributes(rolesRefreshing)}>${getBusyButtonLabel('Обновить список', 'Обновляю...', rolesRefreshing)}</button>
              </div>

              <div class="admin-role-search-card ${rolesRefreshing ? 'is-muted' : ''}">
                <label class="search-box admin-search-box" for="adminRoleSearchInput">
                  <span class="search-icon" aria-hidden="true">⌕</span>
                  <span class="visually-hidden">Поиск пользователя по почте</span>
                  <input id="adminRoleSearchInput" data-admin-user-search type="text" inputmode="email" autocomplete="off" spellcheck="false" placeholder="Поиск пользователя по почте" value="${escapeHtml(roleSearchQuery)}"${getBusyAttributes(rolesRefreshing)} />
                </label>
                <div class="admin-role-search-results">
                  ${roleSearchQuery.trim() ? (roleSearchLoading ? '<p class="admin-empty">Ищу пользователей...</p>' : roleSearchError ? `<p class="admin-empty">${escapeHtml(roleSearchError)}</p>` : roleSearchResults.length ? roleSearchResults.map(entry => {
                    const isBusy = rolesRefreshing || pendingRoleUserId === entry.userId;
                    return `
                    <div class="admin-user-search-row ${isBusy ? 'is-busy' : ''}">
                      <div class="admin-user-search-copy">
                        <strong>${escapeHtml(entry.email)}</strong>
                        <small>${escapeHtml(entry.nickname || 'Пользователь')}</small>
                      </div>
                      ${canManageRoles ? (entry.role === 'owner' || entry.role === 'admin'
                        ? `<span class="admin-user-search-state">${escapeHtml(adminRoleLabel[entry.role])}</span>`
                        : `<button class="admin-plus-btn" type="button" data-admin-grant-admin-id="${escapeHtml(entry.userId)}" aria-label="Выдать роль администратора"${getBusyAttributes(isBusy)}>${isBusy ? '⋯' : '+'}</button>`)
                        : `<span class="admin-user-search-state">Недоступно</span>`}
                    </div>
                  `;}).join('') : '<p class="admin-empty">Пользователи по этой почте не найдены.</p>') : '<p class="admin-empty">Начни вводить почту, чтобы найти пользователя.</p>'}
                </div>
              </div>

              <div class="admin-roles-list ${canManageRoles ? '' : 'is-locked'} ${rolesRefreshing ? 'is-muted' : ''}">
                ${roleEntriesLoading && !roleEntries.length
                  ? '<p class="admin-empty">Загружаю список ролей...</p>'
                  : roleEntriesError
                    ? `<p class="admin-empty">${escapeHtml(roleEntriesError)}</p>`
                    : (roleEntries.map(entry => `
                      <div class="admin-role-row ${pendingRoleUserId === entry.userId ? 'is-busy' : ''}">
                        <div class="admin-role-copy">
                          <span class="admin-role-user">${escapeHtml(entry.email || entry.label)}</span>
                          <small>${escapeHtml(entry.nickname || entry.label)}</small>
                        </div>
                        ${getAdminRoleControlMarkup(entry, canManageRoles, { pendingRoleUserId, rolesRefreshing })}
                      </div>
                    `).join('') || '<p class="admin-empty">Список ролей пока пуст.</p>')}
              </div>
            </article>
          </section>
        ` : ''}
      </div>
    </div>
  `;
}
