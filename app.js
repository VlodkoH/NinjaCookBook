// NinjaCookBook — Vanilla JS PWA
(() => {
  'use strict';

  const STORAGE_KEY = 'ninjacookbook.recipes.v1';
  const APP_STATE_KEY = 'ninjacookbook.appstate.v1';

  // Elements
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  const recipeDetail = document.getElementById('recipe-detail');
  const backToListBtn = document.getElementById('back-to-list');
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const btnAdd = document.getElementById('btn-add');
  const btnFavorites = document.getElementById('btn-favorites');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modal-close');
  const recipeForm = document.getElementById('recipe-form');
  const formCancel = document.getElementById('form-cancel');
  const cardTemplate = document.getElementById('card-template');
  const swStatus = document.getElementById('sw-status');
  const recipesCount = document.getElementById('recipes-count');

  let recipes = [];
  let showingFavorites = false;
  let deferredPrompt = null;

  // Helpers
  function uid() {
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,9);
  }

  function saveRecipes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }

  function loadRecipesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse recipes from storage', e);
      return null;
    }
  }

  function fetchSeedRecipes() {
    return fetch('recipes.json', {cache: "reload"}).then(r => {
      if (!r.ok) throw new Error('Failed to load recipes.json');
      return r.json();
    });
  }

  function setSWStatus(registered) {
    swStatus.textContent = registered ? 'online (service worker)' : 'offline';
  }

  function renderList(filterText = '') {
    listView.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let items = recipes.slice();

    if (showingFavorites) {
      items = items.filter(r => !!r.favorite);
    }

    const q = filterText.trim().toLowerCase();
    if (q) {
      items = items.filter(r => {
        const inTitle = r.title.toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        const inIngr = (r.ingredients || []).some(i => i.toLowerCase().includes(q));
        return inTitle || inDesc || inIngr;
      });
    }

    const sort = sortSelect.value;
    if (sort === 'az') {
      items.sort((a,b) => a.title.localeCompare(b.title));
    } else {
      items.sort((a,b) => b.createdAt - a.createdAt);
    }

    recipesCount.textContent = `${items.length} рецептів`;

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.style.padding = '28px';
      empty.style.color = 'var(--muted)';
      empty.textContent = showingFavorites ? 'Немає улюблених рецептів' : 'Рецепти не знайдені';
      listView.appendChild(empty);
      return;
    }

    items.forEach(r => {
      const node = cardTemplate.content.cloneNode(true);
      const article = node.querySelector('.card');
      const img = node.querySelector('.card-image');
      const title = node.querySelector('.card-title');
      const desc = node.querySelector('.card-desc');
      const favBtn = node.querySelector('.fav-btn');
      const viewBtn = node.querySelector('.view-btn');

      title.textContent = r.title;
      desc.textContent = r.description || '';
      img.src = r.image || 'recipe-placeholder.svg';
      img.alt = r.title;

      favBtn.textContent = r.favorite ? '♥' : '♡';
      favBtn.setAttribute('aria-pressed', r.favorite ? 'true' : 'false');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(r.id);
      });

      viewBtn.addEventListener('click', () => {
        openDetail(r.id);
      });

      article.addEventListener('click', () => openDetail(r.id));
      fragment.appendChild(node);
    });

    listView.appendChild(fragment);
  }

  function toggleFavorite(id) {
    const idx = recipes.findIndex(r => r.id === id);
    if (idx === -1) return;
    recipes[idx].favorite = !recipes[idx].favorite;
    saveRecipes();
    renderList(searchInput.value);
  }

  function openDetail(id) {
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    recipeDetail.innerHTML = `
      <header style="display:flex;gap:12px;align-items:center;justify-content:space-between">
        <div>
          <h2>${escapeHtml(r.title)}</h2>
          <div class="recipe-meta">${escapeHtml(r.description || '')}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="detail-fav" class="btn">${r.favorite ? '♥ Улюблене' : '♡ Додати улюблене'}</button>
        </div>
      </header>
      <figure style="margin:12px 0">
        <img src="${r.image || 'recipe-placeholder.svg'}" alt="${escapeHtml(r.title)}" style="width:100%;max-height:340px;object-fit:cover;border-radius:8px"/>
      </figure>
      <section class="recipe-ingredients">
        <h3>Інгредієнти</h3>
        <ul>${(r.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </section>
      <section class="recipe-steps">
        <h3>Кроки</h3>
        <ol>${(r.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </section>
    `;
    document.getElementById('detail-fav').addEventListener('click', () => {
      toggleFavorite(r.id);
      openDetail(r.id); // refresh
    });

    detailView.classList.remove('hidden');
    listView.classList.add('hidden');
  }

  function closeDetail() {
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Modal controls
  function openModal() { modal.classList.remove('hidden'); }
  function closeModal() { modal.classList.add('hidden'); recipeForm.reset(); }

  // Form submit handler
  recipeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(recipeForm);
    const title = (fd.get('title') || '').toString().trim();
    const description = (fd.get('description') || '').toString().trim();
    const ingredientsRaw = (fd.get('ingredients') || '').toString().trim();
    const stepsRaw = (fd.get('steps') || '').toString().trim();
    const image = (fd.get('image') || '').toString().trim();

    if (!title || !ingredientsRaw || !stepsRaw) return;

    const newRecipe = {
      id: uid(),
      title,
      description,
      ingredients: ingredientsRaw.split('\n').map(s => s.trim()).filter(Boolean),
      steps: stepsRaw.split('\n').map(s => s.trim()).filter(Boolean),
      image: image || 'recipe-placeholder.svg',
      favorite: false,
      createdAt: Date.now()
    };

    recipes.unshift(newRecipe);
    saveRecipes();
    closeModal();
    renderList(searchInput.value);
    // Try to cache recipes.json update via SW message
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({type:'recipes-updated', recipe:newRecipe});
    }
  });

  formCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

  // Events
  btnAdd.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);

  backToListBtn.addEventListener('click', closeDetail);

  searchInput.addEventListener('input', (e) => {
    renderList(e.target.value);
  });

  sortSelect.addEventListener('change', () => renderList(searchInput.value));

  btnFavorites.addEventListener('click', () => {
    showingFavorites = !showingFavorites;
    btnFavorites.classList.toggle('primary', showingFavorites);
    renderList(searchInput.value);
  });

  // Install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const a = confirm('Встановити NinjaCookBook на цей пристрій?');
    if (a) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    }
  });

  // Load initial data
  async function init() {
    // Load from localStorage first
    const stored = loadRecipesFromStorage();
    if (Array.isArray(stored) && stored.length > 0) {
      recipes = stored;
      renderList();
    } else {
      // Fetch seed file
      try {
        const seed = await fetchSeedRecipes();
        // normalize: ensure createdAt and id
        recipes = (Array.isArray(seed) ? seed : []).map(r => ({
          id: r.id || uid(),
          title: r.title || 'Без назви',
          description: r.description || '',
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          steps: Array.isArray(r.steps) ? r.steps : [],
          image: r.image || 'recipe-placeholder.svg',
          favorite: !!r.favorite,
          createdAt: r.createdAt || Date.now()
        }));
        saveRecipes();
        renderList();
      } catch (err) {
        console.error('Не вдалося завантажити recipes.json', err);
        recipes = [];
        renderList();
      }
    }

    // SW status
    setSWStatus(!!navigator.serviceWorker);
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', () => setSWStatus(true));
  }

  init();

  // Message handler from SW
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (evt) => {
      // handle messages from SW if needed
      if (evt.data && evt.data.type === 'reload-recipes') {
        // fetch fresh recipes.json and merge (do not overwrite user-added recipes)
        fetch('recipes.json').then(r => r.json()).then(fetched => {
          if (!Array.isArray(fetched)) return;
          const existingIds = new Set(recipes.map(r => r.id));
          const newOnes = fetched.filter(r => !existingIds.has(r.id)).map(r => ({
            id: r.id || uid(),
            title: r.title || 'Без назви',
            description: r.description || '',
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
            steps: Array.isArray(r.steps) ? r.steps : [],
            image: r.image || 'recipe-placeholder.svg',
            favorite: !!r.favorite,
            createdAt: r.createdAt || Date.now()
          }));
          if (newOnes.length) {
            recipes = newOnes.concat(recipes);
            saveRecipes();
            renderList(searchInput.value);
          }
        }).catch(()=>{});
      }
    });
  }

})();