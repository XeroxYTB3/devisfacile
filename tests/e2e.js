'use strict';
// Test de bout en bout dans un vrai navigateur (Edge ou Chrome installé) : node tests/e2e.js
const path = require('path'), fs = require('fs'), cp = require('child_process');
let pw;
try { pw = require('playwright-core'); } catch (e) {
  const cands = [];
  try { cands.push(cp.execSync('npm root -g').toString().trim()); } catch (x) {}
  cands.push(path.join(process.env.APPDATA || '', 'npm', 'node_modules'));
  cands.push(path.join(process.cwd(), 'node_modules'));
  for (const c of cands) { try { pw = require(path.join(c, 'playwright-core')); break; } catch (x) {} }
  if (!pw) { console.log('KO playwright-core introuvable'); process.exit(2); }
}
const norm = s => String(s).replace(/[\u00a0\u202f]/g, ' ');
const fmt = n => norm(n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
let ko = 0;
function ok(nom, cond, detail) { if (!cond) ko++; console.log((cond ? 'OK ' : 'KO ') + nom + (cond || !detail ? '' : ' → ' + detail)); }
async function etape(nom, fn) { try { await fn(); } catch (e) { ko++; console.log('KO ' + nom + ' → exception : ' + String(e.message).split('\n')[0]); } }

(async () => {
  const sortie = path.resolve('tests', 'e2e-sortie');
  fs.mkdirSync(sortie, { recursive: true });
  const base = require('url').pathToFileURL(path.resolve('index.html')).href;
  let browser = null;
  for (const channel of ['msedge', 'chrome']) {
    try { browser = await pw.chromium.launch({ channel, headless: true }); console.log('Navigateur : ' + channel); break; } catch (e) {}
  }
  if (!browser) { console.log('KO aucun navigateur Edge/Chrome lancé'); process.exit(2); }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push('console: ' + m.text()); });
  const aller = async h => { await page.goto(base + h); await page.reload(); await page.waitForTimeout(150); };

  let idDevis = '', idFacture = '', ent = null, ttcAttendu = 230, franchise = true;

  await etape('démarrage', async () => {
    await page.goto(base + '#/tableau');
    await page.waitForSelector('#vue .kpi', { timeout: 5000 });
    ok('tableau de bord affiché avec indicateurs', (await page.locator('.kpi').count()) >= 4);
    const vide = await page.evaluate(() => ({ c: Store.clients().length, d: Store.documents().length }));
    ok('départ à zéro : aucun client ni document', vide.c === 0 && vide.d === 0, JSON.stringify(vide));
    const menuTxt = await page.locator('#menu').innerText();
    ok('aucune icône ni emoji dans le menu', !/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u.test(menuTxt), menuTxt.replace(/\n/g, ' | '));
    await page.evaluate(() => { window.localStorage.setItem('devisfacile.api', JSON.stringify({ ecriture: true, cle: 'cle-de-test-e2e' })); });
    await page.evaluate(() => { const e = Store.entreprise(); Object.assign(e, { nom: 'Shubham Sharma', siret: '73282932000074', tvaStatut: 'franchise' }); Store.sauverEntreprise(e); });
    const api = await page.evaluate(() => {
      const A = window.DevisFacile, k = 'cle-de-test-e2e', r = {};
      r.present = !!A && typeof A.ecriture.creerDevis === 'function';
      try { A.ecriture.creerClient('mauvaise-cle', { nom: 'X' }); r.mauvaise = false; } catch (e) { r.mauvaise = true; }
      ['Marque A', 'Marque B', 'Marque C'].forEach(n => A.ecriture.creerClient(k, { nom: n, ville: 'Paris' }));
      A.clients().forEach((c, i) => A.ecriture.creerDevis(k, { clientId: c.id, objet: 'Devis API ' + (i + 1), lignes: [{ description: 'Prestation', qte: 1, puHT: 100 * (i + 1), tva: 0 }] }));
      r.docs = A.documents().length;
      r.clients = A.clients().length;
      r.stats = typeof A.statistiques().encaisse;
      try { A.clients()[0].nom = 'modifié'; r.copie = Store.clients()[0].nom !== 'modifié'; } catch (e) { r.copie = true; }
      return r;
    });
    ok('API présente', api.present);
    ok('API : écriture refusée avec une mauvaise clé', api.mauvaise);
    ok('API : 3 clients et 3 devis créés', api.clients === 3 && api.docs === 3, JSON.stringify(api));
    ok('API : statistiques disponibles', api.stats === 'number');
    ok('API : lecture en copie (aucune modification du stockage)', api.copie);
    ent = await page.evaluate(() => Store.entreprise());
    ok('entreprise de test : Shubham Sharma', /Shubham Sharma/.test(ent.nom), ent.nom);
    const nb = await page.evaluate(() => ({ c: Store.clients().length, d: Store.documents().length }));
    ok('3 clients créés par l’API', nb.c === 3, String(nb.c));
    ok('documents créés par l’API', nb.d >= 3, String(nb.d));
    franchise = ent.tvaStatut === 'franchise';
  });

  await etape('liste des documents', async () => {
    await aller('#/documents');
    await page.waitForSelector('table tbody tr', { timeout: 4000 });
    ok('liste des documents non vide', (await page.locator('table tbody tr').count()) >= 3);
  });

  await etape('création d’un devis', async () => {
    await page.click('#btn-nouveau-devis');
    await page.waitForSelector('select[aria-label="Client"]');
    idDevis = decodeURIComponent(page.url().split('/document/')[1]);
    await page.locator('select[aria-label="Client"]').selectOption({ index: 1 });
    await page.locator('input[placeholder^="Ex. : Intégration"]').fill('Test e2e intégration');
    await page.locator('input[aria-label="Description"]').nth(0).fill('Montage vidéo');
    await page.locator('input[aria-label="Quantité"]').nth(0).fill('2');
    await page.locator('input[aria-label="Prix unitaire HT"]').nth(0).fill('100');
    await page.locator('input[aria-label="Remise en pourcentage"]').nth(0).fill('10');
    await page.click('text=+ Ajouter une ligne');
    await page.locator('input[aria-label="Description"]').nth(1).fill('Miniature');
    await page.locator('input[aria-label="Quantité"]').nth(1).fill('1');
    await page.locator('input[aria-label="Prix unitaire HT"]').nth(1).fill('50');
    let tva = 0;
    if (!franchise) tva = await page.evaluate(() => Number(Store.doc(location.hash.split('/document/')[1]).lignes[0].tva));
    ttcAttendu = franchise ? 230 : Math.round(230 * (1 + tva / 100) * 100) / 100;
    await page.waitForTimeout(100);
    let t = norm(await page.locator('.totaux').innerText());
    ok('ligne 2 × 100 € − 10 % + 1 × 50 € = 230,00 € HT', t.includes('230,00'), t.replace(/\n/g, ' | '));
    if (!franchise) ok('TTC attendu ' + fmt(ttcAttendu), t.includes(fmt(ttcAttendu)), t.replace(/\n/g, ' | '));
    await page.locator('input[aria-label="Acompte en pourcentage"]').fill('30');
    await page.waitForTimeout(100);
    t = norm(await page.locator('.totaux').innerText());
    const ac = Math.round(ttcAttendu * 30) / 100, net = Math.round((ttcAttendu - ac) * 100) / 100;
    ok('acompte 30 % = ' + fmt(ac) + ' et net à payer = ' + fmt(net), t.includes(fmt(ac)) && t.includes(fmt(net)), t.replace(/\n/g, ' | '));
    await page.waitForTimeout(600);
    const sauve = await page.evaluate(id => Store.doc(id).lignes.length, idDevis);
    ok('enregistrement automatique (2 lignes)', sauve === 2, String(sauve));
  });

  await etape('statuts du devis et conversion', async () => {
    await page.getByRole('button', { name: 'Marquer comme envoyé' }).click();
    await page.waitForSelector('text=Devis accepté');
    let d = await page.evaluate(id => Store.doc(id), idDevis);
    ok('devis numéroté à l’envoi (D-AAAA-NNN)', /^D-\d{4}-\d{3}$/.test(d.numero) && d.statut === 'envoyé', d.numero + ' / ' + d.statut);
    await page.getByRole('button', { name: 'Devis accepté' }).click();
    await page.waitForSelector('text=Transformer en facture');
    await page.getByRole('button', { name: 'Transformer en facture' }).click();
    await page.waitForFunction(id => !location.hash.includes(id), idDevis, { timeout: 4000 });
    idFacture = decodeURIComponent(page.url().split('/document/')[1]);
    const r = await page.evaluate(([f, dv]) => {
      const F = Store.doc(f), D = Store.doc(dv), e = Store.entreprise();
      return { F: { type: F.type, numero: F.numero, statut: F.statut, lie: F.lieDevisId, lignes: F.lignes.length, acPct: F.acomptePct }, Dst: D.statut, Dfact: D.factureId,
        tF: Calc.totaux(F, e), tD: Calc.totaux(D, e) };
    }, [idFacture, idDevis]);
    ok('facture créée avec numéro F-AAAA-NNN', r.F.type === 'facture' && /^F-\d{4}-\d{3}$/.test(r.F.numero), JSON.stringify(r.F));
    ok('facture liée au devis, devis « facturé »', r.F.lie === idDevis && r.Dst === 'facturé' && r.Dfact === idFacture);
    ok('mêmes lignes et mêmes totaux que le devis', r.F.lignes === 2 && r.tF.totalHT === r.tD.totalHT && r.tF.totalTTC === r.tD.totalTTC && r.tF.acompte === r.tD.acompte, JSON.stringify([r.tF.totalTTC, r.tD.totalTTC]));
    ok('total HT 23000 centimes', r.tF.totalHT === 23000, String(r.tF.totalHT));
    await page.getByRole('button', { name: 'Marquer comme payée' }).click();
    await page.waitForTimeout(150);
    const f = await page.evaluate(id => Store.doc(id), idFacture);
    ok('facture marquée payée avec date de paiement', f.statut === 'payée' && !!f.datePaiement);
  });

  await etape('numérotation sans trou', async () => {
    const nums = await page.evaluate(() => {
      const out = {};
      Store.documents().forEach(d => { if (d.numero) { const m = /^([DF])-(\d{4})-(\d+)$/.exec(d.numero); (out[m[1] + m[2]] = out[m[1] + m[2]] || []).push(Number(m[3])); } });
      return out;
    });
    let bon = true; const det = [];
    Object.keys(nums).forEach(k => { const a = nums[k].sort((x, y) => x - y); det.push(k + ':' + a.join(',')); a.forEach((n, i) => { if (n !== i + 1) bon = false; }); });
    ok('numéros consécutifs par type et par année', bon, det.join(' '));
  });

  await etape('aperçu et PDF', async () => {
    await aller('#/apercu/' + encodeURIComponent(idFacture));
    await page.waitForSelector('.doc-wrap');
    const t = norm(await page.locator('.doc-wrap').innerText()).toLowerCase();
    const f = await page.evaluate(id => Store.doc(id).numero, idFacture);
    ok('aperçu facture : numéro affiché', t.includes(f.toLowerCase()));
    ok('mention indemnité de recouvrement 40 €', t.includes('recouvrement') && t.includes('40'));
    ok('mention pénalités de retard', t.includes('pénalités') || t.includes('penalites'));
    ok('mention TVA (art. 293 B) si franchise', !franchise || t.includes('293 b'));
    ok('SIRET de l’émetteur présent', /\d{3} ?\d{3} ?\d{3} ?\d{5}/.test(t));
    await page.emulateMedia({ media: 'print' });
    const pdf = path.join(sortie, 'facture.pdf');
    await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
    const buf = fs.readFileSync(pdf);
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok('PDF facture généré (' + Math.round(buf.length / 1024) + ' Ko, ' + pages + ' page(s))', buf.length > 5000 && pages >= 1 && pages <= 2, 'pages=' + pages);
    const masque = await page.evaluate(() => { const b = document.querySelector('.no-print'); return b ? getComputedStyle(b).display : 'absent'; });
    ok('éléments d’interface masqués à l’impression', masque === 'none', masque);
    await page.emulateMedia({ media: 'screen' });
    await aller('#/apercu/' + encodeURIComponent(idDevis));
    await page.waitForSelector('.doc-wrap');
    const td = norm(await page.locator('.doc-wrap').innerText()).toLowerCase();
    ok('aperçu devis : zone « Bon pour accord »', td.includes('bon pour accord'));
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: path.join(sortie, 'devis.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
    await page.emulateMedia({ media: 'screen' });
  });

  await etape('persistance et autres écrans', async () => {
    await aller('#/documents');
    const ex = await page.evaluate(id => !!Store.doc(id), idDevis);
    ok('données conservées après rechargement', ex);
    for (const h of ['#/tableau', '#/clients', '#/reglages']) { await aller(h); await page.waitForTimeout(100); }
    await aller('#/tableau');
    const kpi = norm(await page.locator('.grille-kpi').innerText()).toLowerCase();
    ok('tableau de bord : encaissé / attente / retard', kpi.includes('encaiss') && kpi.includes('attente') && kpi.includes('retard'), kpi.replace(/\n/g, ' | ').slice(0, 160));
  });

  await etape('mobile', async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
    const p = await m.newPage();
    p.on('pageerror', e => erreurs.push('mobile pageerror: ' + e.message));
    await p.goto(base + '#/tableau');
    await p.evaluate(txt => localStorage.setItem('devisfacile.v1', txt), await page.evaluate(() => Store.exporter()));
    for (const h of ['#/tableau', '#/documents', '#/document/' + encodeURIComponent(idDevis), '#/apercu/' + encodeURIComponent(idFacture), '#/clients', '#/reglages']) {
      await p.goto(base + h); await p.reload(); await p.waitForTimeout(200);
      const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok('mobile ' + h.split('/')[1] + ' sans défilement horizontal de la page', w.sw <= w.iw + 1, w.sw + ' > ' + w.iw);
      await p.screenshot({ path: path.join(sortie, 'mobile-' + h.split('/')[1] + '.png') });
    }
    const nav = await p.evaluate(() => { const r = document.getElementById('menu').getBoundingClientRect(); return r.bottom >= window.innerHeight - 2; });
    ok('barre de navigation basse sur mobile', nav);
    await m.close();
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await aller('#/tableau');
  await page.screenshot({ path: path.join(sortie, 'bureau-tableau.png') });
  ok('aucune erreur JavaScript dans la console', erreurs.length === 0, erreurs.slice(0, 3).join(' ; '));
  await browser.close();
  console.log(ko ? ('\n' + ko + ' vérification(s) en échec') : '\nToutes les vérifications réussies');
  process.exit(ko ? 1 : 0);
})();