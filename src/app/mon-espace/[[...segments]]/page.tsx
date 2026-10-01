import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PageHeading, ButtonLink } from '@/components/ui';
import { DossierCards } from '@/components/dossier-list';
import { DossierDetail } from '@/components/dossier-detail';
import { PortalDocuments } from '@/components/portal-documents';
import { ActionForm } from '@/components/action-form';
import { updateProfile } from '@/app/actions/dossiers';
import { terminalStatuses, date, statusLabels } from '@/lib/constants';
export default async function ClientPage({ params }: { params: Promise<{ segments?: string[] }> }) {
  const user = await requireUser(['CLIENT']);
  const { segments = [] } = await params;
  if (segments[0] === 'dossiers' && segments.length === 2)
    return <DossierDetail actor={user} reference={segments[1]} />;
  if (segments.length > 1) notFound();
  if (segments[0] === 'documents') return <PortalDocuments actor={user} />;
  if (segments[0] === 'profil')
    return (
      <>
        <PageHeading title="Mon profil" text="Vos coordonnées pour rester en contact." />
        <section className="panel narrow">
          <p>
            Identifiant de connexion : <strong>{user.phone}</strong>
          </p>
          <ActionForm action={updateProfile}>
            <label>
              Nom et prénom
              <input
                name="fullName"
                required
                minLength={3}
                maxLength={120}
                defaultValue={user.fullName}
              />
            </label>
            <label>
              Ville
              <input name="city" required minLength={2} maxLength={100} defaultValue={user.city} />
            </label>
            <label>
              Email (facultatif)
              <input name="email" type="email" defaultValue={user.email || ''} />
            </label>
          </ActionForm>
          <p className="small">
            Pour changer votre numéro de connexion, contactez notre équipe depuis votre dossier.
          </p>
        </section>
      </>
    );
  if (segments.length && segments[0] !== 'dossiers') notFound();
  const dossiers = await db.dossier.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });
  if (segments[0] === 'dossiers')
    return (
      <>
        <PageHeading eyebrow="VOTRE SUIVI" title="Mes dossiers">
          <ButtonLink href="/services">Nouveau dossier</ButtonLink>
        </PageHeading>
        <DossierCards dossiers={dossiers} />
      </>
    );
  const [requests, history] = await Promise.all([
    db.documentRequest.count({ where: { dossier: { userId: user.id }, fulfilledAt: null } }),
    db.dossierStatusHistory.findMany({
      where: { dossier: { userId: user.id } },
      include: { dossier: { select: { reference: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="VOTRE ESPACE PERSONNEL"
        title={`Bonjour ${user.fullName.split(' ')[0]}`}
        text="Retrouvez l’essentiel de votre accompagnement, en un seul endroit."
      >
        <ButtonLink href="/services">Nouveau dossier</ButtonLink>
      </PageHeading>
      <div className="stats-grid">
        {[
          ['Dossiers', dossiers.length],
          [
            'En cours',
            dossiers.filter((d) => !(terminalStatuses as readonly string[]).includes(d.status))
              .length,
          ],
          ['Terminés', dossiers.filter((d) => d.status === 'TERMINE').length],
          ['Documents attendus', requests],
        ].map(([label, value]) => (
          <div className="stat-card" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="section-row compact">
        <h2>Vos dossiers récents</h2>
        <a className="text-link" href="/mon-espace/dossiers">
          Tout voir →
        </a>
      </div>
      <DossierCards dossiers={dossiers.slice(0, 6)} />
      {history.length > 0 && (
        <section className="panel" style={{ marginTop: 'var(--space-6)' }}>
          <h2>Dernières mises à jour</h2>
          <div className="audit-list">
            {history.map((h) => (
              <div key={h.id}>
                <span>{date(h.createdAt)}</span>
                <a href={`/mon-espace/dossiers/${h.dossier.reference}`}>{h.dossier.reference}</a>
                <span>{statusLabels[h.newStatus]}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
