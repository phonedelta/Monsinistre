'use server';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireUser, rateLimit, currentSessionId } from '@/lib/auth';
import { passwordSchema, usernameSchema } from '@/lib/forms';
import { contactKeys } from '@/lib/settings';
import { errorMessage, type ActionResult } from '@/lib/errors';
// Reads a form with a schema; the first problem is reported in plain words, without field paths.
function read<T>(schema: z.ZodType<T>, form: FormData): T {
  const result = schema.safeParse(Object.fromEntries(form));
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}
export async function updateAccount(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser(['ADMIN']);
  try {
    const input = read(
      z.object({
        username: usernameSchema,
        fullName: z
          .string()
          .trim()
          .min(3, 'Nom affiché : 3 caractères minimum.')
          .max(120, 'Nom affiché : 120 caractères maximum.'),
      }),
      form,
    );
    await rateLimit('account-update', actor.id, 20);
    // The unique index is case-sensitive, sign-in is not: refuse a name that differs only by case.
    const taken = await db.user.findFirst({
      where: { username: { equals: input.username, mode: 'insensitive' }, NOT: { id: actor.id } },
      select: { id: true },
    });
    if (taken) throw new Error('Cet identifiant est déjà utilisé.');
    await db.$transaction([
      db.user.update({ where: { id: actor.id }, data: input }),
      db.auditLog.create({ data: { actorId: actor.id, action: 'ACCOUNT_UPDATED' } }),
    ]);
    revalidatePath('/admin', 'layout');
    return { success: 'Compte mis à jour.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function changePassword(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser(['ADMIN']);
  try {
    const input = read(
      z
        .object({
          currentPassword: z.string().min(1, 'Saisissez votre mot de passe actuel.').max(128),
          password: passwordSchema,
          confirmPassword: z.string(),
        })
        .refine((d) => d.password === d.confirmPassword, 'Les mots de passe ne correspondent pas.'),
      form,
    );
    await rateLimit('password-change', actor.id, 5);
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await compare(input.currentPassword, user.passwordHash)))
      throw new Error('Mot de passe actuel incorrect.');
    const passwordHash = await hash(input.password, 12);
    // Whoever held the old password elsewhere is signed out; this session stays open.
    const keep = await currentSessionId();
    await db.$transaction([
      db.user.update({ where: { id: actor.id }, data: { passwordHash } }),
      db.session.deleteMany({
        where: { userId: actor.id, ...(keep ? { NOT: { id: keep } } : {}) },
      }),
      db.auditLog.create({ data: { actorId: actor.id, action: 'PASSWORD_CHANGED' } }),
    ]);
    revalidatePath('/admin/parametres');
    return { success: 'Mot de passe modifié. Les autres sessions ont été fermées.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
const contactNumber = z
  .string()
  .trim()
  .regex(/^(\+?\d[\d ().-]{5,28})?$/, 'Numéro : chiffres, espaces et « + » uniquement.');
export async function updateSiteContact(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser(['ADMIN']);
  try {
    const input = read(
      z.object({
        phone: contactNumber,
        whatsapp: contactNumber,
        email: z
          .string()
          .trim()
          .max(254)
          .refine((v) => v === '' || z.email().safeParse(v).success, 'Adresse email invalide.'),
      }),
      form,
    );
    await rateLimit('site-settings', actor.id, 30);
    await db.$transaction([
      ...(['phone', 'whatsapp', 'email'] as const).map((field) =>
        db.siteSetting.upsert({
          where: { key: contactKeys[field] },
          create: { key: contactKeys[field], value: input[field] },
          update: { value: input[field] },
        }),
      ),
      db.auditLog.create({ data: { actorId: actor.id, action: 'SITE_CONTACT_UPDATED' } }),
    ]);
    revalidatePath('/contact');
    revalidatePath('/admin/parametres');
    return { success: 'Coordonnées enregistrées.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
