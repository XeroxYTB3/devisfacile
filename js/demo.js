'use strict';
var Demo = (function () {

  function creer() {
    var t = Calc.aujourdhui();
    var an = t.slice(0, 4);
    function j(n) { return Calc.ajouterJours(t, n); }
    var cpt = 0;
    function lg(description, qte, unite, puHT, remisePct) {
      cpt++;
      return { id: 'demo-l' + cpt, description: description, qte: qte, unite: unite, puHT: puHT, remisePct: remisePct || 0, tva: 0 };
    }

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#4f46e5"/><text x="60" y="76" font-size="46" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif">SS</text></svg>';
    var logo = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

    var entreprise = {
      nom: 'Shubham Sharma', forme: 'Micro-entrepreneur (entreprise individuelle)',
      adresse: '12 rue des Lilas', cp: '69003', ville: 'Lyon',
      siret: '83912345600021', email: 'contact@shubham-ia.example', tel: '06 12 34 56 78',
      logo: logo, tvaStatut: 'franchise', tvaNumero: '',
      iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'AGRIFRPP',
      delaiPaiementJours: 30, validiteDevisJours: 30, tauxTvaDefaut: 20,
      mentionRCS: 'Dispensé d’immatriculation au RCS et au RM', assurance: '', plafondCA: 77700
    };

    var clients = [
      { id: 'demo-c1', nom: 'Lumora AI', contact: 'Camille Laurent', email: 'partenariats@lumora.example', adresse: '45 avenue de la République', cp: '75011', ville: 'Paris', siret: '90123456700015', tvaNumero: 'FR12901234567', notes: 'Outil d’écriture assistée par IA. Contact principal : Camille, responsable partenariats.' },
      { id: 'demo-c2', nom: 'Nuvia Cloud', contact: 'Thomas Girard', email: 'thomas.girard@nuvia.example', adresse: '8 quai des Chartrons', cp: '33000', ville: 'Bordeaux', siret: '81234567800032', tvaNumero: 'FR45812345678', notes: 'Hébergement et calcul pour modèles d’IA.' },
      { id: 'demo-c3', nom: 'Pixelforge Studio', contact: 'Inès Moreau', email: 'ines@pixelforge.example', adresse: '27 rue du Faubourg Saint-Antoine', cp: '75012', ville: 'Paris', siret: '87654321000019', tvaNumero: 'FR98876543210', notes: 'Générateur d’images par IA.' }
    ];

    var catalogue = [
      { id: 'demo-p1', description: 'Intégration sponsorisée (60 à 90 secondes) dans une vidéo YouTube', unite: 'forfait', puHT: 1800, tva: 0 },
      { id: 'demo-p2', description: 'Vidéo dédiée sponsorisée (5 à 8 minutes)', unite: 'forfait', puHT: 2400, tva: 0 },
      { id: 'demo-p3', description: 'Short YouTube sponsorisé (moins de 60 secondes)', unite: 'unité', puHT: 450, tva: 0 },
      { id: 'demo-p4', description: 'Mention dans la description et commentaire épinglé', unite: 'forfait', puHT: 150, tva: 0 },
      { id: 'demo-p5', description: 'Script, tests et prise en main de l’outil', unite: 'forfait', puHT: 300, tva: 0 },
      { id: 'demo-p6', description: 'Droits d’utilisation publicitaire de la vidéo (3 mois)', unite: 'forfait', puHT: 600, tva: 0 }
    ];

    function base(id, type, numero, statut, clientId, emission, objet, lignes) {
      var d = {
        id: id, type: type, numero: numero, statut: statut, clientId: clientId,
        dateEmission: emission, objet: objet, lignes: lignes, remiseGlobalePct: 0,
        acomptePct: null, acompteMontant: null, notes: '', delaiExecution: '',
        creeLe: emission + 'T09:00:00.000Z'
      };
      return d;
    }

    var d1 = base('demo-d1', 'devis', 'D-' + an + '-001', 'facturé', 'demo-c2', j(-70),
      'Vidéo dédiée : test de Nuvia Cloud',
      [lg('Vidéo dédiée sponsorisée (5 à 8 minutes)', 1, 'forfait', 2400), lg('Script, tests et prise en main de l’outil', 1, 'forfait', 300)]);
    d1.dateValidite = j(-40); d1.dateEnvoi = j(-70); d1.factureId = 'demo-f1';
    d1.delaiExecution = 'Publication sous 3 semaines après validation du script';

    var f1 = base('demo-f1', 'facture', 'F-' + an + '-001', 'payée', 'demo-c2', j(-45),
      'Vidéo dédiée : test de Nuvia Cloud',
      [lg('Vidéo dédiée sponsorisée (5 à 8 minutes)', 1, 'forfait', 2400), lg('Script, tests et prise en main de l’outil', 1, 'forfait', 300)]);
    f1.lieDevisId = 'demo-d1'; f1.dateExecution = j(-47); f1.dateEcheance = j(-15);
    f1.dateEnvoi = j(-45); f1.datePaiement = j(-20); f1.modePaiement = 'Virement bancaire';

    var d2 = base('demo-d2', 'devis', 'D-' + an + '-002', 'facturé', 'demo-c3', j(-60),
      'Intégration sponsorisée : générateur d’images Pixelforge',
      [lg('Intégration sponsorisée (60 à 90 secondes) dans une vidéo YouTube', 1, 'forfait', 1500), lg('Mention dans la description et commentaire épinglé', 1, 'forfait', 100)]);
    d2.dateValidite = j(-30); d2.dateEnvoi = j(-60); d2.acomptePct = 30; d2.factureId = 'demo-f2';

    var f2 = base('demo-f2', 'facture', 'F-' + an + '-002', 'envoyée', 'demo-c3', j(-50),
      'Intégration sponsorisée : générateur d’images Pixelforge',
      [lg('Intégration sponsorisée (60 à 90 secondes) dans une vidéo YouTube', 1, 'forfait', 1500), lg('Mention dans la description et commentaire épinglé', 1, 'forfait', 100)]);
    f2.acomptePct = 30; f2.lieDevisId = 'demo-d2'; f2.dateExecution = j(-52); f2.dateEcheance = j(-20);
    f2.dateEnvoi = j(-50); f2.modePaiement = 'Virement bancaire';

    var d3 = base('demo-d3', 'devis', 'D-' + an + '-003', 'accepté', 'demo-c2', j(-10),
      'Série de 3 Shorts sur les nouveautés de Nuvia Cloud',
      [lg('Short YouTube sponsorisé (moins de 60 secondes)', 3, 'unité', 450, 10)]);
    d3.dateValidite = j(20); d3.dateEnvoi = j(-10);
    d3.delaiExecution = 'Un Short par semaine pendant 3 semaines';

    var d4 = base('demo-d4', 'devis', 'D-' + an + '-004', 'envoyé', 'demo-c1', j(-4),
      'Intégration sponsorisée dans ma prochaine vidéo : Lumora AI',
      [lg('Intégration sponsorisée (60 à 90 secondes) dans une vidéo YouTube', 1, 'forfait', 1800),
       lg('Short YouTube de reprise (moins de 60 secondes)', 1, 'unité', 350),
       lg('Mention dans la description et commentaire épinglé', 1, 'forfait', 150)]);
    d4.dateValidite = j(26); d4.dateEnvoi = j(-4); d4.acomptePct = 30;
    d4.delaiExecution = 'Publication sous 3 semaines après validation du script';
    d4.notes = 'Le script est soumis à votre validation avant tournage. Une demande de modification est incluse.';

    var d5 = base('demo-d5', 'devis', '', 'brouillon', 'demo-c1', t,
      'Test et avis sur un outil de montage vidéo assisté par IA',
      [lg('Vidéo dédiée sponsorisée (5 à 8 minutes)', 1, 'forfait', 2400)]);
    d5.dateValidite = j(30);

    var compteurs = { devis: {}, facture: {} };
    compteurs.devis[an] = 4;
    compteurs.facture[an] = 2;

    return {
      version: 1, entreprise: entreprise, clients: clients, catalogue: catalogue,
      documents: [d1, f1, d2, f2, d3, d4, d5], compteurs: compteurs
    };
  }

  return { creer: creer };
})();