import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { login } from '@/app/actions/auth';
export const metadata = { title: 'Connexion' };
export default function Login() {
  return (
    <section className="hero-band">
      <div className="auth-section container">
        <div className="auth-aside enter">
          <span className="eyebrow">VOTRE ESPACE MONSINISTRE</span>
          <h1>
            Un dossier suivi.
            <br />
            <em>Un esprit plus serein.</em>
          </h1>
          <p>
            Retrouvez vos documents, échangez avec notre équipe et suivez chaque étape de votre
            dossier.
          </p>
          <span className="secure-label">
            <LockKeyhole size={18} /> Un espace personnel et sécurisé
          </span>
        </div>
        <div className="panel auth-panel">
          <span className="eyebrow">HEUREUX DE VOUS RETROUVER</span>
          <h2>Se connecter</h2>
          <p>Utilisez le numéro indiqué lors de votre demande.</p>
          <ActionForm action={login} label="Se connecter">
            <label>
              Téléphone
              <input
                name="phone"
                type="tel"
                autoComplete="username"
                placeholder="06 12 34 56 78"
                required
              />
            </label>
            <label>
              Mot de passe
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
          </ActionForm>
          <Link className="text-link" href="/mot-de-passe-oublie">
            Mot de passe oublié ?
          </Link>
          <div className="auth-bottom">
            Votre première visite ?<Link href="/services">Déposer une demande →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
