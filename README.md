# NinjaCookBook

Легкий PWA-застосунок для перегляду, пошуку та додавання рецептів. Працює офлайн і готовий до розміщення на GitHub Pages.

Особливості:
- Повністю на HTML/CSS/Vanilla JS, без фреймворків.
- Service Worker для кешування та офлайн-режиму.
- Web App Manifest для інсталяції.
- Збереження доданих рецептів у localStorage.
- Сумісний з GitHub Pages.

Запуск локально (без Node.js):
1. Скопіюйте весь вміст цього проєкту у папку.
2. Відкрийте `index.html` у браузері (на localhost або file://).
   - Примітка: для повної роботи Service Worker краще відкривати через `http://localhost` або розмістити на GitHub Pages. Більшість браузерів дозволяють Service Worker на `http://localhost` без HTTPS.
3. Для тестування Service Worker без веб-сервера можна використовувати простий статичний сервер, але це необов'язково для відкриття файлу.

Розгортання на GitHub Pages:
1. Ініціалізуйте репозиторій і запишіть файли у корінь.
2. На GitHub увімкніть GitHub Pages з гілки `main` (або `gh-pages`).
3. Відвідайте сайт — застосунок буде інсталюваним на пристрої.

Файли:
- index.html — точка входу.
- styles.css — стилі.
- app.js — логіка застосунку.
- sw.js — Service Worker.
- manifest.json — Web App Manifest.
- recipes.json — початкові рецепти.
- icon-192.svg, icon-512.svg, favicon.svg — іконки.
- recipe-*.svg — ілюстрації рецептів.

Автор: NinjaCookBook (Open Source)
