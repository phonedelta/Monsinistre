'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// A link of the portal's side menu, marked as current on its section and the pages under it.
// `label` replaces what is read aloud when the link carries a count.
export function PortalLink({
  href,
  label,
  children,
}: {
  href: string;
  label?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/mon-espace' && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={active ? 'active' : ''}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      {children}
    </Link>
  );
}
