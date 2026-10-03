import { connection } from 'next/server';
import Link from 'next/link';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { contact } from '@/app/actions/dossiers';
import { PageBand } from '@/components/ui';
import { Reveal } from '@/components/reveal';
import { dialable, envContact, siteContact } from '@/lib/settings';
export const metadata = { title: 'Contact' };
export default async function Contact() {
  // The contact details are edited in the administration settings: read them on each request,
  // not once at build time. If they cannot be read, the page still shows the environment values.
  await connection();
  const details = await siteContact().catch(envContact);
  return (
    <>
      <PageBand
        eyebrow="CONTACT"
        title="Écrivez-nous."
        text="Décrivez votre situation : notre équipe vous recontacte pour en parler."
      />
      <section className="container section">
        <div className="two-col contact-layout">
          <Reveal>
            <aside>
              <h2>Un dossier d’assurance en cours&nbsp;?</h2>
              <p>
                Vous pouvez aussi déposer votre demande depuis la page du service concerné&nbsp;:
                son formulaire nous transmet directement vos réponses et vos documents.
              </p>
              <Link className="text-link" href="/services">
                Voir les services →
              </Link>
              <div className="contact-links">
                {details.phone && (
                  <a href={`tel:${dialable(details.phone)}`}>
                    <Phone size={18} strokeWidth={1.5} />
                    Téléphone&nbsp;: {details.phone}
                  </a>
                )}
                {details.whatsapp && (
                  <a href={`https://wa.me/${dialable(details.whatsapp).replace(/\D/g, '')}`}>
                    <MessageCircle size={18} strokeWidth={1.5} />
                    Échanger sur WhatsApp ↗
                  </a>
                )}
                {details.email && (
                  <a href={`mailto:${details.email}`}>
                    <Mail size={18} strokeWidth={1.5} />
                    {details.email}
                  </a>
                )}
              </div>
              <p className="small">
                Votre demande reste confidentielle et est transmise à l’équipe Monsinistre.
              </p>
            </aside>
          </Reveal>
          <div className="panel contact-panel">
            <ActionForm action={contact} label="Envoyer ma demande">
              <div className="field-grid">
                <label>
                  Nom et prénom
                  <input
                    name="fullName"
                    autoComplete="name"
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  Téléphone
                  <input name="phone" type="tel" autoComplete="tel" required />
                </label>
                <label>
                  Email <small>(facultatif)</small>
                  <input name="email" type="email" autoComplete="email" />
                </label>
                <label>
                  Ville
                  <input name="city" autoComplete="address-level2" required minLength={2} />
                </label>
              </div>
              <label>
                Service souhaité
                <select name="service" required>
                  <option value="">Choisir un service</option>
                  {[
                    'Incendie habitation',
                    'Incendie commerce',
                    'Expertise préalable',
                    'Autre demande',
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Description de la demande
                <textarea name="description" rows={5} required minLength={10} maxLength={5000} />
              </label>
              <div className="honeypot" aria-hidden="true">
                <label>
                  Site web
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </ActionForm>
          </div>
        </div>
      </section>
    </>
  );
}
