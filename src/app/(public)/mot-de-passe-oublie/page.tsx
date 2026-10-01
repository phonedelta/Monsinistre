import { ActionForm } from '@/components/action-form';
import { requestReset } from '@/app/actions/auth';
export default function Forgot() {
  return (
    <section className="container narrow section">
      <div className="panel auth-panel">
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
      </div>
    </section>
  );
}
