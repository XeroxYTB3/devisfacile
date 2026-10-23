'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  function rnd(x) { var s = x < 0 ? -1 : 1; return s * Math.round(Math.abs(x) + 1e-9); }

  function num(x) {
    if (typeof x === 'number') return isFinite(x) ? x : 0;
    var n = parseFloat(String(x == null ? '' : x).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  function versCentimes(x) { return rnd(num(x) * 100); }

  var fmt = null;
  function eur(c) {
    try {
      if (!fmt) fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
      return fmt.format(c / 100);
    } catch (e) {
      return (c / 100).toFixed(2).replace('.', ',') + ' €';
    }
  }

  function pad(n, l) { var s = String(n); while (s.length < l) s = '0' + s; return s; }

  function aujourdhui() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }

  function ajouterJours(iso, n) {
    var p = String(iso).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + (+n || 0)));
    return d.toISOString().slice(0, 10);
  }

  function numero(type, annee, n) {
    return (type === 'facture' ? 'F' : 'D') + '-' + annee + '-' + pad(n, 3);
  }

  // Calcule tous les montants d'un document, en centimes entiers.
  function totaux(doc, ent) {
    var franchise = !!ent && ent.tvaStatut === 'franchise';
    var lignes = (doc.lignes || []).map(function (l) {
      var qte = num(l.qte);
      var pu = versCentimes(l.puHT);
      var rem = Math.min(100, Math.max(0, num(l.remisePct)));
      return { ht: rnd(qte * pu * (1 - rem / 100)), taux: franchise ? 0 : num(l.tva) };
    });

    var map = {};
    var totalHT = 0;
    lignes.forEach(function (l) {
      map[l.taux] = (map[l.taux] || 0) + l.ht;
      totalHT += l.ht;
    });
    var tauxListe = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });

    var pct = Math.min(100, Math.max(0, num(doc.remiseGlobalePct)));
    var remise = rnd(totalHT * pct / 100);
    var parts = tauxListe.map(function (t) { return { taux: t, base0: map[t], part: rnd(map[t] * pct / 100) }; });
    var somme = 0;
    parts.forEach(function (p) { somme += p.part; });
    var ecart = remise - somme;
    if (ecart && parts.length) {
      var iMax = 0;
      parts.forEach(function (p, i) { if (Math.abs(p.base0) > Math.abs(parts[iMax].base0)) iMax = i; });
      parts[iMax].part += ecart;
    }

    var totalTVA = 0;
    var baseParTaux = parts.map(function (p) {
      var base = p.base0 - p.part;
      var tva = rnd(base * p.taux / 100);
      totalTVA += tva;
      return { taux: p.taux, base: base, tva: tva };
    });

    var totalHTNet = totalHT - remise;
    var totalTTC = totalHTNet + totalTVA;

    var acompte = 0;
    var ap = num(doc.acomptePct);
    var am = versCentimes(doc.acompteMontant);
    if (ap > 0) acompte = rnd(totalTTC * Math.min(100, ap) / 100);
    else if (am > 0) acompte = Math.min(am, Math.max(totalTTC, 0));

    return {
      lignes: lignes,
      baseParTaux: baseParTaux,
      totalHT: totalHT,
      remise: remise,
      totalHTNet: totalHTNet,
      totalTVA: totalTVA,
      totalTTC: totalTTC,
      acompte: acompte,
      netAPayer: totalTTC - acompte
    };
  }

  // Statut tel qu'il doit être affiché (en retard / expiré calculés automatiquement).
  function statutAffiche(doc, today) {
    today = today || aujourdhui();
    if (doc.type === 'facture' && doc.statut === 'envoyée' && doc.dateEcheance && doc.dateEcheance < today) return 'en retard';
    if (doc.type === 'devis' && doc.statut === 'envoyé' && doc.dateValidite && doc.dateValidite < today) return 'expiré';
    return doc.statut;
  }

  return {
    rnd: rnd, num: num, versCentimes: versCentimes, eur: eur, pad: pad,
    aujourdhui: aujourdhui, ajouterJours: ajouterJours, numero: numero,
    totaux: totaux, statutAffiche: statutAffiche
  };
});