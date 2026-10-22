import { getCategories } from '../data.js';
import { escapeHtml } from '../utils.js';

const val = (v) => (v === null || v === undefined ? '' : escapeHtml(v));

function field(label, name, value, extra = '') {
  return `<label class="field">${label}<input name="${name}" value="${val(value)}" ${extra}></label>`;
}

function ingredientRow(ing = {}) {
  return `<li class="edit-row" data-row="ingredient">
    <div class="edit-row__fields edit-row__fields--ing">
      <input data-f="name" value="${val(ing.name)}" aria-label="Назва інгредієнта" placeholder="Назва">
      <input data-f="amount" value="${val(ing.amount)}" aria-label="Кількість" placeholder="Кількість" inputmode="decimal">
      <input data-f="amountMax" value="${val(ing.amountMax)}" aria-label="Кількість до (діапазон)" placeholder="до" inputmode="decimal">
      <input data-f="unit" value="${val(ing.unit)}" aria-label="Одиниця виміру" placeholder="Одиниця">
      <input data-f="note" value="${val(ing.note)}" aria-label="Примітка до інгредієнта" placeholder="Примітка">
    </div>
    <button class="btn btn--icon btn--danger" type="button" data-remove aria-label="Видалити інгредієнт">✕</button>
  </li>`;
}

function stepRow(step = {}) {
  return `<li class="edit-row edit-row--step" data-row="step" data-verified="${step.verified === false ? 'false' : 'true'}">
    <div class="edit-row__fields">
      <label class="field">Текст кроку
        <textarea data-f="text" rows="2">${val(step.text)}</textarea>
      </label>
      <div class="edit-row__params">
        <label class="field">Режим<input data-f="mode" value="${val(step.mode)}" placeholder="напр. Pressure Cook"></label>
        <label class="field">Тиск<input data-f="pressure" value="${val(step.pressure)}"></label>
        <label class="field">Температура / рівень<input data-f="temperature" value="${val(step.temperature)}"></label>
        <label class="field">Хвилин<input data-f="minutes" value="${val(step.minutes)}" inputmode="decimal"></label>
        <label class="field">Хвилин до<input data-f="minutesMax" value="${val(step.minutesMax)}" inputmode="decimal"></label>
        <label class="field">Клапан<input data-f="valve" value="${val(step.valve)}" placeholder="SEAL / VENT"></label>
        <label class="field">Етап<input data-f="stage" value="${val(step.stage)}"></label>
        <label class="field">Примітка<input data-f="note" value="${val(step.note)}"></label>
      </div>
    </div>
    <button class="btn btn--icon btn--danger" type="button" data-remove aria-label="Видалити крок">✕</button>
  </li>`;
}

