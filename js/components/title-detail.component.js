export function getDetailState(item, pageState) {
  if (!pageState.detail[item.id]) {
    pageState.detail[item.id] = {
      altExpanded: false,
      genresExpanded: false,
      voiceoversExpanded: false,
      activeTab: 'voiceovers',
      selectedEpisodeId: item.episodes?.[0]?.id || null,
      selectedVoiceover: item.episodes?.[0]?.voiceovers?.[0]?.name || null,
      selectedPlayerName: item.episodes?.[0]?.voiceovers?.[0]?.players?.[0]?.name || null,
      ratingOpen: false,
    };
  }
  return pageState.detail[item.id];
}

export function getDetailSelection(item, state) {
  const episode = item.episodes?.find((ep) => ep.id === state.selectedEpisodeId) || item.episodes?.[0] || null;
  if (episode && !state.selectedEpisodeId) state.selectedEpisodeId = episode.id;

  const voice = episode?.voiceovers?.find((v) => v.name === state.selectedVoiceover) || episode?.voiceovers?.[0] || null;
  if (voice && !state.selectedVoiceover) state.selectedVoiceover = voice.name;

  const player = voice?.players?.find((p) => p.name === state.selectedPlayerName) || voice?.players?.[0] || null;
  if (player && !state.selectedPlayerName) state.selectedPlayerName = player.name;

  return { episode, voice, player };
}

export function renderExpandableInline(items = [], expanded = false, key = '', escapeHtml) {
  const safe = items.filter(Boolean);
  const limit = 3;
  const visible = expanded ? safe : safe.slice(0, limit);

  return `
    <div class="meta-expandable" data-meta-key="${escapeHtml(key)}">
      <strong>${visible.map((item, index) => `<span class="meta-expandable__item">${escapeHtml(item)}${index < visible.length - 1 ? ',' : ''}</span>`).join(' ')}</strong>
      ${safe.length > limit ? `<button class="inline-dots inline-dots--meta" type="button" data-detail-action="toggle-meta" data-key="${escapeHtml(key)}">${expanded ? 'Скрыть' : '•••'}</button>` : ''}
    </div>
  `;
}

export function renderAltTitles(item, state, escapeHtml) {
  if (!item.altTitles?.length) return '';

  const titles = state.altExpanded ? item.altTitles : item.altTitles.slice(0, 2);
  return `
    <div class="alt-titles">
      <span>${titles.map((title) => escapeHtml(title)).join(' • ')}</span>
      ${item.altTitles.length > 2 ? `<button class="inline-dots" type="button" data-detail-action="toggle-alt">${state.altExpanded ? 'Скрыть' : '•••'}</button>` : ''}
    </div>
  `;
}

export function renderDetailSidebar(item, state, episode, escapeHtml) {
  const voiceovers = episode?.voiceovers || [];
  const selectedVoice = voiceovers.find((voice) => voice.name === state.selectedVoiceover) || voiceovers[0] || null;
  const players = selectedVoice?.players || [];

  const episodeItems = (item.episodes || []).map((ep) => `
    <button class="side-list__item ${ep.id === state.selectedEpisodeId ? 'is-active' : ''}" type="button" data-detail-action="episode-item" data-id="${ep.id}">
      <strong>Эпизод ${ep.number}</strong>
      <span>${escapeHtml(ep.title)}</span>
    </button>
  `).join('');

  const voiceItems = voiceovers.length
    ? voiceovers.map((voice) => `
      <button class="side-list__item ${voice.name === state.selectedVoiceover ? 'is-active' : ''}" type="button" data-detail-action="voice" data-name="${escapeHtml(voice.name)}">
        <strong>${escapeHtml(voice.name)}</strong>
      </button>
    `).join('')
    : '<div class="loading-state">Нет озвучек</div>';

  const playerItems = players.length
    ? players.map((player) => `
      <button class="side-list__item ${player.name === state.selectedPlayerName ? 'is-active' : ''}" type="button" data-detail-action="player" data-name="${escapeHtml(player.name)}">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${player.url ? 'Источник подключён' : 'Ссылка не указана'}</span>
      </button>
    `).join('')
    : '<div class="loading-state">Нет плееров</div>';

  const content = {
    voiceovers: voiceItems,
    players: playerItems,
    episodes: episodeItems,
  }[state.activeTab];

  return `
    <aside class="detail-side glass-soft">
      <div class="detail-side__tabs detail-side__tabs--centered">
        <button class="detail-side__tab ${state.activeTab === 'voiceovers' ? 'is-active' : ''}" type="button" data-detail-tab="voiceovers">Озвучка</button>
        <button class="detail-side__tab ${state.activeTab === 'players' ? 'is-active' : ''}" type="button" data-detail-tab="players">Плеер</button>
        <button class="detail-side__tab ${state.activeTab === 'episodes' ? 'is-active' : ''}" type="button" data-detail-tab="episodes">Список серий</button>
      </div>
      <div class="detail-side__panel custom-scroll">${content}</div>
    </aside>
  `;
}

