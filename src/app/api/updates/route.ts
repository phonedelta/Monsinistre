import { currentUser, dossierScope, digest } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 401 });
  // An administrator also follows what feeds the counts of the menu: contact requests and
  // password reset requests.
  const admin = actor.role === 'ADMIN';
  const [dossiers, events, contacts, resets] = await Promise.all([
    db.dossier.aggregate({ where: dossierScope(actor), _max: { updatedAt: true }, _count: true }),
    db.auditLog.aggregate({
      where: { dossier: dossierScope(actor) },
      _max: { createdAt: true },
      _count: true,
    }),
    admin && db.contactRequest.aggregate({ _max: { updatedAt: true }, _count: true }),
    admin &&
      db.passwordReset.aggregate({
        _max: { createdAt: true },
        _count: { _all: true, tokenHash: true, usedAt: true },
      }),
  ]);
  return Response.json(
    { version: digest(JSON.stringify([dossiers, events, contacts, resets])) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
