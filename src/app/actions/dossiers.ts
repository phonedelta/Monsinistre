'use server';
import { z } from 'zod';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { DossierType, DossierStatus, ContactStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  authorizedDossier,
  createSession,
  currentUser,
  requireUser,
  rateLimit,
  clientIp,
} from '@/lib/auth';
import {
  personSchema,
  passwordSchema,
  validateAnswers,
  reviewFlags,
  phoneSchema,
} from '@/lib/forms';
import { errorMessage, type ActionResult } from '@/lib/errors';
import { submissionFailed, terminalStatuses } from '@/lib/constants';
export async function submitDossier(raw: unknown): Promise<ActionResult> {
  try {
    const input = z
      .object({
        type: z.enum(DossierType),
        answers: z.record(z.string(), z.unknown()),
        person: personSchema,
        password: z.string().optional(),
        confirmPassword: z.string().optional(),
        submissionKey: z.uuid(),
        authenticateExisting: z.boolean().optional(),
      })
      .parse(raw);
    const answers = validateAnswers(input.type, input.answers);
    if (input.type === 'INCENDIE_COMMERCE' && !input.person.businessName)
      throw new Error('Le nom du commerce est obligatoire.');
    await rateLimit('submission', await clientIp(), 40);
    // The request belongs to the client named in the form. A team member signed in on the same
    // browser (testing the form, or filling it for someone) is treated as a visitor here; the
    // browser is then signed in as that client, like for any new request.
    const signedIn = await currentUser();
    let user = signedIn?.role === 'CLIENT' ? signedIn : null;
    let newAccount = false;
    if (!user) {
      const existing = await db.user.findUnique({ where: { phone: input.person.phone } });
      if (existing) {
        if (!input.authenticateExisting)
          return {
            existingAccount: true,
            error: 'Vous avez déjà un compte. Connectez-vous pour ajouter ce nouveau dossier.',
          };
        await rateLimit('login-phone', input.person.phone);
        if (
          !input.password ||
          !(await compare(input.password, existing.passwordHash)) ||
          existing.role !== 'CLIENT'
        )
          throw new Error('Téléphone ou mot de passe incorrect.');
        user = existing;
      } else if (input.authenticateExisting) {
        // Signing in was asked for a number that has no account: same answer as a wrong password.
        await rateLimit('login-phone', input.person.phone);
        throw new Error('Téléphone ou mot de passe incorrect.');
      } else {
        passwordSchema.parse(input.password);
        if (input.password !== input.confirmPassword)
          throw new Error('Les mots de passe ne correspondent pas.');
        newAccount = true;
      }
    }
    const passwordHash = newAccount ? await hash(input.password!, 12) : undefined;
    const flags = reviewFlags(answers);
    const result = await db.$transaction(async (tx) => {
      let ownerId = user?.id;
      if (!ownerId) {
        const { businessName: _business, ...person } = input.person;
        ownerId = (await tx.user.create({ data: { ...person, passwordHash: passwordHash! } })).id;
      }
      const previous = await tx.dossier.findUnique({
        where: { submissionKey: input.submissionKey },
      });
      if (previous) {
        if (previous.userId !== ownerId) throw new Error('Identifiant de demande déjà utilisé.');
        return { reference: previous.reference, ownerId };
      }
      const status = flags.length ? 'A_VERIFIER' : 'NOUVEAU';
      const dossier = await tx.dossier.create({
        data: {
          reference: `pending-${randomUUID()}`,
          submissionKey: input.submissionKey,
          userId: ownerId,
          type: input.type,
          city: input.person.city,
          businessName: input.person.businessName,
          formData: {
            ...answers,
            applicantName: input.person.fullName,
            applicantPhone: user?.phone || input.person.phone,
            applicantCity: input.person.city,
            ...(input.person.businessName ? { businessName: input.person.businessName } : {}),
          } as Prisma.InputJsonValue,
          reviewFlags: flags,
          status,
        },
      });
      const year = new Intl.DateTimeFormat('en', {
        year: 'numeric',
        timeZone: 'Africa/Casablanca',
      }).format(dossier.createdAt);
      const reference = `MS-${year}-${String(dossier.sequence).padStart(6, '0')}`;
      await tx.dossier.update({ where: { id: dossier.id }, data: { reference } });
      await tx.dossierStatusHistory.create({
        data: {
          dossierId: dossier.id,
          authorId: ownerId,
          newStatus: status,
          comment: 'Demande reçue et enregistrée.',
        },
      });
      await tx.auditLog.create({
        data: { actorId: ownerId, dossierId: dossier.id, action: 'DOSSIER_CREATED' },
      });
      return { reference, ownerId };
    });
    await createSession(result.ownerId);
    revalidatePath('/mon-espace');
    revalidatePath('/admin');
    return {
      reference: result.reference,
      success: newAccount
        ? 'Votre compte et votre dossier ont été créés.'
        : 'Votre dossier a été ajouté à votre compte.',
    };
  } catch (e) {
    return { error: errorMessage(e, submissionFailed) };
  }
}
export async function dossierAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const reference = z.string().max(80).parse(form.get('reference'));
    const dossier = await authorizedDossier(reference, actor);
    const action = z.enum(['status', 'message', 'request', 'fulfill']).parse(form.get('action'));
    if (action !== 'message' && actor.role === 'CLIENT')
      throw new Error('Action réservée à l’équipe.');
    await rateLimit('dossier-action', actor.id, 100, 60);
    await db.$transaction(async (tx) => {
      // Serialize all dossier mutations to preserve a trustworthy old/new history.
      await tx.$queryRaw`SELECT id FROM dossiers WHERE id = ${dossier.id} FOR UPDATE`;
      const fresh = await tx.dossier.findUniqueOrThrow({ where: { id: dossier.id } });
      if (actor.role === 'EXPERT' && fresh.assignedTo !== actor.id)
        throw new Error('Ce dossier ne vous est plus assigné.');
      let detail = '';
      if (action === 'status') {
        const status = z.enum(DossierStatus).parse(form.get('status'));
        const comment = z
          .string()
          .max(2000)
          .parse(form.get('comment') || '');
        if (status !== fresh.status) {
          await tx.dossier.update({
            where: { id: dossier.id },
            data: {
              status,
              closedAt: (terminalStatuses as readonly string[]).includes(status)
                ? new Date()
                : null,
            },
          });
          await tx.dossierStatusHistory.create({
            data: {
              dossierId: dossier.id,
              authorId: actor.id,
              oldStatus: fresh.status,
              newStatus: status,
              comment,
            },
          });
        }
        detail = status;
      } else if (action === 'message') {
        const body = z.string().trim().min(1).max(5000).parse(form.get('body'));
        await tx.dossierMessage.create({
          data: { dossierId: dossier.id, authorId: actor.id, body },
        });
      } else if (action === 'request') {
        const label = z.string().trim().min(3).max(250).parse(form.get('label'));
        await tx.documentRequest.create({ data: { dossierId: dossier.id, label } });
        detail = label;
      } else {
        const id = z.string().max(80).parse(form.get('requestId'));
        const changed = await tx.documentRequest.updateMany({
          where: { id, dossierId: dossier.id, fulfilledAt: null },
          data: { fulfilledAt: new Date() },
        });
        if (!changed.count) throw new Error('Demande introuvable ou déjà traitée.');
        detail = id;
      }
      await tx.dossier.update({ where: { id: dossier.id }, data: { updatedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorId: actor.id, dossierId: dossier.id, action: action.toUpperCase(), detail },
      });
    });
    revalidatePath('/mon-espace', 'layout');
    revalidatePath('/admin', 'layout');
    return { success: 'Modification enregistrée.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function contact(_: ActionResult, form: FormData): Promise<ActionResult> {
  try {
    const input = z
      .object({
        fullName: z.string().trim().min(3).max(120),
        phone: phoneSchema,
        email: z.union([z.email(), z.literal('')]),
        city: z.string().trim().min(2).max(100),
        service: z.enum([
          'Incendie habitation',
          'Incendie commerce',
          'Expertise préalable',
          'Autre demande',
        ]),
        description: z.string().trim().min(10).max(5000),
        website: z.string().max(0).optional(),
      })
      .parse(Object.fromEntries(form));
    await rateLimit('contact-ip', await clientIp(), 15, 3600);
    await rateLimit('contact-phone', input.phone, 3, 3600);
    const { website: _website, ...data } = input;
    await db.contactRequest.create({ data });
    return { success: 'Votre demande a bien été transmise à notre équipe.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function updateContact(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser(['ADMIN']);
  try {
    const input = z
      .object({ id: z.string().max(80), status: z.enum(ContactStatus) })
      .parse(Object.fromEntries(form));
    await db.$transaction([
      db.contactRequest.update({ where: { id: input.id }, data: { status: input.status } }),
      db.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'CONTACT_STATUS',
          detail: `${input.id}:${input.status}`,
        },
      }),
    ]);
    revalidatePath('/admin/demandes-contact');
    return { success: 'Statut enregistré.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
export async function updateProfile(_: ActionResult, form: FormData): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const data = z
      .object({
        fullName: z.string().trim().min(3).max(120),
        city: z.string().trim().min(2).max(100),
        email: z.union([z.email(), z.literal('')]),
      })
      .parse(Object.fromEntries(form));
    await db.user.update({ where: { id: actor.id }, data: { ...data, email: data.email || null } });
    revalidatePath('/mon-espace', 'layout');
    return { success: 'Profil mis à jour.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
