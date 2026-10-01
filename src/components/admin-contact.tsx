import { db } from '@/lib/db';
import { contactLabels, date } from '@/lib/constants';
import { ActionForm } from './action-form';
import { updateContact } from '@/app/actions/dossiers';
import { Empty, PageHeading } from './ui';
export async function AdminContact() {
  const requests = await db.contactRequest.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <PageHeading
        eyebrow="PREMIERS ÉCHANGES"
        title="Demandes de contact"
        text="Les demandes adressées à Monsinistre depuis le site."
      />
      {requests.length ? (
        <div className="contact-requests">
          {requests.map((r) => (
            <article className="panel" key={r.id}>
              <span className="eyebrow">
                {r.service} · {date(r.createdAt)}
              </span>
              <h2>{r.fullName}</h2>
              <p>
                {r.phone} · {r.city}
                {r.email && ` · ${r.email}`}
              </p>
              <p className="pre-wrap">{r.description}</p>
              <ActionForm action={updateContact} label="Mettre à jour">
                <input type="hidden" name="id" value={r.id} />
                <label>
                  Statut
                  <select name="status" defaultValue={r.status}>
                    {Object.entries(contactLabels).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </ActionForm>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Aucune demande de contact" />
      )}
    </>
  );
}
