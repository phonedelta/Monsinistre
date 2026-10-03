import Link from 'next/link';
import { Clock3, Mail, MessageCircle, Phone } from 'lucide-react';
import type { ContactStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { contactLabels, date, time } from '@/lib/constants';
import { ActionForm } from './action-form';
import { updateContact } from '@/app/actions/dossiers';
import { Empty, PageHeading } from './ui';
import type { Search } from './admin-dossiers';
// The tabs above the list: every request, or those of one status.
const tabs: [ContactStatus, string][] = [
  ['NOUVEAU', 'Nouvelles'],
  ['CONTACTE', 'Contactées'],
  ['EN_COURS', 'En cours'],
  ['CONVERTI', 'Converties'],
  ['FERME', 'Fermées'],
];
/* The requests sent from the Contact page, newest first: who wrote and what, how to reach them,
   and where the request stands. A new request stands out until someone takes it. */
export async function AdminContact({ search }: { search: Search }) {
  const status = tabs.find(([key]) => key === search.status)?.[0];
  const [requests, groups] = await Promise.all([
    db.contactRequest.findMany({ where: { status }, orderBy: { createdAt: 'desc' } }),
    db.contactRequest.groupBy({ by: ['status'], _count: true }),
  ]);
  const count = (key?: ContactStatus) =>
    groups.reduce((sum, group) => sum + (!key || group.status === key ? group._count : 0), 0);
  return (
    <>
      <PageHeading
        eyebrow="PREMIERS ÉCHANGES"
        title="Demandes de contact"
        text="Les demandes adressées à Monsinistre depuis le site."
      />
      <nav className="status-tabs" aria-label="Filtrer les demandes par statut">
        <Link href="/admin/demandes-contact" aria-current={status ? undefined : 'page'}>
          Toutes <span>{count()}</span>
        </Link>
        {tabs.map(([key, label]) => (
          <Link
            href={`/admin/demandes-contact?status=${key}`}
            aria-current={status === key ? 'page' : undefined}
            key={key}
          >
            {label} <span>{count(key)}</span>
          </Link>
        ))}
      </nav>
      {requests.length ? (
        <div className="contact-requests">
          {requests.map((r) => (
            <article className="panel contact-request" data-status={r.status} key={r.id}>
              <div className="request-body">
                <header>
                  <span className="avatar" aria-hidden="true">
                    {r.fullName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h2>{r.fullName}</h2>
                    <p>
                      {r.service} · {r.city}
                    </p>
                  </div>
                  <span className={`badge badge-contact-${r.status.toLowerCase()}`}>
                    <i />
                    {contactLabels[r.status]}
                  </span>
                </header>
                <p className="request-message">{r.description}</p>
                <footer>
                  <div className="request-contact">
                    <a href={`tel:${r.phone}`}>
                      <Phone size={15} /> {r.phone}
                    </a>
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                    {r.email && (
                      <a href={`mailto:${r.email}`}>
                        <Mail size={15} /> <span>{r.email}</span>
                      </a>
                    )}
                  </div>
                  <small>
                    <Clock3 size={14} /> Reçue le {date(r.createdAt)} à {time(r.createdAt)}
                  </small>
                </footer>
              </div>
              <aside>
                <ActionForm action={updateContact} label="Mettre à jour" secondary>
                  <input type="hidden" name="id" value={r.id} />
                  <label>
                    Statut
                    <select name="status" defaultValue={r.status} key={r.status}>
                      {Object.entries(contactLabels).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
                {r.updatedAt.getTime() - r.createdAt.getTime() > 1000 && (
                  <small>
                    Modifié le {date(r.updatedAt)} à {time(r.updatedAt)}
                  </small>
                )}
              </aside>
            </article>
          ))}
        </div>
      ) : status ? (
        <Empty
          title="Aucune demande avec ce statut"
          text="Choisissez un autre statut, ou revenez à toutes les demandes."
        />
      ) : (
        <Empty
          title="Aucune demande de contact"
          text="Les demandes envoyées depuis la page Contact du site apparaîtront ici."
        />
      )}
    </>
  );
}
