import { db } from './db';
import { dossierScope, type Actor } from './auth';
import { terminalStatuses } from './constants';
/* What waits for the team, by page of the administration: the red counts of its menu. A
   dossier counts while its status is « Nouveau » — the user's choice: a request that arrives
   « À vérifier » is not counted — a contact request until someone takes it, a password reset
   request until a link has been issued for it. An expert only has dossiers. A change of
   status updates the count at once: the action refreshes the layout that draws the menu. */
export async function pendingCounts(actor: Actor): Promise<Record<string, number>> {
  const admin = actor.role === 'ADMIN';
  const [dossiers, contacts, resets] = await Promise.all([
    db.dossier.count({ where: { ...dossierScope(actor), status: 'NOUVEAU' } }),
    admin ? db.contactRequest.count({ where: { status: 'NOUVEAU' } }) : 0,
    admin ? db.passwordReset.count({ where: { usedAt: null, tokenHash: null } }) : 0,
  ]);
  return {
    '/admin/dossiers': dossiers,
    '/admin/demandes-contact': contacts,
    '/admin/parametres': resets,
  };
}
/* What waits for a client: the documents the team asked for and has not verified yet, dossier
   by dossier, the dossier changed last first. A closed dossier asks for nothing any more. */
export async function awaitedDocuments(actor: Actor) {
  return db.dossier.findMany({
    where: {
      userId: actor.id,
      status: { notIn: [...terminalStatuses] },
      requests: { some: { fulfilledAt: null } },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      reference: true,
      type: true,
      requests: {
        where: { fulfilledAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, label: true },
      },
    },
  });
}
