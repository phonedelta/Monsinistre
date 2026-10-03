import Link from 'next/link';
import { ArrowRight, Hourglass } from 'lucide-react';
import type { Actor } from '@/lib/auth';
import { typeLabels } from '@/lib/constants';
import { awaitedDocuments } from '@/lib/pending';
/* At the top of the client's pages, but the page of a dossier, whose band already says it: the
   documents the team asked for and has not verified yet, dossier by dossier, each with the way
   to the form of the dossier that sends a file. The client no longer has to open each dossier
   to find out; the message goes away once the team has verified the documents. */
export async function AwaitedDocuments({ actor }: { actor: Actor }) {
  const dossiers = await awaitedDocuments(actor);
  const total = dossiers.reduce((sum, dossier) => sum + dossier.requests.length, 0);
  if (!total) return null;
  return (
    <aside className="awaited-notice" aria-label="Documents demandés par notre équipe">
      <span className="awaited-mark" aria-hidden="true">
        <Hourglass size={20} />
      </span>
      <div>
        <strong>
          {total > 1
            ? `Notre équipe attend ${total} documents de votre part`
            : 'Notre équipe attend un document de votre part'}
        </strong>
        <p>
          Envoyez chaque document depuis la page du dossier concerné. Ce message disparaît dès que
          notre équipe a vérifié les pièces reçues.
        </p>
        <ul>
          {dossiers.map((dossier) => (
            <li key={dossier.reference}>
              <div>
                <strong>
                  {typeLabels[dossier.type]} · {dossier.reference}
                </strong>
                <span>{dossier.requests.map((request) => request.label).join(' · ')}</span>
              </div>
              <Link
                className="btn"
                href={`/mon-espace/dossiers/${dossier.reference}#ajouter-un-document`}
              >
                {dossier.requests.length > 1 ? 'Envoyer les documents' : 'Envoyer le document'}
                <ArrowRight size={17} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
