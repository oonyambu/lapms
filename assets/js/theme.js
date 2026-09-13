/* LAPMS - light/dark toggle for the public pages. Light is the default. */
(function () {
  'use strict';
  var KEY = 'lapms.theme';
  var LABEL = { light: '☀', dark: '☾', system: '◐' };
  var NEXT = { light: 'dark', dark: 'system', system: 'light' };
  var NAME = { light: 'Light', dark: 'Dark', system: 'System' };

  function current() {
    try { return localStorage.getItem(KEY) || 'light'; } catch (e) { return 'light'; }
  }
  function apply(mode) {
    try { localStorage.setItem(KEY, mode); } catch (e) {}
    if (mode === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    function paint() {
      var m = current();
      btn.textContent = LABEL[m];
      btn.title = NAME[m] + ' theme - click to change';
      btn.setAttribute('aria-label', btn.title);
    }
    btn.addEventListener('click', function () { apply(NEXT[current()]); paint(); });
    paint();
  });
})();
