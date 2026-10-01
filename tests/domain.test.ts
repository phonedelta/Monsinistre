import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../src/lib/phone';
import { validateAnswers, reviewFlags, passwordSchema } from '../src/lib/forms';
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
test('aucun mot de passe ne dépasse la limite bcrypt', () => {
  assert.equal(passwordSchema.safeParse('a'.repeat(12)).success, true);
  assert.equal(passwordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(passwordSchema.safeParse('é'.repeat(37)).success, false);
});
