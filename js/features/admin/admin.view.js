function renderVoiceTabs(episode, ctx) {
  const { pageState, escapeHtml } = ctx;

  const activeVoiceId = pageState.admin.activeVoiceTabs[episode.id] || episode.voiceovers?.[0]?.id;
  pageState.admin.activeVoiceTabs[episode.id] = activeVoiceId;
  const currentVoice = episode.voiceovers.find((item) => item.id === activeVoiceId) || episode.voiceovers[0];

  return `
    <div class="voice-tabs-row">
      <div class="voice-tabs-wrap">
        <div class="voice-tabs custom-scroll">
          ${episode.voiceovers.map((voiceover, voiceIndex) => `
            <div class="voice-tab ${voiceover.id === currentVoice?.id ? 'is-active' : ''}">
              <button type="button" class="voice-tab__button" data-admin-action="activate-voice" data-episode-id="${episode.id}" data-voice-id="${voiceover.id}">${escapeHtml(voiceover.name || `Озвучка ${voiceIndex + 1}`)}</button>
              <button type="button" class="voice-tab__remove" data-admin-action="prompt-remove-voice" data-episode-id="${episode.id}" data-voice-id="${voiceover.id}">×</button>
            </div>
          `).join('')}
        </div>
      </div>
      <button class="voice-tabs-add" type="button" data-admin-action="add-voice" data-episode-id="${episode.id}">+</button>
    </div>
    ${pageState.admin.confirmRemoveVoice?.episodeId === episode.id ? `
      <div class="inline-confirm glass-soft">
        <span>Вы уверены?</span>
        <div class="inline-confirm__actions">
          <button class="button button--danger" type="button" data-admin-action="confirm-remove-voice" data-episode-id="${episode.id}" data-voice-id="${pageState.admin.confirmRemoveVoice.voiceId}">Да</button>
          <button class="button button--ghost" type="button" data-admin-action="cancel-remove-voice">Нет</button>
        </div>
      </div>
    ` : ''}
    ${currentVoice ? `
      <div class="admin-voice-panel glass-soft">
        <div class="form-grid form-grid--2 compact-grid">
          <input class="input" data-admin-field="voice-name" data-episode-id="${episode.id}" data-voice-id="${currentVoice.id}" value="${escapeHtml(currentVoice.name)}" placeholder="Название озвучки" />
          <button class="button button--ghost" type="button" data-admin-action="add-player" data-episode-id="${episode.id}" data-voice-id="${currentVoice.id}">Добавить плеер</button>
        </div>
        <div class="admin-players-stack">
          ${currentVoice.players.map((player) => `
            <div class="admin-player-row">
              <input class="input" data-admin-field="player-name" data-episode-id="${episode.id}" data-voice-id="${currentVoice.id}" data-player-id="${player.id}" value="${escapeHtml(player.name)}" placeholder="Название плеера" />
              <input class="input" data-admin-field="player-url" data-episode-id="${episode.id}" data-voice-id="${currentVoice.id}" data-player-id="${player.id}" value="${escapeHtml(player.url)}" placeholder="Ссылка на плеер" />
              <button class="button button--danger" type="button" data-admin-action="remove-player" data-episode-id="${episode.id}" data-voice-id="${currentVoice.id}" data-player-id="${player.id}">Удалить</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderAdminEpisodes(ctx) {
  const { ensureAdminDraft, escapeHtml } = ctx;
  const draft = ensureAdminDraft();

  return (draft.episodes || []).map((episode, index) => `
    <div class="admin-episode glass-soft">
      <div class="admin-episode__header">
        <strong>Серия ${index + 1}</strong>
        <button class="button button--danger" type="button" data-admin-action="remove-episode" data-episode-id="${episode.id}">Удалить серию</button>
      </div>
      <div class="form-grid form-grid--2 compact-grid">
        <input class="input" data-admin-field="episode-title" data-episode-id="${episode.id}" value="${escapeHtml(episode.title)}" placeholder="Название серии" />
        <input class="input" type="number" min="1" data-admin-field="episode-number" data-episode-id="${episode.id}" value="${escapeHtml(episode.number)}" placeholder="Номер серии" />
      </div>
      ${renderVoiceTabs(episode, ctx)}
    </div>
  `).join('');
}

export function renderAdminList(kind, ctx) {
  const { pageState, escapeHtml, animeService, getEpisodesLabel } = ctx;

  const query = (kind === 'anime' ? pageState.admin.animeSearch : pageState.admin.seriesSearch).toLowerCase().trim();
  const items = animeService.list({ kind, sort: 'newest' }).filter((item) => !query || [item.title, item.releaseLabel].join(' ').toLowerCase().includes(query));

  return items.length
    ? items.map((item) => `
      <div class="admin-list-row">
        <div>
          <div class="row-card__title">${escapeHtml(item.title)}</div>
          <div class="row-card__meta">${escapeHtml(item.releaseLabel)} · ${escapeHtml(item.displayStatus)} · ${escapeHtml(getEpisodesLabel(item))}</div>
        </div>
        <div class="admin-list-row__actions">
          <button class="button button--ghost" type="button" data-admin-action="edit-title" data-id="${item.id}">Редактировать</button>
          <button class="button button--danger" type="button" data-admin-action="delete-title" data-id="${item.id}">Удалить</button>
        </div>
      </div>
    `).join('')
    : '<div class="loading-state">Здесь пока пусто</div>';
}

function renderAdminForm(ctx) {
  const { pageState, ensureAdminDraft, escapeHtml, animeService } = ctx;
  const draft = ensureAdminDraft();
  const kind = pageState.admin.section;
  const isSeries = kind === 'series';

  return `
    <section class="admin-form-section glass-soft">
      <div class="form-grid form-grid--2">
        <input class="input" id="adminTitle" placeholder="Основное название" value="${escapeHtml(draft.title)}" />
        <input class="input" id="adminPoster" placeholder="URL постера" value="${escapeHtml(draft.poster)}" />
        <textarea class="textarea" id="adminAltTitles" placeholder="Альтернативные названия — по одному в строке">${escapeHtml(draft.altTitles)}</textarea>
        <textarea class="textarea" id="adminDescription" placeholder="Описание">${escapeHtml(draft.description)}</textarea>
        <input class="input" id="adminGenres" placeholder="Жанры через запятую" value="${escapeHtml(draft.genres)}" />
        ${isSeries ? '<div></div>' : `<input class="input" id="adminTitleType" placeholder="Тип тайтла" value="${escapeHtml(draft.titleType)}" />`}
        <input class="input" id="adminYear" type="number" min="1950" placeholder="Год" value="${escapeHtml(draft.year)}" />
        <input class="input" id="adminReleaseLabel" placeholder="Сезон / например: Осень" value="${escapeHtml(draft.releaseLabel)}" />
        <input class="input" id="adminAgeRating" placeholder="Возрастной рейтинг" value="${escapeHtml(draft.ageRating)}" />
        <input class="input" id="adminTotalEpisodes" type="number" min="1" placeholder="Итоговое число серий" value="${escapeHtml(draft.totalEpisodes)}" />
        ${isSeries ? `<input class="input" id="adminCountry" placeholder="Страна" value="${escapeHtml(draft.country)}" />` : `<input class="input" id="adminStudio" placeholder="Студия" value="${escapeHtml(draft.studio)}" />`}
        <input class="input" id="adminDirector" placeholder="Продолжительность серии" value="${escapeHtml(draft.director)}" />
      </div>
      <div class="admin-episodes-block">
        <div class="admin-block-header">
          <h4>Серии</h4>
          <button class="button button--ghost" type="button" data-admin-action="add-episode">Добавить серию</button>
        </div>
        <div class="admin-episodes-stack">${renderAdminEpisodes(ctx)}</div>
      </div>
      <div class="admin-submit-row">
        <button class="button button--ghost" id="resetDraftButton">Очистить форму</button>
        <button class="button button--primary" id="saveAdminButton">${pageState.admin.editingId ? 'Сохранить изменения' : `Добавить ${isSeries ? 'сериал' : 'тайтл'}`}</button>
      </div>
    </section>
    <aside class="admin-list glass-soft">
      <div class="section-header compact-header">
        <div><h3>Список ${isSeries ? 'сериалов' : 'тайтлов'}</h3><p class="section-subtitle">Быстрый поиск и переход к редактированию.</p></div>
        <span class="badge">${animeService.list({ kind }).length}</span>
      </div>
      <input class="input" id="adminSearchInput" placeholder="Поиск по названию или сезону" value="${escapeHtml(isSeries ? pageState.admin.seriesSearch : pageState.admin.animeSearch)}" />
      <div class="admin-list-rows custom-scroll" id="adminListRows">${renderAdminList(kind, ctx)}</div>
    </aside>
  `;
}



function renderAboutSocialRows(socials = [], escapeHtml) {
  if (!socials.length) {
    return '<div class="loading-state">Соцсети пока не добавлены.</div>';
  }

  return socials.map((social, index) => `
    <div class="about-social-admin-row glass-soft" data-about-social-row data-social-id="${social.id}" draggable="true">
      <div class="about-social-admin-row__header">
        <div class="about-social-admin-row__title">
          <span class="about-social-admin-row__drag" title="Перетащить">⋮⋮</span>
          <strong>Соцсеть ${index + 1}</strong>
        </div>
        <button class="button button--danger" type="button" data-admin-action="remove-social" data-social-id="${social.id}">Удалить</button>
      </div>

      <div class="about-social-admin-row__preview">
        ${social.icon
          ? `<img class="about-social-preview__image" src="${escapeHtml(social.icon)}" alt="" />`
          : `<span class="about-social-preview__fallback">${escapeHtml((social.label || '•').slice(0, 1).toUpperCase())}</span>`}
      </div>

      <div class="form-grid form-grid--2 compact-grid">
        <input class="input" data-about-social-field="label" data-social-id="${social.id}" value="${escapeHtml(social.label || '')}" placeholder="Подсказка" />
        <input class="input" data-about-social-field="href" data-social-id="${social.id}" value="${escapeHtml(social.href || '')}" placeholder="Ссылка на соц.сеть" />
      </div>

      <div class="form-grid form-grid--2 compact-grid">
        <input class="input" data-about-social-field="icon" data-social-id="${social.id}" value="${escapeHtml(social.icon || '')}" placeholder="Иконка: локальный файл или URL (лучше SVG / PNG 64x64)" />
        <div class="about-social-admin-row__actions">
          <button class="button button--ghost" type="button" data-admin-action="pick-social-icon" data-social-id="${social.id}">Выбрать значок</button>
          <input class="hidden-file-input" type="file" accept="image/*" data-about-social-file data-social-id="${social.id}" hidden />
        </div>
      </div>
    </div>
  `).join('');
}

function renderAboutAdmin(ctx) {
  const { pageState, escapeHtml, aboutService } = ctx;
  const about = aboutService.get();
  const draft = pageState.admin.aboutDraft || {
    ...about,
    title: about.title || 'Кто мы такие',
    teamText: (about.team || [])
      .map((item) => `${item.name}${item.nick ? ` (${item.nick})` : ''} — ${item.role}`)
      .join('\n'),
    socials: (about.socials || []).map((item) => ({ ...item })),
  };

  pageState.admin.aboutDraft = draft;

  return `
    <section class="admin-form-section glass-soft admin-form-section--wide">
      <div class="form-grid">
        <input class="input" id="aboutTitleInput" placeholder="Заголовок блока" value="${escapeHtml(draft.title || 'Кто мы такие')}" />
        <textarea class="textarea" id="aboutDescriptionInput" placeholder="Описание команды">${escapeHtml(draft.description || '')}</textarea>
        <textarea class="textarea" id="aboutTeamInput" placeholder="Команда — по одному участнику в строке\nИмя (Ник) — Роль">${escapeHtml(draft.teamText || '')}</textarea>
      </div>

      <div class="admin-episodes-block">
        <div class="admin-block-header">
          <h4>Соцсети</h4>
          <button class="button button--ghost" type="button" data-admin-action="add-social">Добавить соц.сеть</button>
        </div>
        <div class="admin-socials-stack">${renderAboutSocialRows(draft.socials || [], escapeHtml)}</div>
        <div class="about-social-guideline">Рекомендуемый формат иконок: SVG или PNG 64×64 без фона. На сайте они автоматически приводятся к единому стилю.</div>
      </div>

      <div class="admin-submit-row">
        <button class="button button--primary" id="saveAboutButton">Сохранить страницу</button>
      </div>
    </section>
  `;
}


function renderRolesAdmin(ctx) {
  const { authService, escapeHtml, pageState } = ctx;
  const currentUser = authService.getCurrentUser();
  const allUsers = authService.listUsers();
  const adminUsers = allUsers.filter((user) => ['admin', 'owner'].includes(user.role));
  const query = String(pageState.admin.roleSearch || '').trim().toLowerCase();
  const foundUser = query
    ? allUsers.find((user) => String(user.email || '').trim().toLowerCase() === query)
      || allUsers.find((user) => String(user.email || '').trim().toLowerCase().includes(query))
    : null;

  return `
    <section class="admin-form-section glass-soft admin-form-section--wide">
      <div class="section-header compact-header">
        <div>
          <h3>Роли админки</h3>
          <p class="section-subtitle">Владелец управляет ролями и доступом к критичным разделам.</p>
        </div>
      </div>

      <div class="admin-role-search glass-soft">
        <div class="admin-role-search__header">
          <div>
            <div class="row-card__title">Добавить администратора по email</div>
            <div class="row-card__meta">Ищи конкретного пользователя и назначай ему роль админа без вывода всей базы пользователей.</div>
          </div>
        </div>
        <div class="admin-role-search__row">
          <input class="input" id="adminRoleSearchInput" placeholder="Например: user@example.com" value="${escapeHtml(pageState.admin.roleSearch || '')}" />
        </div>
        ${query ? `
          <div class="admin-role-search__result ${foundUser ? '' : 'is-empty'}">
            ${foundUser ? `
              <div>
                <div class="row-card__title">${escapeHtml(foundUser.name)}</div>
                <div class="row-card__meta">${escapeHtml(foundUser.email)}</div>
              </div>
              <div class="admin-role-row__actions">
                ${['admin', 'owner'].includes(foundUser.role)
                  ? `<span class="badge">Уже ${foundUser.role === 'owner' ? 'владелец' : 'админ'}</span>`
                  : `<button class="button button--primary" type="button" data-admin-action="promote-user" data-user-id="${foundUser.id}">Сделать админом</button>`}
              </div>
            ` : `<div class="loading-state">Пользователь с таким email не найден</div>`}
          </div>
        ` : ''}
      </div>

      <div class="admin-list-rows">
        ${adminUsers.map((user) => `
          <div class="admin-list-row admin-role-row">
            <div>
              <div class="row-card__title">${escapeHtml(user.name)}</div>
              <div class="row-card__meta">${escapeHtml(user.email)}</div>
            </div>
            <div class="admin-role-row__actions">
              ${(() => {
                const ownerUser = allUsers.find((item) => item.role === 'owner');
                const roleOptions = [
                  { value: 'user', label: 'Пользователь' },
                  { value: 'admin', label: 'Админ' },
                  ...(!ownerUser || ownerUser.id === user.id ? [{ value: 'owner', label: 'Владелец' }] : []),
                ];
                const currentRoleLabel = user.role === 'owner' ? 'Владелец' : user.role === 'admin' ? 'Админ' : 'Пользователь';
                return currentUser?.id === user.id
                  ? `<div class="admin-role-static">${currentRoleLabel}</div>`
                  : ctx.createSelectControl({
                      id: `admin-role-${user.id}`,
                      label: currentRoleLabel,
                      value: user.role,
                      options: roleOptions,
                      scope: `user-role:${user.id}`,
                    });
              })()}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

export function renderAdminShell(ctx) {
  const { pageState } = ctx;

  return `
    <section class="page" data-page="admin">
      <section class="section-card glass admin-layout-fixed">
        <div class="section-header">
          <div><h2 class="section-title">Админка</h2><p class="section-subtitle">Управление аниме, сериалами и страницей «О нас» через единый слой данных.</p></div>
          <div class="admin-toolbar">${ctx.isSuperAdmin() ? `<button class="button button--ghost" id="resetDbButton">Сбросить demo-данные</button>` : ``}</div>
        </div>
        <div class="admin-page-tabs">
          <button class="admin-page-tab ${pageState.admin.section === 'anime' ? 'is-active' : ''}" type="button" data-admin-section="anime">Аниме</button>
          <button class="admin-page-tab ${pageState.admin.section === 'series' ? 'is-active' : ''}" type="button" data-admin-section="series">Сериалы</button>
          ${ctx.isSuperAdmin() ? `<button class="admin-page-tab ${pageState.admin.section === 'about' ? 'is-active' : ''}" type="button" data-admin-section="about">О нас</button>` : ''}
          ${ctx.isSuperAdmin() ? `<button class="admin-page-tab ${pageState.admin.section === 'roles' ? 'is-active' : ''}" type="button" data-admin-section="roles">Роли</button>` : ''}
        </div>
        <div class="admin-grid-fixed">
          ${pageState.admin.section === 'about' ? renderAboutAdmin(ctx) : pageState.admin.section === 'roles' ? renderRolesAdmin(ctx) : renderAdminForm(ctx)}
        </div>
      </section>
    </section>
  `;
}
