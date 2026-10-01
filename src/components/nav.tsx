'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight, UserRound } from 'lucide-react';
import { Logo } from './ui';
const links = [
  ['/', 'Accueil'],
  ['/services', 'Services'],
  ['/a-propos', 'À propos'],
  ['/contact', 'Contact'],
];
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // The header gains a border and a shadow once the page has moved under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <header className="public-header" data-scrolled={scrolled ? '' : undefined}>
      <div className="container nav-wrap">
        <Logo />
        <nav
          id="menu"
          className={open ? 'nav-links open' : 'nav-links'}
          aria-label="Navigation principale"
        >
          {links.map(([href, label]) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                onClick={() => setOpen(false)}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                href={href}
                key={href}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/connexion" className="nav-cta" aria-label="Suivre mon dossier">
          <UserRound className="cta-icon" size={18} />
          <span className="cta-label">Suivre mon dossier</span>
          <ArrowUpRight size={15} />
        </Link>
        <button
          className="menu-toggle"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
