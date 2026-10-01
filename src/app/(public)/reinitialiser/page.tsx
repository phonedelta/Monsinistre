import { ActionForm } from '@/components/action-form';
import { resetPassword } from '@/app/actions/auth';
import Link from 'next/link';
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <section className="container narrow section">
      <div className="panel auth-panel">
        <h1>Nouveau mot de passe</h1>
        <ActionForm action={resetPassword} label="Modifier le mot de passe">
          <input type="hidden" name="token" value={token || ''} />
          <label>
            Nouveau mot de passe
            <input
              type="password"
              name="password"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirmation
            <input
              type="password"
              name="confirmPassword"
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>
        </ActionForm>
        <Link href="/connexion" className="text-link">
          Se connecter →
        </Link>
      </div>
    </section>
  );
}
