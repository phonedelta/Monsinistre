import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FolderOpen, MessagesSquare, ShieldCheck } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { Logo } from '@/components/ui';
import { AdminVisual } from '@/components/visuals';
import { staffLogin } from '@/app/actions/auth';
import { currentUser } from '@/lib/auth';
export const metadata = { title: 'Administration', robots: { index: false, follow: false } };
// The team's own sign-in page, apart from the client page "Suivre mon dossier" (/connexion).
export default async function StaffLogin() {
  const user = await currentUser();
  if (user && user.role !== 'CLIENT') redirect('/admin/dashboard');
  return (
    <main id="main" className="staff-page">
      <aside className="staff-aside">
        <Logo light />
        <div className="staff-pitch enter">
          <span className="eyebrow">ESPACE DE L’ÉQUIPE</span>
          <p className="staff-title">
            Chaque dossier,
            <br />
            <em>sous votre regard.</em>
          </p>
          <AdminVisual />
          <ul className="staff-points">
            <li>
              <FolderOpen size={18} /> Dossiers et statuts
            </li>
            <li>
              <MessagesSquare size={18} /> Échanges avec les clients
            </li>
            <li>
              <ShieldCheck size={18} /> Accès réservé
            </li>
          </ul>
        </div>
      </aside>
      <div className="staff-form">
        <div className="staff-login enter">
          <Logo />
          <div className="panel auth-panel">
            <span className="eyebrow">ACCÈS RÉSERVÉ À L’ÉQUIPE</span>
            <h1>Administration</h1>
            <p>Connectez-vous pour gérer les dossiers des clients.</p>
            <ActionForm action={staffLogin} label="Se connecter">
              <label>
                Identifiant ou téléphone
                <input
                  name="identifier"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={64}
                  placeholder="Identifiant ou 06 12 34 56 78"
                  required
                />
              </label>
              <label>
                Mot de passe
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  required
                  maxLength={128}
                />
              </label>
            </ActionForm>
            <div className="auth-bottom">
              Vous êtes client&nbsp;?<Link href="/connexion">Suivre mon dossier →</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
