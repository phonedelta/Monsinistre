import Form from 'next/form';
import Link from 'next/link';
import { FolderOpen, Search } from 'lucide-react';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { dossierScope, type Actor } from '@/lib/auth';
import { date, fileSize, time, typeLabels } from '@/lib/constants';
import { Badge, Empty, FileIcon, PageHeading } from './ui';
import { DocumentPreview } from './documents';
import type { Search as Query } from './admin-dossiers';
const formats: Record<string, string> = {
  'image/jpeg': 'Image JPEG',
  'image/png': 'Image PNG',
  'image/webp': 'Image WebP',
  'application/pdf': 'PDF',
  'video/mp4': 'Vidéo MP4',
  'video/quicktime': 'Vidéo MOV',
};
const teamRoles = { CLIENT: 'Client', ADMIN: 'Équipe · administrateur', EXPERT: 'Équipe · expert' };
// Without case nor accents: "expert" finds "Expertise", "reinitialise" finds "réinitialisé".
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
/* The files a person may see, dossier by dossier, the dossier that received a file last first.
   The team reads who deposited each file; a client reads "Vous" or the team, never the name of
   a team member. Any file opens in a popup and can be downloaded. The team can search: every
   word typed must be found in the file (name, category, format, depositor) or in its dossier
   (reference, service, client, phone, business name). */
export async function PortalDocuments({ actor, search = {} }: { actor: Actor; search?: Query }) {
  const staff = actor.role !== 'CLIENT';
  const base = staff ? '/admin' : '/mon-espace';
  const q = staff && typeof search.q === 'string' ? search.q.trim().slice(0, 100) : '';
  const words = fold(q).split(/\s+/).filter(Boolean);
  const all = await db.dossier.findMany({
    where: { ...dossierScope(actor), documents: { some: {} } },
    select: {
      id: true,
      reference: true,
      type: true,
      status: true,
      businessName: true,
      user: { select: { fullName: true, phone: true } },
      documents: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, fullName: true, role: true } } },
      },
    },
  });
  const dossiers = all
    .map((dossier) => {
      const about = [
        dossier.reference,
        typeLabels[dossier.type],
        dossier.user.fullName,
        dossier.user.phone,
        dossier.user.phone.replace('+212', '0'),
        dossier.businessName || '',
      ];
      return {
        ...dossier,
        total: dossier.documents.length,
        documents: dossier.documents.filter((d) => {
          const text = fold(
            [...about, d.name, d.category, formats[d.mime] || '', d.author.fullName].join(' '),
          );
          return words.every((word) => text.includes(word));
        }),
      };
    })
    .filter((dossier) => dossier.documents.length)
    .sort((a, b) => b.documents[0].createdAt.getTime() - a.documents[0].createdAt.getTime());
  const found = dossiers.reduce((sum, dossier) => sum + dossier.documents.length, 0);
  const depositor = (author: { id: string; fullName: string; role: Role }) =>
    staff
      ? author.fullName
      : author.id === actor.id
        ? 'Vous'
        : author.role === 'CLIENT'
          ? author.fullName
          : 'Équipe Monsinistre';
  return (
    <>
      <PageHeading
        eyebrow="BIBLIOTHÈQUE PRIVÉE"
        title={staff ? 'Documents' : 'Mes documents'}
        text={
          staff
            ? 'Les pièces de chaque dossier : qui les a déposées, et quand.'
            : 'Les pièces de chacun de vos dossiers, réunies dans un espace sécurisé.'
        }
      />
      {staff && all.length > 0 && (
        <Form className="search-bar" action="/admin/documents" role="search">
          <span className="folder-icon">
            <Search size={18} />
          </span>
          <input
            key={q}
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Nom de fichier, client, référence, téléphone…"
            aria-label="Rechercher dans les documents"
          />
          <button className="btn">Rechercher</button>
          {q && (
            <Link className="text-link" href="/admin/documents">
              Effacer
            </Link>
          )}
        </Form>
      )}
      {q && found > 0 && (
        <p className="search-result" role="status">
          {found > 1 ? `${found} fichiers` : '1 fichier'} dans{' '}
          {dossiers.length > 1 ? `${dossiers.length} dossiers` : '1 dossier'} pour «&nbsp;{q}
          &nbsp;»
        </p>
      )}
      {!dossiers.length ? (
        q ? (
          <Empty
            title="Aucun document trouvé"
            text={`Rien ne correspond à « ${q} ». Essayez un autre nom de fichier, un client ou une référence.`}
          />
        ) : (
          <Empty
            title="Aucun document disponible"
            text={
              staff
                ? 'Les pièces déposées par les clients et par l’équipe apparaîtront ici.'
                : 'Ouvrez un dossier pour ajouter les premières pièces.'
            }
          />
        )
      ) : (
        dossiers.map((dossier) => (
          <section className="dossier-files" key={dossier.id}>
            <header>
              <span className="folder-icon">
                <FolderOpen size={20} />
              </span>
              <div>
                <h2>
                  <Link href={`${base}/dossiers/${dossier.reference}`}>{dossier.reference}</Link>
                </h2>
                <p>
                  {typeLabels[dossier.type]}
                  {staff && ` · ${dossier.user.fullName}`} ·{' '}
                  {dossier.documents.length < dossier.total
                    ? `${dossier.documents.length} sur ${dossier.total} fichiers`
                    : dossier.total > 1
                      ? `${dossier.total} fichiers`
                      : '1 fichier'}
                </p>
              </div>
              <Badge status={dossier.status} />
            </header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {['Document', 'Déposé par', 'Date', 'Actions'].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dossier.documents.map((d) => (
                    <tr key={d.id}>
                      <td data-label="Document">
                        <span className="file-name">
                          <FileIcon type={d.mime} size={18} />
                          <strong>{d.name}</strong>
                        </span>
                        <small>
                          {d.category} · {formats[d.mime] || d.mime} · {fileSize(d.size)}
                        </small>
                      </td>
                      <td data-label="Déposé par">
                        {depositor(d.author)}
                        {staff && <small>{teamRoles[d.author.role]}</small>}
                      </td>
                      <td data-label="Date">
                        {date(d.createdAt)}
                        <small>à {time(d.createdAt)}</small>
                      </td>
                      <td>
                        <div className="row-actions">
                          <DocumentPreview id={d.id} name={d.name} mime={d.mime}>
                            {d.category} · {fileSize(d.size)} · déposé par{' '}
                            {staff || d.author.id !== actor.id ? depositor(d.author) : 'vous'} le{' '}
                            {date(d.createdAt)} à {time(d.createdAt)}
                          </DocumentPreview>
                          <a className="text-link" href={`/api/documents/${d.id}`}>
                            Télécharger ↓
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
