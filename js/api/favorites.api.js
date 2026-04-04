import { favoritesRepository } from '../repositories/favorites.repository.js';

export const favoritesApi = {
  getFavoriteIdsByUser: (userId) => favoritesRepository.getIdsByUser(userId),
  isFavorite: (userId, titleId) => favoritesRepository.isFavorite(userId, titleId),
  toggleFavorite: (userId, titleId) => favoritesRepository.toggle(userId, titleId),
};
