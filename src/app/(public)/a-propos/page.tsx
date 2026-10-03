import { Check } from 'lucide-react';
import { PageBand } from '@/components/ui';
import { FinalCta } from '@/components/public';
import { ServiceVisual } from '@/components/visuals';
import { Reveal } from '@/components/reveal';
export const metadata = { title: 'Notre approche' };
export default function About() {
  return (
    <>
      <PageBand
        eyebrow="À PROPOS"
        title="Des experts au service de l’assuré."
        text="Monsinistre accompagne au Maroc les particuliers et les professionnels après un incendie, et expertise les biens de valeur avant leur assurance."
      />
      <section className="container section">
        <div className="two-col about-intro">
          <ServiceVisual kind="methode" />
          <Reveal className="prose">
            <h2>Notre rôle</h2>
            <p>
              Après un incendie, nous examinons les dommages, évaluons les pertes et constituons le
              dossier technique qui servira dans vos échanges avec l’assurance.
            </p>
            <p>
              Avant une assurance, nous identifions et documentons la valeur de vos bijoux, montres,
              tableaux et objets de valeur.
            </p>
            <p>
              Chaque client dispose d’un espace en ligne pour suivre l’avancement, transmettre ses
              documents et échanger avec notre équipe.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section pale">
        <div className="container editorial-grid">
          <Reveal as="header" className="editorial-head">
            <span className="eyebrow">APRÈS UN INCENDIE</span>
            <h2>Quand pouvons-nous intervenir&nbsp;?</h2>
            <div className="prose">
              <p>L’examen est le plus utile tant que l’assurance n’a pas rendu sa décision.</p>
            </div>
          </Reveal>
          <div className="editorial-body">
            <Reveal as="ul" stagger className="check-list">
              {[
                'Le logement ou le commerce était assuré au moment de l’incendie.',
                'Le sinistre a été déclaré et le dossier est toujours en cours.',
                'L’assurance n’a pas encore rendu de décision définitive.',
              ].map((condition) => (
                <li key={condition}>
                  <Check size={20} />
                  <span>{condition}</span>
                </li>
              ))}
            </Reveal>
            <p>
              L’expertise préalable, elle, se demande à tout moment&nbsp;: avant d’assurer ou de
              renouveler une couverture, ou simplement pour connaître la valeur de vos biens.
            </p>
          </div>
        </div>
      </section>
      <FinalCta
        eyebrow="UN DOSSIER EN COURS ?"
        title={
          <>
            Votre assurance n’a pas
            <br />
            encore rendu sa décision&nbsp;?
          </>
        }
        text="Déposez votre demande en ligne depuis la page du service, ou écrivez-nous : nous étudions votre situation."
      />
    </>
  );
}
