import { escapeHtml, formatMinutes, isSafeImageSrc, plural } from './utils.js';
import { isFavorite } from './storage.js';
import { getCategory } from './data.js';

export const PLACEHOLDER_IMAGE = 'images/recipe-placeholder.svg';

export function imageSrc(recipe) {
  return isSafeImageSrc(recipe.image) ? recipe.image : PLACEHOLDER_IMAGE;
}

export function favButtonHtml(recipe, { labelled = false, extraClass = '' } = {}) {
  const fav = isFavorite(recipe.id);
  const icon = `<span class="fav-btn__icon" aria-hidden="true">${fav ? '♥' : '♡'}</span>`;
  if (labelled) {
    return `<button class="btn btn--ghost fav-btn ${extraClass}" type="button" data-fav="${escapeHtml(recipe.id)}"
      aria-pressed="${fav}">${icon} ${fav ? 'В обраному' : 'Додати в обране'}</button>`;
  }
  const label = fav ? `Прибрати «${recipe.title}» з обраного` : `Додати «${recipe.title}» в обране`;
  return `<button class="btn btn--icon fav-btn ${extraClass}" type="button" data-fav="${escapeHtml(recipe.id)}"
    aria-pressed="${fav}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon}</button>`;
}

export function recipeCardHtml(recipe) {
  const category = getCategory(recipe.category);
  const total = (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
  const meta = [];
  if (total) meta.push(`<span><span aria-hidden="true">⏱</span> ${escapeHtml(formatMinutes(total))}</span>`);
  if (recipe.servings) meta.push(`<span><span aria-hidden="true">🍽</span> ${recipe.servings} ${plural(recipe.servings, ['порція', 'порції', 'порцій'])}</span>`);
  return `
    <article class="card">
      <div class="card__media"><img src="${escapeHtml(imageSrc(recipe))}" alt="" loading="lazy" width="400" height="250"></div>
      <div class="card__body">
        ${category ? `<p class="card__category">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</p>` : ''}
        <h3 class="card__title"><a class="card__link" href="#/recipe/${encodeURIComponent(recipe.id)}">${escapeHtml(recipe.title)}</a></h3>
        ${recipe.description ? `<p class="card__desc">${escapeHtml(recipe.description)}</p>` : ''}
        ${meta.length ? `<p class="card__meta">${meta.join('')}</p>` : ''}
      </div>
      ${favButtonHtml(recipe, { extraClass: 'card__fav' })}
    </article>`;
}

export function emptyStateHtml(text, hint = '') {
  return `<div class="empty"><p class="empty__text">${escapeHtml(text)}</p>${hint ? `<p class="empty__hint">${escapeHtml(hint)}</p>` : ''}</div>`;
}

export function renderCards(container, recipes, empty) {
  container.innerHTML = recipes.length
    ? recipes.map(recipeCardHtml).join('')
    : emptyStateHtml(empty.text, empty.hint);
  container.classList.toggle('card-grid--empty', recipes.length === 0);
}
