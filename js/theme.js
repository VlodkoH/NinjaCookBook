import { getTheme, setTheme } from './storage.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function effectiveTheme() {
  return getTheme() || (media.matches ? 'dark' : 'light');
}

function apply(button) {
  const theme = effectiveTheme();
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
  if (button) {
    const next = theme === 'dark' ? 'світлу' : 'темну';
    button.setAttribute('aria-label', `Увімкнути ${next} тему`);
    button.title = `Увімкнути ${next} тему`;
    button.querySelector('[data-icon]').textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

export function initTheme(button) {
  apply(button);
  button.addEventListener('click', () => {
    setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
    apply(button);
  });
  media.addEventListener('change', () => {
    if (!getTheme()) apply(button);
  });
}
