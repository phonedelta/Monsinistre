import { notFound } from 'next/navigation';
import { landings, readEditorial } from '@/lib/editorial';
import { currentUser } from '@/lib/auth';
import { Wizard } from '@/components/wizard';
import { ServiceCards } from '@/components/public';
import { EditorialSections } from '@/components/editorial';
import { ServiceVisual } from '@/components/visuals';
import { Reveal } from '@/components/reveal';
import { ButtonLink, PageBand } from '@/components/ui';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title:
      slug in landings
        ? landings[slug as keyof typeof landings].eyebrow
        : 'Accompagnement après incendie',
  };
}
export default async function Landing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === 'incendie')
    return (
      <>
        <PageBand
          eyebrow="APRÈS UN INCENDIE"
          title="Vous gérez l’imprévu. Nous renforçons votre dossier."
          text="Évaluation des dommages, expertise technique et accompagnement du dossier d’assurance. Choisissez le parcours correspondant à votre bien."
        />
        <section className="container section stack">
          <ServiceCards />
          <Reveal className="panel">
            <h2>Une autre situation ?</h2>
            <p>Décrivez-la à notre équipe pour étudier l’accompagnement adapté.</p>
            <ButtonLink href="/contact">Nous contacter</ButtonLink>
          </Reveal>
        </section>
      </>
    );
  if (!(slug in landings)) notFound();
  const key = slug as keyof typeof landings;
  const data = landings[key];
  const [sections, user] = await Promise.all([readEditorial(key), currentUser()]);
  return (
    <>
      <section className="hero-band">
        <div className="container landing-hero">
          <div className="enter">
            <span className="pill">
              <span className="small-dot" /> {data.eyebrow}
            </span>
            <h1>{data.title}</h1>
            <p>{data.intro}</p>
            <ButtonLink href="#demande" large>
              {data.cta}
            </ButtonLink>
          </div>
          <ServiceVisual kind={data.visual} />
        </div>
      </section>
      <EditorialSections sections={sections} />
      <Wizard
        type={data.type}
        profile={
          user?.role === 'CLIENT'
            ? { fullName: user.fullName, phone: user.phone, city: user.city }
            : undefined
        }
      />
    </>
  );
}
