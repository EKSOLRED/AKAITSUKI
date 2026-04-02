export const supabaseDbAdapter = {
  mode: 'supabase',

  getState() {
    throw new Error('Supabase adapter is not connected yet. Switch appConfig.dataMode back to "local".');
  },

  updateState() {
    throw new Error('Supabase adapter is not connected yet. Switch appConfig.dataMode back to "local".');
  },

  resetState() {
    throw new Error('Supabase adapter is not connected yet. Reset is not available in Supabase adapter scaffold.');
  },
};
