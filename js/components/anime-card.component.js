import { getPosterUrl } from '../services/media.service.js';

export function renderGenreChips(root, item, ctx) {
  const { pageState } = ctx;
  const wrap = root.querySelector('.anime-card__genres');
  if (!wrap) return;
  wrap.innerHTML = '';

  const expanded = pageState.expandedCardGenres.has(item.id);
  const list = expanded ? item.genres : item.genres.slice(0, 3);

  list.forEach((genre) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = genre;
    wrap.append(chip);
  });

  if ((item.genres || []).length > 3) {
    const button = document.createElement('button');
    button.className = 'genre-toggle';
    button.type = 'button';
    button.dataset.action = 'toggle-genres';
    button.dataset.id = item.id;
    button.textContent = expanded ? 'Свернуть' : '•••';
    wrap.append(button);
  }
}

function createElementFromHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function createAnimeCard(item, ctx) {
  const {
    authService,
    favoritesService,
    animeCardTemplate,
    createFavoriteButton,
    getEpisodesLabel,
  } = ctx;

  const user = authService.getCurrentUser();
  const favoriteActive = favoritesService.isFavorite(user?.id, item.id);
  const fragment = animeCardTemplate.content.cloneNode(true);
  const root = fragment.querySelector('.anime-card');

  root.dataset.id = item.id;
  const poster = root.querySelector('.anime-card__poster');
  poster.src = getPosterUrl(item);
  poster.alt = item.title;
  poster.loading = 'lazy';
  poster.decoding = 'async';
  poster.referrerPolicy = 'no-referrer';
  root.querySelector('.anime-card__title').textContent = item.title;
  root.querySelector('.anime-card__description').textContent = item.description;
  root.querySelector('.anime-card__status').textContent = item.displayStatus;
  root.querySelector('.anime-card__year').textContent = item.releaseLabel || `${item.year}`;
  root.querySelector('.anime-card__episodes').textContent = `${getEpisodesLabel(item)} эп.`;
  root.querySelector('[data-action="details"]').dataset.id = item.id;

  const favoriteBtn = root.querySelector('[data-action="favorite"]');
  favoriteBtn.replaceWith(createElementFromHTML(createFavoriteButton(item.id, favoriteActive)));

  renderGenreChips(root, item, ctx);
  return root;
}
