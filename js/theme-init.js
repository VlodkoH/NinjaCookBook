// Applies the saved/system theme before first paint to avoid a theme flash.
(function () {
  var theme = null;
  try { theme = JSON.parse(localStorage.getItem('ninjacookbook.theme.v1')); } catch (e) { theme = null; }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();
