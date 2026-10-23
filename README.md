# DevisFacile

Application de devis et de factures pour freelances et petits entrepreneurs français. Tout est en français, sans compte et sans service en ligne : vos données restent dans votre navigateur.

## Lancer l'application

- **Le plus simple** : double-cliquez sur `index.html`.
- **Ou avec un petit serveur local** : `python -m http.server 8080`, puis ouvrez http://localhost:8080

Au premier lancement, l'application est vide : renseignez d'abord votre entreprise dans **Réglages**, puis ajoutez vos clients et créez votre premier devis.

## Ce que fait l'application

- Informations d'entreprise saisies une seule fois (nom, adresse, SIRET, logo, TVA, IBAN) et reprises partout.
- Clients : liste, recherche, fiche avec l'historique des documents.
- Devis rapide : lignes avec quantité, prix HT, remise, TVA, remise globale, acompte, catalogue de prestations.
- Devis accepté → facture en un clic, numérotation sans trou (D-2026-001, F-2026-001), acompte déduit.
- PDF propre : bouton « Télécharger en PDF » (choisir « Enregistrer au format PDF »).
- Statuts : brouillon, envoyé, accepté, refusé, facturé ; facture envoyée, payée, en retard (calculé).
- Tableau de bord : encaissé, en attente, en retard, devis en cours, chiffre d'affaires du mois, plafond micro-entreprise, texte de relance à copier.
- Mentions obligatoires françaises, dont « TVA non applicable, art. 293 B du CGI » pour la franchise en base.
- Sauvegarde et restauration au format JSON.
- Raccourcis : Ctrl+S enregistrer, N nouveau devis.

## Déployer sur GitHub Pages

1. Créez un dépôt GitHub et envoyez-y tous les fichiers (`.nojekyll` inclus).
2. Dépôt > Settings > Pages > Source : branche `main`, dossier `/ (root)`.
3. L'application est disponible à l'adresse indiquée par GitHub.

Attention : les données sont stockées par navigateur et par adresse. Celles saisies en double-cliquant sur `index.html` ne se retrouvent pas sur l'adresse GitHub Pages : utilisez la sauvegarde JSON pour les transférer.

## API pour vos scripts

`window.DevisFacile` expose vos documents, clients, catalogue et statistiques en lecture (tapez `DevisFacile.aide()` dans la console du navigateur). L'écriture est bloquée par défaut : activez-la dans **Réglages**, section « API pour vos scripts », puis utilisez la clé d'accès affichée. Référence complète et exemples : `API.md`.

## Sécurité

Politique de sécurité (CSP) stricte, aucun appel réseau, aucune évaluation de code, aucune injection HTML avec des données utilisateur, validation des sauvegardes importées. Vérifié par `node tests/securite.js`.

## Tests

- Calculs : `node tests/calc.test.js`
- Sécurité (injection XSS, import, API, CSP) : `node tests/securite.js`
- Parcours complet dans un vrai navigateur (Edge ou Chrome installé) : `npm install --no-save playwright-core` puis `node tests/e2e.js`. Les PDF et captures sont écrits dans `tests/e2e-sortie/`.

## Limites

- Les données vivent dans le navigateur : pas de synchronisation entre appareils (sauvegarde JSON à faire régulièrement).
- Pas d'avoir (facture rectificative) : une facture émise ne se supprime pas ; utilisez « Dupliquer ».
- Le PDF passe par la fenêtre d'impression du navigateur.
- Pas de facturation électronique (Factur-X) ni de connexion à une plateforme agréée.
- L'outil aide à respecter les mentions obligatoires mais ne remplace pas l'avis d'un comptable.