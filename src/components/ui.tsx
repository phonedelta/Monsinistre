import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, ArrowRight } from 'lucide-react';
import { statusLabels } from '@/lib/constants';
import logo from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';
// `light` is the white-wordmark version, for navy backgrounds.
// The height comes from the --logo-height token; `sizes` tells the browser how wide it gets.
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="Monsinistre — accueil">
      <Image src={light ? logoLight : logo} alt="" sizes="240px" loading="eager" />
    </Link>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
  large = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
  large?: boolean;
}) {
  return (
    <Link
      className={`btn${secondary ? ' btn-secondary' : ''}${large ? ' btn-lg' : ''}`}
      href={href}
    >
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
export function Badge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
export function Empty({
  title = 'Aucun élément pour le moment',
  text = 'Les nouveaux éléments apparaîtront ici.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <ShieldCheck size={32} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
type Heading = {
  eyebrow?: string;
  title: string;
  text?: string;
  children?: React.ReactNode;
};
export function PageHeading({
  eyebrow,
  title,
  text,
  children,
  enter = false,
}: Heading & { enter?: boolean }) {
  return (
    <div className="page-heading">
      <div className={enter ? 'enter' : undefined}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}
// The heading of a public page, on its soft band.
export function PageBand(props: Heading) {
  return (
    <section className="page-band">
      <div className="container">
        <PageHeading {...props} enter />
      </div>
    </section>
  );
}
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
