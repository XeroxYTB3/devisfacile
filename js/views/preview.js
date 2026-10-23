'use strict';
window.Views = window.Views || {};
Views.preview = function (p) {
  var h = UI.h;
  var d = Store.doc(p.id);
  if (!d) {
    return h('div', { class: 'carte' }, UI.vide('Document introuvable', 'Ce document n’existe plus.',
      h('a', { class: 'btn btn-primaire', href: '#/documents' }, 'Voir les documents')));
  }
  var ent = Store.entreprise();
  var client = Store.client(d.clientId);
  var facture = d.type === 'facture';
  var franchise = ent.tvaStatut === 'franchise';
  var copie = Object.assign({}, d, { lignes: d.lignes.filter(function (l) { return String(l.description || '').trim(); }) });
  var t = Calc.totaux(copie, ent);
  var aRemise = copie.lignes.some(function (l) { return Calc.num(l.remisePct) > 0; });

  function nb(x) { return Calc.num(x).toLocaleString('fr-FR', { maximumFractionDigits: 3 }); }
  function para(x) { return h('p', null, x); }

  // ---- En-tête du document
  var em = Legal.emetteurLignes(ent);
  var emetteur = h('div', { class: 'doc-emetteur' },
    ent.logo ? h('img', { class: 'doc-logo', src: ent.logo, alt: 'Logo' }) : null,
    h('div', null,
      h('div', { class: 'nom' }, ent.nom || 'Votre entreprise'),
      ent.forme ? para(ent.forme) : null,
      em.slice(1).map(para)));
  var meta = [];
  Legal.meta(d).forEach(function (m) {
    meta.push(h('span', { class: 'k' }, m.label), h('span', { class: 'v' }, m.valeur));
  });
  var titre = h('div', { class: 'doc-titre' }, h('h1', null, facture ? 'FACTURE' : 'DEVIS'), h('div', { class: 'doc-meta' }, meta));

  var cl = Legal.clientLignes(client);
  var blocClient = h('div', { class: 'doc-client' },
    h('div', { class: 'etiq' }, 'Destinataire'),
    cl.length ? [h('div', { class: 'nom' }, cl[0]), cl.slice(1).map(para)] : para('Client à choisir'));

  // ---- Lignes
  var entete = h('tr', null,
    h('th', null, 'Description'), h('th', { class: 'd' }, 'Qté'), h('th', { class: 'd' }, 'PU HT'),
    aRemise ? h('th', { class: 'd' }, 'Remise') : null,
    franchise ? null : h('th', { class: 'd' }, 'TVA'),
    h('th', { class: 'd' }, 'Total HT'));
  var rangees = copie.lignes.map(function (l, i) {
    return h('tr', null,
      h('td', { class: 'desc' }, l.description),
      h('td', { class: 'd' }, nb(l.qte) + (l.unite ? ' ' + l.unite : '')),
      h('td', { class: 'd' }, UI.eur(Calc.versCentimes(l.puHT))),
      aRemise ? h('td', { class: 'd' }, Calc.num(l.remisePct) > 0 ? nb(l.remisePct) + ' %' : '') : null,
      franchise ? null : h('td', { class: 'd' }, nb(t.lignes[i].taux) + ' %'),
      h('td', { class: 'd' }, UI.eur(t.lignes[i].ht)));
  });
  if (!rangees.length) rangees.push(h('tr', null, h('td', { colspan: 6, class: 'desc' }, 'Aucune ligne de prestation.')));

  // ---- Totaux
  var tot = [];
  function lt(lib, val, cls) { tot.push(h('div', { class: 'doc-tot-ligne ' + (cls || '') }, h('span', null, lib), h('span', null, val))); }
  if (t.remise > 0) {
    lt('Sous-total HT', UI.eur(t.totalHT));
    lt('Remise (' + nb(d.remiseGlobalePct) + ' %)', '− ' + UI.eur(t.remise));
  }
  lt('Total HT', UI.eur(t.totalHTNet));
  if (franchise) lt('TVA', 'non applicable');
  else t.baseParTaux.forEach(function (b) { lt('TVA ' + nb(b.taux) + ' %', UI.eur(b.tva)); });
  if (t.acompte > 0) {
    lt(franchise ? 'Total' : 'Total TTC', UI.eur(t.totalTTC), 'sep');
    if (facture) {
      lt('Acompte déjà versé', '− ' + UI.eur(t.acompte));
      lt('Net à payer', UI.eur(t.netAPayer), 'fort');
    } else {
      var pct = Calc.num(d.acomptePct);
      lt('Acompte à la commande' + (pct > 0 ? ' (' + nb(pct) + ' %)' : ''), UI.eur(t.acompte));
      lt('Reste à payer à la livraison', UI.eur(t.netAPayer), 'fort');
    }
  } else {
    lt(facture ? 'Net à payer' : (franchise ? 'Total' : 'Total TTC'), UI.eur(t.totalTTC), 'fort');
  }

  // ---- Bas du document
  var banque = Legal.paiementLignes(ent);
  var gauche = h('div', { class: 'doc-paiement' },
    banque.length ? [h('div', { class: 'etiq' }, 'Règlement par virement'), banque.map(para)] : null,
    d.notes ? [h('div', { class: 'etiq', style: 'margin-top:8px' }, 'Notes'), h('p', { class: 'pre' }, d.notes)] : null);
  var sig = Legal.signature(d);
  var doc = h('div', { class: 'doc-a4' + (d.numero ? '' : ' doc-brouillon') },
    h('div', { class: 'doc-entete' }, emetteur, titre),
    blocClient,
    d.objet ? h('p', { class: 'doc-objet' }, 'Objet : ' + d.objet) : null,
    h('div', { class: 'doc-table-wrap' }, h('table', { class: 'doc-table' }, h('thead', null, entete), h('tbody', null, rangees))),
    h('div', { class: 'doc-bas' }, gauche, h('div', { class: 'doc-totaux' }, tot)),
    sig ? h('div', { class: 'doc-signature' }, h('p', null, sig), h('div', { class: 'doc-sig-lignes' }, h('span', null, 'Date :'), h('span', null, 'Signature :'))) : null,
    h('div', { class: 'doc-mentions' }, Legal.pied(d, ent).map(para)));

  // ---- Actions
  function imprimer() {
    var ancien = document.title;
    document.title = (d.numero || 'Brouillon') + (client ? ' - ' + client.nom : '');
    function retablir() { document.title = ancien; window.removeEventListener('afterprint', retablir); }
    window.addEventListener('afterprint', retablir);
    window.print();
  }
  function valider() {
    var r = Store.changerStatut(d.id, facture ? 'envoyée' : 'envoyé');
    if (!r.ok) { UI.toast(r.message, 'err'); return; }
    UI.toast('Document numéroté : ' + Store.doc(d.id).numero + '.', 'ok');
    App.render();
  }
  var sujet = (facture ? 'Facture ' : 'Devis ') + (d.numero || '') + (ent.nom ? ' — ' + ent.nom : '');
  var dest = client ? (client.contact || client.nom) : '';
  var corps = 'Bonjour' + (dest ? ' ' + dest : '') + ',\n\nVeuillez trouver ci-joint ' + (facture ? 'la facture ' : 'le devis ') + (d.numero || '') +
    (facture && d.dateEcheance ? ', à régler avant le ' + UI.date(d.dateEcheance) : '') + '.\n\nN’hésitez pas à me contacter pour toute question.\n\nBien cordialement,\n' + (ent.nom || '');
  var mail = 'mailto:' + (client && client.email ? client.email : '') + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);

  var controles = Legal.controles(d, ent, client);
  var alertes = controles.map(function (c) {
    return h('div', { class: 'alerte alerte-' + (c.niveau === 'erreur' ? 'erreur' : 'conseil') + ' no-print' }, c.message);
  });
  var versReglages = controles.some(function (c) { return c.message.indexOf('Réglages') >= 0; });

  var barre = h('div', { class: 'barre no-print' },
    h('div', null, h('h1', null, facture ? 'Facture' : 'Devis'), h('div', null, UI.pastille(Calc.statutAffiche(d)), ' ', h('span', { class: 'doux' }, d.numero || 'Pas encore numéroté'))),
    h('div', { class: 'actions' },
      h('a', { class: 'btn', href: '#/document/' + encodeURIComponent(d.id) }, 'Modifier le document'),
      versReglages ? h('a', { class: 'btn', href: '#/reglages' }, 'Ouvrir les Réglages') : null,
      d.statut === 'brouillon' ? h('button', { class: 'btn', type: 'button', onclick: valider }, 'Valider et numéroter') : null,
      h('a', { class: 'btn', href: mail, onclick: function () { UI.toast('Pensez à joindre le PDF à votre message.'); } }, 'Envoyer par e-mail'),
      h('button', { class: 'btn btn-primaire', type: 'button', onclick: imprimer }, 'Télécharger en PDF')));

  return h('div', null, barre,
    h('p', { class: 'doux no-print', style: 'margin-top:-8px' }, 'Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » comme imprimante.'),
    alertes, h('div', { class: 'doc-wrap' }, doc));
};