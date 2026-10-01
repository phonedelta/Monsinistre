import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, MessageSquare, Clock3 } from 'lucide-react';
import { db } from '@/lib/db';
import { dossierScope, type Actor, safeUser } from '@/lib/auth';
import { statusLabels, typeLabels, date } from '@/lib/constants';
import { formSteps } from '@/lib/forms';
import { ActionForm } from './action-form';
import { dossierAction } from '@/app/actions/dossiers';
import { Badge, Empty, PageHeading } from './ui';
import { UploadForm, DeleteDocument } from './documents';
export async function DossierDetail({
  reference,
  actor,
  admin = false,
}: {
  reference: string;
  actor: Actor;
  admin?: boolean;
}) {
  const dossier = await db.dossier.findFirst({
    where: { reference, ...dossierScope(actor) },
    include: {
      user: { select: safeUser },
      assignee: { select: { fullName: true } },
      history: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { fullName: true } } },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { fullName: true, role: true } } },
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { fullName: true, role: true } } },
      },
      requests: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!dossier) notFound();
  const [notes, audits, staff] = admin
    ? await Promise.all([
        db.dossierNote.findMany({
          where: { dossierId: dossier.id },
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { fullName: true } } },
        }),
        db.auditLog.findMany({
          where: { dossierId: dossier.id },
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { fullName: true } } },
        }),
        actor.role === 'ADMIN'
          ? db.user.findMany({
              where: { role: { in: ['ADMIN', 'EXPERT'] } },
              select: { id: true, fullName: true },
            })
          : Promise.resolve([]),
      ])
    : [[], [], []];
  const fieldLabels = Object.fromEntries(
    (formSteps[dossier.type] || []).flatMap((s) => s.fields.map((f) => [f.key, f.label])),
  );
  Object.assign(fieldLabels, {
    applicantName: 'Nom et prénom à la soumission',
    applicantPhone: 'Téléphone du compte',
    applicantCity: 'Ville à la soumission',
    businessName: 'Nom du commerce',
  });
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  return (
    <>
      <Link href={`/${admin ? 'admin' : 'mon-espace'}/dossiers`} className="back-link">
        ← Tous les dossiers
      </Link>
      <PageHeading
        eyebrow={reference}
        title={typeLabels[dossier.type]}
        text={`Créé le ${date(dossier.createdAt)} · ${dossier.city}`}
      >
        <Badge status={dossier.status} />
      </PageHeading>
      {admin && dossier.reviewFlags.length > 0 && (
        <div className="alert">
          Vérification nécessaire : {dossier.reviewFlags.join(' · ')}. La demande reste à examiner
          par l’équipe.
        </div>
      )}
      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel">
            <h2>
              <Clock3 size={20} /> Avancement du dossier
            </h2>
            <ol className="timeline">
              {dossier.history.map((h, i) => (
                <li key={h.id} className={i === dossier.history.length - 1 ? 'latest' : ''}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{statusLabels[h.newStatus]}</strong>
                    <small>
                      {date(h.createdAt)}
                      {admin && ` · ${h.author.fullName}`}
                    </small>
                    {h.comment && <p>{h.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2>Informations de la demande</h2>
            {dossier.businessName && (
              <p>
                <strong>Commerce : </strong>
                {dossier.businessName}
              </p>
            )}
            <dl className="answers">
              {Object.entries(dossier.formData as Record<string, unknown>).map(([key, value]) => (
                <div key={key}>
                  <dt>{fieldLabels[key] || key}</dt>
                  <dd>
                    {Array.isArray(value) ? value.join(', ') || 'Non renseigné' : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel">
            <h2>
              <FileText size={20} /> Documents
            </h2>
            {dossier.requests.length > 0 && (
              <div className="document-requests">
                {dossier.requests.map((r) => (
                  <div className="alert" key={r.id}>
                    <strong>{r.fulfilledAt ? '✓ Document vérifié' : 'Document demandé'}</strong>
                    <p>{r.label}</p>
                    {admin && !r.fulfilledAt && (
                      <ActionForm action={dossierAction} label="Marquer comme reçu et vérifié">
                        {hidden('fulfill')}
                        <input type="hidden" name="requestId" value={r.id} />
                      </ActionForm>
                    )}
                  </div>
                ))}
              </div>
            )}
            {dossier.documents.length ? (
              <div className="document-list">
                {dossier.documents.map((d) => (
                  <div className="document-row" key={d.id}>
                    <FileText size={20} />
                    <div>
                      <strong>{d.name}</strong>
                      <small>
                        {d.category} · {date(d.createdAt)} ·{' '}
                        {d.author.role === 'CLIENT' ? 'Client' : 'Monsinistre'}
                      </small>
                      <div className="document-actions">
                        <a
                          href={`/api/documents/${d.id}?preview=1`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visualiser ↗
                        </a>
                        <a href={`/api/documents/${d.id}`}>Télécharger</a>
                        {actor.role === 'ADMIN' && <DeleteDocument id={d.id} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Aucun document joint pour le moment.</p>
            )}
            <UploadForm reference={reference} />
          </section>
          <section className="panel">
            <h2>
              <MessageSquare size={20} /> Échanges avec {admin ? 'le client' : 'Monsinistre'}
            </h2>
            <div className="messages">
              {dossier.messages.map((m) => (
                <article key={m.id} className={m.authorId === actor.id ? 'message own' : 'message'}>
                  <strong>
                    {m.author.role === 'CLIENT' ? m.author.fullName : 'Équipe Monsinistre'}
                  </strong>
                  <p>{m.body}</p>
                  <small>{date(m.createdAt)}</small>
                </article>
              ))}
            </div>
            {!dossier.messages.length && (
              <p className="muted">Une question sur ce dossier ? Écrivez-nous ici.</p>
            )}
            <ActionForm action={dossierAction} label="Envoyer le message">
              {hidden('message')}
              <label>
                Votre message
                <textarea name="body" rows={3} minLength={1} maxLength={5000} required />
              </label>
            </ActionForm>
          </section>
        </div>
        <aside className="detail-aside">
          {admin ? (
            <>
              <section className="panel">
                <span className="eyebrow">CLIENT</span>
                <h3>{dossier.user.fullName}</h3>
                <p>
                  {dossier.user.phone}
                  <br />
                  {dossier.user.city}
                </p>
                {dossier.user.email && <p>{dossier.user.email}</p>}
                {actor.role === 'ADMIN' && (
                  <Link className="text-link" href={`/admin/clients/${dossier.user.id}`}>
                    Voir le profil →
                  </Link>
                )}
              </section>
              <section className="panel">
                <h3>Statut du dossier</h3>
                <ActionForm action={dossierAction} label="Mettre à jour le statut">
                  {hidden('status')}
                  <label>
                    Nouveau statut
                    <select name="status" defaultValue={dossier.status}>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Commentaire visible par le client
                    <textarea name="comment" maxLength={2000} rows={2} />
                  </label>
                </ActionForm>
              </section>
              {actor.role === 'ADMIN' && (
                <section className="panel">
                  <h3>Responsable</h3>
                  <ActionForm action={dossierAction} label="Assigner">
                    {hidden('assign')}
                    <label>
                      Responsable du dossier
                      <select name="assignedTo" defaultValue={dossier.assignedTo || ''}>
                        <option value="">Non assigné</option>
                        {staff.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </ActionForm>
                </section>
              )}
              <section className="panel">
                <h3>Demander un document</h3>
                <ActionForm action={dossierAction} label="Envoyer la demande">
                  {hidden('request')}
                  <label>
                    Pièce attendue
                    <input
                      name="label"
                      minLength={3}
                      maxLength={250}
                      required
                      placeholder="Ex. rapport d’expertise"
                    />
                  </label>
                </ActionForm>
              </section>
              <section className="panel internal">
                <span className="eyebrow">ÉQUIPE UNIQUEMENT</span>
                <h3>Notes internes</h3>
                {notes.map((n) => (
                  <div className="note" key={n.id}>
                    <p>{n.body}</p>
                    <small>
                      {n.author.fullName} · {date(n.createdAt)}
                    </small>
                  </div>
                ))}
                <ActionForm action={dossierAction} label="Ajouter la note">
                  {hidden('note')}
                  <label>
                    Note interne
                    <textarea name="body" maxLength={5000} rows={3} required />
                  </label>
                </ActionForm>
              </section>
            </>
          ) : (
            <section className="panel">
              <span className="eyebrow">À VOS CÔTÉS</span>
              <h3>Chaque étape, en toute clarté.</h3>
              <p>Cette progression reprend les mises à jour enregistrées par notre équipe.</p>
              <p>Les nouveaux statuts se mettent à jour automatiquement dans votre espace.</p>
              <small>Dernière mise à jour : {date(dossier.updatedAt)}</small>
            </section>
          )}
        </aside>
      </div>
      {admin && (
        <section className="panel">
          <h2>Historique des actions</h2>
          <div className="audit-list">
            {audits.map((a) => (
              <div key={a.id}>
                <span>{date(a.createdAt)}</span>
                <strong>{a.actor.fullName}</strong>
                <span>
                  {(
                    {
                      DOSSIER_CREATED: 'Création du dossier',
                      STATUS: 'Changement de statut',
                      MESSAGE: 'Message envoyé',
                      NOTE: 'Note interne ajoutée',
                      ASSIGN: 'Changement de responsable',
                      REQUEST: 'Document demandé',
                      FULFILL: 'Document vérifié',
                      DOCUMENT_ADDED: 'Document ajouté',
                      DOCUMENT_DELETED: 'Document supprimé',
                    } as Record<string, string>
                  )[a.action] || a.action}
                  {a.detail ? ` · ${a.detail}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
