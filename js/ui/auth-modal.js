import { authService } from '../services/auth.service.js';
import { showToast } from './toast.js';

export function setupAuthModal({ onSuccess }) {
  const modal = document.getElementById('authModal');
  const content = document.getElementById('authContent');
  const tabs = [...document.querySelectorAll('[data-auth-tab]')];
  let activeTab = 'login';
  let isResetMode = false;

  function open(tab = 'login') {
    activeTab = tab;
    isResetMode = false;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    render();
  }

  function close() {
    isResetMode = false;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function render() {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.authTab === activeTab));

    content.innerHTML = isResetMode
      ? `
        <form class="auth-form" id="resetForm">
          <h3>Восстановить пароль</h3>
          <p>Если аккаунт существует, Supabase отправит письмо для восстановления пароля.</p>
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Новый пароль" required minlength="8" />
          <input class="input" name="confirmPassword" type="password" placeholder="Повтори новый пароль" required minlength="8" />
          <button class="button button--primary" type="submit">Сохранить новый пароль</button>
          <button class="button button--ghost" type="button" id="backToLoginButton">Назад ко входу</button>
        </form>
      `
      : activeTab === 'login'
      ? `
        <form class="auth-form" id="loginForm">
          <h3>С возвращением</h3>
          <p>Войди в библиотеку и продолжай смотреть избранные тайтлы.</p>
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Пароль" required />
          <button class="button button--primary" type="submit">Войти</button>
          <button class="auth-link-button" type="button" id="forgotPasswordButton">Забыли пароль?</button>
          <div class="help-text">Нет аккаунта? Перейди на вкладку «Регистрация».</div>
        </form>
      `
      : `
        <form class="auth-form" id="registerForm">
          <h3>Создать аккаунт</h3>
          <p>Создай аккаунт, чтобы сохранять избранное, оценки и получать доступ к возможностям сайта.</p>
          <input class="input" name="name" type="text" placeholder="Имя" required minlength="2" />
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Пароль" required minlength="8" />
          <button class="button button--primary" type="submit">Зарегистрироваться</button>
        </form>
      `;

    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('resetForm')?.addEventListener('submit', handleResetPassword);
    document.getElementById('forgotPasswordButton')?.addEventListener('click', () => {
      isResetMode = true;
      render();
    });
    document.getElementById('backToLoginButton')?.addEventListener('click', () => {
      isResetMode = false;
      activeTab = 'login';
      render();
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await authService.login(form.get('email'), form.get('password'));
      showToast('Вход выполнен');
      close();
      onSuccess();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await authService.register({
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

  async function handleResetPassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await authService.resetPassword({
        email: form.get('email'),
        password: form.get('password'),
        confirmPassword: form.get('confirmPassword'),
      });
      showToast('Если аккаунт существует, проверь почту. Для входа после регистрации тоже сначала нужно подтвердить email.');
      isResetMode = false;
      activeTab = 'login';
      render();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      isResetMode = false;
      activeTab = tab.dataset.authTab;
      render();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal]')) close();
  });

  return { open, close };
}
