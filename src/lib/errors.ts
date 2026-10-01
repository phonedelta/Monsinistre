import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export function errorMessage(error: unknown) {
  if (error instanceof ZodError)
    return error.issues.map((i) => `${i.path.join('.')} : ${i.message}`).join(' · ');
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    return error.code === 'P2002'
      ? 'Cette demande ou ce compte existe déjà. Connectez-vous pour continuer.'
      : 'Une erreur de base de données est survenue. Réessayez.';
  if (
    error instanceof Error &&
    !error.message.includes('prisma') &&
    !error.message.includes('connect')
  )
    return error.message;
  console.error('Operation failed', error instanceof Error ? error.name : 'unknown');
  return 'Le service est momentanément indisponible. Réessayez plus tard.';
}
export type ActionResult = {
  error?: string;
  success?: string;
  reference?: string;
  existingAccount?: boolean;
  resetLink?: string;
};
