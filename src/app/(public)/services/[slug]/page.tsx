import Link from 'next/link';
import { notFound } from 'next/navigation';
import { landings, readEditorial } from '@/lib/editorial';
import { currentUser } from '@/lib/auth';
import { Wizard } from '@/components/wizard';
import { ServiceCards } from '@/components/public';
import { EditorialSections } from '@/components/editorial';
import { ServiceVisual } from '@/components/visuals';
import { Reveal } from '@/components/reveal';
import { ButtonLink, PageBand } from '@/components/ui';
import { fr } from '@/lib/typography';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title:
      slug in landings
        ? landings[slug as keyof typeof landings].name
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
          title="Votre logement ou votre commerce a brûlé ?"
          text="Choisissez votre parcours : les questions du formulaire ne sont pas les mêmes pour une habitation et pour un commerce."
        />
        <section className="container section stack">
          <ServiceCards only={['incendie-habitation', 'incendie-magasins']} />
          <Reveal className="panel">
            <h2>Un autre type de bien&nbsp;?</h2>
            <p>Décrivez votre situation&nbsp;: nous vous dirons si nous pouvons intervenir.</p>
            <ButtonLink href="/contact">Nous contacter</ButtonLink>
          </Reveal>
        </section>
      </>
    );
  if (!(slug in landings)) notFound();
  const key = slug as keyof typeof landings;
  const data = landings[key];
  const [sections, user] = await Promise.all([readEditorial(key), currentUser()]);
  // A title made of two sentences shows the second one on its own line, as the accent.
  const cut = data.title.search(/(?<=[?.!]) /);
  const [title, accent] =
    cut < 0 ? [data.title, ''] : [data.title.slice(0, cut), data.title.slice(cut + 1)];
  return (
    <>
      <section className="hero-band">
        <div className="container landing-hero">
          <div className="enter">
            <nav className="breadcrumb" aria-label="Fil d’Ariane">
              <Link href="/services">Services</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{data.name}</span>
            </nav>
            <h1>
              {fr(title)}
              {accent && (
                <>
                  <br />
                  <em>{fr(accent)}</em>
                </>
              )}
            </h1>
            <p>{fr(data.intro)}</p>
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
