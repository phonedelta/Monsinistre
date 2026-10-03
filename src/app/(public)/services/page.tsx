import { ServiceCards, FinalCta } from '@/components/public';
import { PageBand } from '@/components/ui';
export const metadata = { title: 'Nos services' };
export default function Services() {
  return (
    <>
      <PageBand
        eyebrow="NOS SERVICES"
        title="Après un incendie, ou avant d’assurer."
        text="Une habitation ou un commerce incendié, des bijoux ou des œuvres à faire évaluer : choisissez le parcours qui vous concerne."
      />
      <section className="container section">
        <ServiceCards />
      </section>
      <FinalCta
        eyebrow="UNE AUTRE SITUATION ?"
        title={
          <>
            Votre cas n’entre dans
            <br />
            aucun de ces parcours&nbsp;?
          </>
        }
        text="Décrivez-le-nous : nous vous dirons si nous pouvons vous aider."
        action="Nous écrire"
      />
    </>
  );
}
