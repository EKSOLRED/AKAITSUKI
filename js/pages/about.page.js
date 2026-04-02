export function renderAboutPage(ctx) {
  const { app, aboutService, escapeHtml } = ctx;

  const about = aboutService.get();
  app.innerHTML = `
    <section class="page" data-page="about">
      <section class="section-card glass about-layout">
        <div class="about-copy glass-soft">
          <h2 class="section-title">${escapeHtml(about.title || 'Кто мы такие')}</h2>
          <p class="about-text">${escapeHtml(about.description)}</p>
          <div class="about-socials">
            ${(about.socials || []).map((social) => `
              <a
                class="about-social-button"
                href="${escapeHtml(social.href || '#')}"
                target="_blank"
                rel="noreferrer noopener"
                data-tooltip="${escapeHtml(social.label || 'Соцсеть')}"
                aria-label="${escapeHtml(social.label || 'Соцсеть')}"
              >
                ${social.icon
                  ? `<img class="about-social-button__icon" src="${escapeHtml(social.icon)}" alt="" />`
                  : `<span class="about-social-button__fallback" aria-hidden="true">${escapeHtml((social.label || '•').slice(0, 1).toUpperCase())}</span>`}
              </a>
            `).join('')}
          </div>
        </div>
        <div class="about-team glass-soft">
          <h3>Команда</h3>
          <div class="team-list">
            ${about.team.map((member) => `<div class="team-row"><strong>${escapeHtml(member.name)}${member.nick ? ` (${escapeHtml(member.nick)})` : ''}</strong><span>— ${escapeHtml(member.role)}</span></div>`).join('') || '<div class="loading-state">Команда пока не заполнена.</div>'}
          </div>
        </div>
      </section>
    </section>
  `;
}