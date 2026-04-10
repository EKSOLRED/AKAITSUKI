import { readJson, saveJson } from '../utils/storage.js';
import { getSupabaseUnavailableMessage, isSupabaseReady } from './supabase.js';
import {
  deleteRemoteTitleGraph,
  fetchRemoteContentEntry,
  fetchRemoteTitlesGraph,
  replaceRemoteTitlesGraph,
  upsertRemoteContentEntry,
  upsertRemoteTitleGraph,
  upsertRemoteTitlesBatch
} from './supabase-db.js';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}


function getCachedProjects(cacheKey) {
  const cached = readJson(cacheKey, null);
  return Array.isArray(cached) ? cached : [];
}

function saveCachedProjects(cacheKey, projects = []) {
  const payload = Array.isArray(projects) ? projects : [];
  saveJson(cacheKey, payload);
  return payload;
}

function upsertProjectInList(projects = [], project) {
  const payload = Array.isArray(projects) ? [...projects] : [];
  const normalizedId = Number(project?.id);
  if (!normalizedId) return payload;
  const index = payload.findIndex(item => Number(item?.id) === normalizedId);
  if (index >= 0) payload[index] = project;
  else payload.push(project);
  return payload.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
}

function removeProjectFromList(projects = [], titleId) {
  const normalizedId = Number(titleId);
  return (Array.isArray(projects) ? projects : []).filter(item => Number(item?.id) !== normalizedId);
}


function isRemoteContentSyncRequired() {
  const sync = window.APP_CONFIG?.supabaseSync || {};
  if (sync.enabled === false) return false;
  return sync.content !== false;
}

function createRemoteWriteResultError(message) {
  return {
    data: null,
    error: { message }
  };
}

function finalizeRemoteWrite(cacheUpdater, result, unavailableMessage) {
  if (result?.error) return result;

  if (isRemoteContentSyncRequired()) {
    if (!isSupabaseReady()) return createRemoteWriteResultError(unavailableMessage || getSupabaseUnavailableMessage());
    if (result?.data === null || result?.data === undefined) {
      return createRemoteWriteResultError(unavailableMessage || 'Не удалось сохранить данные в Supabase. Проверь подключение и повтори попытку.');
    }
  }

  cacheUpdater();
  return result || { data: null, error: null };
}

function getRemoteContentConfig() {
  const config = window.APP_CONFIG?.remoteContent || {};
  return {
    allowLegacyTitlesFallback: config.allowLegacyTitlesFallback === true,
    allowLocalCatalogSeedFallback: config.allowLocalCatalogSeedFallback === true,
    allowCachedCatalogFallback: config.allowCachedCatalogFallback !== false
  };
}

