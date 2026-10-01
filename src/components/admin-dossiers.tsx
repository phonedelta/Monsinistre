import { Prisma, DossierType, DossierStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { dossierScope, type Actor } from '@/lib/auth';
import { statusLabels, typeLabels, date } from '@/lib/constants';
import { Badge, Empty, PageHeading } from './ui';
import Link from 'next/link';
export type Search = Record<string, string | string[] | undefined>;
export async function AdminDossiers({ actor, search }: { actor: Actor; search: Search }) {
  const str = (key: string) =>
    typeof search[key] === 'string' ? (search[key] as string).slice(0, 200) : '';
  const q = str('q'),
    status = str('status'),
    type = str('type'),
    city = str('city'),
    assignedTo = str('assignedTo'),
    from = str('from'),
    to = str('to');
  const sort = str('sort');
  const page = Math.max(1, Math.min(100000, Number(str('page')) || 1));
  const where: Prisma.DossierWhereInput = {
    ...dossierScope(actor),
    ...(status in statusLabels ? { status: status as DossierStatus } : {}),
    ...(type in typeLabels ? { type: type as DossierType } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    ...(actor.role === 'ADMIN' && assignedTo
      ? { assignedTo: assignedTo === 'none' ? null : assignedTo }
      : {}),
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(from) && !Number.isNaN(Date.parse(from)))
    where.createdAt = { gte: new Date(from) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(to) && !Number.isNaN(Date.parse(to)))
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      lt: new Date(new Date(to).getTime() + 86400000),
    };
  if (q)
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { phone: { contains: q.replace(/^0/, '+212').replace(/\s/g, '') } } },
      { businessName: { contains: q, mode: 'insensitive' } },
    ];
  const [rows, count, staff] = await Promise.all([
    db.dossier.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy:
        sort === 'oldest'
          ? { createdAt: 'asc' }
          : sort === 'reference'
            ? { reference: 'asc' }
            : { updatedAt: 'desc' },
      take: 15,
      skip: (page - 1) * 15,
    }),
    db.dossier.count({ where }),
    db.user.findMany({
      where: { role: { in: ['ADMIN', 'EXPERT'] } },
      select: { id: true, fullName: true },
    }),
  ]);
  const pageLink = (p: number) => {
    const query = new URLSearchParams();
    Object.entries(search).forEach(([k, v]) => {
      if (typeof v === 'string') query.set(k, v);
    });
    query.set('page', String(p));
    return `/admin/dossiers?${query}`;
  };
  return (
    <>
      <PageHeading
        eyebrow="GESTION OPÉRATIONNELLE"
        title="Dossiers"
        text={`${count} dossier${count > 1 ? 's' : ''} correspondant à vos critères`}
      />
      <form className="panel filters" method="get">
        <label className="search-field">
          Rechercher
          <input name="q" defaultValue={q} placeholder="Référence, client, téléphone, commerce…" />
        </label>
        <label>
          Service
          <select name="type" defaultValue={type}>
            <option value="">Tous les services</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Statut
          <select name="status" defaultValue={status}>
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ville
          <input name="city" defaultValue={city} placeholder="Toutes les villes" />
        </label>
        {actor.role === 'ADMIN' && (
          <label>
            Responsable
            <select name="assignedTo" defaultValue={assignedTo}>
              <option value="">Tous</option>
              <option value="none">Non assigné</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Du
          <input name="from" type="date" defaultValue={from} />
        </label>
        <label>
          Au
          <input name="to" type="date" defaultValue={to} />
        </label>
        <label>
          Trier par
          <select name="sort" defaultValue={sort}>
            <option value="recent">Dernière mise à jour</option>
            <option value="oldest">Plus anciens</option>
            <option value="reference">Référence</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="btn">Appliquer</button>
          <Link href="/admin/dossiers">Réinitialiser</Link>
        </div>
      </form>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Dossier / service',
                  'Client / téléphone',
                  'Ville',
                  'Statut',
                  'Créé le',
                  'Responsable',
                  'Mis à jour',
                  'Action',
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td data-label="Dossier">
                    <strong>{d.reference}</strong>
                    <small>
                      {typeLabels[d.type]}
                      {d.businessName && ` · ${d.businessName}`}
                    </small>
                  </td>
                  <td data-label="Client">
                    {d.user.fullName}
                    <small>{d.user.phone}</small>
                  </td>
                  <td data-label="Ville">{d.city}</td>
                  <td data-label="Statut">
                    <Badge status={d.status} />
                  </td>
                  <td data-label="Création">{date(d.createdAt)}</td>
                  <td data-label="Responsable">{d.assignee?.fullName || 'Non assigné'}</td>
                  <td data-label="Mise à jour">{date(d.updatedAt)}</td>
                  <td>
                    <Link className="text-link" href={`/admin/dossiers/${d.reference}`}>
                      Ouvrir ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Aucun dossier trouvé" text="Essayez d’autres critères de recherche." />
      )}
      <nav className="pagination" aria-label="Pagination">
        {page > 1 && <Link href={pageLink(page - 1)}>← Précédent</Link>}
        <span>
          Page {page} · {count} résultats
        </span>
        {page * 15 < count && <Link href={pageLink(page + 1)}>Suivant →</Link>}
      </nav>
    </>
  );
}
