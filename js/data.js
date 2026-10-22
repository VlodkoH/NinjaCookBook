import { getUserRecipes, getOverrides } from './storage.js';

export const SUPPORTED_SCHEMA_VERSION = 1;
const DATA_URL = 'data/recipes.json';

let db = null;

function toNumberOrNull(value) {
  const n = Number(value);
  return value === null || value === undefined || value === '' || Number.isNaN(n) ? null : n;
}

function normalizeIngredient(item) {
  if (typeof item === 'string') return { name: item, amount: null, amountMax: null, unit: null, note: null };
  return {
    name: String(item?.name || ''),
    amount: toNumberOrNull(item?.amount),
    amountMax: toNumberOrNull(item?.amountMax),
    unit: item?.unit ? String(item.unit) : null,
    note: item?.note ? String(item.note) : null
  };
}

function normalizeStep(step) {
  if (typeof step === 'string') step = { text: step };
  return {
    stage: step?.stage ? String(step.stage) : null,
    text: String(step?.text || ''),
    mode: step?.mode ? String(step.mode) : null,
    temperature: step?.temperature ?? null,
    pressure: step?.pressure ?? null,
    minutes: toNumberOrNull(step?.minutes),
    minutesMax: toNumberOrNull(step?.minutesMax),
    valve: step?.valve ? String(step.valve) : null,
    note: step?.note ? String(step.note) : null,
    verified: step?.verified !== false
  };
}

export function normalizeRecipe(raw) {
  return {
    id: String(raw.id),
    title: String(raw.title || 'Без назви'),
    category: String(raw.category || 'main'),
    description: String(raw.description || ''),
    servings: toNumberOrNull(raw.servings),
    prepMinutes: toNumberOrNull(raw.prepMinutes),
    cookMinutes: toNumberOrNull(raw.cookMinutes),
    difficulty: raw.difficulty || null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    ingredients: (Array.isArray(raw.ingredients) ? raw.ingredients : []).map(normalizeIngredient),
    steps: (Array.isArray(raw.steps) ? raw.steps : []).map(normalizeStep),
    tips: Array.isArray(raw.tips) ? raw.tips.map(String) : [],
    image: raw.image || null,
    userAdded: !!raw.userAdded,
    createdAt: toNumberOrNull(raw.createdAt)
  };
}

export async function loadDatabase() {
  let response;
  try {
    response = await fetch(DATA_URL, { cache: 'no-cache' });
  } catch (err) {
    throw new Error('Немає з’єднання, а збереженої копії рецептів ще немає. Відкрийте застосунок онлайн хоча б один раз.', { cause: err });
  }
  if (!response.ok) throw new Error(`Не вдалося завантажити ${DATA_URL} (HTTP ${response.status}).`);

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new Error('Файл рецептів пошкоджений: некоректний JSON.', { cause: err });
  }
  if (!json || !Array.isArray(json.recipes) || !Array.isArray(json.categories)) {
    throw new Error('Файл рецептів має неочікувану структуру (немає "recipes" або "categories").');
  }
  if (json.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(`Непідтримувана версія схеми рецептів: ${json.schemaVersion}. Очікується ${SUPPORTED_SCHEMA_VERSION}.`);
  }

  db = {
    device: json.device || '',
    categories: json.categories.map((c) => ({ id: String(c.id), name: String(c.name), icon: c.icon || '🍽️' })),
    recipes: json.recipes.filter((r) => r && r.id).map(normalizeRecipe)
  };
  return db;
}

export function getDevice() {
  return db?.device || '';
}

export function getCategories() {
  return db ? db.categories : [];
}

export function getCategory(id) {
  return getCategories().find((c) => c.id === id) || null;
}

export function getAllRecipes() {
  if (!db) return [];
  const seedIds = new Set(db.recipes.map((r) => r.id));
  const overrides = getOverrides();
  const seed = db.recipes.map((r) => (overrides[r.id] ? normalizeRecipe({ ...overrides[r.id], id: r.id }) : r));
  const user = getUserRecipes().filter((r) => r && r.id && !seedIds.has(r.id)).map(normalizeRecipe);
  return seed.concat(user);
}

export function isSeedRecipe(id) {
  return !!db?.recipes.some((r) => r.id === id);
}

export function hasOverride(id) {
  return isSeedRecipe(id) && !!getOverrides()[id];
}

export function getRecipe(id) {
  return getAllRecipes().find((r) => r.id === id) || null;
}
