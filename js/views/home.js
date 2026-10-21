import { getAllRecipes, getCategories, getCategory } from '../data.js';
import { getFavorites, getRecent, clearRecent } from '../storage.js';
import { escapeHtml, normalizeText, plural } from '../utils.js';
import { renderCards } from '../components.js';

const el = {
  input: document.getElementById('search-input'),
  form: document.getElementById('search-form'),
  clear: document.getElementById('search-clear'),
  results: document.getElementById('search-results'),
  status: document.getElementById('search-status'),
  list: document.getElementById('search-list'),
  blocks: document.getElementById('home-blocks'),
  categories: document.getElementById('category-list'),
  favorites: document.getElementById('favorites-list'),
  recent: document.getElementById('recent-list'),
  clearRecent: document.getElementById('btn-clear-recent'),
  categoryTitle: document.getElementById('category-title'),
  categoryRecipes: document.getElementById('category-recipes')
};

function haystack(recipe) {
  const category = getCategory(recipe.category);
  return normalizeText([
    recipe.title,
    recipe.description,
    category?.name,
    ...recipe.tags,
    ...recipe.ingredients.map((i) => i.name)
  ].join(' '));
}

export function searchRecipes(query) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return getAllRecipes()
    .map((recipe) => {
      const text = haystack(recipe);
      if (!terms.every((t) => text.includes(t))) return null;
      const titleHit = terms.some((t) => normalizeText(recipe.title).includes(t));
      return { recipe, score: titleHit ? 0 : 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.recipe.title.localeCompare(b.recipe.title, 'uk'))
    .map((x) => x.recipe);
}

function byIds(ids) {
  const all = getAllRecipes();
  return ids.map((id) => all.find((r) => r.id === id)).filter(Boolean);
}

function renderSearch() {
  const query = el.input.value;
  const active = query.trim().length > 0;
  el.clear.classList.toggle('hidden', !active);
  el.results.classList.toggle('hidden', !active);
  el.blocks.classList.toggle('hidden', active);
  if (!active) return;
  const found = searchRecipes(query);
  el.status.textContent = found.length
    ? `Знайдено ${found.length} ${plural(found.length, ['рецепт', 'рецепти', 'рецептів'])}`
    : '';
  renderCards(el.list, found, {
    text: 'Нічого не знайдено',
    hint: 'Спробуйте змінити запит: інша назва страви, інгредієнт (наприклад, «рис») або коротше слово.'
  });
}

function renderCategories() {
  const all = getAllRecipes();
  el.categories.innerHTML = getCategories().map((c) => {
    const count = all.filter((r) => r.category === c.id).length;
    const name = escapeHtml(c.name);
    const icon = `<span class="category__icon" aria-hidden="true">${escapeHtml(c.icon)}</span>`;
    if (!count) {
      return `<li><div class="category category--soon" aria-label="${name}: скоро">${icon}
        <span class="category__name">${name}</span><span class="badge">Скоро</span></div></li>`;
    }
    return `<li><a class="category" href="#/category/${encodeURIComponent(c.id)}">${icon}
      <span class="category__name">${name}</span>
      <span class="category__count">${count} ${plural(count, ['рецепт', 'рецепти', 'рецептів'])}</span></a></li>`;
  }).join('');
}

export function renderHome() {
  renderCategories();
  renderCards(el.favorites, byIds(getFavorites()), {
    text: 'Додайте рецепт в обране, натиснувши ♡',
    hint: 'Обрані рецепти зберігаються на цьому пристрої й доступні офлайн.'
  });
  const recent = byIds(getRecent());
  renderCards(el.recent, recent, {
    text: 'Тут з’являться рецепти, які ви відкривали',
    hint: 'Відкрийте будь-який рецепт — і він залишиться тут для швидкого доступу.'
  });
  el.clearRecent.classList.toggle('hidden', recent.length === 0);
  renderSearch();
}

export function renderCategory(id) {
  const category = getCategory(id);
  if (!category) return false;
  el.categoryTitle.textContent = `${category.icon} ${category.name}`;
  const recipes = getAllRecipes()
    .filter((r) => r.category === id)
    .sort((a, b) => a.title.localeCompare(b.title, 'uk'));
  renderCards(el.categoryRecipes, recipes, {
    text: 'У цій категорії поки немає рецептів',
    hint: 'Скоро тут з’являться нові страви.'
  });
  return true;
}

export function initHome() {
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    el.input.blur();
  });
  el.input.addEventListener('input', renderSearch);
  el.input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.input.value) {
      e.preventDefault();
      el.input.value = '';
      renderSearch();
    }
  });
  el.clear.addEventListener('click', () => {
    el.input.value = '';
    renderSearch();
    el.input.focus();
  });
  el.clearRecent.addEventListener('click', () => {
    clearRecent();
    renderHome();
    document.getElementById('recent-title').focus?.();
  });
}
