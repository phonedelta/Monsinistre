import { redirect, notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminDossiers, type Search } from '@/components/admin-dossiers';
import { DossierDetail } from '@/components/dossier-detail';
import { AdminClients } from '@/components/admin-clients';
import { AdminContact } from '@/components/admin-contact';
import { AdminSettings } from '@/components/admin-settings';
import { PortalDocuments } from '@/components/portal-documents';
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<Search>;
}) {
  const actor = await requireUser(['ADMIN', 'EXPERT']);
  const { segments = [] } = await params;
  const search = await searchParams;
  if (!segments.length) redirect('/admin/dashboard');
  if (segments[0] === 'dossiers' && segments.length === 2)
    return <DossierDetail reference={segments[1]} actor={actor} admin />;
  if (segments[0] === 'clients' && segments.length === 2) {
    await requireUser(['ADMIN']);
    return <AdminClients id={segments[1]} />;
  }
  if (segments.length !== 1) notFound();
  switch (segments[0]) {
    case 'dashboard':
      return <AdminDashboard actor={actor} />;
    case 'dossiers':
      return <AdminDossiers actor={actor} search={search} />;
    case 'documents':
      return <PortalDocuments actor={actor} />;
    case 'clients':
      await requireUser(['ADMIN']);
      return <AdminClients q={typeof search.q === 'string' ? search.q : ''} />;
    case 'demandes-contact':
      await requireUser(['ADMIN']);
      return <AdminContact />;
    case 'parametres':
      await requireUser(['ADMIN']);
      return <AdminSettings />;
    default:
      notFound();
  }
}
