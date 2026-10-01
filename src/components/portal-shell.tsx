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
import { logout } from '@/app/actions/auth';
import type { Actor } from '@/lib/auth';
import { RefreshData } from './refresh-data';
import { PortalLink } from './portal-link';
export function PortalShell({
  user,
  admin,
  children,
}: {
  user: Actor;
  admin?: boolean;
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
            return (
              <PortalLink key={String(href)} href={String(href)}>
                <I size={19} strokeWidth={1.75} />
                {String(label)}
              </PortalLink>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{user.fullName.charAt(0)}</div>
          <strong>{user.fullName}</strong>
          <small>{user.phone}</small>
          <form action={logout}>
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
            <form action={logout} className="mobile-logout">
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
