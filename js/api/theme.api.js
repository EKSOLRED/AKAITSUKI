import { themeRepository } from '../repositories/theme.repository.js';

export const themeApi = {
  getTheme: () => themeRepository.get(),
  setTheme: (theme) => themeRepository.set(theme),
};
