'use client';
import { Logo } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="status-page">
      <div className="status-card enter">
        <Logo />
        <h1>Le service est momentanément indisponible.</h1>
        <p>Vos données déjà enregistrées sont conservées. Vous pouvez réessayer.</p>
        <button className="btn btn-lg" onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
