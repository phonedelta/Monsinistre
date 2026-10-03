import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
// `unexpected` replaces the wording of failures the person can do nothing about
// (database, network); messages written for the person are returned as they are.
export function errorMessage(error: unknown, unexpected?: string) {
  if (error instanceof ZodError)
    return error.issues.map((i) => `${i.path.join('.')} : ${i.message}`).join(' · ');
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    return error.code === 'P2002'
      ? 'Cette demande ou ce compte existe déjà. Connectez-vous pour continuer.'
      : (unexpected ?? 'Une erreur de base de données est survenue. Réessayez.');
  if (
    error instanceof Error &&
    !error.message.includes('prisma') &&
    !error.message.includes('connect')
  )
    return error.message;
  console.error('Operation failed', error instanceof Error ? error.name : 'unknown');
  return unexpected ?? 'Le service est momentanément indisponible. Réessayez plus tard.';
}
export type ActionResult = {
  error?: string;
  success?: string;
  reference?: string;
  existingAccount?: boolean;
  resetLink?: string;
};