export function createContentRepository({ projectsCacheKey, aboutCacheKey, titlesEntryKey = 'titles', aboutEntryKey = 'about' }) {
  return {
    async loadProjectsWithMeta({ fallbackProjects = [] } = {}) {
      const cached = readJson(projectsCacheKey, null);
      const config = getRemoteContentConfig();
      const normalizedResult = await fetchRemoteTitlesGraph();
      let remoteError = normalizedResult?.error || null;

      if (!normalizedResult?.error && Array.isArray(normalizedResult?.data)) {
        saveJson(projectsCacheKey, normalizedResult.data);

        if (normalizedResult.data.length || !config.allowLegacyTitlesFallback) {
          return { data: normalizedResult.data, source: 'remote', error: null };
        }
      }

      if (config.allowLegacyTitlesFallback) {
        const legacyResult = await fetchRemoteContentEntry(titlesEntryKey);
        const legacyPayload = legacyResult?.data?.payload;
        if (!legacyResult?.error && Array.isArray(legacyPayload) && legacyPayload.length) {
          saveJson(projectsCacheKey, legacyPayload);
          return { data: legacyPayload, source: 'legacy', error: remoteError };
        }
        remoteError = remoteError || legacyResult?.error || null;
      }

      if (config.allowCachedCatalogFallback && Array.isArray(cached)) {
        return { data: cached, source: 'cache', error: remoteError };
      }

      if (config.allowLocalCatalogSeedFallback) {
        const seed = Array.isArray(fallbackProjects) ? fallbackProjects : [];
        saveJson(projectsCacheKey, seed);
        return { data: seed, source: 'seed', error: remoteError };
      }

      saveJson(projectsCacheKey, []);
      return { data: [], source: 'empty', error: remoteError };
    },

    async loadProjects(options = {}) {
      const result = await this.loadProjectsWithMeta(options);
      return result.data;
    },

    async persistProjects(projects = []) {
      const payload = Array.isArray(projects) ? projects : [];
      const result = await replaceRemoteTitlesGraph(payload);
      if (result?.error) {
        console.warn('Remote normalized titles sync failed:', result.error);
        return result;
      }
      return finalizeRemoteWrite(
        () => saveCachedProjects(projectsCacheKey, payload),
        result,
        'Не удалось синхронизировать каталог с Supabase. Проверь подключение и повтори попытку.'
      );
    },

    async persistProject(project = null) {
      if (!project || typeof project !== 'object') return { data: null, error: null };
      const nextProjects = upsertProjectInList(getCachedProjects(projectsCacheKey), project);
      const result = await upsertRemoteTitleGraph(project);
      if (result?.error) {
        console.warn('Remote title sync failed:', result.error);
        return result;
      }
      return finalizeRemoteWrite(
        () => saveCachedProjects(projectsCacheKey, nextProjects),
        result,
        'Не удалось сохранить тайтл в Supabase. Проверь вход и повтори попытку.'
      );
    },

    async persistProjectsBatch(projects = []) {
      const payload = Array.isArray(projects) ? projects.filter(item => item && typeof item === 'object') : [];
      if (!payload.length) return { data: [], error: null };
      let nextProjects = getCachedProjects(projectsCacheKey);
      payload.forEach(project => {
        nextProjects = upsertProjectInList(nextProjects, project);
      });
      const result = await upsertRemoteTitlesBatch(payload);
      if (result?.error) {
        console.warn('Remote batch title sync failed:', result.error);
        return result;
      }
      return finalizeRemoteWrite(
        () => saveCachedProjects(projectsCacheKey, nextProjects),
        result,
        'Не удалось сохранить связанные тайтлы в Supabase. Повтори попытку.'
      );
    },

    async removeProject(titleId) {
      const nextProjects = removeProjectFromList(getCachedProjects(projectsCacheKey), titleId);
      const result = await deleteRemoteTitleGraph(titleId);
      if (result?.error) {
        console.warn('Remote title delete failed:', result.error);
        return result;
      }
      return finalizeRemoteWrite(
        () => saveCachedProjects(projectsCacheKey, nextProjects),
        result,
        'Не удалось удалить тайтл из Supabase. Повтори попытку.'
      );
    },

    async loadAboutContentWithMeta({ fallbackAbout = {} } = {}) {
      const cached = readJson(aboutCacheKey, null);
      const { data, error } = await fetchRemoteContentEntry(aboutEntryKey);
      const remotePayload = data?.payload;

      if (!error && isPlainObject(remotePayload)) {
        saveJson(aboutCacheKey, remotePayload);
        return { data: remotePayload, source: 'remote', error: null };
      }

      if (isPlainObject(cached)) return { data: cached, source: 'cache', error: error || null };
      saveJson(aboutCacheKey, fallbackAbout);
      return { data: isPlainObject(fallbackAbout) ? fallbackAbout : {}, source: 'seed', error: error || null };
    },

    async loadAboutContent(options = {}) {
      const result = await this.loadAboutContentWithMeta(options);
      return result.data;
    },

    async persistAboutContent(aboutContent = {}) {
      const payload = isPlainObject(aboutContent) ? aboutContent : {};
      const result = await upsertRemoteContentEntry({ key: aboutEntryKey, payload });
      if (result?.error) {
        console.warn('Remote about sync failed:', result.error);
        return result;
      }
      return finalizeRemoteWrite(
        () => saveJson(aboutCacheKey, payload),
        result,
        'Не удалось сохранить раздел «О нас» в Supabase. Повтори попытку.'
      );
    }
  };
}
