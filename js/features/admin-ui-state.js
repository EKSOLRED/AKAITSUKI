export function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildAdminUiStateSnapshot(state) {
  return {
    adminSectionTab: state.adminSectionTab,
    adminTypeTab: state.adminTypeTab,
    adminSubtabs: cloneDeep(state.adminSubtabs),
    adminTitleSearch: state.adminTitleSearch,
    adminRoleSearch: state.adminRoleSearch,
    adminEditProjectId: state.adminEditProjectId,
    adminEditTypeTab: state.adminEditTypeTab,
    adminDraftMedia: cloneDeep(state.adminDraftMedia),
    adminSeriesSelection: cloneDeep(state.adminSeriesSelection),
    adminTrailerLinks: cloneDeep(state.adminTrailerLinks),
    adminTrailerLinkSearch: state.adminTrailerLinkSearch,
    adminFormDrafts: cloneDeep(state.adminFormDrafts)
  };
}

export function applyAdminUiStateSnapshot(state, stored) {
  if (!stored || typeof stored !== 'object') return;
  state.adminSectionTab = stored.adminSectionTab || state.adminSectionTab;
  state.adminTypeTab = stored.adminTypeTab || state.adminTypeTab;
  state.adminSubtabs = { ...state.adminSubtabs, ...(stored.adminSubtabs || {}) };
  state.adminTitleSearch = String(stored.adminTitleSearch || '');
  state.adminRoleSearch = String(stored.adminRoleSearch || '');
  state.adminEditProjectId = stored.adminEditProjectId ?? state.adminEditProjectId;
  state.adminEditTypeTab = stored.adminEditTypeTab || state.adminEditTypeTab;
  state.adminDraftMedia = { ...state.adminDraftMedia, ...(stored.adminDraftMedia || {}) };
  state.adminSeriesSelection = { ...state.adminSeriesSelection, ...(stored.adminSeriesSelection || {}) };
  state.adminTrailerLinks = { ...state.adminTrailerLinks, ...(stored.adminTrailerLinks || {}) };
  state.adminTrailerLinkSearch = String(stored.adminTrailerLinkSearch || '');
  state.adminFormDrafts = { ...state.adminFormDrafts, ...(stored.adminFormDrafts || {}) };
}
