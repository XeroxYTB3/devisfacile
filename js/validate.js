'use strict';
// Validation stricte d'une sauvegarde avant import (taille, forme, valeurs, clés dangereuses).
var Validate = (function () {
  var MAX_TEXTE = 5 * 1024 * 1024;
  var LIM = { documents: 5000, clients: 2000, catalogue: 1000, lignes: 300 };
  var STATUTS = {
    devis: ['brouillon', 'envoyé', 'accepté', 'refusé', 'facturé'],
    facture: ['brouillon', 'envoyée', 'payée']
  };

  function chaine(v, max) { return v === undefined || v === null || (typeof v === 'string' && v.length <= max); }
  function nombre(v) {
    if (v === undefined || v === null || v === '') return true;
    if (typeof v === 'number') return isFinite(v) && Math.abs(v) < 1e9;
    return typeof v === 'string' && v.length <= 20 && isFinite(parseFloat(v.replace(',', '.')));
  }
  function date(v) { return v === undefined || v === null || v === '' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)); }
  function logo(v) {
    return v === undefined || v === null || v === '' ||
      (typeof v === 'string' && v.length <= 700000 && /^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(v));
  }
  function objet(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function dangereux(o, prof) {
    if (prof > 8) return true;
    if (o && typeof o === 'object') {
      var ks = Object.keys(o);
      for (var i = 0; i < ks.length; i++) {
        var k = ks[i];
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return true;
        if (dangereux(o[k], prof + 1)) return true;
      }
    }
    return false;
  }

  function verifier(o) {
    var e = [];
    function ko(m) { if (e.length < 5) e.push(m); }
    if (!objet(o)) return ['le fichier n’a pas la bonne forme.'];
    if (dangereux(o, 0)) return ['le fichier contient des éléments interdits.'];
    if (!Array.isArray(o.documents) || !Array.isArray(o.clients) || !objet(o.entreprise)) return ['il manque des parties obligatoires.'];
    if (o.catalogue !== undefined && !Array.isArray(o.catalogue)) return ['le catalogue est invalide.'];
    if (o.documents.length > LIM.documents) ko('trop de documents.');
    if (o.clients.length > LIM.clients) ko('trop de clients.');
    if ((o.catalogue || []).length > LIM.catalogue) ko('trop de prestations dans le catalogue.');
    if (e.length) return e;

    var ent = o.entreprise;
    Object.keys(ent).forEach(function (k) {
      var v = ent[k];
      if (k === 'logo') { if (!logo(v)) ko('le logo n’est pas une image valable.'); }
      else if (typeof v === 'string') { if (v.length > 2000) ko('un champ de l’entreprise est trop long (' + k + ').'); }
      else if (typeof v !== 'number' || !isFinite(v)) ko('un champ de l’entreprise est invalide (' + k + ').');
    });
    if (ent.tvaStatut !== undefined && ent.tvaStatut !== 'franchise' && ent.tvaStatut !== 'assujetti') ko('le statut de TVA est invalide.');

    var ids = {}, cids = {};
    o.clients.forEach(function (c, i) {
      if (!objet(c) || typeof c.id !== 'string' || !c.id || c.id.length > 100) { ko('le client n° ' + (i + 1) + ' est invalide.'); return; }
      if (cids[c.id]) ko('deux clients ont le même identifiant.');
      cids[c.id] = true;
      if (typeof c.nom !== 'string' || c.nom.length > 300) ko('le nom du client n° ' + (i + 1) + ' est invalide.');
      ['contact', 'email', 'adresse', 'cp', 'ville', 'siret', 'tvaNumero', 'notes'].forEach(function (k) {
        if (!chaine(c[k], 3000)) ko('un champ du client n° ' + (i + 1) + ' est invalide (' + k + ').');
      });
    });
    (o.catalogue || []).forEach(function (p, i) {
      if (!objet(p) || typeof p.id !== 'string' || !chaine(p.description, 2000) || !chaine(p.unite, 30) || !nombre(p.puHT) || !nombre(p.tva)) ko('la prestation n° ' + (i + 1) + ' est invalide.');
    });

    var numeros = {};
    o.documents.forEach(function (d, i) {
      var n = i + 1;
      if (!objet(d) || typeof d.id !== 'string' || !d.id || d.id.length > 100) { ko('le document n° ' + n + ' est invalide.'); return; }
      if (ids[d.id]) ko('deux documents ont le même identifiant.');
      ids[d.id] = true;
      if (d.type !== 'devis' && d.type !== 'facture') { ko('le type du document n° ' + n + ' est invalide.'); return; }
      if (STATUTS[d.type].indexOf(d.statut) < 0) ko('le statut du document n° ' + n + ' est invalide.');
      if (d.numero !== undefined && d.numero !== '' && !(typeof d.numero === 'string' && /^[DF]-\d{4}-\d{3,}$/.test(d.numero))) ko('le numéro du document n° ' + n + ' est invalide.');
      if (d.numero) { if (numeros[d.numero]) ko('le numéro ' + d.numero + ' apparaît deux fois.'); numeros[d.numero] = true; }
      if (typeof d.dateEmission !== 'string' || !date(d.dateEmission) || !d.dateEmission) ko('la date du document n° ' + n + ' est invalide.');
      ['dateEcheance', 'dateValidite', 'dateExecution', 'dateEnvoi', 'datePaiement'].forEach(function (k) { if (!date(d[k])) ko('une date du document n° ' + n + ' est invalide (' + k + ').'); });
      if (d.clientId && !cids[d.clientId]) ko('le document n° ' + n + ' référence un client inconnu.');
      ['objet', 'notes', 'delaiExecution', 'modePaiement'].forEach(function (k) { if (!chaine(d[k], 5000)) ko('un texte du document n° ' + n + ' est trop long (' + k + ').'); });
      ['remiseGlobalePct', 'acomptePct', 'acompteMontant'].forEach(function (k) { if (!nombre(d[k])) ko('une valeur du document n° ' + n + ' est invalide (' + k + ').'); });
      if (!Array.isArray(d.lignes) || d.lignes.length > LIM.lignes) { ko('les lignes du document n° ' + n + ' sont invalides ou trop nombreuses.'); return; }
      d.lignes.forEach(function (l, j) {
        if (!objet(l) || !chaine(l.description, 2000) || !chaine(l.unite, 30) || !nombre(l.qte) || !nombre(l.puHT) || !nombre(l.remisePct) || !nombre(l.tva)) ko('la ligne ' + (j + 1) + ' du document n° ' + n + ' est invalide.');
      });
    });

    if (o.compteurs !== undefined) {
      if (!objet(o.compteurs)) ko('les compteurs de numérotation sont invalides.');
      else ['devis', 'facture'].forEach(function (t) {
        var c = o.compteurs[t];
        if (c === undefined) return;
        if (!objet(c)) { ko('les compteurs de numérotation sont invalides.'); return; }
        Object.keys(c).forEach(function (a) { if (!/^\d{4}$/.test(a) || typeof c[a] !== 'number' || !isFinite(c[a]) || c[a] < 0 || c[a] > 1e7) ko('un compteur de numérotation est invalide.'); });
      });
    }
    return e;
  }

  function installer() {
    if (typeof Store === 'undefined' || !Store.importer || Store.importer.__valide) return;
    var original = Store.importer;
    var garde = function (texte) {
      if (typeof texte !== 'string') return { ok: false, message: 'Ce fichier n’est pas une sauvegarde valable.' };
      if (texte.length > MAX_TEXTE) return { ok: false, message: 'Ce fichier est trop volumineux pour être une sauvegarde DevisFacile (5 Mo maximum).' };
      var o;
      try { o = JSON.parse(texte); } catch (x) { return { ok: false, message: 'Ce fichier n’est pas une sauvegarde valable.' }; }
      var err = verifier(o);
      if (err.length) return { ok: false, message: 'Sauvegarde refusée : ' + err[0] };
      return original(texte);
    };
    garde.__valide = true;
    Store.importer = garde;
  }
  installer();

  var API = { verifier: verifier, MAX_TEXTE: MAX_TEXTE };
  if (typeof module === 'object' && module.exports) module.exports = API;
  return API;
})();