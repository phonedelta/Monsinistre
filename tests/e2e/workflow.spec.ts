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
// A real image of one pixel and a minimal PDF, for the files attached in the request form.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
  'base64',
);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
// A PDF that can really be read, one line of text per page: its objects, then the table that
// says where each of them starts. (`pdf` above has the right first bytes and nothing to show.)
function readablePdf(pages: string[]) {
  const objects = ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const tree = 2 + pages.length * 2;
  const kids = pages.map((text) => {
    const stream = `BT /F1 28 Tf 72 720 Td (${text}) Tj ET`;
    const content = objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return objects.push(
      `<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 595 842] /Contents ${content} 0 R /Resources << /Font << /F1 1 0 R >> >> >>`,
    );
  });
  objects.push(
    `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map((kid) => `${kid} 0 R`).join(' ')}] >>`,
  );
  const catalog = objects.push(`<< /Type /Catalog /Pages ${tree} 0 R >>`);
  let file = '%PDF-1.4\n';
  const offsets = objects.map((body, index) => {
    const offset = file.length;
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const table = file.length;
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  file += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  file += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${table}\n%%EOF\n`;
  return Buffer.from(file, 'latin1');
}
// Clients and the team sign in on separate pages: /connexion and /admin/connexion.
const clientSignIn = /^[^/]+\/\/[^/]+\/connexion$/;
const staffSignIn = /\/admin\/connexion$/;
async function signIn(page: Page, identifier: string, secret: string, staff: boolean) {
  await page.goto(staff ? '/admin/connexion' : '/connexion');
  await page
    .getByLabel(staff ? 'Identifiant ou téléphone' : 'Téléphone', { exact: true })
    .fill(identifier);
  await page.getByLabel('Mot de passe', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}
async function login(page: Page, phone: string) {
  const staff = phone === adminPhone || phone === expertPhone;
  await signIn(page, phone, password, staff);
  await expect(page).toHaveURL(staff ? /\/admin\/dashboard$/ : /\/mon-espace$/);
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
  await client.grantPermissions(['clipboard-read', 'clipboard-write']);
  const cp = await client.newPage();
  await habitation(cp);
  await cp.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Client`);
  await cp.getByLabel('Ville', { exact: true }).fill('Casablanca');
  await cp.getByLabel('Téléphone / WhatsApp', { exact: true }).fill(clientPhone);
  await cp.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await cp.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await cp.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  const sent = cp.getByRole('dialog');
  await expect(
    sent.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
  await expect(sent.getByRole('link', { name: 'Aller à mon espace' })).toHaveAttribute(
    'href',
    '/mon-espace',
  );
  reference = (await sent.locator('.reference-box').innerText()).trim();
  expect(reference).toMatch(/^MS-\d{4}-\d{6}$/);
  // The reference can be copied from the popup.
  await sent.getByRole('button', { name: 'Copier la référence' }).click();
  await expect(sent.getByRole('button', { name: 'Référence copiée' })).toBeVisible();
  expect(await cp.evaluate(() => navigator.clipboard.readText())).toBe(reference);
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
  await sent.getByRole('link', { name: 'Voir mon dossier' }).click();
  await expect(cp.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  // The band at the top of the dossier page: what the dossier is, its status and its step.
  const band = cp.locator('.dossier-hero');
  await expect(band.getByRole('heading', { level: 1 })).toHaveText('Incendie habitation');
  await expect(band).toContainText(reference);
  await expect(band.locator('.badge')).toHaveText('À vérifier');
  await expect(band.locator('.stages li')).toHaveText([
    'Réception : étape en cours',
    'Étude : étape à venir',
    'Expertise : étape à venir',
    'Rapport : étape à venir',
    'Terminé : étape à venir',
  ]);
  await expect(band.locator('.stages [aria-current="step"]')).toContainText('Réception');
  // Nothing is asked from the client yet, and a client is not shown their own contact details.
  await expect(band.locator('.hero-foot')).toHaveCount(0);
  // The bar under it leads to each part of the page and marks the one that is read.
  const parts = cp.getByRole('navigation', { name: 'Parties du dossier' });
  await expect(parts.getByRole('link')).toHaveText(['Documents', 'Échanges', 'Ma demande']);
  await parts.getByRole('link', { name: 'Ma demande' }).click();
  await expect(parts.getByRole('link', { name: 'Ma demande' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(cp.getByRole('heading', { name: 'Informations de la demande' })).toBeInViewport();
  // The reference can be copied from the band too.
  await cp.evaluate(() => navigator.clipboard.writeText(''));
  await cp.getByRole('button', { name: 'Copier la référence' }).click();
  await expect(cp.getByRole('button', { name: 'Copié' })).toBeVisible();
  expect(await cp.evaluate(() => navigator.clipboard.readText())).toBe(reference);
  // The dossier keeps every answer of the form, by section, for the client and for the team.
  const sections = ['Client', 'Situation', 'Assurance', 'Dommages', 'Documents'];
  const answers = [
    `${marker} Client`,
    clientPhone,
    'Casablanca',
    'Maison',
    '1 sept. 2026',
    'L’évaluation me paraît insuffisante',
    'Photos / vidéos',
  ];
  await expect(cp.locator('.answers-section h3')).toHaveText(sections);
  for (const answer of answers)
    await expect(cp.locator('.answers').getByText(answer, { exact: true })).toBeVisible();
  // It is listed at once in the client space.
  await cp.goto('/mon-espace');
  await expect(cp.locator('.dossier-card').filter({ hasText: reference })).toContainText(
    'Incendie habitation',
  );
  await cp.goto(`/mon-espace/dossiers/${reference}`);
  const ap = await (await browser.newContext()).newPage();
  await login(ap, adminPhone);
  // And at once in the administration: recent requests, then the list, with the client's details.
  await expect(ap.locator('.dossier-card').filter({ hasText: reference })).toContainText(
    `${marker} Client · ${clientPhone}`,
  );
  await ap.goto('/admin/dossiers');
  const row = ap.locator('tbody tr').filter({ hasText: reference });
  for (const cell of [
    `${marker} Client`,
    clientPhone,
    'Casablanca',
    'Incendie habitation',
    'À vérifier',
  ])
    await expect(row).toContainText(cell);
  await ap.goto(`/admin/dossiers/${reference}`);
  await expect(ap.locator('.answers-section h3')).toHaveText(sections);
  for (const answer of answers)
    await expect(ap.locator('.answers').getByText(answer, { exact: true })).toBeVisible();
  // The team reads whose dossier it is in the band, with the ways to reach the client.
  const owner = ap.locator('.dossier-hero .hero-foot');
  await expect(owner).toContainText(`${marker} Client`);
  await expect(owner.getByRole('link', { name: clientPhone })).toHaveAttribute(
    'href',
    `tel:${clientPhone}`,
  );
  await expect(owner.getByRole('link', { name: 'Voir le profil' })).toHaveAttribute(
    'href',
    `/admin/clients/${created.userId}`,
  );
  await expect(
    ap.getByRole('navigation', { name: 'Parties du dossier' }).getByRole('link'),
  ).toHaveText(['Demande', 'Documents', 'Échanges', 'Historique']);
  await ap.getByLabel('Nouveau statut').selectOption('ANALYSE_EN_COURS');
  await ap.getByLabel('Commentaire visible par le client').fill('Analyse technique commencée.');
  await ap.getByRole('button', { name: 'Mettre à jour le statut', exact: true }).click();
  await expect(ap.getByText('Modification enregistrée.').first()).toBeVisible();
  await cp.bringToFront();
  await expect(cp.locator('.timeline').getByText('Analyse en cours', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  // The list keeps the status that was just saved, like the badge of the page, and again
  // after a second change.
  const statusList = ap.getByLabel('Nouveau statut');
  await expect(statusList).toHaveValue('ANALYSE_EN_COURS');
  await expect(ap.locator('.dossier-hero .badge')).toHaveText('Analyse en cours');
  const step = ap.locator('.stages [aria-current="step"]');
  await expect(step).toContainText('Étude');
  await statusList.selectOption('EXPERTISE_PLANIFIEE');
  await ap.getByRole('button', { name: 'Mettre à jour le statut', exact: true }).click();
  await expect(ap.locator('.dossier-hero .badge')).toHaveText('Expertise planifiée');
  await expect(statusList).toHaveValue('EXPERTISE_PLANIFIEE');
  // The steps follow the status, and the latest status comes first in the list of changes.
  await expect(step).toContainText('Expertise');
  await expect(ap.locator('.stages [data-state="done"]')).toHaveText([
    'Réception : étape franchie',
    'Étude : étape franchie',
  ]);
  await expect(ap.locator('.timeline li')).toHaveCount(3);
  await expect(ap.locator('.timeline li').first()).toContainText('Expertise planifiée');
  await expect(ap.locator('.timeline li').last()).toContainText('À vérifier');
  // The dossier page has neither an assignment nor internal notes.
  await expect(ap.getByRole('heading', { name: 'Responsable' })).toHaveCount(0);
  await expect(ap.getByRole('heading', { name: 'Notes internes' })).toHaveCount(0);
  await ap.getByLabel('Pièce attendue', { exact: true }).fill('Photographie des dommages');
  await ap.getByRole('button', { name: 'Envoyer la demande', exact: true }).click();
  await expect(ap.locator('.document-requests')).toContainText('Photographie des dommages');
  await expect(ap.locator('.document-requests li')).toContainText('En attente');
  // The client does not have to open the dossier to learn it: every page of their space says
  // what the team waits for, with the way to the form of the dossier, and the menu counts it.
  await cp.goto('/mon-espace');
  const notice = cp.locator('.awaited-notice');
  await expect(notice).toContainText('Notre équipe attend un document de votre part');
  await expect(notice).toContainText(`Incendie habitation · ${reference}`);
  await expect(notice).toContainText('Photographie des dommages');
  const asked = cp.locator('.sidebar nav a[href="/mon-espace/dossiers"] .nav-badge');
  await expect(asked).toHaveText('1');
  await cp.goto('/mon-espace/documents');
  await expect(notice).toContainText('Photographie des dommages');
  await cp.goto('/mon-espace/dossiers');
  await notice.getByRole('link', { name: 'Envoyer le document' }).click();
  await expect(cp).toHaveURL(new RegExp(`/mon-espace/dossiers/${reference}#ajouter-un-document$`));
  await expect(cp.getByRole('heading', { name: 'Ajouter un document' })).toBeInViewport();
  // On the dossier itself, the band says it, with a link to the same form, and so does the
  // documents part.
  await expect(notice).toHaveCount(0);
  const awaited = cp.locator('.dossier-hero .hero-foot');
  await expect(awaited).toContainText('1 document à nous transmettre');
  await expect(awaited).toContainText('Photographie des dommages');
  await expect(awaited.getByRole('link', { name: 'Envoyer un document' })).toHaveAttribute(
    'href',
    '#ajouter-un-document',
  );
  await expect(cp.locator('.document-requests li')).toContainText('Photographie des dommages');
  await expect(cp.locator('.document-requests li')).toContainText('À nous transmettre');
  // The zone names the file that was chosen, then is free again once the file is sent.
  const zone = cp.locator('.add-document .upload-zone');
  await expect(zone).toContainText('Joindre un document');
  await cp.getByLabel('Fichier à joindre').setInputFiles({
    name: 'preuve.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(zone).toContainText('preuve.png');
  await cp.getByRole('button', { name: 'Envoyer le document', exact: true }).click();
  await expect(cp.getByText('Document ajouté.', { exact: true })).toBeVisible();
  await expect(zone).toContainText('Joindre un document');
  // The client reads the file as theirs; the team reads the name of who deposited it.
  await expect(cp.locator('.document-row')).toContainText('Photo · 1 Ko · Vous');
  const doc = await db.dossierDocument.findFirstOrThrow({ where: { dossierId: created.id } });
  expect((await client.request.get(`/api/documents/${doc.id}`)).status()).toBe(200);
  // A previewed file can run nothing and, like a download, cannot be framed. A player may ask
  // for a part of the file.
  const preview = await client.request.get(`/api/documents/${doc.id}?preview=1`);
  expect(preview.headers()['x-frame-options']).toBe('DENY');
  expect(preview.headers()['content-security-policy']).toContain("default-src 'none'");
  expect(preview.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(preview.headers()['content-disposition']).toContain('inline');
  const download = await client.request.get(`/api/documents/${doc.id}`);
  expect(download.headers()['x-frame-options']).toBe('DENY');
  expect(download.headers()['content-disposition']).toContain('attachment');
  const part = await client.request.get(`/api/documents/${doc.id}?preview=1`, {
    headers: { range: 'bytes=0-7' },
  });
  expect(part.status()).toBe(206);
  expect(part.headers()['content-range']).toBe(`bytes 0-7/${png.length}`);
  expect((await part.body()).equals(png.subarray(0, 8))).toBe(true);
  expect(
    (
      await client.request.get(`/api/documents/${doc.id}`, { headers: { range: 'bytes=9999-' } })
    ).status(),
  ).toBe(416);
  // The file endpoints only answer to a page of this site: sent from another site, or with no
  // origin at all, a file is refused even with the client's session, and so is a deletion
  // with the administrator's.
  const elsewhere = { origin: 'https://autre-site.example' };
  const upload = (headers: Record<string, string>) =>
    client.request.post('/api/documents', {
      headers,
      multipart: {
        reference,
        category: 'Photo',
        file: { name: 'ailleurs.png', mimeType: 'image/png', buffer: png },
      },
    });
  expect((await upload(elsewhere)).status()).toBe(403);
  expect((await upload({})).status()).toBe(403);
  expect(
    (await ap.request.delete(`/api/documents/${doc.id}`, { headers: elsewhere })).status(),
  ).toBe(403);
  expect(
    await db.dossierDocument.findMany({ where: { dossierId: created.id }, select: { id: true } }),
  ).toEqual([{ id: doc.id }]);
  await cp.getByLabel('Votre message', { exact: true }).fill('Voici ma photographie.');
  await cp.getByRole('button', { name: 'Envoyer le message', exact: true }).click();
  await expect(cp.locator('.messages')).toContainText('Voici ma photographie.');
  await expect(cp.locator('.message.own')).toContainText('Vous');
  await ap.reload();
  await expect(ap.locator('.messages')).toContainText('Voici ma photographie.');
  await expect(ap.locator('.message')).toContainText(`${marker} Client`);
  await expect(ap.locator('.document-row')).toContainText(`Photo · 1 Ko · ${marker} Client`);
  // Once the team has checked the file, the request is settled for both and the journal of the
  // dossier names the document.
  await ap.getByRole('button', { name: 'Marquer comme reçu et vérifié' }).click();
  await expect(ap.locator('.document-requests li')).toContainText('Reçu et vérifié');
  await expect(ap.locator('.activity li').first()).toContainText(
    'Document vérifié · Photographie des dommages',
  );
  await expect(ap.locator('#historique')).toContainText('Changement de statut · Analyse en cours');
  await cp.reload();
  await expect(cp.locator('.dossier-hero .hero-foot')).toHaveCount(0);
  await expect(cp.locator('.document-requests li')).toContainText('Reçu et vérifié');
  await cp.goto('/mon-espace');
  await expect(notice).toHaveCount(0);
  await expect(asked).toHaveCount(0);
  await cp.goto(`/mon-espace/dossiers/${reference}`);
  // The documents page of the administration: the files dossier by dossier, with who deposited
  // each one and when. Any file opens in a popup that also offers the download.
  await ap.goto('/admin/documents');
  const group = ap.locator('.dossier-files').filter({ hasText: reference });
  await expect(group.locator(':scope > header')).toContainText(
    `Incendie habitation · ${marker} Client · 1 fichier`,
  );
  await expect(group.getByRole('link', { name: reference })).toHaveAttribute(
    'href',
    `/admin/dossiers/${reference}`,
  );
  const filed = group.locator('tbody tr');
  await expect(filed).toHaveCount(1);
  for (const cell of ['preuve.png', 'Photo · Image PNG', `${marker} Client`])
    await expect(filed).toContainText(cell);
  await expect(filed.getByRole('link', { name: 'Télécharger' })).toHaveAttribute(
    'href',
    `/api/documents/${doc.id}`,
  );
  await filed.getByRole('button', { name: 'Visualiser' }).click();
  const viewer = ap.getByRole('dialog');
  await expect(viewer.getByRole('heading', { name: 'preuve.png' })).toBeVisible();
  await expect(viewer).toContainText(`déposé par ${marker} Client`);
  await expect
    .poll(() =>
      viewer
        .getByRole('img', { name: 'preuve.png' })
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(1);
  await expect(viewer.getByRole('link', { name: 'Télécharger' })).toHaveAttribute(
    'href',
    `/api/documents/${doc.id}`,
  );
  await viewer.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(ap.getByRole('dialog')).toHaveCount(0);
  // The dossier page opens its files in the same popup.
  await ap.goto(`/admin/dossiers/${reference}`);
  await ap.locator('.document-row').getByRole('button', { name: 'Visualiser' }).click();
  await expect(viewer.getByRole('img', { name: 'preuve.png' })).toBeVisible();
  await viewer.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(ap.getByRole('dialog')).toHaveCount(0);
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
  // An expert only sees the dossiers assigned to them, and so only their files.
  await ep.goto('/admin/documents');
  await expect(ep.getByRole('heading', { level: 1, name: 'Documents' })).toBeVisible();
  await expect(ep.getByText('preuve.png')).toHaveCount(0);
  await ep.goto(`/admin/dossiers/${reference}`);
  await expect(ep.getByRole('heading', { name: 'Cette page est introuvable.' })).toBeVisible();
  const expertRecord = await db.user.findUniqueOrThrow({ where: { phone: expertPhone } });
  // Nothing in the interface assigns a dossier any more: the test does it in the database.
  await db.dossier.update({ where: { reference }, data: { assignedTo: expertRecord.id } });
  await ep.reload();
  await expect(ep.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  // An expert reaches the client from the band, but has neither the client files nor the
  // right to delete a document.
  await expect(ep.locator('.dossier-hero .hero-foot')).toContainText(`${marker} Client`);
  await expect(ep.getByRole('link', { name: 'Voir le profil' })).toHaveCount(0);
  await expect(ep.locator('.document-row')).toHaveCount(1);
  await expect(ep.getByRole('button', { name: 'Supprimer le document' })).toHaveCount(0);
  await ep.goto('/admin/documents');
  await expect(ep.locator('.dossier-files').filter({ hasText: reference })).toContainText(
    'preuve.png',
  );
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
  // A photo chosen at the documents step waits for the request, through the sign-in popup too.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await page
    .getByLabel('Ajouter des fichiers (Photos / vidéos)')
    .setInputFiles({ name: 'facade.png', mimeType: 'image/png', buffer: png });
  await next(page);
  const attached = () =>
    db.dossierDocument.count({ where: { name: 'facade.png', author: { phone: clientPhone } } });
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Client`);
  await page.getByLabel('Ville', { exact: true }).fill('Casablanca');
  await page
    .getByLabel('Téléphone / WhatsApp', { exact: true })
    .fill(clientPhone.replace('+212', '0'));
  await page.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await page.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  const signIn = page.getByRole('dialog');
  await expect(
    signIn.getByRole('heading', { name: 'Un compte existe déjà avec ce numéro' }),
  ).toBeVisible();
  await expect(signIn.getByLabel('Téléphone', { exact: true })).toHaveValue(
    clientPhone.replace('+212', '0'),
  );
  const send = signIn.getByRole('button', { name: 'Se connecter et envoyer ma demande' });
  await signIn.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot-de-passe');
  await send.click();
  await expect(signIn.getByRole('alert')).toContainText('incorrect');
  expect(await db.dossier.count({ where: { user: { phone: clientPhone } } })).toBe(1);
  expect(await attached()).toBe(0);
  await signIn.getByLabel('Mot de passe', { exact: true }).fill(password);
  await send.click();
  await expect(
    page.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
  expect(await db.user.count({ where: { phone: clientPhone } })).toBe(1);
  expect(await db.dossier.count({ where: { user: { phone: clientPhone } } })).toBe(2);
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Un document a été joint',
  );
  expect(await attached()).toBe(1);
});
test('documents joints dès le formulaire, aucun champ quand le client n’en a pas', async ({
  page,
}) => {
  const phone = `+21260${suffix}7`;
  await page.goto('/services/incendie-habitation#demande');
  await choose(page, 'Quel bien', 'Appartement');
  await page.getByLabel('Date de l’incendie', { exact: true }).fill('2026-09-01');
  await next(page);
  // The questions are answered by yes or no: « Je ne sais pas » is no longer offered.
  await expect(page.locator('fieldset.question')).toHaveCount(5);
  await expect(page.getByLabel('Je ne sais pas', { exact: true })).toHaveCount(0);
  await choose(page, 'Le bien était-il assuré', 'Oui');
  await choose(page, 'Le sinistre a-t-il été déclaré', 'Oui');
  await choose(page, 'Votre dossier est-il toujours en cours', 'Oui');
  await choose(page, 'Avez-vous reçu une décision', 'Non');
  await next(page);
  await choose(page, 'Quel est aujourd’hui', 'Mon dossier prend du retard');
  await next(page);
  // Documents: nothing to attach until a kind of document is chosen, then one field for each.
  const fields = page.locator('.attachment');
  const picked = page.locator('.attachment li');
  await expect(page.locator('.attachments')).toHaveCount(0);
  await choose(page, 'Quels documents', 'Photos / vidéos');
  await choose(page, 'Quels documents', 'Rapport / expertise');
  await expect(fields).toHaveCount(2);
  const photos = page.getByLabel('Ajouter des fichiers (Photos / vidéos)');
  await photos.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('texte'),
  });
  await expect(page.locator('.alert.error')).toContainText('format non accepté');
  await expect(picked).toHaveCount(0);
  await photos.setInputFiles([
    { name: 'salon.png', mimeType: 'image/png', buffer: png },
    { name: 'cuisine.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(page.locator('.alert.error')).toHaveCount(0);
  await page.getByRole('button', { name: 'Retirer cuisine.png' }).click();
  await expect(picked).toHaveText([/salon\.png/]);
  // « Aucun » replaces the other choices and shows no field at all; the files come back with
  // their choice.
  await choose(page, 'Quels documents', 'Aucun pour le moment');
  await expect(page.getByLabel('Photos / vidéos', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Rapport / expertise', { exact: true })).not.toBeChecked();
  await expect(page.locator('.attachments')).toHaveCount(0);
  await choose(page, 'Quels documents', 'Photos / vidéos');
  await expect(page.getByLabel('Aucun pour le moment', { exact: true })).not.toBeChecked();
  await choose(page, 'Quels documents', 'Rapport / expertise');
  await expect(picked).toHaveText([/salon\.png/]);
  // The second file is a PDF by its name only: the server refuses it on its content.
  await page.getByLabel('Ajouter des fichiers (Rapport / expertise)').setInputFiles([
    { name: 'rapport.pdf', mimeType: 'application/pdf', buffer: pdf },
    { name: 'faux.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<script>1</script>') },
  ]);
  await expect(picked).toHaveCount(3);
  await next(page);
  // The files are kept while the form goes on, and back.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(picked).toHaveCount(3);
  await next(page);
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Documents`);
  await page.getByLabel('Ville', { exact: true }).fill('Agadir');
  await page.getByLabel('Téléphone / WhatsApp', { exact: true }).fill(phone);
  await page.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await page.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  // The request is confirmed, then its files are sent: two are filed, the false one is named.
  const sent = page.getByRole('dialog');
  await expect(
    sent.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
  await expect(sent.getByRole('status')).toContainText('2 documents ont été joints');
  await expect(sent.getByRole('alert')).toContainText('Un document n’a pas pu être envoyé');
  await expect(sent.getByRole('alert')).toContainText('faux.pdf');
  const filed = async () =>
    (
      await db.dossierDocument.findMany({
        where: { author: { phone } },
        orderBy: { name: 'asc' },
      })
    ).map((d) => [d.name, d.category, d.mime]);
  const expected = [
    ['rapport.pdf', 'Rapport d’expertise', 'application/pdf'],
    ['salon.png', 'Photo', 'image/png'],
  ];
  expect(await filed()).toEqual(expected);
  // Sending the refused file again changes nothing, and does not send the others twice.
  await sent.getByRole('button', { name: 'Réessayer l’envoi' }).click();
  await expect(sent.getByRole('alert')).toContainText('faux.pdf');
  await expect(sent.getByRole('status')).toContainText('2 documents ont été joints');
  expect(await filed()).toEqual(expected);
  await sent.getByRole('link', { name: 'Voir mon dossier' }).click();
  await expect(page.locator('.document-row')).toHaveCount(2);
  await expect(page.locator('.document-list')).toContainText('salon.png');
  await expect(page.locator('.document-list')).toContainText('Rapport d’expertise');
  // The documents page of the client: the files of a dossier together, said to be theirs. Any
  // of them opens in the popup. This PDF has nothing a reader can show: the popup says so and
  // still offers to open or download the file.
  await page.goto('/mon-espace/documents');
  const mine = page.locator('.dossier-files');
  await expect(mine).toHaveCount(1);
  await expect(page.getByRole('search')).toHaveCount(0);
  await expect(mine.locator(':scope > header')).toContainText('Incendie habitation · 2 fichiers');
  await expect(mine.locator('tbody tr')).toHaveCount(2);
  const report = mine.locator('tbody tr').filter({ hasText: 'rapport.pdf' });
  await expect(report).toContainText('Vous');
  await report.getByRole('button', { name: 'Visualiser' }).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer.getByRole('heading', { name: 'rapport.pdf' })).toBeVisible();
  await expect(viewer.getByRole('alert')).toContainText('Ce PDF ne peut pas être affiché ici');
  await expect(viewer.getByRole('link', { name: 'Ouvrir dans un onglet' })).toHaveAttribute(
    'href',
    /\/api\/documents\/[^?]+\?preview=1$/,
  );
  await expect(viewer.getByRole('link', { name: 'Télécharger' })).toHaveAttribute(
    'href',
    /\/api\/documents\/[^?]+$/,
  );
  await viewer.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('les fichiers partent aussi quand le site est ouvert sous son autre adresse locale', async ({
  browser,
}) => {
  // The same machine has two names. Opened as "localhost" while APP_URL says "127.0.0.1" (or
  // the reverse), the site worked but every file was refused as coming from another site.
  const site = new URL(process.env.APP_URL || 'http://127.0.0.1:3018');
  const other = { '127.0.0.1': 'localhost', localhost: '127.0.0.1' }[site.hostname];
  test.skip(!other, 'APP_URL n’est pas une adresse locale');
  const phone = `+21260${suffix}8`;
  const context = await browser.newContext({ baseURL: `${site.protocol}//${other}:${site.port}` });
  const page = await context.newPage();
  await habitation(page);
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await page
    .getByLabel('Ajouter des fichiers (Photos / vidéos)')
    .setInputFiles({ name: 'facade.png', mimeType: 'image/png', buffer: png });
  await next(page);
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Autre adresse`);
  await page.getByLabel('Ville', { exact: true }).fill('Meknès');
  await page.getByLabel('Téléphone / WhatsApp', { exact: true }).fill(phone);
  await page.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await page.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  const sent = page.getByRole('dialog');
  await expect(sent.getByRole('status')).toContainText('Un document a été joint');
  await expect(sent.getByRole('alert')).toHaveCount(0);
  // The dossier page sends files the same way.
  await sent.getByRole('link', { name: 'Voir mon dossier' }).click();
  await expect(page.getByRole('heading', { name: 'Avancement du dossier' })).toBeVisible();
  await page
    .getByLabel('Fichier à joindre')
    .setInputFiles({ name: 'rapport.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.getByRole('button', { name: 'Envoyer le document', exact: true }).click();
  await expect(page.getByText('Document ajouté.', { exact: true })).toBeVisible();
  expect(
    (
      await db.dossierDocument.findMany({ where: { author: { phone } }, orderBy: { name: 'asc' } })
    ).map((d) => d.name),
  ).toEqual(['facade.png', 'rapport.pdf']);
  await context.close();
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
  // A client who is already signed in attaches an invoice: it is filed as one.
  await choose(page, 'Disposez-vous déjà de documents', 'Factures');
  await page.getByLabel('Ajouter des fichiers (Factures)').setInputFiles({
    name: 'facture.pdf',
    mimeType: 'application/pdf',
    buffer: readablePdf(['Facture - page 1', 'Facture - page 2']),
  });
  await next(page);
  await page.getByLabel('Nom du commerce', { exact: true }).fill(`${marker} Pharmacie`);
  await page.getByRole('button', { name: 'Envoyer mon dossier pour analyse', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Un document a été joint',
  );
  expect(
    await db.dossierDocument.count({
      where: { name: 'facture.pdf', category: 'Facture', author: { phone: clientPhone } },
    }),
  ).toBe(1);
  await page.goto('/services/expertise-prealable#demande');
  await choose(page, 'Quels biens', 'Montres');
  await choose(page, 'Combien de biens', '1 bien');
  await choose(page, 'Où se trouvent', 'Coffre / lieu sécurisé');
  await next(page);
  await choose(page, 'Pourquoi souhaitez', 'Avant de souscrire une assurance');
  await next(page);
  await choose(page, 'Avez-vous des documents', 'Certificats');
  await expect(page.getByLabel('Je ne sais pas', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Ajouter des fichiers (Certificats)')).toHaveCount(1);
  await next(page);
  await choose(page, 'Quand souhaitez', 'Dans les prochaines semaines');
  await next(page);
  await page.getByRole('button', { name: 'Envoyer ma demande d’expertise', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
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
  // Each page of the menu carries a red count of what waits there: the new dossiers, the new
  // contact requests, and the password reset requests that have no link yet.
  const waiting = (href: string) => page.locator(`.sidebar nav a[href="${href}"] .nav-badge`);
  const expectWaiting = (href: string, count: number) =>
    count
      ? expect(waiting(href)).toHaveText(count > 99 ? '99+' : String(count))
      : expect(waiting(href)).toHaveCount(0);
  const counts = {
    dossiers: await db.dossier.count({ where: { status: 'NOUVEAU' } }),
    contacts: await db.contactRequest.count({ where: { status: 'NOUVEAU' } }),
    resets: await db.passwordReset.count({ where: { usedAt: null, tokenHash: null } }),
  };
  for (const count of Object.values(counts)) expect(count).toBeGreaterThan(0);
  await expectWaiting('/admin/dossiers', counts.dossiers);
  await expectWaiting('/admin/demandes-contact', counts.contacts);
  await expectWaiting('/admin/parametres', counts.resets);
  await expect(waiting('/admin/documents')).toHaveCount(0);
  // Only the dossiers in status « Nouveau » are counted: this run's commerce request arrived
  // « À vérifier » and is not. Once a new dossier changes status, the count follows at once,
  // without the check made every two seconds in the background.
  expect(
    await db.dossier.count({ where: { user: { phone: clientPhone }, status: 'A_VERIFIER' } }),
  ).toBeGreaterThan(0);
  const fresh = await db.dossier.findFirstOrThrow({
    where: { user: { phone: clientPhone }, type: 'EXPERTISE_PREALABLE', status: 'NOUVEAU' },
  });
  await page.route('**/api/updates', (route) => route.abort());
  await page.goto(`/admin/dossiers/${fresh.reference}`);
  await expectWaiting('/admin/dossiers', counts.dossiers);
  await page.getByLabel('Nouveau statut').selectOption('A_VERIFIER');
  await page.getByRole('button', { name: 'Mettre à jour le statut', exact: true }).click();
  await expect(page.getByText('Modification enregistrée.').first()).toBeVisible();
  await expectWaiting('/admin/dossiers', counts.dossiers - 1);
  await page.unroute('**/api/updates');
  // On the documents page of the administration, a PDF has its preview like any file.
  await page.goto('/admin/documents');
  const invoice = page
    .locator('.dossier-files')
    .filter({ hasText: `${marker} Client` })
    .locator('tbody tr')
    .filter({ hasText: 'facture.pdf' });
  await expect(invoice).toContainText('Facture · PDF');
  await expect(invoice.getByRole('link', { name: 'Télécharger' })).toHaveCount(1);
  // The site draws the pages itself, whatever PDF reader the browser has or lacks: the page
  // number, a first page with ink on it, and a zoom that makes the pages wider than the popup.
  await invoice.getByRole('button', { name: 'Visualiser' }).click();
  const reader = page.getByRole('dialog');
  await expect(reader.locator('.pdf-tools output')).toHaveText('Page 1 sur 2');
  await expect(reader.locator('.pdf-pages [data-page]')).toHaveCount(2);
  await expect
    .poll(() =>
      reader
        .locator('.pdf-pages canvas')
        .first()
        .evaluate((canvas: HTMLCanvasElement) => {
          if (!canvas.width) return false;
          const dots = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data;
          let dark = 0;
          for (let i = 0; i < dots.length; i += 4)
            if (dots[i] + dots[i + 1] + dots[i + 2] < 384) dark++;
          return dark > 50;
        }),
    )
    .toBe(true);
  const well = reader.locator('.pdf-pages');
  expect(await well.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await reader.getByRole('button', { name: 'Agrandir' }).click();
  await expect.poll(() => well.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await reader.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The search of that page: every word must be found in a file or in its dossier, whatever
  // the capitals and the accents. Here the client of this run, and a category.
  const searchBox = page.getByLabel('Rechercher dans les documents');
  const search = async (words: string) => {
    await searchBox.fill(words);
    await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === '/admin/documents' && url.searchParams.get('q') === words,
    );
  };
  await search(`${marker.toLowerCase()} FACTURE`);
  await expect(page.locator('.search-result')).toContainText('1 fichier dans 1 dossier');
  await expect(page.locator('.dossier-files tbody tr')).toHaveText([/facture\.pdf/]);
  await search(`${marker} introuvable`);
  await expect(page.getByRole('heading', { name: 'Aucun document trouvé' })).toBeVisible();
  await page.getByRole('link', { name: 'Effacer' }).click();
  await expect(page).toHaveURL(/\/admin\/documents$/);
  await expect(searchBox).toHaveValue('');
  await expect(invoice).toHaveCount(1);
  // The contact request arrives in the administration as a new one, with its message and what
  // is needed to call back. Once taken in charge it leaves the new requests for the next tab.
  await page.goto('/admin/demandes-contact');
  const tabs = page.getByRole('navigation', { name: 'Filtrer les demandes par statut' });
  const request = page.locator('.contact-request').filter({ hasText: `${marker} Contact` });
  await expect(request).toHaveCount(1);
  await expect(request.locator('.badge')).toHaveText('Nouveau');
  for (const text of [
    'Autre demande · Fès',
    'Je souhaite des informations sur mon dossier.',
    'Reçue le',
  ])
    await expect(request).toContainText(text);
  await expect(request.getByRole('link', { name: clientPhone })).toHaveAttribute(
    'href',
    `tel:${clientPhone}`,
  );
  await expect(request.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    `https://wa.me/${clientPhone.slice(1)}`,
  );
  await expect(request.locator('a[href^="mailto:"]')).toHaveCount(0);
  await tabs.getByRole('link', { name: /^Nouvelles/ }).click();
  await expect(page).toHaveURL(/status=NOUVEAU$/);
  await expect(tabs.getByRole('link', { name: /^Nouvelles/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await request.getByLabel('Statut').selectOption('CONTACTE');
  await request.getByRole('button', { name: 'Mettre à jour' }).click();
  await expect(request).toHaveCount(0);
  await expectWaiting('/admin/demandes-contact', counts.contacts - 1);
  await tabs.getByRole('link', { name: /^Contactées/ }).click();
  await expect(request.locator('.badge')).toHaveText('Contacté');
  await expect(request).toContainText('Modifié le');
  expect(
    (await db.contactRequest.findFirstOrThrow({ where: { fullName: `${marker} Contact` } })).status,
  ).toBe('CONTACTE');
  // A status nobody has: the page says so instead of showing an empty list.
  await page.goto('/admin/demandes-contact?status=INCONNU');
  await expect(tabs.getByRole('link', { name: /^Toutes/ })).toHaveAttribute('aria-current', 'page');
  // The reset request waits in the settings, under the name of the account. Once its link is
  // issued it stays in place with the link, and no longer counts as waiting.
  await page.goto('/admin/parametres');
  await expect(page).toHaveURL(/\/admin\/parametres\?section=reinitialisations$/);
  const section = page.locator('.reset-request').filter({ hasText: otherPhone });
  await expect(section).toContainText(`${marker} CLIENT`);
  await expect(section.locator('.badge')).toHaveText('À traiter');
  await section.getByLabel('Identité du demandeur vérifiée').check();
  await section.getByRole('button', { name: 'Générer un lien de 30 minutes' }).click();
  const url = await section.getByLabel('Lien de réinitialisation').inputValue();
  await expect(section.locator('.badge')).toContainText('Lien valable');
  await expectWaiting('/admin/parametres', counts.resets - 1);
  await expect(section.getByLabel('Lien de réinitialisation')).toHaveValue(url);
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
    '/admin/connexion',
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
  // Signing out of the administration leads back to the team page, not to the client one.
  await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
  await expect(page).toHaveURL(staffSignIn);
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
  await expect(page).toHaveURL(clientSignIn);
});
test('deux pages de connexion : l’espace client refuse l’équipe, l’administration refuse les clients', async ({
  page,
}) => {
  const sessions = (phone: string) => db.session.count({ where: { user: { phone } } });
  const refused = page.locator('.alert.error');
  // Without a session, each space leads to its own sign-in page.
  await page.goto('/mon-espace');
  await expect(page).toHaveURL(clientSignIn);
  await page.goto('/admin/dossiers');
  await expect(page).toHaveURL(staffSignIn);
  await expect(page.getByRole('heading', { level: 1, name: 'Administration' })).toBeVisible();
  // The client page asks for a phone number and never opens a team account, even with the
  // right password.
  const before = await sessions(adminPhone);
  await signIn(page, adminPhone, password, false);
  await expect(refused).toContainText('Téléphone ou mot de passe incorrect');
  await expect(page).toHaveURL(clientSignIn);
  expect(await sessions(adminPhone)).toBe(before);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(staffSignIn);
  // The team page never opens a client account.
  const clientBefore = await sessions(clientPhone);
  await signIn(page, clientPhone, password, true);
  await expect(refused).toContainText('Identifiant ou mot de passe incorrect');
  await expect(page).toHaveURL(staffSignIn);
  expect(await sessions(clientPhone)).toBe(clientBefore);
  await page.goto('/mon-espace');
  await expect(page).toHaveURL(clientSignIn);
  // Once signed in, the team sign-in page leads straight to the administration.
  await login(page, adminPhone);
  await page.goto('/admin/connexion');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  // A session that ends while a dossier is open: the next action leads back to the team page.
  // (The page would otherwise notice by itself within two seconds; that check is held still.)
  await page.route('**/api/updates', (route) => route.fulfill({ json: { version: 'qa' } }));
  await page.goto(`/admin/dossiers/${reference}`);
  await page.getByLabel('Pièce attendue', { exact: true }).fill('Session terminée');
  await page.context().clearCookies();
  await page.getByRole('button', { name: 'Envoyer la demande', exact: true }).click();
  await expect(page).toHaveURL(staffSignIn);
});
test('administrateur : connexion par identifiant et page paramètres', async ({ browser }) => {
  const settingsPhone = `+21260${suffix}5`;
  const username = `qa-admin-${suffix}`;
  const renamed = `qa-chef-${suffix}`;
  const newPassword = randomBytes(18).toString('hex');
  const contactKeys = ['contactPhone', 'contactWhatsapp', 'contactEmail'];
  await db.user.create({
    data: {
      phone: settingsPhone,
      username,
      passwordHash: await hash(password, 12),
      role: 'ADMIN',
      fullName: `${marker} Paramètres`,
      city: 'Rabat',
    },
  });
  await db.user.update({
    where: { phone: expertPhone },
    data: { username: `qa-expert-${suffix}` },
  });
  const savedSettings = await db.siteSetting.findMany({ where: { key: { in: contactKeys } } });
  try {
    const page = await (await browser.newContext()).newPage();
    // The settings: a side list of subjects, one of them open at a time.
    const subjects = page.getByRole('navigation', { name: 'Rubriques des paramètres' });
    const open = async (subject: string, title = subject) => {
      await subjects.getByRole('link', { name: subject }).click();
      await expect(subjects.getByRole('link', { name: subject })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      return page.locator('.settings-section');
    };
    // The username works whatever its capitalisation; the phone number still does.
    await signIn(page, username.toUpperCase(), password, true);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.locator('.sidebar-bottom')).toContainText(username);
    const byPhone = await (await browser.newContext()).newPage();
    // The client page does not take a username.
    await signIn(byPhone, username, password, false);
    await expect(byPhone.locator('.alert.error')).toContainText('Numéro marocain invalide');
    await signIn(byPhone, settingsPhone, password, true);
    await expect(byPhone).toHaveURL(/\/admin\/dashboard$/);
    // The settings keep the reset requests and drop the team list and the read-only configuration.
    await page.goto('/admin/parametres');
    await expect(subjects.getByRole('link')).toHaveText([
      /^Compte/,
      /^Mot de passe/,
      /^Coordonnées publiques/,
      /^Réinitialisations/,
    ]);
    await open('Réinitialisations', 'Demandes de réinitialisation');
    await expect(page.getByRole('heading', { name: 'Équipe autorisée' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Configuration' })).toHaveCount(0);
    // Account: a username already taken is refused, even with another capitalisation.
    const account = await open('Compte', 'Compte administrateur');
    await account.getByLabel('Identifiant de connexion').fill(`QA-EXPERT-${suffix}`);
    await account.getByRole('button', { name: 'Enregistrer le compte' }).click();
    await expect(account.getByRole('alert')).toContainText('déjà utilisé');
    await account.getByLabel('Identifiant de connexion').fill(renamed);
    await account.getByLabel('Nom affiché').fill(`${marker} Direction`);
    await account.getByRole('button', { name: 'Enregistrer le compte' }).click();
    await expect(account.getByRole('status')).toContainText('Compte mis à jour');
    await expect(account.getByLabel('Identifiant de connexion')).toHaveValue(renamed);
    await expect(page.locator('.sidebar-bottom')).toContainText(renamed);
    // Password: the current one is required; the other session is closed, this one stays open.
    const security = await open('Mot de passe');
    const fillPassword = async (current: string) => {
      await security.getByLabel('Mot de passe actuel').fill(current);
      await security.getByLabel('Nouveau mot de passe (12 caractères minimum)').fill(newPassword);
      await security.getByLabel('Confirmation du nouveau mot de passe').fill(newPassword);
      await security.getByRole('button', { name: 'Changer le mot de passe' }).click();
    };
    await fillPassword('mauvais-mot-de-passe');
    await expect(security.getByRole('alert')).toContainText('Mot de passe actuel incorrect');
    await fillPassword(password);
    await expect(security.getByRole('status')).toContainText('Mot de passe modifié');
    await byPhone.goto('/admin/dashboard');
    await expect(byPhone).toHaveURL(staffSignIn);
    await signIn(byPhone, renamed, password, true);
    await expect(byPhone.locator('.alert.error')).toContainText('incorrect');
    await signIn(byPhone, renamed, newPassword, true);
    await expect(byPhone).toHaveURL(/\/admin\/dashboard$/);
    // The settings no longer offer to close the other sessions: the second one stays open.
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'Mot de passe' })).toBeVisible();
    await expect(subjects.getByRole('link', { name: 'Sessions' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Fermer les autres sessions' })).toHaveCount(0);
    await byPhone.goto('/admin/parametres');
    await expect(byPhone.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeVisible();
    // Public contact details are saved here and shown on the Contact page.
    const details = await open('Coordonnées publiques');
    await details.getByLabel('Téléphone', { exact: true }).fill('05 22 00 00 00');
    await details.getByLabel('WhatsApp').fill('06 12 34 56 78');
    await details.getByLabel('Email').fill(`qa-${suffix}@example.org`);
    await details.getByRole('button', { name: 'Enregistrer les coordonnées' }).click();
    await expect(details.getByRole('status')).toContainText('Coordonnées enregistrées');
    await expect(details.getByLabel('Téléphone', { exact: true })).toHaveValue('05 22 00 00 00');
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto('/contact');
    await expect(visitor.getByRole('link', { name: /05 22 00 00 00/ })).toHaveAttribute(
      'href',
      'tel:+212522000000',
    );
    await expect(visitor.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      'https://wa.me/212612345678',
    );
    await expect(visitor.getByRole('link', { name: `qa-${suffix}@example.org` })).toBeVisible();
    // The browser accepts this address; the server does not.
    await details.getByLabel('Email').fill('qa@invalide');
    await details.getByRole('button', { name: 'Enregistrer les coordonnées' }).click();
    await expect(details.getByRole('alert')).toContainText('Adresse email invalide');
    // The settings are for administrators only.
    const expertPage = await (await browser.newContext()).newPage();
    await signIn(expertPage, `qa-expert-${suffix}`, password, true);
    await expect(expertPage).toHaveURL(/\/admin\/dashboard$/);
    await expertPage.goto('/admin/parametres');
    await expect(expertPage).toHaveURL(/\/admin\/dashboard$/);
  } finally {
    await db.siteSetting.deleteMany({ where: { key: { in: contactKeys } } });
    if (savedSettings.length) await db.siteSetting.createMany({ data: savedSettings });
  }
});
test('un membre de l’équipe connecté peut déposer une demande au nom d’un client', async ({
  page,
}) => {
  const phone = `+21260${suffix}6`;
  await login(page, adminPhone);
  await habitation(page);
  await page.getByLabel('Nom et prénom', { exact: true }).fill(`${marker} Depuis Admin`);
  await page.getByLabel('Ville', { exact: true }).fill('Tanger');
  await page.getByLabel('Téléphone / WhatsApp', { exact: true }).fill(phone);
  await page.getByLabel('Mot de passe (12 caractères minimum)', { exact: true }).fill(password);
  await page.getByLabel('Confirmation du mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Faire examiner mon dossier', exact: true }).click();
  const sent = page.getByRole('dialog');
  await expect(
    sent.getByRole('heading', { name: 'Votre demande a bien été envoyée' }),
  ).toBeVisible();
  const created = await db.user.findUniqueOrThrow({
    where: { phone },
    include: { dossiers: true },
  });
  expect(created.role).toBe('CLIENT');
  expect(created.dossiers).toHaveLength(1);
  await expect(sent.locator('.reference-box')).toHaveText(created.dossiers[0].reference);
  // The browser is now signed in as that client, no longer as the administrator.
  await sent.getByRole('link', { name: 'Aller à mon espace' }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.locator('.dossier-card')).toContainText(created.dossiers[0].reference);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/mon-espace$/);
});
