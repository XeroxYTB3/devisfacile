'use strict';
var UI = (function () {

  function estAttrs(x) { return x && typeof x === 'object' && !x.nodeType && !Array.isArray(x); }

  function ajouter(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { ajouter(el, x); }); return; }
    if (c.nodeType) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }

  // h('div', {class:'x', onclick:fn}, enfant1, [enfant2, ...])
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var debut = 1, valeur;
    if (estAttrs(attrs)) {
      debut = 2;
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value') valeur = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    } else if (attrs === null) debut = 2;
    for (var i = debut; i < arguments.length; i++) ajouter(el, arguments[i]);
    if (valeur !== undefined) el.value = valeur;
    return el;
  }

  function vider(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function eur(c) { return Calc.eur(c); }
  function date(iso) { return Legal.date(iso); }
  function majuscule(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'); }

  function pastille(statut) {
    return h('span', { class: 'pastille s-' + slug(statut) }, majuscule(statut));
  }

  function toast(msg, type) {
    var racine = document.getElementById('toasts');
    if (!racine) return;
    var t = h('div', { class: 'toast ' + (type || ''), role: 'status' }, msg);
    racine.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, type === 'err' ? 5500 : 3200);
  }

  function modale(titre, contenu, options) {
    options = options || {};
    var racine = document.getElementById('modale-racine');
    var voile = h('div', { class: 'voile' });
    function fermer() {
      document.removeEventListener('keydown', surTouche);
      if (voile.parentNode) voile.parentNode.removeChild(voile);
      if (options.surFermeture) options.surFermeture();
    }
    function surTouche(e) { if (e.key === 'Escape') fermer(); }
    var boite = h('div', { class: 'modale', role: 'dialog', 'aria-modal': 'true', 'aria-label': titre }, h('h2', null, titre), contenu);
    voile.appendChild(boite);
    voile.addEventListener('mousedown', function (e) { if (e.target === voile) fermer(); });
    document.addEventListener('keydown', surTouche);
    racine.appendChild(voile);
    var premier = boite.querySelector('input,select,textarea,button');
    if (premier) premier.focus();
    return { fermer: fermer, boite: boite };
  }

  function confirmer(titre, texte, libelleOk, danger) {
    return new Promise(function (resolve) {
      var m;
      var fait = false;
      function fin(v) { if (fait) return; fait = true; m.fermer(); resolve(v); }
      var contenu = h('div', null,
        h('p', null, texte),
        h('div', { class: 'pied' },
          h('button', { class: 'btn', type: 'button', onclick: function () { fin(false); } }, 'Annuler'),
          h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primaire'), type: 'button', onclick: function () { fin(true); } }, libelleOk || 'Confirmer')));
      m = modale(titre, contenu, { surFermeture: function () { if (!fait) { fait = true; resolve(false); } } });
    });
  }

  function vide(titre, texte, bouton) {
    return h('div', { class: 'vide' }, h('h3', null, titre), h('p', null, texte), bouton || null);
  }

  function champ(libelle, controle, aide) {
    return h('label', { class: 'champ' },
      h('span', { class: 'etiquette' }, libelle),
      controle,
      aide ? h('span', { class: 'aide' }, aide) : null);
  }

  function copier(texte) {
    function repli() {
      var ta = h('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = texte;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? 'Texte copié.' : 'Copie impossible : sélectionnez le texte à la main.', ok ? 'ok' : 'err');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(function () { toast('Texte copié.', 'ok'); }, repli);
    } else repli();
  }

  function telecharger(nom, contenu, mime) {
    var blob = new Blob([contenu], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: nom });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  return {
    h: h, vider: vider, eur: eur, date: date, majuscule: majuscule, slug: slug, pastille: pastille,
    toast: toast, modale: modale, confirmer: confirmer, vide: vide, champ: champ,
    copier: copier, telecharger: telecharger, debounce: debounce
  };
})();