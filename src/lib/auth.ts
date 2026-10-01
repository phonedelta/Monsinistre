import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import type { Role, User } from '@prisma/client';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'ms_session';
export const safeUser = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  city: true,
  role: true,
  createdAt: true,
} as const;
export type Actor = Pick<
  User,
  'id' | 'fullName' | 'phone' | 'email' | 'city' | 'role' | 'createdAt'
>;
export async function currentUser(): Promise<Actor | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { user: { select: safeUser } },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) redirect('/connexion');
  if (roles && !roles.includes(user.role))
    redirect(user.role === 'CLIENT' ? '/mon-espace' : '/admin/dashboard');
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  const old = (await cookies()).get(cookieName)?.value;
  if (old) await db.session.deleteMany({ where: { id: digest(old) } });
  await db.session.create({ data: { id: digest(token), userId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { id: digest(token) } });
  jar.delete(cookieName);
}
export async function rateLimit(scope: string, identifier: string, max = 8, seconds = 900) {
  const key = digest(`${scope}:${identifier}`);
  const result = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO rate_limits (key, count, "expiresAt") VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limits."expiresAt" < NOW() THEN 1 ELSE rate_limits.count + 1 END, "expiresAt" = CASE WHEN rate_limits."expiresAt" < NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE rate_limits."expiresAt" END RETURNING count`;
  if (result[0].count > max)
    throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
}
export async function clientIp() {
  return process.env.TRUST_PROXY === 'true'
    ? (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    : 'direct';
}
export function dossierScope(user: Actor) {
  return user.role === 'ADMIN'
    ? {}
    : user.role === 'EXPERT'
      ? { assignedTo: user.id }
      : { userId: user.id };
}
export async function authorizedDossier(reference: string, user: Actor) {
  const dossier = await db.dossier.findFirst({ where: { reference, ...dossierScope(user) } });
  if (!dossier) throw new Error('Dossier introuvable ou accès non autorisé.');
  return dossier;
}
