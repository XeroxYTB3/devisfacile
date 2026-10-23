# DevisFacile — PLAN

Application statique (HTML/CSS/JS pur, AUCUN build, AUCUNE dépendance en ligne) → fonctionne en double-clic sur index.html ET sur GitHub Pages. Scripts classiques (pas de modules ES, pour que file:// marche). Tout en français, vouvoiement, sans jargon.

## Lancement
- Double-clic sur index.html, ou `python -m http.server 8080` puis http://localhost:8080
- Tests de calcul : `node tests/calc.test.js`
- Déploiement : dépôt GitHub → Settings > Pages > branche main, dossier racine

## Fichiers
- index.html : coquille (menu, zone #vue, modales), charge les scripts dans l'ordre ci-dessous
- css/app.css : design (variables CSS, responsive mobile en premier)
- css/print.css : mise en page A4 du document imprimé/PDF (@page A4, marges 15mm)
- js/calc.js : calculs purs (global `Calc`), UMD (module.exports si Node) pour les tests
- js/store.js : stockage (global `Store`), localStorage clé `devisfacile.v1`, export/import JSON, sauvegarde
- js/legal.js : mentions obligatoires (global `Legal`)
- js/demo.js : données de démonstration (global `Demo`)
- js/ui.js : utilitaires UI (global `UI`) : h(), toast, modale, formats €, dates, échappement HTML
- js/views/*.js : une vue = une fonction `Views.nom(params)` qui renvoie un nœud DOM
  - dashboard.js, documents.js (liste), editor.js (devis/facture), clients.js, settings.js, preview.js (aperçu + impression)
- js/app.js : routeur par hash (#/tableau, #/documents, #/document/ID, #/clients, #/reglages, #/apercu/ID), démarrage
- tests/calc.test.js : tests Node des calculs et de la numérotation
- README.md

## Modèle de données (Store.state)

{ version:1,
entreprise:{ nom, forme, adresse, cp, ville, siret, email, tel, logo(dataURL|’’), tvaStatut:’franchise’|’assujetti’, tvaNumero, iban, bic, delaiPaiementJours:30, validiteDevisJours:30, tauxTvaDefaut:20, mentionRCS:’’, assurance:’’ },
clients:[{ id, nom, contact, email, adresse, cp, ville, siret, tvaNumero, notes }],
documents:[{ id, type:’devis’|’facture’, numero:’’, statut, clientId, dateEmission, dateEcheance (facture) | dateValidite (devis), objet, lignes:[{id, description, qte, unite, puHT, remisePct, tva}], remiseGlobalePct, acomptePct|null, acompteMontant|null, notes, conditions, lieDevisId, dateExecution, dateEnvoi, datePaiement, modePaiement, creeLe }],
compteurs:{ devis:{ “2026”:0 }, facture:{ “2026”:0 } } }


- Montants stockés en nombre décimal d'euros dans les lignes (saisie), MAIS tous les calculs passent en CENTIMES entiers (Calc).
- ids : `Store.uid()` ; numéros : devis `D-2026-001`, facture `F-2026-001`.

## Statuts
- devis : brouillon, envoyé, accepté, refusé, expiré (dérivé si dateValidite dépassée et statut=envoyé), facturé
- facture : brouillon, envoyée, payée, en retard (DÉRIVÉ : envoyée et dateEcheance < aujourd'hui)
- `Calc.statutAffiche(doc, aujourdhui)` renvoie le statut effectif.

## Calculs (js/calc.js) — règles
- ligneHT = arrondi(qte × puHT × (1 − remisePct/100)) en centimes
- remise globale appliquée au total HT, répartie au prorata sur chaque taux de TVA (arrondi, le reste va au plus gros taux)
- TVA par taux = arrondi(base × taux/100) ; si tvaStatut='franchise' → TVA = 0 partout
- totalTTC = HT net + TVA ; acompte = pct × TTC (ou montant fixe), arrondi ; netAPayer = TTC − acompte
- Facture issue d'un devis avec acompte : l'acompte est déduit sur ligne « Acompte déjà versé » ; netAPayer en conséquence
- API : Calc.totaux(doc, entreprise) → { lignes:[{ht}], baseParTaux:[{taux,base,tva}], totalHT, remise, totalHTNet, totalTVA, totalTTC, acompte, netAPayer } (tout en centimes) ; Calc.eur(cents) ; Calc.versCentimes(x)

## Numérotation
- Un numéro n'est attribué qu'à l'émission (passage brouillon → envoyé, ou conversion devis → facture), jamais au brouillon.
- Compteur par type et par année, +1, sans trou. Une facture émise ne se supprime pas (annulation = avoir, hors périmètre : on propose « Dupliquer »). Un brouillon se supprime librement sans consommer de numéro.

## Mentions légales (js/legal.js)
Devis : identité émetteur (nom, forme, adresse, SIRET, tél/email), client, date, numéro, durée de validité, description détaillée, prix unitaires HT, remises, TVA ou « TVA non applicable, art. 293 B du CGI », total HT/TTC, acompte, délai d'exécution/livraison, conditions de paiement, zone « Bon pour accord, date et signature ».
Facture : tout ce qui précède + date d'émission, date de réalisation de la prestation, date d'échéance, pénalités de retard (3 fois le taux d'intérêt légal), indemnité forfaitaire de recouvrement 40 €, escompte (« Pas d'escompte pour paiement anticipé »), n° TVA intracom si assujetti, coordonnées bancaires, mention RCS/assurance si renseignées.
Micro-entrepreneur : « TVA non applicable, art. 293 B du CGI » sur devis ET facture + « Dispensé d'immatriculation au RCS/RM » possible.
Avertissement dans Réglages : l'outil aide mais ne remplace pas un conseil comptable.

## PDF
Aperçu fidèle (#/apercu/ID) + bouton « Télécharger en PDF » = window.print() avec css/print.css (A4, titre du document = « Numero-Client » pour nom de fichier PDF proposé). Aucun service en ligne. Texte sélectionnable, logo inclus, en-têtes de tableau répétés, pas de coupure au milieu d'une ligne, bloc totaux jamais séparé.

## Fonctionnalités en plus (gain de temps)
- Catalogue de prestations enregistrées (ajout en un clic dans les lignes)
- Duplication d'un document, création rapide depuis un client
- Tableau de bord : encaissé / en attente / en retard / devis en cours + chiffre d'affaires du mois, alertes de relance
- Plafond micro-entreprise (indicateur CA annuel vs seuil prestations de services 77 700 €, modifiable)
- Texte de relance prêt à copier pour les factures en retard
- Sauvegarde/restauration JSON, recherche et filtres
- Raccourcis clavier (Ctrl+S enregistrer, N nouveau devis)

## Design
Sobre, moderne : fond clair, accent indigo (#4f46e5), cartes arrondies, typographie système (Inter si présente, sinon system-ui), pastilles de statut colorées, menu latéral sur ordinateur, barre basse sur mobile, champs larges et tactiles, mode sombre via prefers-color-scheme.

## Conventions
- Aucun innerHTML avec des données utilisateur : toujours UI.h()/textContent (anti-injection)
- Dates ISO `YYYY-MM-DD`, affichage `JJ/MM/AAAA`
- Les vues se re-rendent via `App.render()`
- Chaque fichier JS commence par `'use strict';` et expose un seul global