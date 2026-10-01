import { NextRequest, NextResponse } from 'next/server';
import { currentUser, authorizedDossier } from '@/lib/auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return new Response('Connexion requise.', { status: 401 });
  const doc = await db.dossierDocument.findUnique({
    where: { id: (await ctx.params).id },
    include: { dossier: { select: { reference: true } } },
  });
  if (!doc) return new Response('Introuvable.', { status: 404 });
  try {
    await authorizedDossier(doc.dossier.reference, actor);
  } catch {
    return new Response('Introuvable.', { status: 404 });
  }
  const inline = req.nextUrl.searchParams.get('preview') === '1';
  return new Response(new Uint8Array(await storage.get(doc.storageKey)), {
    headers: {
      'Content-Type': doc.mime,
      'Content-Length': String(doc.size),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || actor.role !== 'ADMIN') return new Response('Accès refusé.', { status: 403 });
  if (req.headers.get('origin') !== new URL(process.env.APP_URL || req.url).origin)
    return new Response('Origine invalide.', { status: 403 });
  const doc = await db.dossierDocument.findUnique({ where: { id: (await ctx.params).id } });
  if (!doc) return new Response('Introuvable.', { status: 404 });
  await db.$transaction([
    db.dossierDocument.delete({ where: { id: doc.id } }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        dossierId: doc.dossierId,
        action: 'DOCUMENT_DELETED',
        detail: doc.name,
      },
    }),
  ]);
  await storage.remove(doc.storageKey);
  return NextResponse.json({ success: 'Document supprimé.' });
}
