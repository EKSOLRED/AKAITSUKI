export function renderHomePage(ctx) {
  const { app, animeService, getDb, createAnimeCard, bindGridInteractions } = ctx;

  const latest = animeService.getLatestReleased(4);
  const topAnime = animeService.getTopRated('anime', 4);
  const topSeries = animeService.getTopRated('series', 4);
  app.innerHTML = `
    <section class="page home-page" data-page="home">
      <section class="hero glass">
        <div>
          <span class="badge">Библиотека команды озвучки</span>
          <h1 class="hero__title">AKAITSUKI — современный каталог озвученного аниме</h1>
          <p class="hero__subtitle">Удобный просмотр тайтлов, избранное, оценки пользователей и живая интеграция с Supabase для командной публикации релизов.</p>
          <div class="hero__stats">
            <div class="stat-card"><strong>${animeService.list({ kind: 'anime' }).length}</strong><span>аниме в библиотеке</span></div>
            <div class="stat-card"><strong>${animeService.list({ kind: 'series' }).length}</strong><span>сериалов в библиотеке</span></div>
            <div class="stat-card"><strong>${getDb().users.length}</strong><span>пользователей в системе</span></div>
          </div>
        </div>
        <aside class="hero__panel glass">
          <h2>Что уже есть</h2>
          <p>Рабочая витрина проекта с каталогом, пользовательскими данными и админ-панелью поверх Supabase.</p>
          <ul>
            <li>Каталог + поиск + фильтры</li>
            <li>Избранное по пользователю</li>
            <li>Аниме и сериалы в одной структуре</li>
            <li>Админка и контент на Supabase без лишнего слоя костылей</li>
          </ul>
          <button class="button button--primary" id="heroCatalogButton">Перейти в каталог</button>
        </aside>
      </section>

      <section class="section-card glass">
        <div class="section-header compact-header"><div><h2 class="section-title">Новые вышедшие серии</h2><p class="section-subtitle">Свежие обновления по аниме и сериалам.</p></div></div>
        <div class="catalog-grid" id="homeLatestGrid"></div>
      </section>

      <section class="section-card glass">
        <div class="section-header compact-header"><div><h2 class="section-title">Топ аниме</h2><p class="section-subtitle">Тайтлы со средней оценкой 7.0 и выше.</p></div></div>
        <div class="catalog-grid" id="homeTopGrid"></div>
      </section>

      <section class="section-card glass">
        <div class="section-header compact-header"><div><h2 class="section-title">Топ сериалы</h2><p class="section-subtitle">Сериалы со средней оценкой 7.0 и выше.</p></div></div>
        <div class="catalog-grid" id="homeTopSeriesGrid"></div>
      </section>
    </section>
  `;
  const latestGrid = document.getElementById('homeLatestGrid');
  latest.forEach((item) => latestGrid.append(createAnimeCard(item)));
  if (!latest.length) latestGrid.innerHTML = `<div class="empty-state glass"><h3>Здесь пока пусто</h3></div>`;
  const topGrid = document.getElementById('homeTopGrid');
  topAnime.forEach((item) => topGrid.append(createAnimeCard(item)));
  if (!topAnime.length) topGrid.innerHTML = `<div class="empty-state glass"><h3>Пока нет аниме с рейтингом 7.0+</h3></div>`;

  const topSeriesGrid = document.getElementById('homeTopSeriesGrid');
  topSeries.forEach((item) => topSeriesGrid.append(createAnimeCard(item)));
  if (!topSeries.length) topSeriesGrid.innerHTML = `<div class="empty-state glass"><h3>Пока нет сериалов с рейтингом 7.0+</h3></div>`;

  bindGridInteractions(app.querySelector('[data-page="home"]'), 'catalog');
  document.getElementById('heroCatalogButton')?.addEventListener('click', () => { location.hash = '#/catalog'; });
}