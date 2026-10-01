import Link from 'next/link';
import { House, Store, Gem, Flame, ArrowUpRight, Check } from 'lucide-react';
import { Logo, SectionTitle, ButtonLink } from './ui';
import { Reveal } from './reveal';
export const services = [
  {
    slug: 'incendie',
    title: 'Après un incendie',
    text: 'Une analyse technique pour comprendre les dommages et renforcer votre dossier d’assurance.',
    icon: Flame,
    tag: 'ACCOMPAGNEMENT',
  },
  {
    slug: 'incendie-habitation',
    title: 'Votre habitation',
    text: 'Maison, villa ou appartement : identifier et documenter l’ensemble des dommages.',
    icon: House,
    tag: 'PARTICULIERS',
  },
  {
    slug: 'incendie-magasins',
    title: 'Votre commerce',
    text: 'Stock, équipements et locaux : une évaluation adaptée à la réalité de votre activité.',
    icon: Store,
    tag: 'PROFESSIONNELS',
  },
  {
    slug: 'expertise-prealable',
    title: 'Vos biens de valeur',
    text: 'Bijoux, montres et œuvres d’art : connaître leur valeur avant de les assurer.',
    icon: Gem,
    tag: 'EXPERTISE PRÉALABLE',
  },
];
export function ServiceCards() {
  return (
    <Reveal stagger className="service-grid">
      {services.map((s, i) => (
        <Link className="service-card" key={s.slug} href={`/services/${s.slug}`}>
          <div className="card-top">
            <span className="service-icon">
              <s.icon size={24} strokeWidth={1.5} />
            </span>
            <span>0{i + 1}</span>
          </div>
          <span className="eyebrow">{s.tag}</span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
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
        <SectionTitle
          eyebrow="UNE DÉMARCHE CLAIRE"
          title="À chaque étape, vous savez où vous en êtes."
        />
        <Reveal stagger className="process-grid">
          {[
            [
              'Parlons de votre situation',
              'Vous nous transmettez les premières informations grâce à un formulaire adapté.',
            ],
            [
              'Nous étudions votre dossier',
              'Notre équipe examine vos documents et précise les prochaines étapes.',
            ],
            [
              'Nous vous accompagnons',
              'Retrouvez vos échanges, vos documents et l’avancement dans votre espace.',
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
export function FinalCta() {
  return (
    <section className="section">
      <Reveal className="container final-cta">
        <div>
          <span className="eyebrow">FAISONS LE POINT, ENSEMBLE</span>
          <h2>
            Votre situation mérite
            <br />
            une expertise attentive.
          </h2>
          <p>Expliquez-nous votre besoin. Nous vous aidons à y voir plus clair.</p>
        </div>
        <ButtonLink href="/contact" large>
          Parler de ma situation
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
            L’expertise qui éclaire vos décisions.
            <br />
            L’accompagnement qui fait la différence.
          </p>
          <span className="footer-country">MAROC · PARTICULIERS & PROFESSIONNELS</span>
        </div>
        <div>
          <h4>Nos expertises</h4>
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>
              {s.title}
            </Link>
          ))}
        </div>
        <div>
          <h4>À vos côtés</h4>
          <Link href="/a-propos">À propos de Monsinistre</Link>
          <Link href="/contact">Nous contacter</Link>
          <Link href="/connexion">Mon espace client</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Monsinistre</span>
        <span>
          <Check size={14} /> Expertise · Rigueur · Transparence
        </span>
      </div>
    </footer>
  );
}
