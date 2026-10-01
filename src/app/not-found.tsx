import Link from 'next/link';
import { Logo } from '@/components/ui';
export default function NotFound() {
  return (
    <main id="main" className="status-page">
      <div className="status-card enter">
        <Logo />
        <span className="status-code" aria-hidden="true">
          404
        </span>
        <h1>Cette page est introuvable.</h1>
        <p>Le lien a peut-être changé ou ce dossier ne vous est pas accessible.</p>
        <Link className="btn btn-lg" href="/">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
