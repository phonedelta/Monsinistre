import { requireUser } from '@/lib/auth';
import { awaitedDocuments } from '@/lib/pending';
import { PortalShell } from '@/components/portal-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(['CLIENT']);
  // The red count of "Mes dossiers": the documents the team waits for from this client.
  const awaited = (await awaitedDocuments(user)).reduce(
    (sum, dossier) => sum + dossier.requests.length,
    0,
  );
  return (
    <PortalShell user={user} counts={{ '/mon-espace/dossiers': awaited }}>
      {children}
    </PortalShell>
  );
}
