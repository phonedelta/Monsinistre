import 'dotenv/config';
import { db } from '../src/lib/db';
import { ensureFirstAdmin } from '../src/lib/first-admin';
// The same first administrator the server creates when it starts, for hosts where the seed is
// run by hand (npm run db:seed).
async function main() {
  const result = await ensureFirstAdmin();
  if (result === 'not configured')
    throw new Error(
      'Configurez ADMIN_PHONE, ADMIN_NAME et ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum).',
    );
  console.log(
    result === 'created'
      ? 'Premier administrateur créé.'
      : 'Administrateur déjà présent, inchangé.',
  );
}
main().finally(() => db.$disconnect());
