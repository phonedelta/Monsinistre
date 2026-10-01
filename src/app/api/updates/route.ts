import { currentUser, dossierScope, digest } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET() {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 401 });
  const [dossiers, events] = await Promise.all([
    db.dossier.aggregate({ where: dossierScope(actor), _max: { updatedAt: true }, _count: true }),
    db.auditLog.aggregate({
      where: { dossier: dossierScope(actor) },
      _max: { createdAt: true },
      _count: true,
    }),
  ]);
  return Response.json(
    { version: digest(JSON.stringify([dossiers, events])) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
