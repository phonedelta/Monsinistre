import { Eye, Handshake, Ruler, Scale, ScanSearch } from 'lucide-react';
import { PageBand, SectionTitle } from '@/components/ui';
import { FinalCta } from '@/components/public';
import { ServiceVisual } from '@/components/visuals';
import { Reveal } from '@/components/reveal';
export const metadata = { title: 'Notre approche' };
export default function About() {
  return (
    <>
      <PageBand
        eyebrow="À PROPOS DE MONSINISTRE"
        title="De la rigueur technique. De la présence humaine."
        text="Notre mission : vous aider à comprendre, documenter et défendre la réalité de votre situation."
      />
      <section className="container section">
        <div className="two-col about-intro">
          <ServiceVisual kind="methode" />
          <Reveal className="prose">
            <h2>Une expertise au service de l’assuré.</h2>
            <p>
              Monsinistre accompagne les particuliers et les professionnels au Maroc dans
              l’évaluation technique des dommages et la constitution de leurs dossiers après un
              incendie.
            </p>
            <p>
              Nous intervenons également avant l’assurance, pour identifier et documenter la valeur
              des bijoux, montres, tableaux et autres biens précieux.
            </p>
            <p>
              Notre approche repose sur l’étude des faits, l’analyse des pièces et un échange clair
              à chaque étape. Vous disposez d’un espace personnel pour suivre votre dossier et
              communiquer avec notre équipe.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section pale">
        <div className="container">
          <Reveal>
            <SectionTitle
              eyebrow="NOS PRINCIPES"
              title="Une mission claire, des engagements concrets."
            />
          </Reveal>
          <Reveal stagger className="feature-grid wide">
            {(
              [
                [
                  ScanSearch,
                  'Expertise',
                  'Examiner les dommages et les biens avec une approche technique adaptée.',
                ],
                [
                  Ruler,
                  'Rigueur',
                  'Identifier, évaluer et documenter les éléments de façon méthodique.',
                ],
                [
                  Eye,
                  'Transparence',
                  'Rendre les étapes, les demandes de documents et les échanges accessibles.',
                ],
                [
                  Handshake,
                  'Accompagnement',
                  'Vous aider à gérer les aspects techniques de votre dossier.',
                ],
                [
                  Scale,
                  'Défense des intérêts de l’assuré',
                  'Faire en sorte que les pertes réellement subies soient correctement représentées.',
                ],
              ] as const
            ).map(([Icon, t, d]) => (
              <article className="feature" key={t}>
                <span className="feature-icon">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
