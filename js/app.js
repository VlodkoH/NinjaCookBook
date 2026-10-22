import { loadDatabase, getAllRecipes, getRecipe, getDevice } from './data.js';
import { toggleFavorite, migrateLegacyRecipes } from './storage.js';
import { initTheme } from './theme.js';
import { initHome, renderHome, renderCategory } from './views/home.js';
import { renderRecipe, refreshFavoriteButton, isEditing, confirmLeaveEdit } from './views/recipe.js';
import { initAddDialog, openAddDialog } from './add-recipe.js';
import { releaseWakeLock } from './wakelock.js';
import { plural } from './utils.js';

const views = {
  loading: document.getElementById('view-loading'),
  error: document.getElementById('view-error'),
  home: document.getElementById('view-home'),
  category: document.getElementById('view-category'),
  recipe: document.getElementById('view-recipe'),
  notfound: document.getElementById('view-notfound')
};
const main = document.getElementById('main');
const toast = document.getElementById('toast');
let ready = false;
let toastTimer = null;
let firstRoute = true;
let currentHash = location.hash;
let restoringHash = false;

function show(name) {
  Object.entries(views).forEach(([key, node]) => node.classList.toggle('hidden', key !== name));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

function updateCount() {
  const n = getAllRecipes().length;
  document.getElementById('recipes-count').textContent = `${n} ${plural(n, ['рецепт', 'рецепти', 'рецептів'])}`;
}

function focusView(target) {
  if (firstRoute) return;
  (target || main).focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function route() {
  if (!ready) return;
  releaseWakeLock();
  const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [section, id] = hash.split('/');

  if (section === 'recipe' && id) {
    const recipe = getRecipe(id);
    if (!recipe) {
      show('notfound');
      document.title = 'Рецепт не знайдено — NinjaCookBook';
    } else {
      renderRecipe(recipe, {
        onDeleted: () => {
          showToast('Рецепт видалено');
          updateCount();
          location.hash = '#/';
        },
        onSaved: (saved) => {
          document.title = `${saved.title} — NinjaCookBook`;
          showToast('Рецепт збережено');
        },
        onReset: () => {
          showToast('Відновлено початкову версію');
          route();
        }
      });
      show('recipe');
      document.title = `${recipe.title} — NinjaCookBook`;
      focusView(document.getElementById('recipe-title'));
    }
  } else if (section === 'category' && id) {
    if (renderCategory(id)) {
      show('category');
      document.title = `${document.getElementById('category-title').textContent} — NinjaCookBook`;
      focusView(document.getElementById('category-title'));
    } else {
      show('notfound');
    }
  } else {
    renderHome();
    show('home');
    document.title = 'NinjaCookBook — рецепти для Ninja Foodi OL650EU';
    focusView();
  }
  firstRoute = false;
}

function onFavoriteClick(e) {
  const btn = e.target.closest('[data-fav]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.fav;
  const added = toggleFavorite(id);
  showToast(added ? 'Додано в обране' : 'Прибрано з обраного');
  if (!views.recipe.classList.contains('hidden')) {
    refreshFavoriteButton();
    return;
  }
  const inFavoritesList = btn.closest('#favorites-list');
  if (!views.home.classList.contains('hidden')) renderHome();
  else if (!views.category.classList.contains('hidden')) route();
  // Restore focus to the same recipe's button after re-render, or to the section heading.
  const sameButton = [...document.querySelectorAll('[data-fav]')].find((b) => b.dataset.fav === id && !b.closest('.hidden'));
  if (sameButton && !inFavoritesList) sameButton.focus();
  else document.getElementById('favorites-title').focus();
}

async function start() {
  show('loading');
  try {
    await loadDatabase();
  } catch (err) {
    console.warn('Recipes load failed:', err);
    document.getElementById('error-message').textContent = err.message;
    show('error');
    return;
  }
  migrateLegacyRecipes();
  const device = getDevice();
  if (device) document.getElementById('device-model').textContent = device;
  ready = true;
  updateCount();
  route();
}

function setSwStatus(text) {
  document.getElementById('sw-status').textContent = text;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    setSwStatus('Офлайн-режим недоступний у цьому браузері');
    return;
  }
  navigator.serviceWorker.register('service-worker.js').then((reg) => {
    const update = () => setSwStatus(navigator.serviceWorker.controller || reg.active
      ? 'Офлайн-режим готовий'
      : 'Офлайн-режим: підготовка…');
    update();
    navigator.serviceWorker.addEventListener('controllerchange', update);
    (reg.installing || reg.waiting)?.addEventListener('statechange', update);
  }).catch((err) => {
    console.warn('Service Worker registration failed:', err);
    setSwStatus('Офлайн-режим недоступний');
  });
}

initTheme(document.getElementById('theme-toggle'));
initHome();
initAddDialog((recipe) => {
  updateCount();
  showToast('Рецепт збережено');
  location.hash = `#/recipe/${encodeURIComponent(recipe.id)}`;
});
document.getElementById('btn-add').addEventListener('click', () => {
  if (ready) openAddDialog();
  else showToast('Зачекайте, рецепти ще завантажуються');
});
document.getElementById('btn-retry').addEventListener('click', start);
document.addEventListener('click', onFavoriteClick);
window.addEventListener('hashchange', () => {
  if (restoringHash) {
    restoringHash = false;
    return;
  }
  if (isEditing() && !confirmLeaveEdit()) {
    restoringHash = true;
    location.hash = currentHash;
    return;
  }
  currentHash = location.hash;
  route();
});
window.addEventListener('storage', () => { if (ready && !isEditing()) { updateCount(); route(); } });

registerServiceWorker();
start();
