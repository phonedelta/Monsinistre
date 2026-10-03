import { hash } from 'bcryptjs';
import { db } from './db';
import { normalizePhone } from './phone';
import { usernameSchema } from './forms';
const incomplete =
  'Configurez ADMIN_PHONE, ADMIN_NAME et ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum).';
/* The first administrator, described by ADMIN_PHONE, ADMIN_NAME, ADMIN_PASSWORD and, if wanted,
   ADMIN_USERNAME (the name to sign in with). It is created once, when no account has that
   phone; an existing account is never changed, so a password changed later in the
   administration stays, and ADMIN_PASSWORD can be removed from the host once the account
   exists. Used when the server starts (instrumentation.ts) and by the seed. */
export async function ensureFirstAdmin(
  env: Record<string, string | undefined> = process.env,
): Promise<'created' | 'present' | 'not configured'> {
  const { ADMIN_PHONE, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_USERNAME } = env;
  if (!ADMIN_PHONE && !ADMIN_PASSWORD && !ADMIN_NAME && !ADMIN_USERNAME) return 'not configured';
  // What is given must be valid before anything is read.
  if (
    !ADMIN_PHONE ||
    (ADMIN_PASSWORD && (ADMIN_PASSWORD.length < 12 || Buffer.byteLength(ADMIN_PASSWORD) > 72))
  )
    throw new Error(incomplete);
  const phone = normalizePhone(ADMIN_PHONE);
  const username = ADMIN_USERNAME ? usernameSchema.parse(ADMIN_USERNAME) : null;
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    if (existing.role !== 'ADMIN') throw new Error('Ce numéro est déjà attribué à un autre rôle.');
    return 'present';
  }
  if (!ADMIN_NAME || !ADMIN_PASSWORD) throw new Error(incomplete);
  if (
    username &&
    (await db.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } }))
  )
    throw new Error('Cet identifiant est déjà utilisé par un autre compte.');
  await db.user.create({
    data: {
      fullName: ADMIN_NAME,
      phone,
      username,
      city: 'À renseigner',
      passwordHash: await hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
    },
  });
  return 'created';
}
