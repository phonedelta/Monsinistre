import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { safeUser } from '@/lib/auth';
import { date, terminalStatuses, statusLabels } from '@/lib/constants';
import { PageHeading, Empty } from './ui';
import { DossierCards } from './dossier-list';
export async function AdminClients({ id, q = '' }: { id?: string; q?: string }) {
  if (id) {
    const client = await db.user.findFirst({
      where: { id, role: 'CLIENT' },
      select: {
        ...safeUser,
        dossiers: {
          include: { documents: true, history: { orderBy: { createdAt: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) notFound();
    return (
      <>
        <Link className="back-link" href="/admin/clients">
          ← Tous les clients
        </Link>
        <PageHeading
          eyebrow="FICHE CLIENT"
          title={client.fullName}
          text={`${client.phone} · ${client.city} · Inscrit le ${date(client.createdAt)}`}
        />
        <section className="panel">
          <h2>Coordonnées</h2>
          <p>
            {client.email || 'Aucun email renseigné'}
            <br />
            {client.phone}
            <br />
            {client.city}
          </p>
        </section>
        <h2 className="section-title">Dossiers et historique</h2>
        <DossierCards dossiers={client.dossiers} admin />
        <section className="panel" style={{ marginTop: 'var(--space-6)' }}>
          <h2>Historique des statuts</h2>
          <div className="audit-list">
            {client.dossiers
              .flatMap((d) => d.history.map((h) => ({ ...h, reference: d.reference })))
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((h) => (
                <div key={h.id}>
                  <span>{date(h.createdAt)}</span>
                  <Link href={`/admin/dossiers/${h.reference}`}>{h.reference}</Link>
                  <span>{statusLabels[h.newStatus]}</span>
                </div>
              ))}
          </div>
        </section>
        <section className="panel" style={{ marginTop: 'var(--space-6)' }}>
          <h2>Documents du client</h2>
          {client.dossiers
            .flatMap((d) => d.documents)
            .map((d) => (
              <div className="document-row" key={d.id}>
                <strong>{d.name}</strong>
                <a href={`/api/documents/${d.id}`}>Télécharger ↓</a>
              </div>
            ))}
          {!client.dossiers.some((d) => d.documents.length) && <p>Aucun document.</p>}
        </section>
      </>
    );
  }
  const clients = await db.user.findMany({
    where: {
      role: 'CLIENT',
      ...(q
        ? {
            OR: [
              { fullName: { contains: q.slice(0, 120), mode: 'insensitive' as const } },
              { phone: { contains: q.replace(/^0/, '+212').replace(/\s/g, '').slice(0, 40) } },
            ],
          }
        : {}),
    },
    select: { ...safeUser, dossiers: { select: { status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <>
      <PageHeading eyebrow="RELATION CLIENT" title="Clients" text={`${clients.length} client(s)`} />
      <form className="panel filters">
        <label className="search-field">
          Rechercher un client
          <input name="q" defaultValue={q} placeholder="Nom ou téléphone" />
        </label>
        <button className="btn">Rechercher</button>
      </form>
      {clients.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Client', 'Téléphone', 'Ville', 'Dossiers', 'Actifs', 'Inscription', ''].map(
                  (t, i) => (
                    <th key={i}>{t}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {clients.map((u) => (
                <tr key={u.id}>
                  <td data-label="Client">
                    <strong>{u.fullName}</strong>
                  </td>
                  <td data-label="Téléphone">{u.phone}</td>
                  <td data-label="Ville">{u.city}</td>
                  <td data-label="Dossiers">{u.dossiers.length}</td>
                  <td data-label="Actifs">
                    {
                      u.dossiers.filter(
                        (d) => !(terminalStatuses as readonly string[]).includes(d.status),
                      ).length
                    }
                  </td>
                  <td data-label="Inscription">{date(u.createdAt)}</td>
                  <td>
                    <Link className="text-link" href={`/admin/clients/${u.id}`}>
                      Voir le profil ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Aucun client trouvé" />
      )}
    </>
  );
}
