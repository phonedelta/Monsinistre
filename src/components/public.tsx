import Link from 'next/link';
import { House, Store, Gem, Flame, ArrowUpRight } from 'lucide-react';
import { Logo, SectionTitle, ButtonLink } from './ui';
import { Reveal } from './reveal';
import { fr } from '@/lib/typography';
export const services = [
  {
    slug: 'incendie',
    title: 'Après un incendie',
    text: 'Une analyse technique pour comprendre les dommages et renforcer votre dossier d’assurance.',
    icon: Flame,
    tag: 'Accompagnement',
  },
  {
    slug: 'incendie-habitation',
    title: 'Votre habitation',
    text: 'Maison, villa ou appartement : identifier et documenter l’ensemble des dommages.',
    icon: House,
    tag: 'Particuliers',
  },
  {
    slug: 'incendie-magasins',
    title: 'Votre commerce',
    text: 'Stock, équipements et locaux : une évaluation adaptée à la réalité de votre activité.',
    icon: Store,
    tag: 'Professionnels',
  },
  {
    slug: 'expertise-prealable',
    title: 'Vos biens de valeur',
    text: 'Bijoux, montres et œuvres d’art : connaître leur valeur avant de les assurer.',
    icon: Gem,
    tag: 'Expertise préalable',
  },
];
// `only` keeps some of the services, by their address: the page about fires shows its two.
export function ServiceCards({ only }: { only?: string[] }) {
  const shown = only ? services.filter((s) => only.includes(s.slug)) : services;
  return (
    <Reveal stagger className={shown.length === 2 ? 'service-grid pair' : 'service-grid'}>
      {shown.map((s) => (
        <Link className="service-card" key={s.slug} href={`/services/${s.slug}`}>
          <div className="card-top">
            <span className="service-icon">
              <s.icon size={24} strokeWidth={1.5} />
            </span>
          </div>
          <span className="card-tag">{s.tag}</span>
          <h3>{s.title}</h3>
          <p>{fr(s.text)}</p>
          <span className="service-link">
            Découvrir l’accompagnement <ArrowUpRight size={17} />
          </span>
        </Link>
      ))}
    </Reveal>
  );
}
export function Process() {
  return (
    <section className="section pale">
      <div className="container">
        <SectionTitle eyebrow="COMMENT ÇA SE PASSE" title="De la demande au suivi en ligne." />
        <Reveal stagger className="process-grid">
          {[
            [
              'Vous décrivez votre situation',
              'Un formulaire par type de dossier, où vous joignez aussi vos photos et documents.',
            ],
            [
              'Nous étudions le dossier',
              'Nous vous disons ce que nous pouvons faire et quelles pièces il nous manque.',
            ],
            [
              'Vous suivez l’avancement',
              'Statut, documents demandés et messages de l’équipe : tout est dans votre espace.',
            ],
          ].map(([t, d], i) => (
            <article key={t}>
              <span className="step-no">0{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
// The invitation to write to the team that ends a page, worded for that page.
export function FinalCta({
  eyebrow = 'UNE QUESTION AVANT DE COMMENCER ?',
  title = (
    <>
      Parlez-nous
      <br />
      de votre situation.
    </>
  ),
  text = 'Décrivez-la en quelques lignes : nous vous recontactons pour vous dire si nous pouvons intervenir.',
  action = 'Nous contacter',
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  text?: string;
  action?: string;
}) {
  return (
    <section className="section">
      <Reveal className="container final-cta">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{fr(text)}</p>
        </div>
        <ButtonLink href="/contact" large>
          {action}
        </ButtonLink>
      </Reveal>
    </section>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p>
            Expertise après incendie
            <br />
            et expertise préalable des biens de valeur.
          </p>
          <span className="footer-country">MAROC · PARTICULIERS & PROFESSIONNELS</span>
        </div>
        <div>
          <h4>Services</h4>
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>
              {s.title}
            </Link>
          ))}
        </div>
        <div>
          <h4>Monsinistre</h4>
          <Link href="/a-propos">À propos de Monsinistre</Link>
          <Link href="/contact">Nous contacter</Link>
          <Link href="/connexion">Mon espace client</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Monsinistre</span>
        <span>
          Conçu et réalisé par{' '}
          <a href="https://thinkgroup.ma" target="_blank" rel="noopener">
            ThinkGroup
          </a>
        </span>
      </div>
    </footer>
  );
}
