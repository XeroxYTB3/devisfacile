'use strict';
window.Views = window.Views || {};
var App = (function () {
  var h = UI.h;
  var TITRE = 'DevisFacile — Devis et factures';
  var derniereVue = '';

  var ROUTES = {
    tableau:   { vue: 'dashboard', menu: 'tableau' },
    documents: { vue: 'documents', menu: 'documents' },
    document:  { vue: 'editor',    menu: 'documents' },
    apercu:    { vue: 'preview',   menu: 'documents' },
    clients:   { vue: 'clients',   menu: 'clients' },
    reglages:  { vue: 'settings',  menu: 'reglages' }
  };

  function analyser() {
    var hash = String(location.hash || '').replace(/^#\/?/, '');
    var q = '', i = hash.indexOf('?');
    if (i >= 0) { q = hash.slice(i + 1); hash = hash.slice(0, i); }
    var morceaux = hash.split('/').filter(Boolean).map(function (m) { try { return decodeURIComponent(m); } catch (e) { return m; } });
    var params = {};
    q.split('&').forEach(function (kv) {
      if (!kv) return;
      var a = kv.split('=');
      try { params[decodeURIComponent(a[0])] = decodeURIComponent(a[1] || ''); } catch (e) { params[a[0]] = a[1] || ''; }
    });
    return { nom: morceaux[0] || 'tableau', id: morceaux[1] || '', params: params };
  }

  function aller(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function marquerMenu(menu) {
    var liens = document.querySelectorAll('#nav a');
    for (var i = 0; i < liens.length; i++) {
      var actif = liens[i].getAttribute('data-route') === menu;
      liens[i].classList.toggle('actif', actif);
      if (actif) liens[i].setAttribute('aria-current', 'page');
      else liens[i].removeAttribute('aria-current');
    }
  }

  function carteErreur(titre, texte) {
    return h('div', { class: 'carte' }, UI.vide(titre, texte,
      h('a', { class: 'btn btn-primaire', href: '#/tableau' }, 'Retour au tableau de bord')));
  }

  function render() {
    var vue = document.getElementById('vue');
    if (!vue) return;
    var r = analyser();
    var route = ROUTES[r.nom];
    var cle = r.nom + '/' + r.id;
    var changement = cle !== derniereVue;
    derniereVue = cle;
    UI.vider(vue);
    document.title = TITRE;
    if (!route) {
      marquerMenu('');
      vue.appendChild(carteErreur('Page introuvable', 'Cette page n’existe pas. Revenez au tableau de bord.'));
      return;
    }
    marquerMenu(route.menu);
    if (!Store.estPersistant()) {
      vue.appendChild(h('div', { class: 'alerte alerte-erreur', role: 'alert' },
        'Votre navigateur ne permet pas d’enregistrer les données : elles seront perdues à la fermeture de cette page. Pensez à télécharger une sauvegarde dans les Réglages.'));
    }
    var fn = window.Views[route.vue];
    if (typeof fn !== 'function') {
      vue.appendChild(carteErreur('Bientôt disponible', 'Cette partie de l’application n’est pas encore prête.'));
      return;
    }
    try {
      var noeud = fn({ id: r.id, params: r.params });
      if (noeud) vue.appendChild(noeud);
    } catch (e) {
      if (window.console) console.error(e);
      vue.appendChild(carteErreur('Un problème est survenu', 'Cet écran n’a pas pu s’afficher. Essayez de revenir au tableau de bord ; vos données ne sont pas perdues.'));
    }
    if (changement) { window.scrollTo(0, 0); try { vue.focus({ preventScroll: true }); } catch (e) {} }
  }

  function nouveauDevis(clientId) {
    var d = Store.nouveauDocument('devis', clientId || '');
    aller('#/document/' + encodeURIComponent(d.id));
    return d;
  }

  function saisieEnCours(cible) {
    if (!cible || !cible.tagName) return false;
    var t = cible.tagName.toLowerCase();
    return t === 'input' || t === 'textarea' || t === 'select' || cible.isContentEditable;
  }

  function surTouche(e) {
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('df:enregistrer'));
      return;
    }
    if (ctrl || e.altKey || saisieEnCours(e.target)) return;
    if (document.querySelector('#modale-racine .voile')) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); nouveauDevis(); }
    else if (e.key === '/') {
      var champ = document.querySelector('#vue input[type=search]');
      if (champ) { e.preventDefault(); champ.focus(); }
    }
  }

  function demarrer() {
    try { Store.load(); }
    catch (e) { if (window.console) console.error(e); }
    var btn = document.getElementById('btn-nouveau-devis');
    if (btn) btn.addEventListener('click', function () { nouveauDevis(); });
    document.addEventListener('keydown', surTouche);
    window.addEventListener('hashchange', render);
    if (!location.hash || location.hash === '#') location.replace('#/tableau');
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();

  return { render: render, aller: aller, nouveauDevis: nouveauDevis, analyser: analyser };
})();