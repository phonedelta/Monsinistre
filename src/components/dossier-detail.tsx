import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileQuestion,
  FileText,
  FileX2,
  FolderPlus,
  History,
  Hourglass,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
} from 'lucide-react';
import type { DossierStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { dossierScope, type Actor, safeUser } from '@/lib/auth';
import {
  statusLabels,
  statusStages,
  terminalStatuses,
  typeLabels,
  date,
  time,
  fileSize,
} from '@/lib/constants';
import { formSteps } from '@/lib/forms';
import { dialable, envContact, siteContact } from '@/lib/settings';
import { fr } from '@/lib/typography';
import { ActionForm } from './action-form';
import { dossierAction } from '@/app/actions/dossiers';
import { Badge, FileIcon } from './ui';
import { UploadForm, DeleteDocument, DocumentPreview } from './documents';
import { CopyButton } from './copy-button';
import { SectionNav } from './section-nav';
const blank = 'Non renseigné';
// A question of the request form and its answer; several answers when several were ticked.
type Row = [label: string, value: string | string[]];
const at = (value: Date) => `${date(value)} à ${time(value)}`;
const stageOf = (status: DossierStatus) =>
  statusStages.findIndex((stage) => stage.statuses.includes(status));
// What the journal of a dossier calls each recorded action, and its mark.
const actions: Record<string, [string, typeof History]> = {
  DOSSIER_CREATED: ['Création du dossier', FolderPlus],
  STATUS: ['Changement de statut', RefreshCw],
  MESSAGE: ['Message envoyé', MessageSquare],
  NOTE: ['Note interne ajoutée', ClipboardList],
  ASSIGN: ['Changement de responsable', History],
  REQUEST: ['Document demandé', FileQuestion],
  FULFILL: ['Document vérifié', FileCheck2],
  DOCUMENT_ADDED: ['Document ajouté', FilePlus2],
  DOCUMENT_DELETED: ['Document supprimé', FileX2],
};
// The journal shows this many actions; the older ones wait behind a switch.
const recent = 8;
/* The page of one dossier, for the team (`admin`) and for its client. A navy band says what the
   dossier is and where it stands; a bar names the parts of the page and stays in view. The team
   reads the request first and has the status beside it; the client reads the documents and the
   exchanges first, beside the steps their dossier went through. */
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
      history: {
        orderBy: { createdAt: 'desc' },
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
  const [audits, team] = await Promise.all([
    admin
      ? db.auditLog.findMany({
          where: { dossierId: dossier.id },
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { fullName: true } } },
        })
      : [],
    // How a client reaches the team, as on the Contact page.
    admin ? null : siteContact().catch(envContact),
  ]);
  /* Everything entered in the request form, by section: who asked, then one section per step
     of the form in its order, each question shown even when it was left unanswered. Anything
     stored that the form no longer defines goes to a last section, so that no answer is lost. */
  const data = dossier.formData as Record<string, unknown>;
  const steps = (formSteps[dossier.type] || []).filter((step) => step.fields.length);
  const written = (value: unknown, kind?: string): string | string[] =>
    Array.isArray(value)
      ? value.length
        ? value.map(String)
        : blank
      : value === undefined || value === null || value === ''
        ? blank
        : kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(value))
          ? date(String(value))
          : String(value);
  const applicant = ['applicantName', 'applicantPhone', 'applicantCity', 'businessName'];
  const asked = new Set([...applicant, ...steps.flatMap((s) => s.fields.map((f) => f.key))]);
  const answered: { title: string; rows: Row[] }[] = [
    {
      title: 'Client',
      rows: [
        ['Nom et prénom', written(data.applicantName ?? dossier.user.fullName)],
        ['Téléphone', written(data.applicantPhone ?? dossier.user.phone)],
        ['Ville', written(data.applicantCity ?? dossier.city)],
        ...(data.businessName || dossier.businessName
          ? [['Nom du commerce', written(data.businessName ?? dossier.businessName)] as Row]
          : []),
      ],
    },
    ...steps.map((step) => ({
      title: step.title,
      rows: step.fields.map((field): Row => [
        fr(field.label),
        written(data[field.key], field.kind),
      ]),
    })),
    {
      title: 'Autres informations',
      rows: Object.entries(data)
        .filter(([key]) => !asked.has(key))
        .map(([key, value]): Row => [key, written(value)]),
    },
  ];
  const sections = answered.filter((section) => section.rows.length);
  /* Where the dossier stands among the five steps. A cancelled or archived dossier is on none:
     it keeps the steps it went through. */
  const stage = stageOf(dossier.status);
  const closed = (terminalStatuses as readonly string[]).includes(dossier.status);
  const reached =
    stage >= 0 ? stage : Math.max(-1, ...dossier.history.map((h) => stageOf(h.newStatus)));
  const stageState = (index: number) =>
    stage < 0
      ? index <= reached
        ? 'done'
        : 'todo'
      : index < stage || dossier.status === 'TERMINE'
        ? 'done'
        : index === stage
          ? 'current'
          : 'todo';
  // The documents asked from the client: those still awaited first, then those received.
  const awaited = dossier.requests.filter((r) => !r.fulfilledAt);
  const requests = [...awaited, ...dossier.requests.filter((r) => r.fulfilledAt)];
  /* Who deposited a file. The team reads the name; a client reads "Vous" or the team, never the
     name of a team member. `said` is the form used inside a sentence. */
  const depositor = (d: (typeof dossier.documents)[number], said = false) =>
    admin
      ? d.author.fullName
      : d.authorId === actor.id
        ? said
          ? 'vous'
          : 'Vous'
        : said
          ? 'l’équipe Monsinistre'
          : 'Équipe Monsinistre';
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  const request = (
    <section className="panel" id="demande">
      <h2>
        <ClipboardList size={20} /> Informations de la demande
      </h2>
      {sections.map((section) => (
        <div className="answers-section" key={section.title}>
          <h3>{section.title}</h3>
          <dl className="answers">
            {section.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={value === blank ? 'blank' : undefined}>
                  {Array.isArray(value) ? value.map((v) => <span key={v}>{v}</span>) : value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
  const documents = (
    <section className="panel" id="documents">
      <h2>
        <FileText size={20} /> Documents
      </h2>
      {(admin || dossier.requests.length > 0) && (
        <div className="document-requests">
          <h3>{admin ? 'Documents demandés au client' : 'Documents demandés par notre équipe'}</h3>
          {dossier.requests.length ? (
            <ul>
              {requests.map((r) => (
                <li key={r.id} data-done={r.fulfilledAt ? '' : undefined}>
                  <span className="request-mark" aria-hidden="true">
                    {r.fulfilledAt ? <Check size={15} strokeWidth={3} /> : <Hourglass size={14} />}
                  </span>
                  <div>
                    <strong>{r.label}</strong>
                    <small>
                      {r.fulfilledAt
                        ? `Reçu et vérifié le ${date(r.fulfilledAt)}`
                        : `${admin ? 'En attente' : 'À nous transmettre'} · demandé le ${date(r.createdAt)}`}
                    </small>
                  </div>
                  {admin && !r.fulfilledAt && (
                    <ActionForm
                      action={dossierAction}
                      label="Marquer comme reçu et vérifié"
                      secondary
                    >
                      {hidden('fulfill')}
                      <input type="hidden" name="requestId" value={r.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucun document demandé pour le moment.</p>
          )}
          {admin && (
            <ActionForm action={dossierAction} label="Envoyer la demande" className="inline-form">
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
          )}
        </div>
      )}
      {dossier.documents.length ? (
        <div className="document-list">
          {dossier.documents.map((d) => (
            <div className="document-row" key={d.id}>
              <span className="folder-icon">
                <FileIcon type={d.mime} size={19} />
              </span>
              <div>
                <strong>{d.name}</strong>
                <small>
                  {d.category} · {fileSize(d.size)} · {depositor(d)} · {date(d.createdAt)}
                </small>
              </div>
              <div className="document-actions">
                <DocumentPreview id={d.id} name={d.name} mime={d.mime}>
                  {d.category} · {fileSize(d.size)} · déposé par {depositor(d, true)} le{' '}
                  {at(d.createdAt)}
                </DocumentPreview>
                <a className="text-link" href={`/api/documents/${d.id}`}>
                  Télécharger ↓
                </a>
                {actor.role === 'ADMIN' && <DeleteDocument id={d.id} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Aucun document joint pour le moment.</p>
      )}
      <div className="add-document" id="ajouter-un-document">
        <h3>Ajouter un document</h3>
        <UploadForm reference={reference} />
      </div>
    </section>
  );
  const exchanges = (
    <section className="panel" id="echanges">
      <h2>
        <MessageSquare size={20} /> Échanges avec {admin ? 'le client' : 'Monsinistre'}
      </h2>
      {dossier.messages.length ? (
        <div className="messages">
          {dossier.messages.map((m) => {
            const own = m.authorId === actor.id;
            // A client reads the team as one voice; the team reads which colleague wrote.
            const named = m.author.role === 'CLIENT' || admin;
            const name = named ? m.author.fullName : 'Équipe Monsinistre';
            return (
              <article key={m.id} className={own ? 'message own' : 'message'}>
                {!own && (
                  <span className="avatar" aria-hidden="true">
                    {named ? name.charAt(0).toUpperCase() : 'M'}
                  </span>
                )}
                <div>
                  <strong>{own ? 'Vous' : name}</strong>
                  <p>{m.body}</p>
                  <small>{at(m.createdAt)}</small>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted">
          {admin
            ? 'Aucun échange pour le moment. Écrivez au client ci-dessous.'
            : 'Une question sur ce dossier ? Écrivez-nous ici.'}
        </p>
      )}
      <ActionForm action={dossierAction} label="Envoyer le message" className="composer">
        {hidden('message')}
        <label>
          Votre message
          <textarea name="body" rows={3} minLength={1} maxLength={5000} required />
        </label>
      </ActionForm>
    </section>
  );
  const progress = (
    <section className="panel" id="avancement">
      <h2>
        <Clock3 size={20} /> Avancement du dossier
      </h2>
      <ol className="timeline">
        {dossier.history.map((h, i) => (
          <li key={h.id} className={i === 0 ? 'latest' : ''}>
            <span className="timeline-dot" />
            <div>
              <strong>{statusLabels[h.newStatus]}</strong>
              <small>
                {at(h.createdAt)}
                {admin && ` · ${h.author.fullName}`}
              </small>
              {h.comment && <p>{h.comment}</p>}
            </div>
          </li>
        ))}
      </ol>
      {!admin && (
        <small>Mis à jour automatiquement, à chaque étape franchie par notre équipe.</small>
      )}
    </section>
  );
  const entry = (a: (typeof audits)[number]) => {
    const [label, Icon] = actions[a.action] || [a.action, History];
    // A verified document is recorded by the number of its request: the journal names it.
    const detail =
      a.action === 'FULFILL'
        ? dossier.requests.find((r) => r.id === a.detail)?.label
        : a.action === 'ASSIGN'
          ? ''
          : (statusLabels as Record<string, string>)[a.detail || ''] || a.detail;
    return (
      <li key={a.id}>
        <span className="activity-mark" aria-hidden="true">
          <Icon size={15} />
        </span>
        <p>
          <strong>{a.actor.fullName}</strong> · {label}
          {detail ? ` · ${detail}` : ''}
        </p>
        <small>{at(a.createdAt)}</small>
      </li>
    );
  };
  const count = (list: unknown[]) => (list.length ? list.length : undefined);
  return (
    <>
      <Link href={`/${admin ? 'admin' : 'mon-espace'}/dossiers`} className="back-link">
        ← Tous les dossiers
      </Link>
      <header className="dossier-hero">
        <div className="hero-head">
          <div>
            <span className="eyebrow">
              {reference} <CopyButton value={reference} compact />
            </span>
            <h1>{typeLabels[dossier.type]}</h1>
            <ul className="hero-facts">
              <li>
                <MapPin size={15} />
                {[dossier.businessName, dossier.city].filter(Boolean).join(' · ')}
              </li>
              <li>
                <CalendarDays size={15} /> Créé le {date(dossier.createdAt)}
              </li>
              <li>
                <RefreshCw size={15} /> Mis à jour le {date(dossier.updatedAt)}
              </li>
            </ul>
          </div>
          <Badge status={dossier.status} />
        </div>
        <ol
          className="stages"
          aria-label="Étapes du dossier"
          data-closed={stage < 0 ? '' : undefined}
        >
          {statusStages.map(({ label }, index) => {
            const state = stageState(index);
            return (
              <li
                key={label}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className="stage-mark" aria-hidden="true">
                  {state === 'done' && <Check size={14} strokeWidth={3} />}
                </span>
                {label}
                {/* What the mark shows, said to who cannot see it. */}
                <span className="visually-hidden">
                  {state === 'done'
                    ? ' : étape franchie'
                    : state === 'current'
                      ? ' : étape en cours'
                      : stage < 0
                        ? ' : étape non atteinte'
                        : ' : étape à venir'}
                </span>
              </li>
            );
          })}
        </ol>
        {admin ? (
          <div className="hero-foot">
            <div className="hero-client">
              <span className="avatar" aria-hidden="true">
                {dossier.user.fullName.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{dossier.user.fullName}</strong>
                <small>Client · {dossier.user.city}</small>
              </div>
            </div>
            <div className="hero-contact">
              <a href={`tel:${dossier.user.phone}`}>
                <Phone size={15} /> {dossier.user.phone}
              </a>
              <a
                href={`https://wa.me/${dossier.user.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
              {dossier.user.email && (
                <a href={`mailto:${dossier.user.email}`}>
                  <Mail size={15} /> <span>{dossier.user.email}</span>
                </a>
              )}
              {actor.role === 'ADMIN' && (
                <Link href={`/admin/clients/${dossier.user.id}`}>
                  Voir le profil <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        ) : (
          // Nothing is asked from the client any more once the dossier is closed.
          !closed &&
          awaited.length > 0 && (
            <div className="hero-foot">
              <div className="hero-client">
                <span className="avatar" aria-hidden="true">
                  <Hourglass size={18} />
                </span>
                <div>
                  <strong>
                    {awaited.length > 1
                      ? `${awaited.length} documents à nous transmettre`
                      : '1 document à nous transmettre'}
                  </strong>
                  <small>{awaited.map((r) => r.label).join(' · ')}</small>
                </div>
              </div>
              <a className="btn" href="#ajouter-un-document">
                Envoyer un document <ArrowRight size={17} />
              </a>
            </div>
          )
        )}
      </header>
      {admin && dossier.reviewFlags.length > 0 && (
        <div className="alert">
          Vérification nécessaire&nbsp;: {dossier.reviewFlags.join(' · ')}. La demande reste à
          examiner par l’équipe.
        </div>
      )}
      <SectionNav
        label="Parties du dossier"
        sections={
          admin
            ? [
                { id: 'demande', label: 'Demande' },
                { id: 'documents', label: 'Documents', count: count(dossier.documents) },
                { id: 'echanges', label: 'Échanges', count: count(dossier.messages) },
                { id: 'suivi', label: 'Suivi', narrow: true },
                { id: 'historique', label: 'Historique' },
              ]
            : [
                { id: 'documents', label: 'Documents', count: count(dossier.documents) },
                { id: 'echanges', label: 'Échanges', count: count(dossier.messages) },
                { id: 'demande', label: 'Ma demande' },
              ]
        }
      />
      <div className="detail-grid" data-role={admin ? 'team' : 'client'}>
        <div className="detail-main">
          {admin && request}
          {documents}
          {exchanges}
          {!admin && request}
        </div>
        <aside className="detail-aside" id="suivi">
          {admin && (
            <section className="panel">
              <h2>Statut du dossier</h2>
              <ActionForm action={dossierAction} label="Mettre à jour le statut">
                {hidden('status')}
                <label>
                  Nouveau statut
                  {/* The key shows the new status once it is saved: a list keeps the choice
                      it was first given, and a form goes back to it after sending. */}
                  <select name="status" defaultValue={dossier.status} key={dossier.status}>
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
          )}
          {progress}
          {team && (
            <section className="panel">
              <span className="eyebrow">À VOS CÔTÉS</span>
              <h2>Une question sur votre dossier&nbsp;?</h2>
              <p>
                Écrivez-nous dans les échanges de ce dossier&nbsp;: notre équipe vous y répond.
                {(team.phone || team.whatsapp || team.email) &&
                  ' Vous pouvez aussi nous joindre directement.'}
              </p>
              {(team.phone || team.whatsapp || team.email) && (
                <div className="request-contact">
                  {team.phone && (
                    <a href={`tel:${dialable(team.phone)}`}>
                      <Phone size={15} /> {team.phone}
                    </a>
                  )}
                  {team.whatsapp && (
                    <a
                      href={`https://wa.me/${dialable(team.whatsapp).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                  )}
                  {team.email && (
                    <a href={`mailto:${team.email}`}>
                      <Mail size={15} /> <span>{team.email}</span>
                    </a>
                  )}
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
      {admin && (
        <section className="panel" id="historique">
          <h2>
            <History size={20} /> Historique des actions
          </h2>
          {audits.length ? (
            <ol className="activity">{audits.slice(0, recent).map(entry)}</ol>
          ) : (
            <p className="muted">Aucune action enregistrée pour le moment.</p>
          )}
          {audits.length > recent && (
            <details className="activity-more">
              <summary>Afficher les {audits.length - recent} actions précédentes</summary>
              <ol className="activity">{audits.slice(recent).map(entry)}</ol>
            </details>
          )}
        </section>
      )}
    </>
  );
}