export function renderPlayerSection(item, state, escapeHtml, createSelectControl) {
  const { episode, player } = getDetailSelection(item, state);
  const options = (item.episodes || []).map((ep) => ({ value: ep.id, label: String(ep.number) }));

  return `
    <div class="detail-player-layout detail-player-layout--wide">
      <section class="detail-player glass-soft">
        <div class="player-topbar">
          ${createSelectControl({
            id: 'detailEpisodeSelect',
            label: String(episode?.number || '—'),
            value: episode?.id || '',
            options,
            detail: true,
            scope: 'episode',
          })}
        </div>
        <div class="player-frame-wrap">
          ${player?.url
            ? `<iframe class="player-frame" src="${escapeHtml(player.url)}" title="Плеер ${escapeHtml(item.title)}" allowfullscreen loading="lazy" referrerpolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"></iframe>`
            : '<div class="player-empty">Нет такого видео</div>'}
        </div>
      </section>
      ${renderDetailSidebar(item, state, episode, escapeHtml)}
    </div>
  `;
}

export function renderDetailMeta(item, state, escapeHtml, getEpisodesLabel) {
  const common = [
    `<div class="meta-item"><span>Год выхода</span><strong>${escapeHtml(item.year || '—')}</strong></div>`,
    `<div class="meta-item"><span>Сезон</span><strong>${escapeHtml(item.releaseLabel || '—')}</strong></div>`,
    `<div class="meta-item"><span>Серии</span><strong>${escapeHtml(getEpisodesLabel(item))}</strong></div>`,
    item.contentType === 'series'
      ? `<div class="meta-item"><span>Страна</span><strong>${escapeHtml(item.country || 'Не указана')}</strong></div>`
      : `<div class="meta-item"><span>Тип тайтла</span><strong>${escapeHtml(item.titleType || 'Не указан')}</strong></div>`,
    `<div class="meta-item"><span>Возрастной рейтинг</span><strong>${escapeHtml(item.ageRating || '—')}</strong></div>`,
    item.contentType === 'series'
      ? `<div class="meta-item"><span>Режиссёр</span><strong>${escapeHtml(item.director || 'Не указан')}</strong></div>`
      : `<div class="meta-item"><span>Студия</span><strong>${escapeHtml(item.studio || 'Не указана')}</strong></div>`,
    item.contentType === 'series'
      ? `<div class="meta-item"><span>Озвучка</span>${renderExpandableInline(item.voiceovers || ['AKAITSUKI'], state.voiceoversExpanded, 'voiceovers', escapeHtml)}</div>`
      : `<div class="meta-item"><span>Режиссёр</span><strong>${escapeHtml(item.director || 'Не указан')}</strong></div>`,
    `<div class="meta-item"><span>Жанры</span>${renderExpandableInline(item.genres || [], state.genresExpanded, 'genres', escapeHtml)}</div>`,
    item.contentType === 'series'
      ? ''
      : `<div class="meta-item"><span>Озвучка</span>${renderExpandableInline(item.voiceovers || ['AKAITSUKI'], state.voiceoversExpanded, 'voiceovers', escapeHtml)}</div>`,
  ].filter(Boolean);

  return common.join('');
}
