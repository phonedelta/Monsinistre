import Link from 'next/link';
import type { Dossier } from '@prisma/client';
import { ArrowUpRight, FolderOpen } from 'lucide-react';
import { date, typeLabels } from '@/lib/constants';
import { Badge, Empty } from './ui';
export function DossierCards({
  dossiers,
  admin = false,
}: {
  dossiers: (Dossier & { user?: { fullName: string; phone: string } })[];
  admin?: boolean;
}) {
  if (!dossiers.length)
    return admin ? (
      <Empty title="Aucun dossier pour le moment" text="Les nouvelles demandes apparaîtront ici." />
    ) : (
      <Empty
        title="Votre prochain dossier commence ici"
        text="Déposez une demande pour retrouver son avancement et vos échanges dans cet espace."
      />
    );
  return (
    <div className="dossier-cards">
      {dossiers.map((d) => (
        <article className="panel dossier-card" key={d.id}>
          <div className="card-top">
            <span className="folder-icon">
              <FolderOpen size={23} />
            </span>
            <Badge status={d.status} />
          </div>
          <span className="eyebrow">{d.reference}</span>
          <h3>{typeLabels[d.type]}</h3>
          {d.user && (
            <p className="dossier-client">
              {d.user.fullName} · {d.user.phone}
            </p>
          )}
          <p>
            {d.city}
            {d.businessName ? ` · ${d.businessName}` : ''}
          </p>
          <div className="dossier-dates">
            <span>Créé le {date(d.createdAt)}</span>
            <span>Mis à jour le {date(d.updatedAt)}</span>
          </div>
          <Link
            href={`/${admin ? 'admin' : 'mon-espace'}/dossiers/${d.reference}`}
            className="text-link"
          >
            {admin ? 'Ouvrir le dossier' : 'Voir mon dossier'}
            <ArrowUpRight size={17} />
          </Link>
        </article>
      ))}
    </div>
  );
}
