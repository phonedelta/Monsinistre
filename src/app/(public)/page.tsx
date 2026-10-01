import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Droplets,
  Flame,
  FolderCheck,
  Handshake,
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
            <div className="pill">
              <span className="small-dot" /> Expertise indépendante · Maroc
            </div>
            <h1>
              Après l’imprévu,
              <br />
              retrouvez
              <br />
              <em>un cap clair.</em>
            </h1>
            <p>
              Évaluer les dommages. Comprendre vos options.
              <br className="desktop" /> Défendre la réalité de vos pertes.
              <br />
              Monsinistre est à vos côtés, à chaque étape.
            </p>
            <div className="hero-actions">
              <a className="btn btn-lg" href="#parcours">
                Trouver mon accompagnement <ArrowDown size={18} />
              </a>
              <Link className="text-link" href="/services">
                Découvrir nos services <ArrowRight size={17} />
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
            <div className="path-number">01 / APRÈS UN SINISTRE</div>
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
            <div className="path-number">02 / AVANT D’ASSURER</div>
            <h2>
              Je souhaite faire
              <br />
              évaluer mes biens.
            </h2>
            <p>Connaissez et documentez la valeur de ce qui vous est précieux.</p>
            <span>
              Demander une expertise préalable
              <span className="path-arrow">
                <ArrowUpRight size={20} />
              </span>
            </span>
          </Link>
        </Reveal>
        <Reveal stagger className="reassurance">
          {[
            [ShieldCheck, 'Une expertise technique'],
            [FolderCheck, 'Des pertes documentées'],
            [Handshake, 'Un suivi humain'],
          ].map(([Icon, t]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={String(t)}>
                <I size={22} strokeWidth={1.5} />
                <span>{String(t)}</span>
              </div>
            );
          })}
        </Reveal>
      </section>
      <section className="section pale">
        <div className="container">
          <Reveal className="section-row">
            <SectionTitle
              eyebrow="NOS DOMAINES D’INTERVENTION"
              title="Une expertise adaptée à votre situation."
            />
            <p>
              Chaque bien a ses particularités.
              <br />
              Chaque dossier mérite une attention précise.
            </p>
          </Reveal>
          <ServiceCards />
        </div>
      </section>
      <section className="section container approach">
        <Reveal>
          <span className="eyebrow">NOTRE ENGAGEMENT</span>
          <h2>
            Voir au-delà des dommages visibles.
            <br />
            <em>Faire valoir ce qui compte.</em>
          </h2>
          <p>
            La fumée, la chaleur, l’eau d’extinction : les conséquences d’un incendie ne s’arrêtent
            pas à ce qui a brûlé. Nous identifions, évaluons et documentons les pertes pour
            construire un dossier technique structuré.
          </p>
          <Link className="text-link" href="/a-propos">
            Découvrir notre approche <ArrowUpRight size={18} />
          </Link>
        </Reveal>
        <Reveal as="ul" stagger className="sources">
          {[
            [Flame, 'Le feu'],
            [Wind, 'La fumée'],
            [Thermometer, 'La chaleur'],
            [Droplets, 'L’extinction'],
            [Zap, 'Les installations'],
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
