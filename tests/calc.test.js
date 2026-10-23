'use strict';
var assert = require('assert');
var Calc = require('../js/calc.js');
var n = 0;
function test(nom, fn) { fn(); n++; console.log('ok  ' + nom); }
var ass = { tvaStatut: 'assujetti' };
var fra = { tvaStatut: 'franchise' };
function l(qte, pu, tva, rem) { return { qte: qte, puHT: pu, tva: tva, remisePct: rem || 0 }; }

test('conversion en centimes', function () {
  assert.strictEqual(Calc.versCentimes(1.005), 101);
  assert.strictEqual(Calc.versCentimes('12,5'), 1250);
  assert.strictEqual(Calc.versCentimes(''), 0);
  assert.strictEqual(Calc.versCentimes(0.1 + 0.2), 30);
});
test('ligne simple 2 x 100 € à 20 %', function () {
  var t = Calc.totaux({ lignes: [l(2, 100, 20)] }, ass);
  assert.strictEqual(t.totalHT, 20000);
  assert.strictEqual(t.totalTVA, 4000);
  assert.strictEqual(t.totalTTC, 24000);
  assert.strictEqual(t.netAPayer, 24000);
});
test('remise de ligne arrondie', function () {
  var t = Calc.totaux({ lignes: [l(3, 33.33, 20, 10)] }, ass);
  assert.strictEqual(t.lignes[0].ht, 8999);
});
test('remise 100 % donne 0', function () {
  var t = Calc.totaux({ lignes: [l(1, 500, 20, 100)] }, ass);
  assert.strictEqual(t.totalTTC, 0);
});
test('franchise de TVA : aucune TVA', function () {
  var t = Calc.totaux({ lignes: [l(2, 100, 20)] }, fra);
  assert.strictEqual(t.totalTVA, 0);
  assert.strictEqual(t.totalTTC, 20000);
  assert.strictEqual(t.baseParTaux.length, 1);
  assert.strictEqual(t.baseParTaux[0].taux, 0);
});
test('TVA calculée par taux, pas par ligne', function () {
  var t = Calc.totaux({ lignes: [l(1, 3.33, 20), l(1, 3.33, 20), l(1, 3.33, 20)] }, ass);
  assert.strictEqual(t.totalHT, 999);
  assert.strictEqual(t.totalTVA, 200);
  assert.strictEqual(t.totalTTC, 1199);
});
test('remise globale répartie sur deux taux', function () {
  var t = Calc.totaux({ lignes: [l(1, 1000, 20), l(1, 500, 5.5)], remiseGlobalePct: 10 }, ass);
  assert.strictEqual(t.totalHT, 150000);
  assert.strictEqual(t.remise, 15000);
  assert.strictEqual(t.totalHTNet, 135000);
  assert.strictEqual(t.totalTVA, 18000 + 2475);
  assert.strictEqual(t.totalTTC, 155475);
});
test('la somme des bases égale toujours le HT net', function () {
  var t = Calc.totaux({ lignes: [l(1, 10.01, 20), l(1, 10.01, 10), l(1, 10.01, 5.5)], remiseGlobalePct: 33.3 }, ass);
  var s = 0; t.baseParTaux.forEach(function (b) { s += b.base; });
  assert.strictEqual(s, t.totalHTNet);
});
test('acompte en pourcentage', function () {
  var t = Calc.totaux({ lignes: [l(2, 100, 20)], acomptePct: 30 }, ass);
  assert.strictEqual(t.acompte, 7200);
  assert.strictEqual(t.netAPayer, 16800);
});
test('acompte en montant fixe plafonné au total', function () {
  var t = Calc.totaux({ lignes: [l(2, 100, 20)], acompteMontant: 500 }, ass);
  assert.strictEqual(t.acompte, 24000);
  assert.strictEqual(t.netAPayer, 0);
  var t2 = Calc.totaux({ lignes: [l(2, 100, 20)], acompteMontant: 50 }, ass);
  assert.strictEqual(t2.acompte, 5000);
});
test('document vide', function () {
  var t = Calc.totaux({ lignes: [] }, ass);
  assert.strictEqual(t.totalTTC, 0);
  assert.strictEqual(t.netAPayer, 0);
});
test('statuts affichés', function () {
  var today = '2026-10-23';
  assert.strictEqual(Calc.statutAffiche({ type: 'facture', statut: 'envoyée', dateEcheance: '2026-10-01' }, today), 'en retard');
  assert.strictEqual(Calc.statutAffiche({ type: 'facture', statut: 'envoyée', dateEcheance: '2026-10-23' }, today), 'envoyée');
  assert.strictEqual(Calc.statutAffiche({ type: 'facture', statut: 'payée', dateEcheance: '2026-10-01' }, today), 'payée');
  assert.strictEqual(Calc.statutAffiche({ type: 'devis', statut: 'envoyé', dateValidite: '2026-10-01' }, today), 'expiré');
  assert.strictEqual(Calc.statutAffiche({ type: 'devis', statut: 'accepté', dateValidite: '2026-10-01' }, today), 'accepté');
});
test('numérotation et dates', function () {
  assert.strictEqual(Calc.numero('devis', 2026, 7), 'D-2026-007');
  assert.strictEqual(Calc.numero('facture', 2026, 123), 'F-2026-123');
  assert.strictEqual(Calc.ajouterJours('2026-10-23', 30), '2026-11-22');
  assert.strictEqual(Calc.ajouterJours('2026-12-31', 1), '2027-01-01');
});
console.log('\n' + n + ' tests réussis');