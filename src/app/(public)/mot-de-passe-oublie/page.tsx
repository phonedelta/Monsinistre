import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
import { requestReset } from '@/app/actions/auth';
export const metadata = { title: 'Mot de passe oublié' };
export default function Forgot() {
  return (
    <section className="hero-band account-band">
      <div className="container">
        <div className="panel auth-panel enter">
          <span className="eyebrow">ACCÈS À VOTRE ESPACE</span>
          <h1>Retrouver votre accès</h1>
          <p>
            Notre équipe vérifiera votre identité avant de vous communiquer un lien de
            réinitialisation.
          </p>
          <ActionForm action={requestReset} label="Demander une réinitialisation">
            <label>
              Téléphone du compte
              <input type="tel" name="phone" autoComplete="tel" required />
            </label>
          </ActionForm>
          <Link href="/connexion" className="text-link">
            Se connecter →
          </Link>
        </div>
      </div>
    </section>
  );
}
