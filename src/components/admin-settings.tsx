import { db } from '@/lib/db';
import { date } from '@/lib/constants';
import { PageHeading } from './ui';
import { ActionForm } from './action-form';
import { issueReset } from '@/app/actions/auth';
export async function AdminSettings() {
  const [resets, staff] = await Promise.all([
    db.passwordReset.findMany({
      where: { usedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.user.findMany({
      where: { role: { in: ['ADMIN', 'EXPERT'] } },
      select: { fullName: true, phone: true, role: true },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Paramètres"
        text="Équipe, accès et configuration du service."
      />
      <div className="two-col">
        <section className="panel">
          <h2>Équipe autorisée</h2>
          {staff.map((s) => (
            <div className="document-row" key={s.phone}>
              <div>
                <strong>{s.fullName}</strong>
                <small>{s.phone}</small>
              </div>
              <span className="badge">{s.role}</span>
            </div>
          ))}
          <p className="small">
            Les comptes de l’équipe sont provisionnés par la commande sécurisée documentée dans le
            README.
          </p>
        </section>
        <section className="panel">
          <h2>Configuration</h2>
          <dl className="answers">
            <div>
              <dt>Stockage des documents</dt>
              <dd>Privé · local</dd>
            </div>
            <div>
              <dt>Identifiant client</dt>
              <dd>Téléphone marocain normalisé</dd>
            </div>
            <div>
              <dt>Durée d’une session</dt>
              <dd>7 jours</dd>
            </div>
          </dl>
          <p className="small">
            Les coordonnées publiques et les paramètres d’infrastructure se configurent dans les
            variables d’environnement.
          </p>
        </section>
      </div>
      <h2 style={{ marginTop: 'var(--space-8)' }}>Demandes de réinitialisation</h2>
      <p>
        Vérifiez l’identité par votre procédure habituelle avant de générer un lien. Aucun SMS n’est
        envoyé automatiquement.
      </p>
      {resets.length ? (
        <div className="values-grid">
          {resets.map((r) => (
            <section className="panel" key={r.id}>
              <h3>{r.phone}</h3>
              <p>Demande du {date(r.createdAt)}</p>
              <ActionForm action={issueReset} label="Générer un lien de 30 minutes">
                <input type="hidden" name="id" value={r.id} />
                <label className="checkbox-label">
                  <input type="checkbox" name="verified" required />
                  Identité du demandeur vérifiée
                </label>
              </ActionForm>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <p>Aucune demande en attente.</p>
        </section>
      )}
    </>
  );
}
