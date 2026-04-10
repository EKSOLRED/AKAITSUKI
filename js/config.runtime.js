window.APP_CONFIG = {
  // Supabase Auth / Browser client
  supabaseUrl: 'https://pxknxwcwzdekzgxclkop.supabase.co',
  supabaseKey: 'sb_publishable_GI4GnpTwATcKxdq7SPl4JQ_wq70HDuq',
  supabaseAuthStorageKey: 'akaitsuki-auth',

  // Gradual Supabase adoption.
  // Content now uses normalized title tables plus site_content for about-page blocks.
  supabaseSync: {
    enabled: true,
    profiles: true,
    favorites: true,
    ratings: true,
    content: true
  },

  supabaseFunctions: {
    adminRoles: 'admin-roles'
  },

  supabaseTables: {
    profiles: 'profiles',
    favorites: 'favorite_titles',
    ratings: 'title_ratings',
    siteContent: 'site_content',
    titles: 'titles',
    titleAltTitles: 'title_alt_titles',
    titleGenres: 'title_genres',
    titleCategories: 'title_categories',
    titleSeasons: 'title_seasons',
    titleEpisodes: 'title_episodes',
    episodeVoiceovers: 'episode_voiceovers',
    voiceoverPlayers: 'voiceover_players'
  },

  // Production mode: roles must come from app_metadata / JWT only.
  enableLocalAdminFallback: false,

  // Production mode: guest favorites are disabled, only authenticated storage remains.
  allowGuestFavorites: false,

  // Final production pass: catalog prefers Supabase and cached remote data only.
  remoteContent: {
    allowLegacyTitlesFallback: false,
    allowLocalCatalogSeedFallback: false,
    allowCachedCatalogFallback: true
  }
};
