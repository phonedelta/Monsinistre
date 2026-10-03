import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { normalizePhone } from '../src/lib/phone';
import { usernameSchema } from '../src/lib/forms';
const db = new PrismaClient();
async function main() {
  const { ADMIN_PHONE, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_USERNAME } = process.env;
  if (
    !ADMIN_PHONE ||
    !ADMIN_PASSWORD ||
    !ADMIN_NAME ||
    ADMIN_PASSWORD.length < 12 ||
    Buffer.byteLength(ADMIN_PASSWORD) > 72
  )
    throw new Error(
      'Configurez ADMIN_PHONE, ADMIN_NAME et ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum).',
    );
  const phone = normalizePhone(ADMIN_PHONE);
  // Optional: a name the administrator signs in with instead of the phone number.
  const username = ADMIN_USERNAME ? usernameSchema.parse(ADMIN_USERNAME) : null;
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    if (existing.role !== 'ADMIN') throw new Error('Ce numéro est déjà attribué à un autre rôle.');
    console.log('Administrateur déjà présent, inchangé.');
    return;
  }
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
  console.log('Premier administrateur créé.');
}
main().finally(() => db.$disconnect());
