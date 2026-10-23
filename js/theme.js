'use strict';
(function () {
  var KEY = 'devisfacile.theme';
  var racine = document.documentElement;
  function lire() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function ecrire(v) { try { window.localStorage.setItem(KEY, v); } catch (e) {} }
  function systeme() { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function courant() { var t = lire(); return t === 'dark' || t === 'light' ? t : systeme(); }
  function appliquer(t) {
    racine.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', t === 'dark' ? '#121316' : '#f5f3ee');
    var b = document.getElementById('btn-theme');
    if (b) {
      b.textContent = t === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre';
      b.setAttribute('aria-label', b.textContent);
    }
  }
  appliquer(courant());
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-theme');
    appliquer(courant());
    if (b) b.addEventListener('click', function () {
      var t = racine.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      ecrire(t);
      appliquer(t);
    });
  });
})();