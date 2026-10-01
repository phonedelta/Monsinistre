import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { normalizePhone } from '../src/lib/phone';
import { passwordSchema } from '../src/lib/forms';
const db = new PrismaClient();
async function main() {
  const { STAFF_PHONE, STAFF_PASSWORD, STAFF_NAME, STAFF_ROLE } = process.env;
  if (
    !STAFF_PHONE ||
    !STAFF_PASSWORD ||
    !STAFF_NAME ||
    !['ADMIN', 'EXPERT'].includes(STAFF_ROLE || '')
  )
    throw new Error(
      'Définissez STAFF_PHONE, STAFF_PASSWORD, STAFF_NAME et STAFF_ROLE (ADMIN ou EXPERT).',
    );
  passwordSchema.parse(STAFF_PASSWORD);
  await db.user.create({
    data: {
      phone: normalizePhone(STAFF_PHONE),
      fullName: STAFF_NAME,
      city: 'À renseigner',
      passwordHash: await hash(STAFF_PASSWORD, 12),
      role: STAFF_ROLE as 'ADMIN' | 'EXPERT',
    },
  });
  console.log('Compte équipe créé.');
}
main()
  .catch(() => {
    console.error('Création impossible. Vérifiez les variables et l’unicité du téléphone.');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
