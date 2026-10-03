import Link from 'next/link';
import {
  LayoutDashboard,
  FolderOpen,
  Files,
  UserRound,
  UsersRound,
  Settings,
  Inbox,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { Logo } from './ui';
import { logout, staffLogout } from '@/app/actions/auth';
import type { Actor } from '@/lib/auth';
import { RefreshData } from './refresh-data';
import { PortalLink } from './portal-link';
// `counts` is what waits on each page, by its address: a red count at the right of its button.
export function PortalShell({
  user,
  admin,
  counts = {},
  children,
}: {
  user: Actor;
  admin?: boolean;
  counts?: Record<string, number>;
  children: React.ReactNode;
}) {
  const links = admin
    ? [
        ['/admin/dashboard', 'Vue d’ensemble', LayoutDashboard],
        ['/admin/dossiers', 'Dossiers', FolderOpen],
        ...(user.role === 'ADMIN'
          ? [
              ['/admin/clients', 'Clients', UsersRound],
              ['/admin/demandes-contact', 'Demandes de contact', Inbox],
            ]
          : []),
        ['/admin/documents', 'Documents', Files],
        ...(user.role === 'ADMIN' ? [['/admin/parametres', 'Paramètres', Settings]] : []),
      ]
    : [
        ['/mon-espace', 'Vue d’ensemble', LayoutDashboard],
        ['/mon-espace/dossiers', 'Mes dossiers', FolderOpen],
        ['/mon-espace/documents', 'Mes documents', Files],
        ['/mon-espace/profil', 'Mon profil', UserRound],
      ];
  const signOut = admin ? staffLogout : logout;
  return (
    <div className="portal">
      <aside className="sidebar">
        <Logo light />
        <span className="sidebar-label">
          {admin ? (user.role === 'EXPERT' ? 'ESPACE EXPERT' : 'ADMINISTRATION') : 'ESPACE CLIENT'}
        </span>
        <nav aria-label="Navigation de l’espace">
          {links.map(([href, label, Icon]) => {
            const I = Icon as typeof FolderOpen;
            const count = counts[String(href)] || 0;
            return (
              <PortalLink
                key={String(href)}
                href={String(href)}
                label={count ? `${label} (${count} à traiter)` : undefined}
              >
                <I size={19} strokeWidth={1.75} />
                {String(label)}
                {count > 0 && <b className="nav-badge">{count > 99 ? '99+' : count}</b>}
              </PortalLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{user.fullName.charAt(0)}</div>
          <strong>{user.fullName}</strong>
          <small>{user.username ?? user.phone}</small>
          <form action={signOut}>
            <button>
              <LogOut size={16} /> Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-top">
          <span>
            <span className="small-dot" />{' '}
            {admin ? 'Gestion des dossiers' : 'Votre accompagnement, en toute transparence'}
          </span>
          <div className="portal-top-actions">
            <Link href="/">
              Site public <ArrowUpRight size={14} />
            </Link>
            <form action={signOut} className="mobile-logout">
              <button aria-label="Déconnexion">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="portal-content">
          {children}
        </main>
        <div className="portal-bottom">Monsinistre · Votre espace sécurisé</div>
      </div>
      <RefreshData />
    </div>
  );
}
