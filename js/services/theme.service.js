import { themeApi } from '../api/theme.api.js';

export const themeService = {
  get() {
    return themeApi.getTheme();
  },

  getTheme() {
    return this.get();
  },

  set(theme) {
    return themeApi.setTheme(theme);
  },

  toggleTheme() {
    const nextTheme = this.get() === 'dark' ? 'light' : 'dark';
    this.set(nextTheme);
    return nextTheme;
  },
};
