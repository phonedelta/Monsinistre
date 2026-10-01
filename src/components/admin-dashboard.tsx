import { db } from '@/lib/db';
import { dossierScope, type Actor } from '@/lib/auth';
import { statusLabels, typeLabels } from '@/lib/constants';
import { PageHeading } from './ui';
import { DossierCards } from './dossier-list';
export async function AdminDashboard({ actor }: { actor: Actor }) {
  const where = dossierScope(actor);
  const [
    total,
    active,
    newCount,
    docs,
    expertise,
    complete,
    clients,
    recent,
    types,
    statuses,
    cities,
    contacts,
  ] = await Promise.all([
    db.dossier.count({ where }),
    db.dossier.count({ where: { ...where, status: { notIn: ['TERMINE', 'ANNULE', 'ARCHIVE'] } } }),
    db.dossier.count({ where: { ...where, status: 'NOUVEAU' } }),
    db.dossier.count({ where: { ...where, status: 'DOCUMENTS_REQUIS' } }),
    db.dossier.count({ where: { ...where, status: 'EXPERTISE_EN_COURS' } }),
    db.dossier.count({ where: { ...where, status: 'TERMINE' } }),
    actor.role === 'ADMIN' ? db.user.count({ where: { role: 'CLIENT' } }) : Promise.resolve(0),
    db.dossier.findMany({ where, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.dossier.groupBy({ by: ['type'], where, _count: true }),
    db.dossier.groupBy({ by: ['status'], where, _count: true }),
    db.dossier.groupBy({
      by: ['city'],
      where,
      _count: true,
      orderBy: { _count: { city: 'desc' } },
      take: 10,
    }),
    actor.role === 'ADMIN'
      ? db.contactRequest.count({ where: { status: 'NOUVEAU' } })
      : Promise.resolve(0),
  ]);
  const chart = (title: string, rows: { label: string; count: number }[]) => (
    <section className="panel distribution">
      <h3>{title}</h3>
      {rows.length ? (
        rows.map((r) => (
          <div key={r.label}>
            <div className="bar-label">
              <span>{r.label}</span>
              <strong>{r.count}</strong>
            </div>
            <div className="bar">
              <span style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="muted">Les répartitions apparaîtront avec les premiers dossiers.</p>
      )}
    </section>
  );
  return (
    <>
      <PageHeading
        eyebrow="TABLEAU DE BORD"
        title="Vue d’ensemble"
        text={
          actor.role === 'EXPERT'
            ? 'Le suivi des dossiers qui vous sont assignés.'
            : 'Pilotez l’activité et gardez une vision claire de chaque dossier.'
        }
      />
      <div className="stats-grid">
        {[
          ['Nouveaux dossiers', newCount],
          ['Dossiers actifs', active],
          ['Documents requis', docs],
          ['Expertises en cours', expertise],
          ['Terminés', complete],
          ...(actor.role === 'ADMIN'
            ? [
                ['Clients', clients],
                ['Nouveaux contacts', contacts],
              ]
            : []),
          ['Total dossiers', total],
        ].map(([label, count]) => (
          <div className="stat-card" key={String(label)}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="distribution-grid">
        {chart(
          'Par service',
          types.map((t) => ({ label: typeLabels[t.type], count: t._count })),
        )}
        {chart(
          'Par statut',
          statuses.map((s) => ({ label: statusLabels[s.status], count: s._count })),
        )}
        {chart(
          'Par ville',
          cities.map((c) => ({ label: c.city, count: c._count })),
        )}
      </div>
      <div className="section-row compact">
        <h2>Demandes récentes</h2>
        <a href="/admin/dossiers" className="text-link">
          Tous les dossiers →
        </a>
      </div>
      <DossierCards dossiers={recent} admin />
    </>
  );
}
