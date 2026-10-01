import { ServiceCards, Process, FinalCta } from '@/components/public';
import { PageBand } from '@/components/ui';
export const metadata = { title: 'Nos services' };
export default function Services() {
  return (
    <>
      <PageBand
        eyebrow="NOS EXPERTISES"
        title="Le bon accompagnement, au bon moment."
        text="Après un incendie ou avant d’assurer vos biens, une démarche technique adaptée à votre situation."
      />
      <section className="container section">
        <ServiceCards />
      </section>
      <Process />
      <FinalCta />
    </>
  );
}
