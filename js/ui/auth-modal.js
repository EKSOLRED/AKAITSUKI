import { authService } from '../services/auth.service.js';
import { showToast } from './toast.js';

export function setupAuthModal({ onSuccess }) {
  const modal = document.getElementById('authModal');
  const content = document.getElementById('authContent');
  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  let activeTab = 'login';

  function open() {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    render();
  }

  function close() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function render() {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.authTab === activeTab));

    content.innerHTML = activeTab === 'login'
      ? `
        <form class="auth-form" id="loginForm">
          <h3>С возвращением</h3>
          <p>Войди в библиотеку и продолжай смотреть избранные тайтлы.</p>
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Пароль" required />
          <button class="button button--primary" type="submit">Войти</button>
          <div class="help-text">Владелец: admin@akaitsuki.local / admin12345</div><div class="help-text">Обычный админ: editor@akaitsuki.local / editor12345</div>
        </form>
      `
      : `
        <form class="auth-form" id="registerForm">
          <h3>Создать аккаунт</h3>
          <p>Локальная регистрация для этапа разработки. Потом это легко меняется на Supabase Auth.</p>
          <input class="input" name="name" type="text" placeholder="Имя" required minlength="2" />
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Пароль" required minlength="8" />
          <button class="button button--primary" type="submit">Зарегистрироваться</button>
        </form>
      `;

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  }

  function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      authService.login(form.get('email'), form.get('password'));
      showToast('Вход выполнен');
      close();
      onSuccess();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function handleRegister(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      authService.register({
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      showToast('Аккаунт создан');
      close();
      onSuccess();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.authTab;
      render();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal]')) close();
  });

  return { open, close };
}
