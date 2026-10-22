const KEYS = {
  favorites: 'ninjacookbook.favorites.v1',
  recent: 'ninjacookbook.recent.v1',
  theme: 'ninjacookbook.theme.v1',
  userRecipes: 'ninjacookbook.userRecipes.v1',
  overrides: 'ninjacookbook.overrides.v1',
  checked: 'ninjacookbook.checked.v1',
  legacyRecipes: 'ninjacookbook.recipes.v1',
  legacyMigrated: 'ninjacookbook.legacyMigrated.v1'
};

const RECENT_LIMIT = 6;

// Ids of the fictitious seed recipes shipped by the first prototype.
const LEGACY_SEED_IDS = new Set([
  'r-olive-oil-pasta', 'r-avocado-toast', 'r-vegetable-stirfry',
  'r-classic-pancakes', 'r-tomato-soup', 'r-greek-salad'
]);

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getFavorites() {
  const list = read(KEYS.favorites, []);
  return Array.isArray(list) ? list : [];
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const list = getFavorites();
  const index = list.indexOf(id);
  if (index === -1) list.unshift(id);
  else list.splice(index, 1);
  write(KEYS.favorites, list);
  return index === -1;
}

export function getRecent() {
  const list = read(KEYS.recent, []);
  return Array.isArray(list) ? list : [];
}

export function addRecent(id) {
  const list = getRecent().filter((x) => x !== id);
  list.unshift(id);
  write(KEYS.recent, list.slice(0, RECENT_LIMIT));
}

export function clearRecent() {
  write(KEYS.recent, []);
}

export function getTheme() {
  const theme = read(KEYS.theme, null);
  return theme === 'light' || theme === 'dark' ? theme : null;
}

export function setTheme(theme) {
  write(KEYS.theme, theme);
}

export function getChecked(recipeId) {
  const all = read(KEYS.checked, {});
  return Array.isArray(all[recipeId]) ? all[recipeId] : [];
}

export function setChecked(recipeId, indexes) {
  const all = read(KEYS.checked, {});
  if (indexes.length) all[recipeId] = indexes;
  else delete all[recipeId];
  write(KEYS.checked, all);
}

export function getUserRecipes() {
  const list = read(KEYS.userRecipes, []);
  return Array.isArray(list) ? list : [];
}

export function saveUserRecipe(recipe) {
  const list = getUserRecipes().filter((r) => r.id !== recipe.id);
  list.unshift(recipe);
  return write(KEYS.userRecipes, list);
}

// Edited copies of recipes shipped in data/recipes.json (the file itself is read-only in a browser).
export function getOverrides() {
  const map = read(KEYS.overrides, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

export function saveOverride(recipe) {
  const map = getOverrides();
  map[recipe.id] = recipe;
  return write(KEYS.overrides, map);
}

export function deleteOverride(id) {
  const map = getOverrides();
  delete map[id];
  write(KEYS.overrides, map);
}

export function deleteUserRecipe(id) {
  write(KEYS.userRecipes, getUserRecipes().filter((r) => r.id !== id));
  write(KEYS.favorites, getFavorites().filter((x) => x !== id));
  write(KEYS.recent, getRecent().filter((x) => x !== id));
}

/**
 * Moves recipes the user added in the first prototype (old flat schema) into
 * the new user-recipe store. The old key is left untouched so nothing is lost.
 */
export function migrateLegacyRecipes() {
  if (read(KEYS.legacyMigrated, false)) return;
  const legacy = read(KEYS.legacyRecipes, null);
  if (Array.isArray(legacy)) {
    const existing = new Set(getUserRecipes().map((r) => r.id));
    legacy
      .filter((r) => r && r.id && !LEGACY_SEED_IDS.has(r.id) && !existing.has(r.id))
      .forEach((r) => {
        saveUserRecipe({
          id: String(r.id),
          title: String(r.title || 'Без назви'),
          category: 'main',
          description: String(r.description || ''),
          servings: null,
          prepMinutes: null,
          cookMinutes: null,
          difficulty: null,
          tags: [],
          ingredients: (Array.isArray(r.ingredients) ? r.ingredients : [])
            .map((name) => ({ name: String(name), amount: null, unit: null, note: null })),
          steps: (Array.isArray(r.steps) ? r.steps : [])
            .map((text) => ({ text: String(text), mode: null, temperature: null, pressure: null, minutes: null, verified: false })),
          tips: [],
          image: null,
          userAdded: true,
          createdAt: Number(r.createdAt) || Date.now()
        });
        if (r.favorite && !isFavorite(r.id)) toggleFavorite(r.id);
      });
  }
  write(KEYS.legacyMigrated, true);
}
