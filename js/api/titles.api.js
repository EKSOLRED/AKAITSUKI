import { titlesRepository } from '../repositories/titles.repository.js';

export const titlesApi = {
  listTitles: () => titlesRepository.list(),
  getTitleById: (id) => titlesRepository.getById(id),
  createTitle: (title) => titlesRepository.create(title),
  updateTitle: (id, title) => titlesRepository.update(id, title),
  removeTitle: (id) => titlesRepository.remove(id),
  getRatings: (titleId) => titlesRepository.getRatings(titleId),
  setRating: (titleId, userId, value) => titlesRepository.setRating(titleId, userId, value),
};
