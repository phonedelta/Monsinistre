import { db } from '@/lib/db';
import { dossierScope, type Actor } from '@/lib/auth';
import { date } from '@/lib/constants';
import { Empty, PageHeading } from './ui';
import Link from 'next/link';
export async function PortalDocuments({ actor }: { actor: Actor }) {
  const docs = await db.dossierDocument.findMany({
    where: { dossier: dossierScope(actor) },
    include: { dossier: { select: { reference: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const base = actor.role === 'CLIENT' ? '/mon-espace' : '/admin';
  return (
    <>
      <PageHeading
        eyebrow="BIBLIOTHÈQUE PRIVÉE"
        title={actor.role === 'CLIENT' ? 'Mes documents' : 'Documents'}
        text="Les pièces de vos dossiers, réunies dans un espace sécurisé."
      />
      {!docs.length ? (
        <Empty
          title="Aucun document disponible"
          text="Ouvrez un dossier pour ajouter les premières pièces."
        />
      ) : (
        <div className="panel document-list">
          {docs.map((d) => (
            <div className="document-row" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <small>
                  {d.category} · {date(d.createdAt)} · {Math.ceil(d.size / 1024)} Ko
                </small>
                <Link href={`${base}/dossiers/${d.dossier.reference}`}>{d.dossier.reference}</Link>
              </div>
              <a className="text-link" href={`/api/documents/${d.id}`}>
                Télécharger ↓
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
