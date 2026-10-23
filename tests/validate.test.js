'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'js', 'validate.js'));
let ko = 0;
function t(nom, cond) { if (!cond) ko++; console.log((cond ? 'OK ' : 'KO ') + nom); }
const base = () => ({
  entreprise: { nom: 'A', tvaStatut: 'franchise', logo: '' },
  clients: [{ id: 'c1', nom: 'Client' }],
  documents: [{ id: 'd1', type: 'devis', statut: 'brouillon', numero: '', dateEmission: '2026-10-23', clientId: 'c1', lignes: [{ description: 'x', qte: 1, puHT: 10, remisePct: 0, tva: 0 }] }],
  compteurs: { devis: { '2026': 0 }, facture: {} }
});
t('sauvegarde valide acceptée', V.verifier(base()).length === 0);
t('clé __proto__ refusée', V.verifier(JSON.parse('{"__proto__":{"x":1},"entreprise":{},"clients":[],"documents":[]}')).length > 0);
let o = base(); o.documents[0].statut = 'hacké'; t('statut inconnu refusé', V.verifier(o).length > 0);
o = base(); o.documents[0].clientId = 'inconnu'; t('client inconnu refusé', V.verifier(o).length > 0);
o = base(); o.entreprise.logo = 'javascript:alert(1)'; t('logo javascript: refusé', V.verifier(o).length > 0);
o = base(); o.entreprise.logo = 'data:text/html;base64,AAAA'; t('logo non image refusé', V.verifier(o).length > 0);
o = base(); o.entreprise.logo = 'data:image/png;base64,AAAA'; t('logo image accepté', V.verifier(o).length === 0);
o = base(); o.documents[0].lignes[0].puHT = 'abc'; t('prix non numérique refusé', V.verifier(o).length > 0);
o = base(); o.documents = Array.from({ length: 5001 }, (_, i) => ({ id: 'x' + i })); t('trop de documents refusé', V.verifier(o).length > 0);
o = base(); o.documents.push(Object.assign({}, o.documents[0])); t('identifiant en double refusé', V.verifier(o).length > 0);
o = base(); o.documents[0].numero = 'F-2026-001'; o.documents[0].type = 'facture'; o.documents[0].statut = 'envoyée'; o.documents.push(Object.assign({}, o.documents[0], { id: 'd2' })); t('numéro en double refusé', V.verifier(o).length > 0);
o = base(); o.documents[0].lignes = new Array(301).fill({ description: 'x' }); t('trop de lignes refusé', V.verifier(o).length > 0);
console.log(ko ? ko + ' échec(s)' : 'Toutes les vérifications réussies');
process.exit(ko ? 1 : 0);