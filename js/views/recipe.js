import { getCategory } from '../data.js';
import { addRecent, getChecked, setChecked, deleteUserRecipe } from '../storage.js';
import { escapeHtml, formatMinutes, formatNumber, plural, scaleAmount } from '../utils.js';
import { favButtonHtml, imageSrc } from '../components.js';
import { wakeLockSupported, setWakeLock, isActive as wakeLockActive } from '../wakelock.js';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

const container = document.getElementById('view-recipe');
let current = null;
let servings = null;

function amountText(ingredient, factor) {
  if (ingredient.amount === null) return '';
  const min = scaleAmount(ingredient.amount, factor, ingredient.unit);
  const max = ingredient.amountMax !== null ? scaleAmount(ingredient.amountMax, factor, ingredient.unit) : null;
  const value = max !== null && max !== min ? `${formatNumber(min)}–${formatNumber(max)}` : formatNumber(min);
  return `${value}${ingredient.unit ? ' ' + ingredient.unit : ''}`;
}

function ingredientsHtml() {
  const factor = current.servings && servings ? servings / current.servings : 1;
  const checked = new Set(getChecked(current.id));
  return current.ingredients.map((ing, i) => {
    const id = `ing-${i}`;
    const amount = amountText(ing, factor);
    return `<li class="ingredient">
      <input type="checkbox" id="${id}" data-ing="${i}" ${checked.has(i) ? 'checked' : ''}>
      <label for="${id}">
        <span class="ingredient__name">${escapeHtml(ing.name)}</span>
        ${amount ? `<span class="ingredient__amount">${escapeHtml(amount)}</span>` : ''}
        ${ing.note ? `<span class="ingredient__note">${escapeHtml(ing.note)}</span>` : ''}
      </label>
    </li>`;
  }).join('');
}

function paramsHtml(step) {
  const rows = [];
  if (step.mode) rows.push(['Режим', step.mode]);
  if (step.pressure) rows.push(['Тиск', step.pressure]);
  if (step.temperature) rows.push([step.mode === 'Sear/Sauté' ? 'Рівень' : 'Температура', step.temperature]);
  if (step.minutes !== null && step.mode) rows.push(['Час', formatMinutes(step.minutes, step.minutesMax)]);
  if (step.valve) rows.push(['Клапан', step.valve]);
  if (!rows.length) return '';
  return `<dl class="params" aria-label="Параметри мультиварки">${rows
    .map(([k, v]) => `<div class="params__item"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`)
    .join('')}</dl>`;
}

function stepsHtml() {
  let lastStage = null;
  let html = '';
  let open = false;
  current.steps.forEach((step, i) => {
    if (step.stage !== lastStage) {
      if (open) html += '</ol>';
      if (step.stage) html += `<h3 class="stage-title">${escapeHtml(step.stage)}</h3>`;
      html += `<ol class="steps" role="list" start="${i + 1}">`;
      open = true;
      lastStage = step.stage;
    }
    html += `<li class="step${step.verified ? '' : ' step--unverified'}" data-n="${i + 1}">
      <div class="step__body">
        <p class="step__text">${escapeHtml(step.text)}</p>
        ${paramsHtml(step)}
        ${step.note ? `<p class="step__note">${escapeHtml(step.note)}</p>` : ''}
        ${step.verified ? '' : '<p class="badge badge--warn"><span aria-hidden="true">⚠️</span> Перевірте за інструкцією</p>'}
      </div>
    </li>`;
  });
  if (open) html += '</ol>';
  return html;
}

function servingsNoticeHtml() {
  if (!current.servings || servings === current.servings) return '';
  return `<p class="notice" role="note">Кількість води в кроках і час наведено для базових ${current.servings} ${plural(current.servings, ['порції', 'порцій', 'порцій'])}. Перераховано лише інгредієнти. Під час готування рису чашу не можна заповнювати більш ніж наполовину, а для тиску — вище лінії PRESSURE MAX.</p>`;
}

