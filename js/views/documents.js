'use strict';
window.Views = window.Views || {};
Views.documents = function (p) {
  var h = UI.h;
  var ent = Store.entreprise();
  var q = (p && p.params) || {};
  var etat = { type: q.type || 'tous', statut: q.statut || 'tous', recherche: '' };
  var TYPES = [['tous', 'Tous'], ['devis', 'Devis'], ['facture', 'Factures']];
  var STATUTS = [['tous', 'Tous les statuts'], ['brouillon', 'Brouillons'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['payee', 'Payés'], ['retard', 'En retard']];

  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function groupe(d) {
    var s = Calc.statutAffiche(d);
    if (s === 'envoyé' || s === 'envoyée') return 'envoye';
    if (s === 'accepté') return 'accepte';
    if (s === 'payée') return 'payee';
    if (s === 'en retard') return 'retard';
    if (s === 'brouillon') return 'brouillon';
    return 'autre';
  }
  function nomClient(d) { var c = Store.client(d.clientId); return c ? c.nom : '—'; }
  function correspond(d) {
    if (etat.type !== 'tous' && d.type !== etat.type) return false;
    if (etat.statut !== 'tous' && groupe(d) !== etat.statut) return false;
    var r = norm(etat.recherche).trim();
    if (r && norm([d.numero, nomClient(d), d.objet].join(' ')).indexOf(r) < 0) return false;
    return true;
  }
  function stop(e) { e.stopPropagation(); }

  function chips(liste, cle) {
    return h('div', { class: 'filtres' }, liste.map(function (x) {
      return h('button', { type: 'button', class: 'filtre' + (etat[cle] === x[0] ? ' actif' : ''), onclick: function () { etat[cle] = x[0]; dessiner(); } }, x[1]);
    }));
  }

  function changer(d, v) {
    if (!v) return;
    var r = Store.changerStatut(d.id, v);
    if (!r.ok) UI.toast(r.message, 'err');
    else UI.toast('Statut mis à jour : ' + v + '.', 'ok');
    dessiner();
  }
  function facturer(d) {
    var r = Store.convertirEnFacture(d.id);
    if (!r.ok) { UI.toast(r.message, 'err'); return; }
    UI.toast((r.existant ? 'Facture déjà créée : ' : 'Facture créée : ') + r.facture.numero + '.', 'ok');
    App.aller('#/apercu/' + encodeURIComponent(r.facture.id));
  }
  function dupliquer(d) {
    var c = Store.dupliquer(d.id);
    if (!c) return;
    UI.toast('Copie créée en brouillon.', 'ok');
    App.aller('#/document/' + encodeURIComponent(c.id));
  }
  function supprimer(d) {
    UI.confirmer('Supprimer ce brouillon ?', 'Ce brouillon sera définitivement supprimé. Il n’a pas de numéro : la numérotation reste donc sans trou.', 'Supprimer', true).then(function (ok) {
      if (!ok) return;
      var r = Store.supprimerDocument(d.id);
      if (!r.ok) UI.toast(r.message, 'err'); else UI.toast('Brouillon supprimé.', 'ok');
      dessiner();
    });
  }

  function selecteur(d) {
    if (d.statut === 'facturé') return null;
    var options = Store.STATUTS[d.type].filter(function (s) { return s !== d.statut && !(s === 'brouillon'); });
    if (!options.length) return null;
    var sel = h('select', { class: 'btn-petit', 'aria-label': 'Changer le statut', style: 'width:auto;min-height:32px;padding:4px 8px;margin-top:4px' },
      h('option', { value: '' }, 'Changer…'),
      options.map(function (s) { return h('option', { value: s }, UI.majuscule(s)); }));
    sel.addEventListener('change', function () { changer(d, sel.value); });
    return sel;
  }

  function actions(d) {
    return h('div', { style: 'display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap' },
      h('a', { class: 'btn btn-petit', href: '#/apercu/' + encodeURIComponent(d.id) }, 'Aperçu / PDF'),
      d.type === 'devis' && d.statut === 'accepté' ? h('button', { class: 'btn btn-petit btn-primaire', type: 'button', onclick: function () { facturer(d); } }, 'Facturer') : null,
      h('button', { class: 'btn btn-petit', type: 'button', onclick: function () { dupliquer(d); } }, 'Dupliquer'),
      d.statut === 'brouillon' && !d.numero ? h('button', { class: 'btn btn-petit btn-danger', type: 'button', onclick: function () { supprimer(d); } }, 'Supprimer') : null);
  }

  function ligne(d) {
    var t = Calc.totaux(d, ent);
    var st = Calc.statutAffiche(d);
    var echeance = d.type === 'facture'
      ? (d.dateEcheance ? 'Échéance ' + UI.date(d.dateEcheance) : '')
      : (d.dateValidite ? 'Valable jusqu’au ' + UI.date(d.dateValidite) : '');
    return h('tr', { class: 'cliquable', onclick: function () { App.aller('#/document/' + encodeURIComponent(d.id)); } },
      h('td', null, h('div', { class: 'gras' }, d.numero || 'Brouillon'), h('div', { class: 'doux' }, d.type === 'devis' ? 'Devis' : 'Facture')),
      h('td', { style: 'max-width:280px' }, h('div', { class: 'gras' }, nomClient(d)), h('div', { class: 'doux', style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, d.objet || '')),
      h('td', null, UI.date(d.dateEmission), h('div', { class: 'doux' }, echeance)),
      h('td', { class: 'num gras' }, UI.eur(t.totalTTC)),
      h('td', { onclick: stop }, UI.pastille(st), h('div', null, selecteur(d))),
      h('td', { onclick: stop }, actions(d)));
  }

  var zoneType = h('div'), zoneStatut = h('div'), liste = h('div');
  var recherche = h('input', {
    type: 'search', placeholder: 'Rechercher un numéro, un client, un objet…', 'aria-label': 'Rechercher un document',
    oninput: function (e) { etat.recherche = e.target.value; dessiner(); }
  });

  function dessiner() {
    UI.vider(zoneType).appendChild(chips(TYPES, 'type'));
    UI.vider(zoneStatut).appendChild(chips(STATUTS, 'statut'));
    UI.vider(liste);
    var docs = Store.documentsTries();
    if (!docs.length) {
      liste.appendChild(UI.vide('Aucun document pour l’instant', 'Créez votre premier devis : cela prend moins d’une minute.',
        h('button', { class: 'btn btn-primaire', type: 'button', onclick: function () { App.nouveauDevis(); } }, '+ Nouveau devis')));
      return;
    }
    var res = docs.filter(correspond);
    if (!res.length) { liste.appendChild(UI.vide('Aucun résultat', 'Aucun document ne correspond à ces filtres.')); return; }
    liste.appendChild(h('div', { class: 'defile' },
      h('table', { class: 'tableau' },
        h('thead', null, h('tr', null, h('th', null, 'Numéro'), h('th', null, 'Client'), h('th', null, 'Date'), h('th', { class: 'num' }, 'Montant'), h('th', null, 'Statut'), h('th', null, ''))),
        h('tbody', null, res.map(ligne)))));
    liste.appendChild(h('p', { class: 'doux', style: 'margin:10px 0 0' }, res.length + (res.length > 1 ? ' documents' : ' document') + '. Cliquez sur une ligne pour la modifier.'));
  }

  var racine = h('div', null,
    h('div', { class: 'barre' },
      h('h1', null, 'Documents'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: function () { var d = Store.nouveauDocument('facture', ''); App.aller('#/document/' + encodeURIComponent(d.id)); } }, '+ Nouvelle facture'),
        h('button', { class: 'btn btn-primaire', type: 'button', onclick: function () { App.nouveauDevis(); } }, '+ Nouveau devis'))),
    h('div', { class: 'carte' }, h('div', { class: 'champ' }, recherche), zoneType, zoneStatut, liste));
  dessiner();
  return racine;
};