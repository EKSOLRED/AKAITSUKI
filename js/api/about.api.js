import { aboutRepository } from '../repositories/about.repository.js';

export const aboutApi = {
  getAbout: () => aboutRepository.get(),
  updateAbout: (payload) => aboutRepository.update(payload),
};
