'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import { formSteps, type Field } from '@/lib/forms';
import { submitDossier } from '@/app/actions/dossiers';
import { UploadForm } from './documents';
export function Wizard({
  type,
  profile,
}: {
  type: string;
  profile?: { fullName: string; phone: string; city: string };
}) {
  const steps = [...formSteps[type], { title: 'Vos informations', fields: [] }];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [person, setPerson] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    businessName: '',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(false);
  const [result, setResult] = useState<{ reference: string; success: string }>();
  const key = useRef<string | null>(null);
  const locked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const last = step === steps.length - 1;
  // The page is streamed: when it is opened on #demande the form does not exist yet at load,
  // so the browser cannot scroll to it. Do it once the form is there.
  useEffect(() => {
    if (window.location.hash === '#demande')
      document.getElementById('demande')?.scrollIntoView({ behavior: 'instant' });
  }, []);
  function update(field: Field, value: string) {
    setAnswers((old) => ({
      ...old,
      [field.key]: field.multiple
        ? ((old[field.key] || []) as string[]).includes(value)
          ? ((old[field.key] || []) as string[]).filter((v) => v !== value)
          : [...((old[field.key] || []) as string[]), value]
        : value,
    }));
  }
  async function next(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    for (const field of steps[step].fields)
      if (!field.optional && (!answers[field.key] || answers[field.key].length === 0)) {
        setError(`Veuillez répondre : ${field.label}`);
        return;
      }
    if (!last) {
      setStep(step + 1);
      requestAnimationFrame(() => heading.current?.focus());
      return;
    }
    if (locked.current) return;
    if (!profile && !existing && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    locked.current = true;
    setBusy(true);
    key.current ||= crypto.randomUUID();
    try {
      const response = await submitDossier({
        type,
        answers,
        person,
        password,
        confirmPassword,
        submissionKey: key.current,
        authenticateExisting: existing,
      });
      if (response.existingAccount) setExisting(true);
      if (response.error) setError(response.error);
      else if (response.reference) {
        setResult({ reference: response.reference, success: response.success || '' });
        setPassword('');
        setConfirm('');
      }
    } catch {
      setError('Connexion interrompue. Vos réponses sont conservées dans cette page. Réessayez.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="wizard success-screen" id="demande">
        <CheckCircle2 size={46} />
        <span className="eyebrow">DEMANDE BIEN REÇUE</span>
        <h2>Nous avons votre dossier.</h2>
        <p>{result.success}</p>
        <div className="reference-box">{result.reference}</div>
        <Link href={`/mon-espace/dossiers/${result.reference}`} className="btn">
          Suivre mon dossier <ArrowRight size={17} />
        </Link>
        <div className="panel">
          <h3>Compléter avec vos documents</h3>
          <p>Vous pouvez maintenant joindre les pièces disponibles.</p>
          <UploadForm reference={result.reference} />
        </div>
      </section>
    );
  return (
    <section className="wizard-section" id="demande">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">VOTRE DEMANDE, PAS À PAS</span>
          <h2>
            {type === 'EXPERTISE_PREALABLE'
              ? 'Demandez votre expertise préalable.'
              : 'Faisons le point sur votre dossier.'}
          </h2>
          <p>Quelques informations pour comprendre votre situation et préparer notre échange.</p>
        </div>
        <div className="wizard">
          <ol className="wizard-progress">
            {steps.map((s, i) => (
              <li key={s.title} className={i === step ? 'current' : i < step ? 'complete' : ''}>
                <span>{i < step ? '✓' : i + 1}</span>
                <small>{s.title}</small>
              </li>
            ))}
          </ol>
          <form onSubmit={next}>
            {/* The key replays the entrance of the content at each step. */}
            <fieldset disabled={busy} className="wizard-step" key={step}>
              <div className="wizard-title">
                <span className="eyebrow">
                  ÉTAPE {step + 1} SUR {steps.length}
                </span>
                <h3 ref={heading} tabIndex={-1}>
                  {steps[step].title}
                </h3>
              </div>
              {steps[step].fields.map((field) => (
                <fieldset className="question" key={field.key}>
                  <legend>
                    {field.label}
                    {field.optional && <small> (facultatif)</small>}
                  </legend>
                  {field.options ? (
                    <div className="choices">
                      {field.options.map((value) => (
                        <label
                          className={`choice ${(field.multiple ? (answers[field.key] || []).includes(value) : answers[field.key] === value) ? 'selected' : ''}`}
                          key={value}
                        >
                          <input
                            type={field.multiple ? 'checkbox' : 'radio'}
                            name={field.key}
                            checked={
                              field.multiple
                                ? (answers[field.key] || []).includes(value)
                                : answers[field.key] === value
                            }
                            onChange={() => update(field, value)}
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      aria-label={field.label}
                      type={field.kind || 'text'}
                      value={answers[field.key] || ''}
                      max={
                        field.kind === 'date' ? new Date().toISOString().slice(0, 10) : undefined
                      }
                      onChange={(e) => update(field, e.target.value)}
                      required={!field.optional}
                    />
                  )}
                </fieldset>
              ))}
              {steps[step].title === 'Documents' && (
                <p className="alert">
                  Vous pourrez joindre vos fichiers après l’enregistrement de votre dossier, dans
                  votre espace sécurisé.
                </p>
              )}
              {answers.insured === 'Non' && step === 1 && (
                <p className="alert">
                  Cet accompagnement concerne principalement les biens assurés. Votre demande sera
                  tout de même enregistrée et examinée par notre équipe.
                </p>
              )}
              {last && (
                <div className="form-stack">
                  <div className="field-grid">
                    {(['fullName', 'city', 'phone'] as const).map((k) => (
                      <label key={k}>
                        {
                          {
                            fullName: 'Nom et prénom',
                            city: 'Ville',
                            phone: 'Téléphone / WhatsApp',
                          }[k]
                        }
                        <input
                          name={k}
                          type={k === 'phone' ? 'tel' : 'text'}
                          autoComplete={
                            { fullName: 'name', city: 'address-level2', phone: 'tel' }[k]
                          }
                          value={person[k]}
                          required
                          minLength={k === 'fullName' ? 3 : 2}
                          maxLength={120}
                          readOnly={k === 'phone' && !!profile}
                          onChange={(e) => {
                            setPerson({ ...person, [k]: e.target.value });
                            if (k === 'phone') setExisting(false);
                          }}
                        />
                      </label>
                    ))}
                    {type === 'INCENDIE_COMMERCE' && (
                      <label>
                        Nom du commerce
                        <input
                          value={person.businessName}
                          onChange={(e) => setPerson({ ...person, businessName: e.target.value })}
                          required
                          maxLength={160}
                        />
                      </label>
                    )}
                  </div>
                  {!profile && (
                    <>
                      <div className="account-info">
                        <LockKeyhole size={19} />
                        <p>
                          {existing
                            ? 'Connectez-vous ici : vos réponses seront ajoutées à votre compte.'
                            : 'Votre téléphone sera votre identifiant. Choisissez un mot de passe pour suivre votre dossier.'}
                        </p>
                      </div>
                      <label>
                        {existing
                          ? 'Mot de passe de votre compte'
                          : 'Mot de passe (12 caractères minimum)'}
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={existing ? 'current-password' : 'new-password'}
                          minLength={existing ? 1 : 12}
                          required
                        />
                      </label>
                      {!existing && (
                        <label>
                          Confirmation du mot de passe
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            minLength={12}
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setExisting(!existing)}
                      >
                        {existing ? 'Créer un nouveau compte' : 'J’ai déjà un compte'}
                      </button>
                    </>
                  )}
                  <p className="small">
                    Vos informations sont utilisées pour examiner votre demande.{' '}
                    <Link href="/confidentialite">En savoir plus</Link>.
                  </p>
                </div>
              )}
            </fieldset>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="wizard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={step === 0 || busy}
                onClick={() => {
                  setStep(step - 1);
                  setError('');
                }}
              >
                <ArrowLeft size={16} /> Retour
              </button>
              <button className="btn" type="submit" disabled={busy}>
                {busy
                  ? 'Enregistrement…'
                  : last
                    ? type === 'EXPERTISE_PREALABLE'
                      ? 'Envoyer ma demande d’expertise'
                      : type === 'INCENDIE_COMMERCE'
                        ? 'Envoyer mon dossier pour analyse'
                        : 'Faire examiner mon dossier'
                    : 'Continuer'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
          <div className="wizard-footer">
            <LockKeyhole size={14} /> Vos informations restent confidentielles.
          </div>
        </div>
      </div>
    </section>
  );
}
