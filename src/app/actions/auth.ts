'use server';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import {
  createSession,
  destroySession,
  rateLimit,
  clientIp,
  digest,
  requireUser,
} from '@/lib/auth';
import { phoneSchema, passwordSchema } from '@/lib/forms';
import { errorMessage, type ActionResult } from '@/lib/errors';
export async function login(_: ActionResult, form: FormData): Promise<ActionResult> {
  let destination = '/mon-espace';
  try {
    const input = z
      .object({ phone: phoneSchema, password: z.string().min(1).max(128) })
      .parse(Object.fromEntries(form));
    await rateLimit('login-phone', input.phone);
    await rateLimit('login-ip', await clientIp(), 60);
    const user = await db.user.findUnique({ where: { phone: input.phone } });
    const valid = await compare(
      input.password,
      user?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxwmFYYPqIuGCQjyOC1nIGUGnUG',
    );
    if (!user || !valid) return { error: 'Téléphone ou mot de passe incorrect.' };
    await createSession(user.id);
    destination = user.role === 'CLIENT' ? '/mon-espace' : '/admin/dashboard';
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect(destination);
}
export async function logout() {
  await destroySession();
  redirect('/connexion');
}
export async function requestReset(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const phone = phoneSchema.parse(form.get('phone'));
    await rateLimit('reset', phone, 3, 3600);
    await rateLimit('reset-ip', await clientIp(), 30, 3600);
    if (await db.user.findUnique({ where: { phone } }))
      await db.passwordReset.create({ data: { phone } });
    return {
      success:
        'Si un compte correspond à ce numéro, une demande a été transmise à notre équipe. Après vérification de votre identité, elle vous communiquera un lien de réinitialisation.',
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function resetPassword(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const input = z
      .object({
        token: z.string().length(64),
        password: passwordSchema,
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, 'Les mots de passe ne correspondent pas.')
      .parse(Object.fromEntries(form));
    await rateLimit('reset-token', await clientIp(), 30);
    const tokenHash = digest(input.token);
    const passwordHash = await hash(input.password, 12);
    await db.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
      if (!reset || reset.usedAt || !reset.expiresAt || reset.expiresAt < new Date())
        throw new Error('Lien expiré ou invalide.');
      const claimed = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!claimed.count) throw new Error('Lien déjà utilisé.');
      const user = await tx.user.update({ where: { phone: reset.phone }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    return { success: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function issueReset(_: ActionResult, form: FormData): Promise<ActionResult> {
  const admin = await requireUser(['ADMIN']);
  try {
    if (form.get('verified') !== 'on') throw new Error('Vérifiez d’abord l’identité du demandeur.');
    const id = z.string().max(80).parse(form.get('id'));
    const token = randomBytes(32).toString('hex');
    await db.$transaction(async (tx) => {
      const request = await tx.passwordReset.findUniqueOrThrow({ where: { id } });
      if (request.usedAt) throw new Error('Cette demande a déjà été utilisée.');
      await tx.passwordReset.update({
        where: { id },
        data: { tokenHash: digest(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
      });
      await tx.auditLog.create({
        data: { actorId: admin.id, action: 'RESET_LINK_ISSUED', detail: id },
      });
    });
    return {
      resetLink: `${process.env.APP_URL || 'http://localhost:3000'}/reinitialiser?token=${token}`,
    };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
