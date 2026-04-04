import { favoritesApi } from '../api/favorites.api.js';
import { animeService } from './anime.service.js';

export const favoritesService = {
  getUserFavorites(userId) {
    if (!userId) return [];
    const favoriteIds = favoritesApi.getFavoriteIdsByUser(userId);
    return favoriteIds.map((id) => animeService.getById(id)).filter(Boolean);
  },

  isFavorite(userId, animeId) {
    if (!userId) return false;
    return favoritesApi.isFavorite(userId, animeId);
  },

  toggle(userId, animeId) {
    if (!userId) {
      throw new Error('Для работы с избранным нужно войти в аккаунт');
    }

    return favoritesApi.toggleFavorite(userId, animeId);
  },
};
