# NinjaCookBook — Copilot Instructions

## Project overview
NinjaCookBook is a Ukrainian-language interactive cookbook delivered as a Progressive Web App (PWA). It is tailored to the **Ninja Foodi SmartLid OL650EU** multicooker. It is hosted on GitHub Pages at `https://<username>.github.io/NinjaCookBook/` (a **subpath**, not the domain root).

## Tech stack
- HTML5, CSS3, JavaScript ES Modules. **Vanilla only**: no React, Angular, Vue, or other frameworks.
- JSON for the recipe database (`data/recipes.json`).
- Web App Manifest and Service Worker.
- LocalStorage or IndexedDB for local data (favorites, recently viewed, theme).
- Do not add heavy libraries without a real need. Node.js must not be required to run the app. If it is needed for tests or builds, document why in the README.

## Critical rules
- **Relative paths only.** The app is served from a subpath. In HTML, CSS, JS, `manifest.json` (`start_url`, `scope`, icons), the Service Worker, and every `fetch`, never use paths starting with `/`.
- **ES modules and Service Workers do not work over `file://`.** Document running via Live Server or `python -m http.server`.
- **Offline support.** The Service Worker caches the app shell (HTML, CSS, JS, icons, `recipes.json`). Use a `CACHE_VERSION` constant and delete old caches on `activate`. Bump `CACHE_VERSION` whenever a cached file changes.
- **Error handling.** If `recipes.json` fails to load, show a clear error message, never a blank screen.
- Do not create empty files, placeholder modules, or dead links.

## Project structure
```
NinjaCookBook/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── css/
├── js/
├── data/recipes.json
├── docs/        # user's source materials: READ-ONLY, never modify
├── icons/       # icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png
└── images/
```
The structure may change if technically justified.

## Language
- All user-facing UI text, README, and recipe content: **Ukrainian**.
- Code identifiers, code comments, and commit messages: **English**.

## Data integrity (most important rule)
- **Never invent technical data.** Cooking modes, pressure, temperatures, and times come only from files in `docs/` (the OL650EU manual) or from the user's own recipe.
- If data is missing, set `"verified": false` on that step and list it in the final report. Never guess.
- If `docs/` is empty, do not invent modes. Use the most generic fields and mark all technical parameters `"verified": false`.
- Do not add fictitious recipes to fill the UI.

### Recipe schema (`data/recipes.json`)
```json
{
  "schemaVersion": 1,
  "device": "OL650EU",
  "categories": [{ "id": "main", "name": "Основні страви", "icon": "🍲" }],
  "recipes": [{
    "id": "plov",
    "title": "Плов",
    "category": "main",
    "description": "...",
    "servings": 4,
    "prepMinutes": 20,
    "cookMinutes": 35,
    "difficulty": "easy",
    "tags": ["м'ясо", "рис"],
    "ingredients": [{ "name": "Рис довгозернистий", "amount": 300, "unit": "г", "note": "промити" }],
    "steps": [{
      "text": "...",
      "mode": "Mode name from the manual",
      "temperature": null,
      "pressure": null,
      "minutes": 5,
      "verified": true
    }],
    "tips": ["..."],
    "image": null
  }]
}
```
- Steps that use the multicooker must display `mode`, time, and pressure in a **separate block** on the step card.
- Steps with `verified: false` show the badge «Перевірте за інструкцією».
- Changing the schema requires bumping `schemaVersion` and updating the README.

## UI/UX requirements
- Modern, clean, professional cooking-app look. Responsive for Windows, tablets, and phones (verify at 360, 768, and 1280 px).
- Light and dark themes: default to system preference, with a manual toggle and a persisted choice.
- Kitchen-friendly: tap targets at least 44×44 px, large step text, Screen Wake Lock API ("keep screen on") where supported.
- Accessibility: semantic HTML, `aria-*` attributes, full keyboard navigation, always-visible focus, WCAG AA contrast, respect `prefers-reduced-motion`.
- No ads, no mandatory registration, no copyrighted photos. Use local SVG illustrations or neutral placeholders.
- Empty states must be handled:
  - Favorites empty: «Додайте рецепт в обране, натиснувши ♡»
  - Recently viewed empty: similar hint
  - Categories without recipes: hide, or show a «Скоро» badge
  - Search with no results: «Нічого не знайдено» with a suggestion to change the query

## Safety
- Before writing pressure-cooking steps, confirm that the relevant parameters (minimum liquid, max fill level, pressure release method) exist in `docs/`. If not, mark `verified: false`.
- The app and README must include a short disclaimer: the app does not replace the official device manual.

## Quality checks (before considering any task done)
- `recipes.json` and `manifest.json` are valid JSON.
- No console errors (when the app can be run in a browser).
- Every file referenced by `index.html`, the manifest, and the Service Worker exists.
- No absolute paths: search the project for `href="/`, `src="/`, and `'/`.
- Run any available tests or linters and fix the issues found.

## Working style
- Work directly with project files; implement, don't just propose plans.
- Analyze existing files first. Preserve useful code and don't overwrite it without need.
- Ask questions only when it is impossible to proceed without the answer.