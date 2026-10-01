import { requireUser } from '@/lib/auth';
import { PortalShell } from '@/components/portal-shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(['ADMIN', 'EXPERT']);
  return (
    <PortalShell user={user} admin>
      {children}
    </PortalShell>
  );
}
