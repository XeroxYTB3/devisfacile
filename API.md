# API DevisFacile

DevisFacile expose un objet `window.DevisFacile` dans la page ouverte. Il sert à lire vos données depuis vos propres scripts ou depuis la console du navigateur (touche F12), sans rien envoyer sur Internet.

- **Lecture** : toujours disponible.
- **Écriture** : bloquée par défaut. Elle s'active dans *Réglages → API pour vos scripts* et exige alors une **clé d'accès**, passée en premier argument.
- L'objet est gelé et ne renvoie que des **copies** : modifier un résultat ne modifie jamais vos données.
- Les montants de `montants` sont en **centimes d'euro** (18000 = 180,00 €).

Tapez `DevisFacile.aide()` pour un rappel dans la console.

## Lecture

| Fonction | Résultat |
|---|---|
| `DevisFacile.version` | `"1.0"` |
| `DevisFacile.entreprise()` | Vos informations d'entreprise |
| `DevisFacile.clients()` | Liste des clients (ordre alphabétique) |
| `DevisFacile.client(id)` | Un client ou `null` |
| `DevisFacile.catalogue()` | Prestations enregistrées |
| `DevisFacile.documents(filtre)` | Documents, du plus récent au plus ancien |
| `DevisFacile.document(id)` | Un document ou `null` |
| `DevisFacile.statistiques()` | Encaissé, en attente, en retard, devis en cours (année en cours) |

`filtre` est facultatif : `{ type: 'devis' | 'facture', statut: 'payée', clientId: '...' }`. Le statut peut être un statut stocké ou affiché (`'en retard'`, `'expiré'`).

Chaque document contient en plus :

- `statutAffiche` : statut tel qu'il apparaît à l'écran (calcule « en retard » et « expiré ») ;
- `montants` : `{ totalHT, remise, totalHTNet, totalTVA, totalTTC, acompte, netAPayer }`.

## Écriture

Activez d'abord l'option dans les Réglages et copiez la clé. Dans les exemples, remplacez `CLE` par cette clé.

### `ecriture.creerClient(cle, données)`

```js
DevisFacile.ecriture.creerClient('CLE', {
  nom: 'Lumora AI', contact: 'Camille Laurent', email: 'camille@lumora.example',
  adresse: '45 avenue de la République', cp: '75011', ville: 'Paris', siret: '90123456700015'
});
```

Seul `nom` est obligatoire (300 caractères maximum).

### `ecriture.creerDevis(cle, données)`

```js
DevisFacile.ecriture.creerDevis('CLE', {
  clientId: 'identifiant-du-client',
  objet: 'Intégration sponsorisée',
  lignes: [{ description: 'Intégration de 60 secondes', qte: 1, unite: 'forfait', puHT: 1800, remisePct: 0, tva: 0 }],
  remiseGlobalePct: 0, acomptePct: 30, delaiExecution: '3 semaines', notes: ''
});
```

Le devis est créé en **brouillon, sans numéro** : le numéro n'est attribué qu'à l'envoi, ce qui garantit une numérotation sans trou. Si vous êtes en franchise de TVA, le taux de TVA est forcé à 0.

### `ecriture.changerStatut(cle, id, statut)`

Statuts devis : `brouillon`, `envoyé`, `accepté`, `refusé`, `facturé`. Statuts facture : `brouillon`, `envoyée`, `payée`. Le premier passage hors brouillon attribue le numéro. Un document numéroté ne redevient jamais brouillon.

### `ecriture.convertirEnFacture(cle, id)`

Transforme un devis **accepté** en facture numérotée (lignes et acompte repris, devis marqué « facturé »). Renvoie la facture ; si elle existe déjà, la renvoie sans en créer une seconde.

## Erreurs

Toute erreur est une exception `Error` avec un message en français : clé incorrecte, écriture désactivée, valeur trop longue ou invalide, client introuvable, statut impossible. Les textes sont limités en taille et les nombres bornés.

## Exemple complet (console)

```js
const cle = 'CLE';
const client = DevisFacile.ecriture.creerClient(cle, { nom: 'Nuvia Cloud', ville: 'Bordeaux' });
const devis = DevisFacile.ecriture.creerDevis(cle, {
  clientId: client.id,
  lignes: [{ description: 'Vidéo dédiée', qte: 1, puHT: 2400 }]
});
DevisFacile.ecriture.changerStatut(cle, devis.id, 'envoyé');
DevisFacile.ecriture.changerStatut(cle, devis.id, 'accepté');
const facture = DevisFacile.ecriture.convertirEnFacture(cle, devis.id);
console.log(facture.numero, facture.montants.netAPayer / 100, '€');
```

## Sécurité

La clé est stockée sur votre appareil (pas dans les sauvegardes). Toute page ou script qui s'exécute dans le même navigateur sur la même adresse peut lire vos données : n'ouvrez pas de scripts inconnus. L'écriture reste désactivée tant que vous ne l'avez pas autorisée.