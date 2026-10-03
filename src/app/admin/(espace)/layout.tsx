import { requireUser } from '@/lib/auth';
import { pendingCounts } from '@/lib/pending';
import { PortalShell } from '@/components/portal-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(['ADMIN', 'EXPERT']);
  return (
    <PortalShell user={user} admin counts={await pendingCounts(user)}>
      {children}
    </PortalShell>
  );
}
