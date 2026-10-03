import { NextRequest, NextResponse } from 'next/server';
import { currentUser, authorizedDossier } from '@/lib/auth';
import { db } from '@/lib/db';
import { byteRange, storage } from '@/lib/storage';
import { sameOrigin } from '@/lib/origin';
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
  const range = byteRange(req.headers.get('range'), doc.size);
  if (range === false)
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${doc.size}` } });
  const data = await storage.get(doc.storageKey, range ?? undefined);
  // What a previewed file may do in the page is set in next.config.ts, for `?preview`.
  return new Response(new Uint8Array(data), {
    status: range ? 206 : 200,
    headers: {
      'Content-Type': doc.mime,
      'Content-Length': String(data.length),
      'Accept-Ranges': 'bytes',
      ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${doc.size}` } : {}),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || actor.role !== 'ADMIN') return new Response('Accès refusé.', { status: 403 });
  if (!sameOrigin(req)) return new Response('Origine invalide.', { status: 403 });
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
