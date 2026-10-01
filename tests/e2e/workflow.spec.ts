import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { storage } from '../../src/lib/storage';
test.describe.configure({ mode: 'serial' });
const db = new PrismaClient();
const password = randomBytes(18).toString('hex');
const marker = `QA-${Date.now()}`;
const suffix = String(Date.now()).slice(-6);
const clientPhone = `+21260${suffix}1`,
  otherPhone = `+21260${suffix}2`,
  adminPhone = `+21260${suffix}3`,
  expertPhone = `+21260${suffix}4`;
let reference = '';
async function login(page: Page, phone: string) {
  await page.goto('/connexion');
  await page.getByLabel('Téléphone', { exact: true }).fill(phone);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/(mon-espace|admin)/);
}
async function choose(page: Page, legend: string, option: string) {
  const group = page
    .locator('fieldset.question')
    .filter({ has: page.locator('legend', { hasText: legend }) });
  await group.getByLabel(option, { exact: true }).check();
}
async function next(page: Page) {
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
}
async function habitation(page: Page) {
  await page.goto('/services/incendie-habitation#demande');
  await choose(page, 'Quel bien', 'Maison');
  await page.getByLabel('Date de l’incendie', { exact: true }).fill('2026-09-01');
  await next(page);
  await choose(page, 'Le bien était-il assuré', 'Non');
  await choose(page, 'Le sinistre a-t-il été déclaré', 'Oui');
  await choose(page, 'Votre dossier est-il toujours en cours', 'Oui');
  await choose(page, 'Avez-vous reçu une décision', 'Non');
  await next(page);
  await choose(page, 'Quel est aujourd’hui', 'L’évaluation me paraît insuffisante');
  await next(page);
  await choose(page, 'Quels documents', 'Photos / vidéos');
  await next(page);
}
test.beforeAll(async () => {
  const passwordHash = await hash(password, 12);
  for (const [phone, role] of [
    [adminPhone, 'ADMIN'],
    [otherPhone, 'CLIENT'],
    [expertPhone, 'EXPERT'],
  ] as const)
    await db.user.create({
      data: { phone, passwordHash, role, fullName: `${marker} ${role}`, city: 'Rabat' },
    });
});
test.afterAll(async () => {
  const users = await db.user.findMany({
    where: { fullName: { startsWith: marker } },
    select: { id: true, phone: true },
  });
  const ids = users.map((u) => u.id);
  const docs = await db.dossierDocument.findMany({ where: { authorId: { in: ids } } });
  for (const doc of docs) await storage.remove(doc.storageKey);
  await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
  await db.dossier.deleteMany({ where: { userId: { in: ids } } });
  await db.passwordReset.deleteMany({ where: { phone: { in: users.map((u) => u.phone) } } });
  await db.contactRequest.deleteMany({ where: { fullName: { startsWith: marker } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
test('parcours réel : formulaire, compte, dossier, admin, historique, documents et sécurité', async ({
  browser,
}) => {
  const client = await browser.newContext();
  const cp = await client.newPage();
  await habitation(cp);
  await cp.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Client`);
  await cp.getByLabel('Ville', { exact: true }).fill('Casablanca');
  await cp.getByLabel('Téléphone / WhatsApp', { exact: true }).fill(clientPhone);
  await cp.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await cp.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await cp.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  await expect(cp.getByText('Nous avons votre dossier.', { exact: true })).toBeVisible();
  reference = (await cp.locator('.reference-box').innerText()).trim();
  expect(reference).toMatch(/^MS-\d{4}-\d{6}$/);
  const created = await db.dossier.findUniqueOrThrow({
    where: { reference },
    include: { user: true, history: true },
  });
  expect(created.user.phone).toBe(clientPhone);
  expect(created.user.passwordHash).not.toBe(password);
  expect(created.status).toBe('A_VERIFIER');
  expect(created.history).toHaveLength(1);
  expect(created.reviewFlags).toContain('Bien non assuré');
  const session = (await client.cookies()).find((c) => c.name === 'ms_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  await cp.getByRole('link', { name: 'Suivre mon dossier', exact: true }).last().click();
  await expect(cp.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  const ap = await (await browser.newContext()).newPage();
  await login(ap, adminPhone);
  await ap.goto(`/admin/dossiers/${reference}`);
  await ap.getByLabel('Nouveau statut').selectOption('ANALYSE_EN_COURS');
  await ap.getByLabel('Commentaire visible par le client').fill('Analyse technique commencée.');
  await ap.getByRole('button', { name: 'Mettre à jour le statut', exact: true }).click();
  await expect(ap.getByText('Modification enregistrée.').first()).toBeVisible();
  await cp.bringToFront();
  await expect(cp.locator('.timeline').getByText('Analyse en cours', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await ap.getByLabel('Note interne', { exact: true }).fill('NOTE-CONFIDENTIELLE-QA');
  await ap.getByRole('button', { name: 'Ajouter la note', exact: true }).click();
  await expect(ap.locator('.note')).toContainText('NOTE-CONFIDENTIELLE-QA');
  await cp.reload();
  await expect(cp.locator('body')).not.toContainText('NOTE-CONFIDENTIELLE-QA');
  await ap.getByLabel('Pièce attendue', { exact: true }).fill('Photographie des dommages');
  await ap.getByRole('button', { name: 'Envoyer la demande', exact: true }).click();
  await expect(ap.locator('.document-requests')).toContainText('Photographie des dommages');
  await cp.reload();
  await expect(cp.getByText('Photographie des dommages', { exact: true })).toBeVisible();
  await cp.getByLabel('Fichier à joindre').setInputFiles({
    name: 'preuve.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await cp.getByRole('button', { name: 'Envoyer le document', exact: true }).click();
  await expect(cp.getByText('Document ajouté.', { exact: true })).toBeVisible();
  const doc = await db.dossierDocument.findFirstOrThrow({ where: { dossierId: created.id } });
  expect((await client.request.get(`/api/documents/${doc.id}`)).status()).toBe(200);
  await cp.getByLabel('Votre message', { exact: true }).fill('Voici ma photographie.');
  await cp.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
  await expect(cp.locator('.messages')).toContainText('Voici ma photographie.');
  await ap.reload();
  await expect(ap.locator('.messages')).toContainText('Voici ma photographie.');
  const other = await browser.newContext();
  const op = await other.newPage();
  await login(op, otherPhone);
  await op.goto(`/mon-espace/dossiers/${reference}`);
  await expect(op.getByRole('heading', { name: 'Cette page est introuvable.' })).toBeVisible();
  expect((await other.request.get(`/api/documents/${doc.id}`)).status()).toBe(404);
  await op.goto('/admin/dossiers');
  await expect(op).toHaveURL(/\/mon-espace$/);
  const anon = await browser.newContext();
  expect((await anon.request.get(`/api/documents/${doc.id}`)).status()).toBe(401);
  const expert = await browser.newContext();
  const ep = await expert.newPage();
  await login(ep, expertPhone);
  await ep.goto(`/admin/dossiers/${reference}`);
  await expect(ep.getByRole('heading', { name: 'Cette page est introuvable.' })).toBeVisible();
  const expertRecord = await db.user.findUniqueOrThrow({ where: { phone: expertPhone } });
  await ap.getByLabel('Responsable du dossier').selectOption(expertRecord.id);
  await ap.getByRole('button', { name: 'Assigner', exact: true }).click();
  await expect
    .poll(async () => (await db.dossier.findUniqueOrThrow({ where: { reference } })).assignedTo)
    .toBe(expertRecord.id);
  await ep.reload();
  await expect(ep.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  await ep.goto('/admin/clients');
  await expect(ep).toHaveURL(/\/admin\/dashboard$/);
  await cp.getByLabel('Fichier à joindre').setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('<script>alert(1)</script>'),
  });
  await cp.getByRole('button', { name: 'Envoyer le document', exact: true }).click();
  await expect(cp.getByText(/Format accepté/)).toBeVisible();
  await ap.goto(`/admin/dossiers?q=${reference}`);
  await expect(ap.locator('tbody')).toContainText(reference);
  await client.close();
  await other.close();
  await anon.close();
  await expert.close();
  await ap.context().close();
});
test('compte existant : authentification puis second dossier sans doublon', async ({ page }) => {
  await habitation(page);
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Client`);
  await page.getByLabel('Ville', { exact: true }).fill('Casablanca');
  await page
    .getByLabel('Téléphone / WhatsApp', { exact: true })
    .fill(clientPhone.replace('+212', '0'));
  await page.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await page.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  await expect(page.locator('.alert.error')).toContainText('Vous avez déjà un compte');
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  await expect(page.getByText('Nous avons votre dossier.', { exact: true })).toBeVisible();
  expect(await db.user.count({ where: { phone: clientPhone } })).toBe(1);
  expect(await db.dossier.count({ where: { user: { phone: clientPhone } } })).toBe(2);
});
test('formulaires commerce et expertise préalable, contact et reset vérifié', async ({ page }) => {
  await login(page, clientPhone);
  await page.goto('/services/incendie-magasins#demande');
  await choose(page, 'Quel commerce', 'Pharmacie');
  await page.getByLabel('Date de l’incendie', { exact: true }).fill('2026-09-01');
  await next(page);
  await choose(page, 'Le bien était-il assuré', 'Oui');
  await choose(page, 'Le sinistre a-t-il été déclaré', 'Oui');
  await choose(page, 'Votre dossier est-il toujours en cours', 'Non');
  await choose(page, 'Avez-vous reçu une décision', 'Oui');
  await next(page);
  await choose(page, 'Quels éléments', 'Stock / marchandises');
  await choose(page, 'Quel problème', 'Je souhaite faire vérifier mes pertes');
  await next(page);
  await next(page);
  await page.getByLabel('Nom du commerce', { exact: true }).fill(`${marker} Pharmacie`);
  await page.getByRole('button', { name: 'Envoyer mon dossier pour analyse', exact: true }).click();
  await expect(page.getByText('Nous avons votre dossier.', { exact: true })).toBeVisible();
  await page.goto('/services/expertise-prealable#demande');
  await choose(page, 'Quels biens', 'Montres');
  await choose(page, 'Combien de biens', '1 bien');
  await choose(page, 'Où se trouvent', 'Coffre / lieu sécurisé');
  await next(page);
  await choose(page, 'Pourquoi souhaitez', 'Avant de souscrire une assurance');
  await next(page);
  await choose(page, 'Avez-vous des documents', 'Certificats');
  await next(page);
  await choose(page, 'Quand souhaitez', 'Dans les prochaines semaines');
  await next(page);
  await page.getByRole('button', { name: 'Envoyer ma demande d’expertise', exact: true }).click();
  await expect(page.getByText('Nous avons votre dossier.', { exact: true })).toBeVisible();
  await page.goto('/contact');
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Contact`);
  await page.getByLabel('Téléphone', { exact: true }).fill(clientPhone);
  await page.getByLabel('Ville', { exact: true }).fill('Fès');
  await page.getByLabel('Service souhaité').selectOption('Autre demande');
  await page
    .getByLabel('Description de la demande')
    .fill('Je souhaite des informations sur mon dossier.');
  await page.getByRole('button', { name: 'Envoyer ma demande', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('transmise');
  await page.goto('/mot-de-passe-oublie');
  await page.getByLabel('Téléphone du compte').fill(otherPhone);
  await page.getByRole('button', { name: 'Demander une réinitialisation' }).click();
  await expect(page.getByRole('status')).toContainText('Si un compte');
  await login(page, adminPhone);
  await page.goto('/admin/parametres');
  const section = page
    .locator('section.panel')
    .filter({ has: page.getByRole('heading', { name: otherPhone, exact: true }) });
  await section.getByLabel('Identité du demandeur vérifiée').check();
  await section.getByRole('button', { name: 'Générer un lien de 30 minutes' }).click();
  const url = await section.getByLabel('Lien de réinitialisation').inputValue();
  await page.goto(url);
  const newPassword = randomBytes(18).toString('hex');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirmation', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
  await expect(page.getByRole('status')).toContainText('a été modifié');
});
test('pages publiques et responsive sans débordement', async ({ page }) => {
  for (const width of [390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('link', { name: 'À propos', exact: true })).toBeVisible();
  for (const path of [
    '/services',
    '/services/incendie',
    '/services/incendie-habitation',
    '/services/incendie-magasins',
    '/services/expertise-prealable',
    '/a-propos',
    '/contact',
    '/connexion',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await login(page, adminPhone);
  for (const path of [
    '/admin/dashboard',
    '/admin/dossiers',
    `/admin/dossiers/${reference}`,
    '/admin/clients',
    '/admin/demandes-contact',
    '/admin/documents',
    '/admin/parametres',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto(`/admin/dossiers/${reference}`);
  await expect(page.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
  for (const width of [768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await login(page, clientPhone);
  for (const width of [390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/mon-espace',
      '/mon-espace/dossiers',
      `/mon-espace/dossiers/${reference}`,
      '/mon-espace/documents',
      '/mon-espace/profil',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/mon-espace/dossiers/${reference}`);
  await expect(page.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  await page.screenshot({ path: 'test-results/client-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});
