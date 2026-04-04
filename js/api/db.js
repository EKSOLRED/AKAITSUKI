import { appConfig } from '../config/app.config.js';
import { localDbAdapter } from './local-db.adapter.js';
import { supabaseDbAdapter } from './supabase-db.adapter.js';

const adapters = {
  local: localDbAdapter,
  supabase: supabaseDbAdapter,
};

function resolveAdapter() {
  return adapters[appConfig.dataMode] ?? localDbAdapter;
}

export function getDataAdapter() {
  return resolveAdapter();
}

export function getDb() {
  return resolveAdapter().getState();
}

export function updateDb(updater) {
  return resolveAdapter().updateState(updater);
}

export function resetDb() {
  return resolveAdapter().resetState();
}
