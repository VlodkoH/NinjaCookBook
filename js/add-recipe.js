import { getCategories } from './data.js';
import { saveUserRecipe } from './storage.js';
import { escapeHtml } from './utils.js';

const dialog = document.getElementById('add-dialog');
const form = document.getElementById('recipe-form');
const categorySelect = document.getElementById('form-category');
const errorBox = document.getElementById('form-error');
let opener = null;
let onSaved = () => {};

function uid() {
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// "Рис | 300 | г | промити" -> { name, amount, unit, note }
function parseIngredient(line) {
  const [name, amount, unit, note] = line.split('|').map((s) => s.trim());
  const n = Number(String(amount || '').replace(',', '.'));
  const hasAmount = amount !== undefined && amount !== '' && !Number.isNaN(n);
  return {
    name: hasAmount ? name : line.trim(),
    amount: hasAmount ? n : null,
    unit: hasAmount && unit ? unit : null,
    note: hasAmount && note ? note : null
  };
}

function lines(value) {
  return String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.toggle('hidden', !message);
}

function close() {
  dialog.close();
}

export function openAddDialog() {
  opener = document.activeElement;
  categorySelect.innerHTML = getCategories()
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`)
    .join('');
  form.reset();
  showError('');
  dialog.showModal();
  form.elements.title.focus();
}

export function initAddDialog(savedCallback) {
  onSaved = savedCallback;
  dialog.addEventListener('close', () => opener?.focus?.());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) close();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const ingredients = lines(data.get('ingredients')).map(parseIngredient);
    const steps = lines(data.get('steps'));
    if (!title || !ingredients.length || !steps.length) {
      showError('Заповніть назву, хоча б один інгредієнт і хоча б один крок.');
      (!title ? form.elements.title : !ingredients.length ? form.elements.ingredients : form.elements.steps).focus();
      return;
    }
    const servings = Number(data.get('servings'));
    const recipe = {
      id: uid(),
      title,
      category: String(data.get('category') || 'main'),
      description: String(data.get('description') || '').trim(),
      servings: Number.isInteger(servings) && servings > 0 ? servings : null,
      prepMinutes: null,
      cookMinutes: null,
      difficulty: null,
      tags: [],
      ingredients,
      steps: steps.map((text) => ({ text, mode: null, temperature: null, pressure: null, minutes: null, verified: false })),
      tips: [],
      image: null,
      userAdded: true,
      createdAt: Date.now()
    };
    if (!saveUserRecipe(recipe)) {
      showError('Не вдалося зберегти: сховище браузера переповнене або недоступне.');
      return;
    }
    opener = null;
    close();
    onSaved(recipe);
  });
}
