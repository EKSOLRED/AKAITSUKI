import { projects } from './projects.js';

export const sortOptions = [
  { value: 'rating_high', label: 'Высокий рейтинг' },
  { value: 'rating_low', label: 'Низкий рейтинг' },
  { value: 'year', label: 'По году' },
  { value: 'title', label: 'По названию' }
];

export const mediaSortOptions = [
  { value: 'popularity_high', label: 'Высокая популярность' },
  { value: 'release_date', label: 'Дата выхода' }
];

const genreSet = [...new Set(projects.flatMap(project => project.genres || []))]
  .sort((left, right) => left.localeCompare(right, 'ru'));

export const genreOptions = [
  { value: 'all', label: 'Все жанры' },
  ...genreSet.map(genre => ({ value: genre, label: genre }))
];

export const controlsMeta = {
  catalog: {
    eyebrow: 'Каталог',
    title: 'Найди тайтл за пару кликов',
    searchLabel: 'Поиск по каталогу',
    searchPlaceholder: 'Поиск по названию, жанру, описанию...',
    emptyTitle: 'Ничего не найдено',
    emptyText: 'Попробуй сменить фильтр или убрать часть запроса.'
  },
  favorites: {
    eyebrow: 'Избранное',
    title: 'Твои сохранённые тайтлы',
    searchLabel: 'Поиск по избранному',
    searchPlaceholder: 'Поиск по названию, жанру, описанию...',
    emptyTitle: 'Избранное пока пустое',
    emptyText: 'Добавь тайтлы сердечком, и они появятся здесь.'
  }
};
