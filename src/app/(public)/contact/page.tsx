import { FileSearch, Mail, MessageCircle, PenLine, Phone, PhoneCall } from 'lucide-react';
import { ActionForm } from '@/components/action-form';
import { contact } from '@/app/actions/dossiers';
import { PageBand } from '@/components/ui';
import { Reveal } from '@/components/reveal';
export const metadata = { title: 'Contact' };
export default function Contact() {
  return (
    <>
      <PageBand
        eyebrow="PARLONS DE VOTRE SITUATION"
        title="Un premier échange pour avancer."
        text="Décrivez votre besoin. Notre équipe examinera votre demande et vous recontactera."
      />
      <section className="container section">
        <div className="two-col contact-layout">
          <Reveal>
            <aside>
              <h2>Nous sommes à votre écoute.</h2>
              <p>
                Un sinistre, une question sur votre dossier ou des biens à faire évaluer :
                choisissez le service qui vous concerne.
              </p>
              <ol className="contact-steps">
                {(
                  [
                    [PenLine, 'Vous décrivez votre besoin'],
                    [FileSearch, 'Notre équipe examine votre demande'],
                    [PhoneCall, 'Nous vous recontactons'],
                  ] as const
                ).map(([Icon, t]) => (
                  <li key={t}>
                    <span>
                      <Icon size={19} strokeWidth={1.5} />
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="contact-links">
                {process.env.CONTACT_PHONE && (
                  <a href={`tel:${process.env.CONTACT_PHONE}`}>
                    <Phone size={18} strokeWidth={1.5} />
                    Téléphone : {process.env.CONTACT_PHONE}
                  </a>
                )}
                {process.env.CONTACT_WHATSAPP && (
                  <a href={`https://wa.me/${process.env.CONTACT_WHATSAPP.replace(/\D/g, '')}`}>
                    <MessageCircle size={18} strokeWidth={1.5} />
                    Échanger sur WhatsApp ↗
                  </a>
                )}
                {process.env.CONTACT_EMAIL && (
                  <a href={`mailto:${process.env.CONTACT_EMAIL}`}>
                    <Mail size={18} strokeWidth={1.5} />
                    {process.env.CONTACT_EMAIL}
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
