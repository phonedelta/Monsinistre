import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ContactRound, KeyRound, LifeBuoy, UserRound } from 'lucide-react';
import { db } from '@/lib/db';
import type { Actor } from '@/lib/auth';
import { date, time } from '@/lib/constants';
import { siteContact } from '@/lib/settings';
import { PageHeading } from './ui';
import { ActionForm } from './action-form';
import { issueReset } from '@/app/actions/auth';
import { changePassword, updateAccount, updateSiteContact } from '@/app/actions/settings';
import type { Search } from './admin-dossiers';
// The subjects of the settings, in the order of their side list: address, name, icon.
const sections = [
  ['compte', 'Compte', UserRound],
  ['mot-de-passe', 'Mot de passe', KeyRound],
  ['coordonnees', 'Coordonnées publiques', ContactRound],
  ['reinitialisations', 'Réinitialisations', LifeBuoy],
] as const;
/* A side list of subjects and, beside it, the one that is open. Reset requests that wait for
   a link are what the red count of the menu sends an administrator here for: without a choice
   of subject the page opens on them, with its address saying so, so that the page does not
   change subject by itself once the last request is handled. */
export async function AdminSettings({ actor, search }: { actor: Actor; search: Search }) {
  const waiting = await db.passwordReset.count({ where: { usedAt: null, tokenHash: null } });
  const chosen = sections.find(([slug]) => slug === search.section)?.[0];
  if (!chosen && waiting) redirect('/admin/parametres?section=reinitialisations');
  const current = chosen ?? 'compte';
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Paramètres"
        text="Votre compte, les coordonnées du site et les demandes de vos clients."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Rubriques des paramètres">
          {sections.map(([slug, label, Icon]) => (
            <Link
              href={`/admin/parametres?section=${slug}`}
              aria-current={slug === current ? 'page' : undefined}
              key={slug}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
              {slug === 'reinitialisations' && waiting > 0 && (
                <b className="count-badge">{waiting}</b>
              )}
            </Link>
          ))}
        </nav>
        {current === 'compte' && <Account actor={actor} />}
        {current === 'mot-de-passe' && <Password />}
        {current === 'coordonnees' && <PublicContact />}
        {current === 'reinitialisations' && <Resets />}
      </div>
    </>
  );
}
function Account({ actor }: { actor: Actor }) {
  return (
    <section className="settings-section">
      <header>
        <h2>Compte administrateur</h2>
        <p>
          L’identifiant sert à vous connecter, à la place du numéro de téléphone. Majuscules et
          minuscules sont équivalentes.
        </p>
      </header>
      <div className="panel">
        <ActionForm action={updateAccount} label="Enregistrer le compte">
          <div className="field-grid">
            <label>
              Identifiant de connexion
              <input
                name="username"
                defaultValue={actor.username || ''}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={32}
                required
              />
            </label>
            <label>
              Nom affiché
              <input
                name="fullName"
                defaultValue={actor.fullName}
                autoComplete="name"
                minLength={3}
                maxLength={120}
                required
              />
            </label>
          </div>
        </ActionForm>
      </div>
    </section>
  );
}
function Password() {
  return (
    <section className="settings-section">
      <header>
        <h2>Mot de passe</h2>
        <p>Après le changement, les sessions ouvertes sur vos autres appareils sont fermées.</p>
      </header>
      <div className="panel">
        <ActionForm action={changePassword} label="Changer le mot de passe">
          <label>
            Mot de passe actuel
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              required
            />
          </label>
          <div className="field-grid">
            <label>
              Nouveau mot de passe (12 caractères minimum)
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
            <label>
              Confirmation du nouveau mot de passe
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>
          </div>
        </ActionForm>
      </div>
    </section>
  );
}
async function PublicContact() {
  const contact = await siteContact();
  return (
    <section className="settings-section">
      <header>
        <h2>Coordonnées publiques</h2>
        <p>Affichées sur la page Contact du site. Un champ laissé vide n’est pas affiché.</p>
      </header>
      <div className="panel">
        <ActionForm action={updateSiteContact} label="Enregistrer les coordonnées">
          <div className="field-grid">
            <label>
              Téléphone
              <input
                name="phone"
                type="tel"
                defaultValue={contact.phone}
                maxLength={30}
                placeholder="05 22 00 00 00"
              />
            </label>
            <label>
              WhatsApp
              <input
                name="whatsapp"
                type="tel"
                defaultValue={contact.whatsapp}
                maxLength={30}
                placeholder="06 12 34 56 78"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={contact.email}
                maxLength={254}
                placeholder="contact@exemple.ma"
              />
            </label>
          </div>
        </ActionForm>
      </div>
    </section>
  );
}
// The requests keep their order when one is handled: the link just issued stays where it is.
async function Resets() {
  const resets = await db.passwordReset.findMany({
    where: { usedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const holders = new Map(
    (
      await db.user.findMany({
        where: { phone: { in: resets.map((r) => r.phone) } },
        select: { phone: true, fullName: true, role: true },
      })
    ).map((user) => [user.phone, user]),
  );
  const now = new Date();
  return (
    <section className="settings-section">
      <header>
        <h2>Demandes de réinitialisation</h2>
        <p>
          Un client qui a oublié son mot de passe en fait la demande depuis le site. Vérifiez son
          identité par votre procédure habituelle, puis transmettez-lui le lien. Aucun SMS n’est
          envoyé automatiquement.
        </p>
      </header>
      <div className="panel">
        {resets.length ? (
          <div className="reset-requests">
            {resets.map((r) => {
              const holder = holders.get(r.phone);
              const expired = !!r.expiresAt && r.expiresAt < now;
              return (
                <article className="reset-request" key={r.id}>
                  <header>
                    <div>
                      <h3>{holder?.fullName || r.phone}</h3>
                      <p>
                        {holder && `${r.phone} · `}
                        {holder && holder.role !== 'CLIENT' && 'équipe · '}
                        demandée le {date(r.createdAt)} à {time(r.createdAt)}
                      </p>
                    </div>
                    {!r.tokenHash ? (
                      <span className="badge badge-reset-waiting">
                        <i />À traiter
                      </span>
                    ) : expired ? (
                      <span className="badge badge-reset-expired">
                        <i />
                        Lien expiré
                      </span>
                    ) : (
                      <span className="badge">
                        <i />
                        Lien valable jusqu’à {time(r.expiresAt!)}
                      </span>
                    )}
                  </header>
                  <ActionForm
                    action={issueReset}
                    label={
                      r.tokenHash ? 'Générer un nouveau lien' : 'Générer un lien de 30 minutes'
                    }
                    secondary={!!r.tokenHash}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <label className="checkbox-label">
                      <input type="checkbox" name="verified" required />
                      Identité du demandeur vérifiée
                    </label>
                  </ActionForm>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">Aucune demande en attente.</p>
        )}
      </div>
    </section>
  );
}
