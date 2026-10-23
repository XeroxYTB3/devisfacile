'use strict';
window.Views = window.Views || {};
window.Views.editor = function (p) {
  var h = UI.h;
  var d = p && p.id ? Store.doc(p.id) : null;
  if (!d) {
    return h('div', { class: 'carte' }, UI.vide('Document introuvable', 'Ce document n’existe plus.',
      h('a', { class: 'btn btn-primaire', href: '#/documents' }, 'Retour aux documents')));
  }
  var ent = Store.entreprise();
  var facture = d.type === 'facture';
  var franchise = ent.tvaStatut === 'franchise';
  var verrouille = d.statut !== 'brouillon';
  var cellulesTotal = [];
  var zoneLignes = h('div', null);
  var zoneTotaux = h('div', { class: 'totaux' });
  var etatSauvegarde = h('span', { class: 'doux' }, '');

  function ctrl(el) { if (verrouille) el.disabled = true; return el; }

  var supprime = false;
  function sauver(silencieux) {
    if (supprime) return;
    Store.sauverDocument(d);
    etatSauvegarde.textContent = 'Enregistré à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (silencieux === false) UI.toast('Document enregistré.', 'ok');
  }
  var planifier = UI.debounce(function () { sauver(true); }, 400);
  function changer() { majTotaux(); planifier(); }

  if (window.__dfEnregistrer) document.removeEventListener('df:enregistrer', window.__dfEnregistrer);
  window.__dfEnregistrer = function () {
    if (!document.body.contains(zoneTotaux)) return;
    sauver(false);
  };
  document.addEventListener('df:enregistrer', window.__dfEnregistrer);

  function texte(cle, extra) {
    var el = h('input', Object.assign({ type: 'text' }, extra || {}));
    el.value = d[cle] == null ? '' : d[cle];
    el.addEventListener('input', function () { d[cle] = el.value; changer(); });
    return ctrl(el);
  }
  function dateChamp(cle) {
    var el = h('input', { type: 'date' });
    el.value = d[cle] || '';
    el.addEventListener('input', function () { d[cle] = el.value; changer(); });
    return ctrl(el);
  }

  function majTotaux() {
    var t = Calc.totaux(d, ent);
    UI.vider(zoneTotaux);
    function l(lib, val, cls) {
      zoneTotaux.appendChild(h('div', { class: 'ligne ' + (cls || '') }, h('span', null, lib), h('span', { class: 'mono' }, val)));
    }
    l('Total HT', UI.eur(t.totalHT));
    if (t.remise) {
      l('Remise globale', '− ' + UI.eur(t.remise));
      l('Total HT net', UI.eur(t.totalHTNet));
    }
    if (!franchise) {
      t.baseParTaux.forEach(function (b) { l('TVA ' + b.taux + ' % sur ' + UI.eur(b.base), UI.eur(b.tva)); });
    }
    l(franchise ? 'Total à payer' : 'Total TTC', UI.eur(t.totalTTC), 'fort');
    if (t.acompte) {
      l('Acompte', '− ' + UI.eur(t.acompte));
      l('Net à payer', UI.eur(t.netAPayer), 'fort');
    }
    if (franchise) zoneTotaux.appendChild(h('p', { class: 'doux', style: 'font-size:.8rem' }, Legal.tvaMention(ent)));
    t.lignes.forEach(function (lg, i) { if (cellulesTotal[i]) cellulesTotal[i].textContent = UI.eur(lg.ht); });
  }

  function dessinerLignes() {
    UI.vider(zoneLignes);
    cellulesTotal = [];
    zoneLignes.appendChild(h('div', { class: 'ligne-doc entete' },
      h('span', null, 'Description'), h('span', null, 'Qté'), h('span', null, 'Unité'), h('span', null, 'PU HT'),
      h('span', null, 'Remise %'), h('span', null, 'TVA %'), h('span', { class: 'droite' }, 'Total HT'), h('span', null, '')));
    d.lignes.forEach(function (l, i) {
      function champL(cle, extra) {
        var el = h('input', Object.assign({ type: 'text' }, extra || {}));
        el.value = l[cle] == null ? '' : l[cle];
        el.addEventListener('input', function () { l[cle] = el.value; changer(); });
        return ctrl(el);
      }
      var tva = h('select', { 'aria-label': 'Taux de TVA' });
      [0, 2.1, 5.5, 10, 20].forEach(function (t) { tva.appendChild(h('option', { value: String(t) }, String(t).replace('.', ',') + ' %')); });
      tva.value = String(franchise ? 0 : Calc.num(l.tva));
      if (!tva.value) tva.value = '20';
      tva.addEventListener('change', function () { l.tva = Calc.num(tva.value); changer(); });
      if (franchise) tva.disabled = true;
      ctrl(tva);
      var total = h('span', { class: 'droite mono gras' }, '');
      cellulesTotal.push(total);
      var suppr = h('button', { class: 'btn btn-danger btn-petit', type: 'button', 'aria-label': 'Supprimer la ligne', title: 'Supprimer la ligne', onclick: function () {
        if (d.lignes.length <= 1) { d.lignes = [Store.ligneVide()]; } else { d.lignes.splice(i, 1); }
        dessinerLignes(); changer();
      } }, 'Retirer');
      if (verrouille) suppr.disabled = true;
      zoneLignes.appendChild(h('div', { class: 'ligne-doc' },
        champL('description', { placeholder: 'Description de la prestation', 'aria-label': 'Description' }),
        champL('qte', { inputmode: 'decimal', 'aria-label': 'Quantité', placeholder: 'Qté' }),
        champL('unite', { placeholder: 'Unité (jour, forfait…)', 'aria-label': 'Unité' }),
        champL('puHT', { inputmode: 'decimal', 'aria-label': 'Prix unitaire HT', placeholder: 'PU HT' }),
        champL('remisePct', { inputmode: 'decimal', 'aria-label': 'Remise en pourcentage', placeholder: 'Remise %' }),
        tva, total, suppr));
    });
    majTotaux();
  }

  var titre = (facture ? 'Facture' : 'Devis') + (d.numero ? ' ' + d.numero : ' (brouillon)');
  var entete = h('div', { class: 'barre' },
    h('div', null, h('h1', null, titre), h('div', { class: 'doux' }, etatSauvegarde)),
    h('div', { class: 'actions', id: 'actions-editeur' },
      h('a', { class: 'btn', href: '#/documents' }, 'Retour aux documents'),
      h('span', null, UI.pastille(Calc.statutAffiche(d, Calc.aujourdhui())))));

  var selClient = h('select', { 'aria-label': 'Client' }, h('option', { value: '' }, '— Choisir un client —'));
  Store.clients().forEach(function (c) { selClient.appendChild(h('option', { value: c.id }, c.nom)); });
  selClient.value = d.clientId || '';
  selClient.addEventListener('change', function () { d.clientId = selClient.value; changer(); });
  ctrl(selClient);

  var carteInfos = h('div', { class: 'carte' },
    h('h2', null, 'Informations'),
    h('div', { class: 'grille-champs' },
      UI.champ('Client *', selClient, Store.clients().length ? null : 'Aucun client : créez-en un dans la section Clients.'),
      UI.champ('Objet du ' + (facture ? 'document' : 'devis'), texte('objet', { placeholder: 'Ex. : Intégration sponsorisée vidéo' })),
      UI.champ('Date d’émission', dateChamp('dateEmission')),
      facture ? UI.champ('Date de réalisation de la prestation', dateChamp('dateExecution')) : UI.champ('Valable jusqu’au', dateChamp('dateValidite')),
      facture ? UI.champ('Date d’échéance de paiement', dateChamp('dateEcheance')) : UI.champ('Délai d’exécution (facultatif)', texte('delaiExecution', { placeholder: 'Ex. : 2 semaines après acceptation' }))),
    h('a', { href: '#/clients', onclick: function () { sauver(true); } }, '+ Gérer mes clients'));

  var boutonAjout = h('button', { class: 'btn', type: 'button', onclick: function () {
    d.lignes.push(Store.ligneVide());
    dessinerLignes(); changer();
  } }, '+ Ajouter une ligne');
  if (verrouille) boutonAjout.disabled = true;

  var carteLignes = h('div', { class: 'carte' },
    h('h2', null, 'Prestations'),
    h('div', { class: 'defile' }, zoneLignes),
    h('div', { style: 'margin:8px 0 16px' }, boutonAjout),
    zoneTotaux);

  var avis = verrouille
    ? h('div', { class: 'alerte alerte-info' }, 'Ce document est numéroté : le contenu est verrouillé pour garantir l’intégrité des pièces comptables.')
    : null;

  var extra = [];
  // ---- Partie 2 : remise, acompte, catalogue, notes, actions ----
  var champRemise = h('input', { type: 'text', inputmode: 'decimal', placeholder: '0', 'aria-label': 'Remise globale en pourcentage' });
  champRemise.value = d.remiseGlobalePct ? d.remiseGlobalePct : '';
  champRemise.addEventListener('input', function () { d.remiseGlobalePct = champRemise.value; changer(); });
  ctrl(champRemise);

  var champAcPct = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Ex. : 30', 'aria-label': 'Acompte en pourcentage' });
  var champAcMontant = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Ex. : 500', 'aria-label': 'Acompte en euros' });
  champAcPct.value = d.acomptePct ? d.acomptePct : '';
  champAcMontant.value = d.acompteMontant ? d.acompteMontant : '';
  champAcPct.addEventListener('input', function () {
    d.acomptePct = champAcPct.value;
    if (champAcPct.value) { d.acompteMontant = ''; champAcMontant.value = ''; }
    changer();
  });
  champAcMontant.addEventListener('input', function () {
    d.acompteMontant = champAcMontant.value;
    if (champAcMontant.value) { d.acomptePct = ''; champAcPct.value = ''; }
    changer();
  });
  ctrl(champAcPct); ctrl(champAcMontant);

  var carteRemise = h('div', { class: 'carte' },
    h('h2', null, 'Remise et acompte'),
    h('div', { class: 'grille-champs' },
      UI.champ('Remise globale (%)', champRemise, 'Appliquée sur le total HT, avant TVA.'),
      UI.champ('Acompte (%)', champAcPct, 'Pourcentage du total TTC.'),
      UI.champ('ou acompte (€)', champAcMontant, 'Un seul des deux : le pourcentage prime.')));

  var carteCatalogue = null;
  var prestations = Store.catalogue();
  if (!verrouille) {
    var selCat = h('select', { 'aria-label': 'Prestation du catalogue' }, h('option', { value: '' }, '— Choisir une prestation —'));
    prestations.forEach(function (p) {
      selCat.appendChild(h('option', { value: p.id }, p.description + ' (' + UI.eur(Calc.versCentimes(p.puHT)) + ' HT)'));
    });
    var btnInserer = h('button', { class: 'btn', type: 'button', onclick: function () {
      var p = prestations.filter(function (x) { return x.id === selCat.value; })[0];
      if (!p) { UI.toast('Choisissez une prestation à insérer.', 'err'); return; }
      var nouvelle = Store.ligneVide();
      nouvelle.description = p.description;
      nouvelle.unite = p.unite || '';
      nouvelle.puHT = p.puHT;
      nouvelle.tva = franchise ? 0 : Calc.num(p.tva);
      if (!nouvelle.qte) nouvelle.qte = '1';
      var derniere = d.lignes[d.lignes.length - 1];
      if (derniere && !String(derniere.description || '').trim() && !Calc.num(derniere.puHT)) d.lignes[d.lignes.length - 1] = nouvelle;
      else d.lignes.push(nouvelle);
      selCat.value = '';
      dessinerLignes(); changer();
    } }, 'Insérer dans le document');
    carteCatalogue = h('div', { class: 'carte' },
      h('h2', null, 'Catalogue de prestations'),
      prestations.length
        ? h('div', { class: 'grille-champs' }, UI.champ('Prestation', selCat), h('div', { style: 'align-self:end;margin-bottom:12px' }, btnInserer))
        : h('p', { class: 'doux' }, 'Votre catalogue est vide. Ajoutez vos prestations habituelles dans ', h('a', { href: '#/reglages' }, 'les réglages'), '.'));
  }

  var champNotes = h('textarea', { placeholder: 'Conditions particulières, informations de paiement, remerciements…', 'aria-label': 'Notes' });
  champNotes.value = d.notes || '';
  champNotes.addEventListener('input', function () { d.notes = champNotes.value; changer(); });
  ctrl(champNotes);
  var carteNotes = h('div', { class: 'carte' }, h('h2', null, 'Notes'), UI.champ('Notes affichées sur le document', champNotes));

  function changerStatutDoc(statut, message) {
    sauver(true);
    var r = Store.changerStatut(d.id, statut);
    if (!r.ok) { UI.toast(r.message || 'Changement impossible.', 'err'); return; }
    UI.toast(message, 'ok');
    App.render();
  }
  function bouton(libelle, fn, cls) {
    return h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: fn }, libelle);
  }

  var actions = [];
  if (d.type === 'devis') {
    if (d.statut === 'brouillon') actions.push(bouton('Marquer comme envoyé', function () { changerStatutDoc('envoyé', 'Devis numéroté et marqué comme envoyé.'); }, 'btn-primaire'));
    if (d.statut === 'envoyé') {
      actions.push(bouton('Devis accepté', function () { changerStatutDoc('accepté', 'Devis marqué comme accepté.'); }, 'btn-primaire'));
      actions.push(bouton('Devis refusé', function () { changerStatutDoc('refusé', 'Devis marqué comme refusé.'); }));
    }
    if (d.statut === 'accepté') {
      actions.push(bouton('Transformer en facture', function () {
        sauver(true);
        var r = Store.convertirEnFacture(d.id);
        if (!r.ok) { UI.toast(r.message || 'Conversion impossible.', 'err'); return; }
        UI.toast(r.existant ? 'Cette facture existe déjà.' : 'Facture créée à partir du devis.', 'ok');
        App.aller('#/document/' + encodeURIComponent(r.facture.id));
      }, 'btn-primaire'));
    }
    if (d.statut === 'facturé' && d.factureId && Store.doc(d.factureId)) {
      actions.push(h('a', { class: 'btn', href: '#/document/' + encodeURIComponent(d.factureId) }, 'Voir la facture'));
    }
  } else {
    if (d.statut === 'brouillon') actions.push(bouton('Émettre la facture', function () { changerStatutDoc('envoyée', 'Facture numérotée et émise.'); }, 'btn-primaire'));
    if (d.statut === 'envoyée') actions.push(bouton('Marquer comme payée', function () { changerStatutDoc('payée', 'Facture marquée comme payée.'); }, 'btn-primaire'));
    if (d.statut === 'payée') actions.push(bouton('Annuler le paiement', function () { changerStatutDoc('envoyée', 'Paiement annulé : facture de nouveau en attente.'); }));
    if (d.lieDevisId && Store.doc(d.lieDevisId)) {
      actions.push(h('a', { class: 'btn', href: '#/document/' + encodeURIComponent(d.lieDevisId) }, 'Voir le devis'));
    }
  }
  actions.push(h('a', { class: 'btn', href: '#/apercu/' + encodeURIComponent(d.id), onclick: function () { sauver(true); } }, 'Aperçu / PDF'));
  actions.push(bouton('Dupliquer', function () {
    sauver(true);
    var c = Store.dupliquer(d.id);
    if (c) { UI.toast('Copie créée en brouillon.', 'ok'); App.aller('#/document/' + encodeURIComponent(c.id)); }
  }));
  if (d.statut === 'brouillon') {
    actions.push(bouton('Enregistrer', function () { sauver(false); }));
    actions.push(bouton('Supprimer le brouillon', function () {
      UI.confirmer('Supprimer ce brouillon ?', 'Cette action est définitive.', 'Supprimer', true).then(function (ok) {
        if (!ok) return;
        supprime = true;
        Store.supprimerDocument(d.id);
        UI.toast('Brouillon supprimé.', 'ok');
        App.aller('#/documents');
      });
    }, 'btn-danger'));
  }
  var carteActions = h('div', { class: 'carte' }, h('h2', null, 'Actions'), h('div', { class: 'actions', style: 'display:flex;gap:8px;flex-wrap:wrap' }, actions));

  extra.push(carteRemise);
  if (carteCatalogue) extra.push(carteCatalogue);
  extra.push(carteNotes, carteActions);

  dessinerLignes();
  return h('div', { class: 'editeur' }, entete, avis, carteInfos, carteLignes, extra);
};