import { sanitizeMediaSrc } from '../../utils/text.utils.js';
import { renderAdminList, renderAdminShell } from './admin.view.js';
import { resetAdminDraftState } from './admin.helpers.js';

const TOP_LEVEL_FIELDS = {
  adminTitle: 'title',
  adminPoster: 'poster',
  adminAltTitles: 'altTitles',
  adminDescription: 'description',
  adminGenres: 'genres',
  adminTitleType: 'titleType',
  adminYear: 'year',
  adminReleaseLabel: 'releaseLabel',
  adminAgeRating: 'ageRating',
  adminTotalEpisodes: 'totalEpisodes',
  adminStudio: 'studio',
  adminCountry: 'country',
  adminDirector: 'director',
};

function isTextField(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function createAdminController(ctx) {
  const {
    pageState,
    ensureAdminDraft,
    animeService,
    aboutService,
    isAdmin,
    isSuperAdmin,
    canAccessAdminSection,
    authService,
    app,
    createEmptyDraft,
    saveDraftToService,
    resetDb,
    showToast,
    addDraftEpisode,
    removeDraftEpisode,
    getEpisodeById,
    createEmptyVoiceover,
    createEmptyPlayer,
    normalizeDraftFromTitle,
  } = ctx;

  function rerender() {
    render();
  }

  function resetDraftBySection() {
    const kind = pageState.admin.section === 'series' ? 'series' : 'anime';
    resetAdminDraftState(pageState, kind);
  }

  function syncAboutDraftFromInputs() {
    const current = pageState.admin.aboutDraft || {};
    const title = document.getElementById('aboutTitleInput')?.value || 'Кто мы такие';
    const description = document.getElementById('aboutDescriptionInput')?.value || '';
    const teamText = document.getElementById('aboutTeamInput')?.value || '';
    const socials = [...document.querySelectorAll('[data-about-social-row]')].map((row) => ({
      id: row.dataset.socialId || crypto.randomUUID(),
      label: row.querySelector('[data-about-social-field="label"]')?.value || '',
      icon: row.querySelector('[data-about-social-field="icon"]')?.value || '',
      href: row.querySelector('[data-about-social-field="href"]')?.value || '',
    }));
    pageState.admin.aboutDraft = { ...current, title, description, teamText, socials };
    return pageState.admin.aboutDraft;
  }

  function saveAboutContent() {
    const { title, description, teamText, socials } = syncAboutDraftFromInputs();
    aboutService.update({ title, description, team: teamText, socials });
    pageState.admin.aboutDraft = { title, description, teamText, socials };
  }

  function ensureAboutDraft() {
    if (!pageState.admin.aboutDraft) {
      const about = aboutService.get();
      pageState.admin.aboutDraft = {
        title: about.title || 'Кто мы такие',
        description: about.description || '',
        teamText: (about.team || [])
          .map((item) => `${item.name}${item.nick ? ` (${item.nick})` : ''} — ${item.role}`)
          .join('\\n'),
        socials: (about.socials || []).map((item) => ({ ...item })),
      };
    }
    if (!Array.isArray(pageState.admin.aboutDraft.socials)) {
      pageState.admin.aboutDraft.socials = [];
    }
    return pageState.admin.aboutDraft;
  }

  function renderAccessDenied() {
    app.innerHTML = `<section class="page"><div class="empty-state glass"><h3>Доступ закрыт</h3><p>Эта страница доступна только администраторам проекта.</p><button class="button button--primary" id="adminBackButton">Вернуться в каталог</button></div></section>`;
    document.getElementById('adminBackButton')?.addEventListener('click', () => {
      location.hash = '#/catalog';
    });
  }

  function render() {
    if (!isAdmin()) {
      renderAccessDenied();
      return;
    }

    if (!canAccessAdminSection(pageState.admin.section)) {
      pageState.admin.section = 'anime';
    }

    if (!pageState.admin.draft || pageState.admin.draft.contentType !== pageState.admin.section) {
      pageState.admin.draft = createEmptyDraft(pageState.admin.section);
    }

    app.innerHTML = renderAdminShell(ctx);
    bindPageEvents();
  }

  function bindPageEvents() {
    const page = app.querySelector('[data-page="admin"]');
    if (!page) return;

    page.addEventListener('click', handleClick);
    page.addEventListener('keydown', handleKeydown);
    page.addEventListener('input', handleInput);
    page.addEventListener('change', handleChange);
    page.addEventListener('dragstart', handleDragStart);
    page.addEventListener('dragover', handleDragOver);
    page.addEventListener('drop', handleDrop);
  }

  function handleSectionSwitch(section) {
    if (!canAccessAdminSection(section)) {
      showToast('У вас нет доступа к этому разделу', 'error');
      return;
    }
    pageState.admin.section = section;
    pageState.admin.aboutDraft = section === 'about' ? pageState.admin.aboutDraft : null;
    if (section !== 'roles') resetDraftBySection();
    rerender();
  }

  function handleAction(actionNode) {
    const action = actionNode.dataset.adminAction;
    const draft = ensureAdminDraft();
    const episodeId = actionNode.dataset.episodeId;
    const episodeIndex = Number(actionNode.dataset.episodeIndex);
    const episode = episodeId ? getEpisodeById(draft, episodeId) : draft.episodes?.[episodeIndex];
    const voice = episode?.voiceovers?.find((item) => item.id === actionNode.dataset.voiceId);

    if (action === 'add-episode') {
      addDraftEpisode(draft);
      return rerender();
    }

    if (action === 'remove-episode' && episode) {
      removeDraftEpisode(draft, episode.id);
      return rerender();
    }

    if (action === 'activate-voice' && episode) {
      pageState.admin.activeVoiceTabs[episode.id] = actionNode.dataset.voiceId;
      return rerender();
    }

    if (action === 'add-voice' && episode) {
      const newVoice = createEmptyVoiceover('');
      episode.voiceovers.push(newVoice);
      pageState.admin.activeVoiceTabs[episode.id] = newVoice.id;
      return rerender();
    }

    if (action === 'prompt-remove-voice' && episode) {
      pageState.admin.confirmRemoveVoice = { episodeId: episode.id, voiceId: actionNode.dataset.voiceId };
      return rerender();
    }

    if (action === 'cancel-remove-voice') {
      pageState.admin.confirmRemoveVoice = null;
      return rerender();
    }

    if (action === 'confirm-remove-voice' && episode) {
      episode.voiceovers = episode.voiceovers.filter((item) => item.id !== actionNode.dataset.voiceId);
      pageState.admin.confirmRemoveVoice = null;
      if (!episode.voiceovers.length) episode.voiceovers = [createEmptyVoiceover('')];
      return rerender();
    }

    if (action === 'add-player' && voice) {
      voice.players.push(createEmptyPlayer());
      return rerender();
    }

    if (action === 'remove-player' && voice) {
      voice.players = voice.players.filter((item) => item.id !== actionNode.dataset.playerId);
      if (!voice.players.length) voice.players = [createEmptyPlayer()];
      return rerender();
    }

    if (action === 'edit-title') {
      const item = animeService.getById(actionNode.dataset.id);
      pageState.admin.section = item.contentType;
      pageState.admin.editingId = item.id;
      pageState.admin.draft = normalizeDraftFromTitle(item);
      pageState.admin.activeVoiceTabs = Object.fromEntries((item.episodes || []).map((itemEpisode) => [itemEpisode.id, itemEpisode.voiceovers?.[0]?.id || null]));
      pageState.admin.confirmRemoveVoice = null;
      return rerender();
    }


    if (action === 'add-social') {
      if (!isSuperAdmin()) {
        showToast('Раздел «О нас» доступен только владельцу', 'error');
        return;
      }
      const aboutDraft = ensureAboutDraft();
      aboutDraft.socials.push({ id: crypto.randomUUID(), label: '', icon: '', href: '' });
      return rerender();
    }

    if (action === 'remove-social') {
      if (!isSuperAdmin()) {
        showToast('Раздел «О нас» доступен только владельцу', 'error');
        return;
      }
      const aboutDraft = ensureAboutDraft();
      aboutDraft.socials = (aboutDraft.socials || []).filter((item) => item.id !== actionNode.dataset.socialId);
      return rerender();
    }

    if (action === 'pick-social-icon') {
      const fileInput = document.querySelector(`[data-about-social-file][data-social-id="${actionNode.dataset.socialId}"]`);
      fileInput?.click();
      return;
    }

    if (action === 'add-social') {
      if (!isSuperAdmin()) {
        showToast('Раздел «О нас» доступен только владельцу', 'error');
        return;
      }
      const aboutDraft = ensureAboutDraft();
      aboutDraft.socials.push({ id: crypto.randomUUID(), label: '', icon: '', href: '' });
      return rerender();
    }

    if (action === 'remove-social') {
      if (!isSuperAdmin()) {
        showToast('Раздел «О нас» доступен только владельцу', 'error');
        return;
      }
      const aboutDraft = ensureAboutDraft();
      aboutDraft.socials = (aboutDraft.socials || []).filter((item) => item.id !== actionNode.dataset.socialId);
      return rerender();
    }

    if (action === 'pick-social-icon') {
      const fileInput = document.querySelector(`[data-about-social-file][data-social-id="${actionNode.dataset.socialId}"]`);
      fileInput?.click();
      return;
    }

    if (action === 'promote-user') {
      if (!isSuperAdmin()) {
        showToast('Назначать администраторов может только владелец', 'error');
        return;
      }
      authService.updateUserRole(actionNode.dataset.userId, 'admin');
      showToast('Пользователь назначен админом');
      return rerender();
    }

    if (action === 'delete-title') {
      const item = animeService.getById(actionNode.dataset.id);
      const confirmed = window.confirm(`Удалить ${item?.contentType === 'series' ? 'сериал' : 'тайтл'} «${item?.title || 'без названия'}»? Это действие нельзя отменить.`);
      if (!confirmed) return;
      animeService.remove(actionNode.dataset.id);
      showToast('Тайтл удалён');
      return rerender();
    }
  }

  function handleClick(event) {
    const sectionBtn = event.target.closest('[data-admin-section]');
    if (sectionBtn) {
      handleSectionSwitch(sectionBtn.dataset.adminSection);
      return;
    }

    const selectTrigger = event.target.closest('[data-select-trigger]');
    if (selectTrigger && selectTrigger.closest('[data-select-root]')) {
      const selectRoot = selectTrigger.closest('[data-select-root]');
      const isOpen = selectRoot.classList.contains('is-open');
      ctx.closeAllFloating();
      selectRoot.classList.toggle('is-open', !isOpen);
      selectTrigger.setAttribute('aria-expanded', String(!isOpen));
      return;
    }

    const optionNode = event.target.closest('[data-select-option]');
    if (optionNode && optionNode.closest('[data-select-root]')) {
      const selectRoot = optionNode.closest('[data-select-root]');
      const scope = String(selectRoot.dataset.scope || '');
      if (scope.startsWith('user-role:')) {
        if (!isSuperAdmin()) {
          showToast('Управление ролями доступно только владельцу', 'error');
          return rerender();
        }
        try {
          authService.updateUserRole(scope.slice('user-role:'.length), optionNode.dataset.value);
          showToast('Роль пользователя обновлена');
        } catch (error) {
          showToast(error.message, 'error');
        }
        return rerender();
      }
    }

    const actionNode = event.target.closest('[data-admin-action]');
    if (actionNode) {
      handleAction(actionNode);
      return;
    }

    if (event.target.closest('#resetDbButton')) {
      if (!isSuperAdmin()) {
        showToast('Сброс базы доступен только владельцу', 'error');
        return;
      }
      resetDb();
      resetDraftBySection();
      pageState.admin.aboutDraft = null;
      showToast('Demo-данные сброшены');
      rerender();
      return;
    }

    if (event.target.closest('#resetDraftButton') || event.target.closest('[data-admin-action="reset-draft"]')) {
      resetDraftBySection();
      rerender();
      return;
    }

    if (event.target.closest('#saveAdminButton') || event.target.closest('[data-admin-action="save-draft"]')) {
      try {
        saveDraftToService();
        showToast('Сохранено');
        rerender();
      } catch (error) {
        showToast(error.message, 'error');
      }
      return;
    }

    if (event.target.closest('#saveAboutButton') || event.target.closest('[data-admin-action="save-about"]')) {
      if (!isSuperAdmin()) {
        showToast('Раздел «О нас» доступен только владельцу', 'error');
        return;
      }
      saveAboutContent();
      showToast('Страница «О нас» обновлена');
      rerender();
    }
  }

  function handleKeydown(event) {
    const target = event.target;
    if (!isTextField(target)) return;
    if (target.id === 'adminSearchInput' || event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (target instanceof HTMLTextAreaElement && !target.closest('.admin-voice-panel') && target.id !== 'aboutDescriptionInput' && target.id !== 'aboutTeamInput') return;

    event.preventDefault();

    if (pageState.admin.section === 'about') {
      saveAboutContent();
      showToast('Страница «О нас» обновлена');
      return;
    }

    try {
      saveDraftToService({ preserveEditing: true });
      showToast('Изменения сохранены');
      rerender();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function updateDraftField(fieldId, value) {
    const draft = ensureAdminDraft();
    const key = TOP_LEVEL_FIELDS[fieldId];
    if (key) draft[key] = value;
  }

  function updateSearch(value) {
    if (pageState.admin.section === 'anime') pageState.admin.animeSearch = value;
    if (pageState.admin.section === 'series') pageState.admin.seriesSearch = value;

    const list = document.getElementById('adminListRows');
    if (list) list.innerHTML = renderAdminList(pageState.admin.section, ctx);
  }

  function updateNestedField(target) {
    const draft = ensureAdminDraft();
    const field = target.dataset.adminField;
    if (!field) return;

    const episode = target.dataset.episodeId
      ? getEpisodeById(draft, target.dataset.episodeId)
      : draft.episodes?.[Number(target.dataset.episodeIndex)];
    if (!episode) return;

    if (field === 'episode-title') episode.title = target.value;
    if (field === 'episode-number') episode.number = target.value;

    const voice = episode.voiceovers.find((item) => item.id === target.dataset.voiceId);
    if (field === 'voice-name' && voice) voice.name = target.value;

    if ((field === 'player-name' || field === 'player-url') && voice) {
      const player = voice.players.find((item) => item.id === target.dataset.playerId);
      if (player) player[field === 'player-name' ? 'name' : 'url'] = target.value;
    }
  }


  function handleChange(event) {
    const target = event.target;

    if (target instanceof HTMLSelectElement && target.dataset.adminField === 'user-role') {
      if (!isSuperAdmin()) {
        showToast('Управление ролями доступно только владельцу', 'error');
        rerender();
        return;
      }

      authService.updateUserRole(target.dataset.userId, target.value);
      showToast('Роль пользователя обновлена');
      rerender();
      return;
    }

    if (target instanceof HTMLInputElement && target.matches('[data-about-social-file]')) {
      const file = target.files?.[0];
      if (!file) return;
      const socialId = target.dataset.socialId;
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || '');
        const aboutDraft = ensureAboutDraft();
        const social = (aboutDraft.socials || []).find((item) => item.id === socialId);
        if (social) social.icon = value;
        const textInput = document.querySelector(`[data-about-social-field="icon"][data-social-id="${socialId}"]`);
        if (textInput) textInput.value = value;
        const preview = document.querySelector(`[data-about-social-row][data-social-id="${socialId}"] .about-social-admin-row__preview`);
        if (preview) {
          preview.replaceChildren();
          const img = document.createElement('img');
          img.className = 'about-social-preview__image';
          img.alt = '';
          img.src = sanitizeMediaSrc(value);
          preview.append(img);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!isTextField(target)) return;

    if (pageState.admin.section === 'about') {
      syncAboutDraftFromInputs();
      return;
    }

    if (target.id === 'adminSearchInput') {
      updateSearch(target.value);
      return;
    }

    if (target.id === 'adminRoleSearchInput') {
      pageState.admin.roleSearch = target.value;
      rerender();
      return;
    }

    updateDraftField(target.id, target.value);
    updateNestedField(target);
  }

  function handleDragStart(event) {
    const row = event.target.closest('[data-about-social-row]');
    if (!row || pageState.admin.section !== 'about') return;
    syncAboutDraftFromInputs();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.socialId || '');
    row.classList.add('is-dragging');
  }

  function handleDragOver(event) {
    const row = event.target.closest('[data-about-social-row]');
    if (!row || pageState.admin.section !== 'about') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event) {
    const row = event.target.closest('[data-about-social-row]');
    if (!row || pageState.admin.section !== 'about') return;
    event.preventDefault();

    const draggedId = event.dataTransfer.getData('text/plain');
    const targetId = row.dataset.socialId;
    document.querySelectorAll('[data-about-social-row].is-dragging').forEach((node) => node.classList.remove('is-dragging'));

    if (!draggedId || !targetId || draggedId === targetId) return;

    const aboutDraft = ensureAboutDraft();
    const socials = [...(aboutDraft.socials || [])];
    const fromIndex = socials.findIndex((item) => item.id === draggedId);
    const toIndex = socials.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = socials.splice(fromIndex, 1);
    socials.splice(toIndex, 0, moved);
    aboutDraft.socials = socials;
    rerender();
  }

  return { render };
}
