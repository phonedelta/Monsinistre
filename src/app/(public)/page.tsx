import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Droplets,
  Flame,
  ShieldCheck,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { ServiceCards, Process, FinalCta } from '@/components/public';
import { HeroVisual } from '@/components/visuals';
import { Reveal } from '@/components/reveal';
import { SectionTitle } from '@/components/ui';
export default function Home() {
  return (
    <>
      <section className="hero-band">
        <div className="hero container">
          <div className="hero-copy enter">
            <p className="hero-kicker">Expertise indépendante au Maroc</p>
            <h1>
              Après un incendie,
              <br />
              un expert
              <br />
              <em>de votre côté.</em>
            </h1>
            <p>
              Nous évaluons les dommages d’un logement ou d’un commerce incendié et préparons le
              dossier technique pour votre assurance. Nous expertisons aussi les biens de valeur
              avant leur assurance.
            </p>
            <div className="hero-actions">
              <a className="btn btn-lg" href="#parcours">
                Choisir ma situation <ArrowDown size={18} />
              </a>
              <Link className="text-link" href="/services">
                Voir les services <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={18} />
              <span>Pour les particuliers et les professionnels</span>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>
      <section className="section container" id="parcours">
        <Reveal stagger className="paths">
          <Link className="path-card dark" href="/services/incendie">
            <div className="card-tag">Après un sinistre</div>
            <h2>
              J’ai subi
              <br />
              un sinistre.
            </h2>
            <p>Faites examiner vos dommages et votre dossier d’assurance.</p>
            <span>
              Faire examiner mon dossier
              <span className="path-arrow">
                <ArrowUpRight size={20} />
              </span>
            </span>
          </Link>
          <Link className="path-card soft" href="/services/expertise-prealable">
            <div className="card-tag">Avant d’assurer</div>
            <h2>
              Je souhaite faire
              <br />
              évaluer mes biens.
            </h2>
            <p>
              Bijoux, montres, œuvres d’art&nbsp;: faites établir leur valeur avant de les assurer.
            </p>
            <span>
              Demander une expertise préalable
              <span className="path-arrow">
                <ArrowUpRight size={20} />
              </span>
            </span>
          </Link>
        </Reveal>
      </section>
      <section className="section pale">
        <div className="container">
          <Reveal className="section-row">
            <SectionTitle eyebrow="NOS SERVICES" title="Un parcours pour chaque situation." />
            <p>Chaque parcours a son formulaire, avec les questions propres à votre cas.</p>
          </Reveal>
          <ServiceCards />
        </div>
      </section>
      <section className="section container approach">
        <Reveal>
          <span className="eyebrow">CE QUE NOUS EXAMINONS</span>
          <h2>
            Un incendie abîme
            <br />
            <em>plus que ce qui a brûlé.</em>
          </h2>
          <p>
            La fumée gagne les pièces voisines, la chaleur fragilise l’électricité, l’eau des
            pompiers abîme les plafonds. Ces dommages passent facilement inaperçus&nbsp;: nous les
            recherchons et les documentons pour votre dossier.
          </p>
          <Link className="text-link" href="/a-propos">
            En savoir plus sur Monsinistre <ArrowUpRight size={18} />
          </Link>
        </Reveal>
        <Reveal as="ul" stagger className="sources">
          {[
            [Flame, 'Le feu'],
            [Wind, 'La fumée'],
            [Thermometer, 'La chaleur'],
            [Droplets, 'L’eau d’extinction'],
            [Zap, 'L’électricité'],
          ].map(([Icon, t]) => {
            const I = Icon as typeof Flame;
            return (
              <li key={String(t)}>
                <span>
                  <I size={20} strokeWidth={1.5} />
                </span>
                {String(t)}
                <Check size={18} />
              </li>
            );
          })}
        </Reveal>
      </section>
      <Process />
      <FinalCta />
    </>
  );
}
