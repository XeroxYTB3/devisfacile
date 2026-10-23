'use strict';
// API ouverte : window.DevisFacile (lecture libre ; écriture seulement avec la clé d'accès des Réglages).
var Api = (function () {
  var CLE = 'devisfacile.api';

  function lireCfg() {
    try { var o = JSON.parse(window.localStorage.getItem(CLE) || '{}'); return { ecriture: o.ecriture === true, cle: typeof o.cle === 'string' ? o.cle : '' }; }
    catch (e) { return { ecriture: false, cle: '' }; }
  }
  function ecrireCfg(c) { try { window.localStorage.setItem(CLE, JSON.stringify(c)); } catch (e) {} }
  function copie(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function genererCle() {
    var a = new Uint8Array(18);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function egal(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var r = 0;
    for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
  }
  function autoriser(cle) {
    var c = lireCfg();
    if (!c.ecriture || !c.cle) throw new Error('Écriture désactivée : activez-la dans Réglages, section « API pour vos scripts ».');
    if (!egal(String(cle), c.cle)) throw new Error('Clé d’accès incorrecte.');
  }
  function txt(x, max, nom) {
    if (x === undefined || x === null) return '';
    if (typeof x !== 'string') throw new Error(nom + ' doit être un texte.');
    if (x.length > max) throw new Error(nom + ' est trop long (' + max + ' caractères au maximum).');
    return x;
  }
  function nb(x, min, max, nom, def) {
    if (x === undefined || x === null || x === '') return def;
    var n = typeof x === 'number' ? x : parseFloat(String(x).replace(',', '.'));
    if (!isFinite(n) || n < min || n > max) throw new Error(nom + ' doit être un nombre compris entre ' + min + ' et ' + max + '.');
    return n;
  }
  function rafraichir() { try { if (window.App && App.render) App.render(); } catch (e) {} }

  function vueDoc(d) {
    var t = Calc.totaux(d, Store.entreprise());
    var o = copie(d);
    o.statutAffiche = Calc.statutAffiche(d);
    o.montants = {
      totalHT: t.totalHT, remise: t.remise, totalHTNet: t.totalHTNet, totalTVA: t.totalTVA,
      totalTTC: t.totalTTC, acompte: t.acompte, netAPayer: t.netAPayer
    };
    return o;
  }

  // ---- Lecture
  function documents(f) {
    f = f || {};
    return Store.documentsTries().filter(function (d) {
      if (f.type && d.type !== f.type) return false;
      if (f.clientId && d.clientId !== f.clientId) return false;
      if (f.statut && d.statut !== f.statut && Calc.statutAffiche(d) !== f.statut) return false;
      return true;
    }).map(vueDoc);
  }
  function document_(id) { var d = Store.doc(String(id)); return d ? vueDoc(d) : null; }
  function statistiques() {
    var ent = Store.entreprise(), auj = Calc.aujourdhui(), an = auj.slice(0, 4);
    var s = { annee: an, encaisse: 0, enAttente: 0, enRetard: 0, devisEnCours: 0, unite: 'centimes d’euro' };
    Store.documents().forEach(function (d) {
      if (!d.numero) return;
      var t = Calc.totaux(d, ent), st = Calc.statutAffiche(d, auj);
      if (d.type === 'facture') {
        if (d.statut === 'payée') { if ((d.datePaiement || d.dateEmission).slice(0, 4) === an) s.encaisse += t.totalTTC; }
        else if (d.statut === 'envoyée') {
          if (d.dateEmission.slice(0, 4) === an) s.encaisse += t.acompte;
          if (st === 'en retard') s.enRetard += t.netAPayer; else s.enAttente += t.netAPayer;
        }
      } else if (st === 'envoyé' || st === 'accepté') s.devisEnCours += t.totalTTC;
    });
    return s;
  }

  // ---- Écriture (clé d'accès obligatoire en premier argument)
  function creerClient(cle, d) {
    autoriser(cle);
    d = d || {};
    var nom = txt(d.nom, 300, 'Le nom');
    if (!nom.trim()) throw new Error('Le nom du client est obligatoire.');
    var c = Store.sauverClient({
      nom: nom, contact: txt(d.contact, 300, 'Le contact'), email: txt(d.email, 300, 'L’e-mail'),
      adresse: txt(d.adresse, 500, 'L’adresse'), cp: txt(d.cp, 20, 'Le code postal'), ville: txt(d.ville, 200, 'La ville'),
      siret: txt(d.siret, 30, 'Le SIRET'), tvaNumero: txt(d.tvaNumero, 30, 'Le numéro de TVA'), notes: txt(d.notes, 3000, 'Les notes')
    });
    rafraichir();
    return copie(c);
  }

  function creerDevis(cle, d) {
    autoriser(cle);
    d = d || {};
    var ent = Store.entreprise();
    var client = Store.client(String(d.clientId || ''));
    if (!client) throw new Error('Client introuvable : créez-le d’abord avec creerClient.');
    if (!Array.isArray(d.lignes) || !d.lignes.length) throw new Error('Ajoutez au moins une ligne de prestation.');
    if (d.lignes.length > 300) throw new Error('Trop de lignes (300 au maximum).');
    var franchise = ent.tvaStatut === 'franchise';
    var lignes = d.lignes.map(function (l, i) {
      l = l || {};
      var desc = txt(l.description, 2000, 'La description de la ligne ' + (i + 1));
      if (!desc.trim()) throw new Error('La ligne ' + (i + 1) + ' n’a pas de description.');
      return {
        id: Store.uid(), description: desc,
        qte: nb(l.qte, 0, 1e6, 'La quantité', 1), unite: txt(l.unite, 30, 'L’unité'),
        puHT: nb(l.puHT, -1e7, 1e7, 'Le prix unitaire HT', 0), remisePct: nb(l.remisePct, 0, 100, 'La remise', 0),
        tva: franchise ? 0 : nb(l.tva, 0, 100, 'Le taux de TVA', ent.tauxTvaDefaut)
      };
    });
    var objet = txt(d.objet, 500, 'L’objet');
    var remise = nb(d.remiseGlobalePct, 0, 100, 'La remise globale', 0);
    var acPct = nb(d.acomptePct, 0, 100, 'L’acompte en pourcentage', null);
    var acMont = nb(d.acompteMontant, 0, 1e7, 'L’acompte en euros', null);
    var notes = txt(d.notes, 3000, 'Les notes');
    var delai = txt(d.delaiExecution, 500, 'Le délai d’exécution');
    var doc = Store.nouveauDocument('devis', client.id);
    doc.objet = objet; doc.lignes = lignes; doc.remiseGlobalePct = remise;
    doc.acomptePct = acPct; doc.acompteMontant = acPct ? null : acMont; doc.notes = notes; doc.delaiExecution = delai;
    Store.sauverDocument(doc);
    rafraichir();
    return vueDoc(doc);
  }

  function changerStatut(cle, id, statut) {
    autoriser(cle);
    var r = Store.changerStatut(String(id), String(statut));
    if (!r.ok) throw new Error(r.message);
    rafraichir();
    return document_(id);
  }
  function convertirEnFacture(cle, id) {
    autoriser(cle);
    var r = Store.convertirEnFacture(String(id));
    if (!r.ok) throw new Error(r.message);
    rafraichir();
    return vueDoc(r.facture);
  }

  var AIDE = [
    'DevisFacile API 1.0 (montants en centimes d’euro dans « montants »)',
    'Lecture : entreprise(), clients(), client(id), catalogue(), documents({type, statut, clientId}), document(id), statistiques()',
    'Écriture (clé d’accès en premier argument, à activer dans Réglages) :',
    '  ecriture.creerClient(cle, {nom, contact, email, adresse, cp, ville, siret, tvaNumero, notes})',
    '  ecriture.creerDevis(cle, {clientId, objet, lignes:[{description, qte, unite, puHT, remisePct, tva}], remiseGlobalePct, acomptePct, acompteMontant, notes, delaiExecution})',
    '  ecriture.changerStatut(cle, id, statut)',
    '  ecriture.convertirEnFacture(cle, id)',
    'Référence complète : fichier API.md'
  ].join('\n');

  var ecriture = Object.freeze({
    creerClient: creerClient, creerDevis: creerDevis, changerStatut: changerStatut, convertirEnFacture: convertirEnFacture
  });
  var API = Object.freeze({
    version: '1.0',
    aide: function () { return AIDE; },
    entreprise: function () { return copie(Store.entreprise()); },
    clients: function () { return copie(Store.clients()); },
    client: function (id) { return copie(Store.client(String(id))); },
    catalogue: function () { return copie(Store.catalogue()); },
    documents: documents,
    document: document_,
    statistiques: statistiques,
    ecriture: ecriture
  });
  try { Object.defineProperty(window, 'DevisFacile', { value: API, enumerable: true }); } catch (e) {}

  // ---- Carte dans les Réglages
  function carteApi() {
    var h = UI.h;
    var zone = h('div', { class: 'carte', id: 'carte-api' });
    function dessiner() {
      var c = lireCfg();
      UI.vider(zone);
      zone.appendChild(h('h2', null, 'API pour vos scripts'));
      zone.appendChild(h('p', { class: 'doux' }, 'Vos propres scripts peuvent lire vos documents, clients et statistiques depuis cette page (DevisFacile dans la console du navigateur). L’écriture reste bloquée tant que vous ne l’autorisez pas ci-dessous : elle exige alors une clé d’accès.'));
      zone.appendChild(h('label', { style: 'display:flex;gap:8px;align-items:center;margin:8px 0' },
        h('input', {
          type: 'checkbox', checked: c.ecriture,
          onchange: function (e) {
            var cfg = lireCfg();
            cfg.ecriture = e.target.checked;
            if (cfg.ecriture && !cfg.cle) cfg.cle = genererCle();
            ecrireCfg(cfg);
            dessiner();
          }
        }),
        'Autoriser l’écriture par l’API (avec clé d’accès)'));
      if (c.ecriture) {
        zone.appendChild(UI.champ('Votre clé d’accès', h('input', { type: 'text', readonly: true, value: c.cle, 'aria-label': 'Clé d’accès à l’API' }),
          'Gardez-la secrète. Elle n’est pas incluse dans les sauvegardes.'));
        zone.appendChild(h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: function () { UI.copier(lireCfg().cle); } }, 'Copier la clé'),
          h('button', { class: 'btn', type: 'button', onclick: function () { var cfg = lireCfg(); cfg.cle = genererCle(); ecrireCfg(cfg); UI.toast('Nouvelle clé générée. L’ancienne ne fonctionne plus.', 'ok'); dessiner(); } }, 'Générer une nouvelle clé')));
      }
      zone.appendChild(h('p', { class: 'doux', style: 'margin-top:10px' }, 'Pour la liste des fonctions, tapez DevisFacile.aide() dans la console. Référence complète : fichier API.md.'));
    }
    dessiner();
    return zone;
  }

  if (window.Views && typeof Views.settings === 'function') {
    var origine = Views.settings;
    Views.settings = function (p) {
      var n = origine(p);
      try { n.appendChild(carteApi()); } catch (e) { if (window.console) console.error(e); }
      return n;
    };
  }

  return { lireCfg: lireCfg };
})();