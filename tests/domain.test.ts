import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/lib/phone';
import {
  attachmentCategory,
  formSteps,
  validateAnswers,
  reviewFlags,
  passwordSchema,
  usernameSchema,
  loginIdentifier,
} from '../src/lib/forms';
import {
  documentCategories,
  fileSize,
  statusLabels,
  statusStages,
  terminalStatuses,
} from '../src/lib/constants';
import { sameOrigin } from '../src/lib/origin';
import { byteRange } from '../src/lib/storage';
import { ensureFirstAdmin } from '../src/lib/first-admin';
test('les variantes marocaines partagent un identifiant unique', () => {
  for (const phone of [
    '0612345678',
    '+212612345678',
    '212612345678',
    '00212612345678',
    '06 12 34 56 78',
  ])
    assert.equal(normalizePhone(phone), '+212612345678');
});
test('les numéros invalides sont rejetés', () => {
  for (const phone of ['+33612345678', '1234', '++212612345678', '06123456789'])
    assert.throws(() => normalizePhone(phone));
});
test('les critères de revue ne refusent pas la demande', () => {
  assert.deepEqual(reviewFlags({ insured: 'Non', ongoing: 'Non', finalDecision: 'Oui' }), [
    'Bien non assuré',
    'Dossier déjà clôturé',
    'Décision définitive reçue',
  ]);
});
test('les réponses métier sont validées côté serveur', () => {
  assert.throws(() => validateAnswers('EXPERTISE_PREALABLE', { assets: ['Bitcoin'] }));
  assert.throws(() =>
    validateAnswers('INCENDIE_HABITATION', { property: 'Maison', fireDate: '2099-01-01' }),
  );
});
test('aucun formulaire ne propose plus « Je ne sais pas »', () => {
  for (const field of Object.values(formSteps).flatMap((steps) => steps.flatMap((s) => s.fields)))
    assert.equal(field.options?.includes('Je ne sais pas') ?? false, false, field.label);
  const answers = {
    property: 'Maison',
    fireDate: '2026-09-01',
    insured: 'Oui',
    declared: 'Oui',
    ongoing: 'Oui',
    finalDecision: 'Non',
    problem: 'Autre',
  };
  assert.doesNotThrow(() => validateAnswers('INCENDIE_HABITATION', answers));
  for (const key of ['insured', 'ongoing', 'finalDecision'])
    assert.throws(() =>
      validateAnswers('INCENDIE_HABITATION', { ...answers, [key]: 'Je ne sais pas' }),
    );
});
test('documents : « aucun » exclut les autres choix, chaque choix a sa catégorie', () => {
  const answers = {
    assets: ['Montres'],
    quantity: '1 bien',
    location: 'Autre',
    objective: 'Avant une vente',
    deadline: 'Dès que possible',
  };
  for (const documents of [undefined, [], ['Aucun document'], ['Factures', 'Certificats']])
    assert.doesNotThrow(() => validateAnswers('EXPERTISE_PREALABLE', { ...answers, documents }));
  assert.throws(() =>
    validateAnswers('EXPERTISE_PREALABLE', {
      ...answers,
      documents: ['Factures', 'Aucun document'],
    }),
  );
  // Every option that takes files files them under a category the server accepts.
  const fields = Object.values(formSteps).flatMap((steps) =>
    steps.flatMap((s) => s.fields.filter((f) => f.attach)),
  );
  assert.equal(fields.length, 3);
  for (const field of fields)
    for (const option of field.options!.filter((o) => o !== field.none))
      for (const mime of ['image/jpeg', 'video/mp4', 'application/pdf'])
        assert.ok(documentCategories.includes(attachmentCategory(option, mime)), option);
  assert.equal(attachmentCategory('Photos / vidéos', 'image/png'), 'Photo');
  assert.equal(attachmentCategory('Photos / vidéos', 'video/quicktime'), 'Vidéo');
  assert.equal(attachmentCategory('Factures', 'image/png'), 'Facture');
  assert.equal(
    attachmentCategory('Anciennes expertises', 'application/pdf'),
    'Rapport d’expertise',
  );
});
test('les fichiers ne sont acceptés que depuis une page du site, sous toutes ses adresses', () => {
  const allowed = (headers: Record<string, string>) =>
    sameOrigin(new Request('http://127.0.0.1:3018/api/documents', { method: 'POST', headers }));
  const accepted: Record<string, string>[] = [
    // The same local site under its two names.
    { origin: 'http://127.0.0.1:3018', host: '127.0.0.1:3018' },
    { origin: 'http://localhost:3018', host: 'localhost:3018' },
    // Behind a proxy that forwards the public host.
    {
      origin: 'https://monsinistre.example',
      host: 'app:3000',
      'x-forwarded-host': 'monsinistre.example',
    },
    // Behind a proxy that forwards nothing: the address in APP_URL.
    { origin: 'http://127.0.0.1:3018', host: 'app:3000' },
  ];
  const refused: Record<string, string>[] = [
    // Another site, another port, the internal host, an opaque origin, no origin at all.
    { origin: 'https://autre-site.example', host: 'localhost:3018' },
    { origin: 'http://localhost:9999', host: 'localhost:3018' },
    { origin: 'http://app:3000', host: 'app:3000', 'x-forwarded-host': 'monsinistre.example' },
    { origin: 'null', host: 'localhost:3018' },
    { host: 'localhost:3018' },
  ];
  const saved = process.env.APP_URL;
  process.env.APP_URL = 'http://127.0.0.1:3018';
  try {
    for (const headers of accepted) assert.equal(allowed(headers), true, JSON.stringify(headers));
    for (const headers of refused) assert.equal(allowed(headers), false, JSON.stringify(headers));
  } finally {
    if (saved === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = saved;
  }
});
test('un lecteur vidéo peut demander une partie d’un fichier', () => {
  assert.deepEqual(byteRange('bytes=0-1', 100), { start: 0, end: 1 });
  assert.deepEqual(byteRange('bytes=50-', 100), { start: 50, end: 99 });
  assert.deepEqual(byteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange('bytes=90-500', 100), { start: 90, end: 99 });
  // No range, or a form that is not handled: the whole file.
  for (const header of [null, '', 'bytes=-', 'bytes=0-1,5-6', 'octets=0-1'])
    assert.equal(byteRange(header, 100), null);
  // A range outside the file.
  for (const header of ['bytes=100-', 'bytes=200-300', 'bytes=5-2', 'bytes=-0'])
    assert.equal(byteRange(header, 100), false);
});
test('la taille d’un fichier se lit en Ko puis en Mo', () => {
  assert.equal(fileSize(300), '1 Ko');
  assert.equal(fileSize(203_000), '198 Ko');
  assert.equal(fileSize(2_500_000), '2,4 Mo');
  assert.equal(fileSize(18 * 1024 * 1024), '18 Mo');
});
test('chaque statut qui fait avancer un dossier appartient à une seule étape', () => {
  const placed = statusStages.flatMap((stage) => stage.statuses);
  assert.equal(new Set(placed).size, placed.length);
  // A cancelled or archived dossier is on no step; a finished one is on the last.
  const closed: string[] = terminalStatuses.filter((status) => status !== 'TERMINE');
  assert.deepEqual(
    Object.keys(statusLabels).filter((status) => !closed.includes(status)),
    placed,
  );
  assert.deepEqual(statusStages.at(-1)?.statuses, ['TERMINE']);
  assert.equal(new Set(statusStages.map((stage) => stage.label)).size, statusStages.length);
});
test('un identifiant d’équipe ne se confond jamais avec un téléphone', () => {
  assert.deepEqual(loginIdentifier(' Monsinistre '), { username: 'Monsinistre' });
  assert.deepEqual(loginIdentifier('06 12 34 56 78'), { phone: '+212612345678' });
  for (const value of ['Monsinistre', 'equipe.rabat', 'expert-2'])
    assert.equal(usernameSchema.safeParse(value).success, true);
  for (const value of [
    'ab',
    '0612345678',
    'mon sinistre',
    'mons_nistre',
    '%',
    '.admin',
    'a'.repeat(33),
  ])
    assert.equal(usernameSchema.safeParse(value).success, false);
  // Neither a username nor a valid number: refused before any lookup.
  for (const value of ['mons_nistre', '1234', '']) assert.throws(() => loginIdentifier(value));
});
test('le premier administrateur ne se crée qu’à partir de variables complètes', async () => {
  // Nothing configured: nothing to do, as on a developer's machine.
  assert.equal(await ensureFirstAdmin({}), 'not configured');
  // Without a phone, or with a short password: refused before the database is read.
  for (const env of [
    { ADMIN_USERNAME: 'Monsinistre' },
    { ADMIN_NAME: 'Administrateur', ADMIN_PASSWORD: 'un-mot-de-passe-long' },
    { ADMIN_PHONE: '0612345678', ADMIN_NAME: 'Administrateur', ADMIN_PASSWORD: 'court' },
  ])
    await assert.rejects(ensureFirstAdmin(env), /ADMIN_PHONE, ADMIN_NAME et ADMIN_PASSWORD/);
});
test('aucun mot de passe ne dépasse la limite bcrypt', () => {
  assert.equal(passwordSchema.safeParse('a'.repeat(12)).success, true);
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(passwordSchema.safeParse('é'.repeat(37)).success, false);
});
