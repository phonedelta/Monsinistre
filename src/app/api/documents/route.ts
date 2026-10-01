import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { currentUser, authorizedDossier, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { documentCategories } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
export const runtime = 'nodejs';
const max = 20 * 1024 * 1024;
export async function POST(req: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (req.headers.get('origin') !== new URL(process.env.APP_URL || req.url).origin)
    return NextResponse.json({ error: 'Origine invalide.' }, { status: 403 });
  try {
    await rateLimit('upload', actor.id, 30, 3600);
    // Bound streaming body before parsing: do not trust Content-Length alone.
    const reader = req.body?.getReader();
    if (!reader) throw new Error('Fichier manquant.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max + 65536) {
        await reader.cancel();
        throw new Error('Fichier trop volumineux (20 Mo maximum).');
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': req.headers.get('content-type') || '' },
    }).formData();
    const reference = z.string().max(80).parse(form.get('reference'));
    const dossier = await authorizedDossier(reference, actor);
    const category = z
      .string()
      .refine((v) => documentCategories.includes(v))
      .parse(form.get('category'));
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > max)
      throw new Error('Fichier vide ou supérieur à 20 Mo.');
    const buffer = Buffer.from(await file.arrayBuffer());
    const type = await fileTypeFromBuffer(buffer);
    if (
      !type ||
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/quicktime',
      ].includes(type.mime)
    )
      throw new Error('Format accepté : JPEG, PNG, WebP, PDF, MP4 ou MOV.');
    const key = await storage.put(buffer);
    try {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM dossiers WHERE id = ${dossier.id} FOR UPDATE`;
        const fresh = await tx.dossier.findUniqueOrThrow({ where: { id: dossier.id } });
        if (actor.role === 'EXPERT' && fresh.assignedTo !== actor.id)
          throw new Error('Accès non autorisé.');
        const doc = await tx.dossierDocument.create({
          data: {
            dossierId: dossier.id,
            authorId: actor.id,
            name: file.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 180),
            mime: type.mime,
            size: file.size,
            storageKey: key,
            category,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            dossierId: dossier.id,
            action: 'DOCUMENT_ADDED',
            detail: doc.name,
          },
        });
        await tx.dossier.update({ where: { id: dossier.id }, data: { updatedAt: new Date() } });
      });
    } catch (e) {
      await storage.remove(key);
      throw e;
    }
    return NextResponse.json({ success: 'Document ajouté.' });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