export function editFormHtml(r) {
  const categories = getCategories()
    .map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === r.category ? 'selected' : ''}>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`)
    .join('');
  return `
    <h1 id="recipe-title" class="page-title" tabindex="-1">Редагування рецепта</h1>
    <form id="edit-form" class="edit-form" novalidate>
      ${field('Назва', 'title', r.title, 'required maxlength="120"')}
      <label class="field">Короткий опис
        <textarea name="description" rows="2" maxlength="300">${val(r.description)}</textarea>
      </label>
      <div class="edit-form__row">
        <label class="field">Категорія<select name="category">${categories}</select></label>
        ${field('Порцій', 'servings', r.servings, 'inputmode="numeric"')}
        ${field('Підготовка, хв', 'prepMinutes', r.prepMinutes, 'inputmode="numeric"')}
        ${field('Готування, хв', 'cookMinutes', r.cookMinutes, 'inputmode="numeric"')}
      </div>

      <fieldset class="edit-group">
        <legend>Інгредієнти</legend>
        <ul class="edit-list" id="edit-ingredients" role="list">${r.ingredients.map(ingredientRow).join('')}</ul>
        <button class="btn btn--ghost" type="button" data-add="ingredient">＋ Додати інгредієнт</button>
      </fieldset>

      <fieldset class="edit-group">
        <legend>Кроки приготування</legend>
        <ul class="edit-list" id="edit-steps" role="list">${r.steps.map(stepRow).join('')}</ul>
        <button class="btn btn--ghost" type="button" data-add="step">＋ Додати крок</button>
      </fieldset>

      <label class="field">Поради (одна на рядок)
        <textarea name="tips" rows="3">${val(r.tips.join('\n'))}</textarea>
      </label>
      <p id="edit-error" class="form-error hidden" role="alert"></p>
    </form>`;
}

export function editBarHtml({ canReset }) {
  return `<div class="action-bar" role="group" aria-label="Дії редагування">
    ${canReset ? '<button class="btn btn--ghost" type="button" data-edit-reset>Скинути до оригіналу</button>' : ''}
    <span class="action-bar__spacer"></span>
    <button class="btn btn--ghost" type="button" data-edit-cancel>Відмінити</button>
    <button class="btn btn--primary" type="submit" form="edit-form" data-edit-save>Зберегти</button>
  </div>`;
}

export function viewBarHtml() {
  return `<div class="action-bar action-bar--view">
    <button class="btn btn--primary" type="button" data-edit-start><span aria-hidden="true">✎</span> Редагувати рецепт</button>
  </div>`;
}

/** Handles add/remove row clicks. Returns true when the click was consumed. */
export function handleRowClick(e, container) {
  const add = e.target.closest('[data-add]');
  if (add) {
    const isStep = add.dataset.add === 'step';
    const list = container.querySelector(isStep ? '#edit-steps' : '#edit-ingredients');
    list.insertAdjacentHTML('beforeend', isStep ? stepRow() : ingredientRow());
    list.lastElementChild.querySelector('input, textarea').focus();
    return true;
  }
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    const row = remove.closest('.edit-row');
    const list = row.parentElement;
    const addBtn = list.parentElement.querySelector('[data-add]');
    row.remove();
    addBtn.focus();
    return true;
  }
  return false;
}

function num(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') return { value: null };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? { value: n } : { error: true };
}

function text(raw) {
  const s = String(raw ?? '').trim();
  return s === '' ? null : s;
}

/** Reads the edit form. Returns { recipe } or { error, field }. */
export function readEditForm(form, original) {
  const f = form.elements;
  const title = String(f.title.value).trim();
  if (!title) return { error: 'Вкажіть назву рецепта.', field: f.title };

  const intField = (name, label) => {
    const el = f[name];
    const n = num(el.value);
    if (n.error || (n.value !== null && !Number.isInteger(n.value))) {
      return { error: `Поле «${label}» має бути цілим невід'ємним числом.`, field: el };
    }
    return n;
  };
  const servings = intField('servings', 'Порцій');
  if (servings.error) return servings;
  if (servings.value === 0) return { error: 'Кількість порцій має бути не менше 1.', field: f.servings };
  const prep = intField('prepMinutes', 'Підготовка, хв');
  if (prep.error) return prep;
  const cook = intField('cookMinutes', 'Готування, хв');
  if (cook.error) return cook;

  const ingredients = [];
  for (const row of form.querySelectorAll('[data-row="ingredient"]')) {
    const g = (k) => row.querySelector(`[data-f="${k}"]`);
    const name = text(g('name').value);
    const hasAny = ['amount', 'amountMax', 'unit', 'note'].some((k) => text(g(k).value));
    if (!name && !hasAny) continue;
    if (!name) return { error: 'Вкажіть назву інгредієнта або видаліть порожній рядок.', field: g('name') };
    const amount = num(g('amount').value);
    if (amount.error) return { error: `Некоректна кількість у «${name}».`, field: g('amount') };
    const amountMax = num(g('amountMax').value);
    if (amountMax.error) return { error: `Некоректне значення «до» у «${name}».`, field: g('amountMax') };
    ingredients.push({
      name, amount: amount.value, amountMax: amountMax.value, unit: text(g('unit').value), note: text(g('note').value)
    });
  }
  if (!ingredients.length) return { error: 'Додайте хоча б один інгредієнт.', field: form.querySelector('[data-add="ingredient"]') };

  const steps = [];
  for (const row of form.querySelectorAll('[data-row="step"]')) {
    const g = (k) => row.querySelector(`[data-f="${k}"]`);
    const stepText = text(g('text').value);
    const hasAny = ['mode', 'pressure', 'temperature', 'minutes', 'minutesMax', 'valve', 'stage', 'note'].some((k) => text(g(k).value));
    if (!stepText && !hasAny) continue;
    if (!stepText) return { error: 'Вкажіть текст кроку або видаліть порожній.', field: g('text') };
    const minutes = num(g('minutes').value);
    if (minutes.error) return { error: 'Некоректний час кроку.', field: g('minutes') };
    const minutesMax = num(g('minutesMax').value);
    if (minutesMax.error) return { error: 'Некоректне значення «Хвилин до».', field: g('minutesMax') };
    steps.push({
      stage: text(g('stage').value),
      text: stepText,
      mode: text(g('mode').value),
      temperature: text(g('temperature').value),
      pressure: text(g('pressure').value),
      minutes: minutes.value,
      minutesMax: minutesMax.value,
      valve: text(g('valve').value),
      note: text(g('note').value),
      verified: row.dataset.verified !== 'false'
    });
  }
  if (!steps.length) return { error: 'Додайте хоча б один крок.', field: form.querySelector('[data-add="step"]') };

  return {
    recipe: {
      ...original,
      title,
      description: String(f.description.value).trim(),
      category: f.category.value,
      servings: servings.value,
      prepMinutes: prep.value,
      cookMinutes: cook.value,
      ingredients,
      steps,
      tips: String(f.tips.value).split('\n').map((s) => s.trim()).filter(Boolean)
    }
  };
}