function render() {
  const r = current;
  const category = getCategory(r.category);
  const facts = [];
  if (r.prepMinutes) facts.push(['Підготовка', formatMinutes(r.prepMinutes)]);
  if (r.cookMinutes) facts.push(['Готування', `≈ ${formatMinutes(r.cookMinutes)}`]);
  if (r.servings) facts.push(['Порцій', String(r.servings)]);

  container.innerHTML = `
    <a class="btn btn--ghost back-link" href="#/"><span aria-hidden="true">←</span> До рецептів</a>
    <header class="recipe__header">
      <div class="recipe__media"><img src="${escapeHtml(imageSrc(r))}" alt="" width="800" height="500"></div>
      <div class="recipe__intro">
        ${category ? `<p class="card__category">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</p>` : ''}
        <h1 id="recipe-title" class="page-title" tabindex="-1">${escapeHtml(r.title)}</h1>
        ${r.description ? `<p class="recipe__desc">${escapeHtml(r.description)}</p>` : ''}
        ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>` : ''}
        ${r.cookMinutes ? '<p class="recipe__hint">Час готування не враховує набір тиску (на дисплеї «PrE»).</p>' : ''}
        <div class="recipe__actions">
          <span data-fav-slot>${favButtonHtml(r, { labelled: true })}</span>
          ${wakeLockSupported ? `<button id="btn-wakelock" class="btn btn--ghost" type="button" aria-pressed="${wakeLockActive()}">
            <span aria-hidden="true">💡</span> Не вимикати екран</button>` : ''}
          ${r.userAdded ? '<button id="btn-delete" class="btn btn--danger" type="button">Видалити рецепт</button>' : ''}
        </div>
        ${r.userAdded ? '<p class="badge badge--warn">Власний рецепт: параметри не перевірені за інструкцією</p>' : ''}
      </div>
    </header>

    <div class="recipe__columns">
      <section class="panel" aria-labelledby="ingredients-title">
        <div class="panel__head">
          <h2 id="ingredients-title" class="section__title">Інгредієнти</h2>
          ${r.servings ? `<div class="servings" role="group" aria-label="Кількість порцій">
            <button class="btn btn--icon" type="button" data-servings="-1" aria-label="Менше порцій" ${servings <= MIN_SERVINGS ? 'disabled' : ''}>−</button>
            <output id="servings-value" class="servings__value" aria-live="polite">${servings} ${plural(servings, ['порція', 'порції', 'порцій'])}</output>
            <button class="btn btn--icon" type="button" data-servings="1" aria-label="Більше порцій" ${servings >= MAX_SERVINGS ? 'disabled' : ''}>+</button>
          </div>` : ''}
        </div>
        <div id="servings-notice">${servingsNoticeHtml()}</div>
        <ul id="ingredient-list" class="ingredients" role="list">${ingredientsHtml()}</ul>
        <button id="btn-reset-checks" class="btn btn--ghost btn--small" type="button">Зняти всі позначки</button>
      </section>

      <section class="panel" aria-labelledby="steps-title">
        <h2 id="steps-title" class="section__title">Приготування</h2>
        ${stepsHtml()}
      </section>
    </div>

    ${r.tips.length ? `<section class="panel tips" aria-labelledby="tips-title">
      <h2 id="tips-title" class="section__title"><span aria-hidden="true">💡</span> Поради</h2>
      <ul>${r.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    </section>` : ''}`;
}

function updateServings(delta, pressed) {
  servings = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, servings + delta));
  container.querySelector('#ingredient-list').innerHTML = ingredientsHtml();
  container.querySelector('#servings-value').textContent = `${servings} ${plural(servings, ['порція', 'порції', 'порцій'])}`;
  container.querySelector('#servings-notice').innerHTML = servingsNoticeHtml();
  const [minus, plus] = container.querySelectorAll('[data-servings]');
  minus.disabled = servings <= MIN_SERVINGS;
  plus.disabled = servings >= MAX_SERVINGS;
  // A disabled button drops focus to <body>; move it to the opposite button instead.
  if (pressed?.disabled) (pressed === minus ? plus : minus).focus();
}

function saveChecks() {
  const indexes = [...container.querySelectorAll('[data-ing]:checked')].map((c) => Number(c.dataset.ing));
  setChecked(current.id, indexes);
}

function updateWakeButton(active) {
  const btn = container.querySelector('#btn-wakelock');
  if (btn) btn.setAttribute('aria-pressed', String(active));
}

export function renderRecipe(recipe, { onDeleted } = {}) {
  current = recipe;
  servings = recipe.servings;
  addRecent(recipe.id);
  render();
  container.onclick = (e) => {
    const sBtn = e.target.closest('[data-servings]');
    if (sBtn) return updateServings(Number(sBtn.dataset.servings), sBtn);
    if (e.target.closest('#btn-reset-checks')) {
      container.querySelectorAll('[data-ing]').forEach((c) => { c.checked = false; });
      return saveChecks();
    }
    if (e.target.closest('#btn-wakelock')) return setWakeLock(!wakeLockActive(), updateWakeButton);
    if (e.target.closest('#btn-delete')) {
      if (window.confirm(`Видалити рецепт «${current.title}»? Цю дію не можна скасувати.`)) {
        deleteUserRecipe(current.id);
        onDeleted?.();
      }
    }
  };
  container.onchange = (e) => {
    if (e.target.matches('[data-ing]')) saveChecks();
  };
}

export function refreshFavoriteButton() {
  if (!current) return;
  const slot = container.querySelector('[data-fav-slot]');
  if (slot) {
    slot.innerHTML = favButtonHtml(current, { labelled: true });
    slot.querySelector('button').focus();
  }
}
