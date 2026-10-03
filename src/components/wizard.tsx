'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, LockKeyhole, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { attachmentCategory, attachmentLimit, formSteps, type Field } from '@/lib/forms';
import { documentMaxSize, documentTypes, fileSize, submissionFailed } from '@/lib/constants';
import { fr } from '@/lib/typography';
import { submitDossier } from '@/app/actions/dossiers';
import { UploadForm } from './documents';
import { FileIcon } from './ui';
import { Modal } from './modal';
import { CopyButton } from './copy-button';
const sending = (
  <>
    <span className="spinner" aria-hidden="true" /> Envoi de votre demande…
  </>
);
// A file chosen in the form: the category it is filed under and, if so, why it was not sent.
type Attachment = { file: File; category: string; error?: string };
const joined = (count: number) =>
  count > 1
    ? `${count} documents ont été joints à votre dossier.`
    : 'Un document a été joint à votre dossier.';
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
  // The files chosen at the documents step, by option. They are sent once the dossier exists.
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [uploads, setUploads] = useState<{
    active: boolean;
    position: number;
    total: number;
    sent: number;
    failed: Attachment[];
  }>();
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
  // The sign-in popup: opened because the server found an account for this number
  // ('detected'), or by the person who says they already have one ('asked').
  const [account, setAccount] = useState<'detected' | 'asked' | null>(null);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [result, setResult] = useState<{ reference: string; success: string }>();
  const [dismissed, setDismissed] = useState(false);
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
  // After a submission the form gives way to a shorter confirmation: bring it into view.
  useEffect(() => {
    if (result) document.getElementById('demande')?.scrollIntoView();
  }, [result]);
  // Leaving the page while documents are being sent would drop the ones still to go.
  const uploading = uploads?.active;
  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);
  function update(field: Field, value: string) {
    setError('');
    setAnswers((old) => {
      if (!field.multiple) return { ...old, [field.key]: value };
      const chosen = (old[field.key] || []) as string[];
      return {
        ...old,
        [field.key]: chosen.includes(value)
          ? chosen.filter((v) => v !== value)
          : // "None" replaces the other choices, and any other choice replaces "none".
            value === field.none
            ? [value]
            : [...chosen.filter((v) => v !== field.none), value],
      };
    });
  }
  // The options of a documents question that take files: the chosen ones, "none" aside.
  const attachable = (field: Field) => {
    const chosen = answers[field.key];
    return field.attach && Array.isArray(chosen)
      ? field.options!.filter((option) => option !== field.none && chosen.includes(option))
      : [];
  };
  // What goes with the request: the files of the options that are still chosen.
  const attachments = (): Attachment[] =>
    formSteps[type]
      .flatMap((s) => s.fields)
      .flatMap(attachable)
      .flatMap((option) =>
        (files[option] || []).map((file) => ({
          file,
          category: attachmentCategory(option, file.type),
        })),
      );
  // Adds the files picked for an option, leaving out those the server would refuse anyway.
  function pick(option: string, picked: FileList | null) {
    const room = attachmentLimit - attachments().length;
    const kept: File[] = [];
    let refused = '';
    for (const file of Array.from(picked || [])) {
      const same = (f: File) =>
        f.name === file.name && f.size === file.size && f.lastModified === file.lastModified;
      if ((files[option] || []).some(same)) continue;
      if (!documentTypes.includes(file.type))
        refused = `« ${file.name} » : format non accepté (JPEG, PNG, WebP, PDF, MP4 ou MOV).`;
      else if (!file.size) refused = `« ${file.name} » est vide.`;
      else if (file.size > documentMaxSize) refused = `« ${file.name} » dépasse 20 Mo.`;
      else if (kept.length >= room)
        refused = `${attachmentLimit} fichiers au maximum. Vous pourrez en ajouter d’autres depuis votre dossier.`;
      else kept.push(file);
    }
    setFiles((old) => ({ ...old, [option]: [...(old[option] || []), ...kept] }));
    setError(fr(refused));
  }
  function unpick(option: string, index: number) {
    setError('');
    setFiles((old) => ({ ...old, [option]: old[option].filter((_, i) => i !== index) }));
  }
  /* Sends the chosen files to the dossier, which now exists, one at a time. A file that fails
     does not stop the others: the confirmation lists it, and it can be sent again from there. */
  async function attach(reference: string, queue: Attachment[], sent = 0) {
    const failed: Attachment[] = [];
    for (const [index, item] of queue.entries()) {
      setUploads({ active: true, position: index + 1, total: queue.length, sent, failed: [] });
      const body = new FormData();
      body.set('reference', reference);
      body.set('category', item.category);
      body.set('file', item.file);
      try {
        const response = await fetch('/api/documents', { method: 'POST', body });
        if (response.ok) sent++;
        else {
          const answer: { error?: string } | null = await response.json().catch(() => null);
          failed.push({ ...item, error: answer?.error || 'Envoi refusé.' });
        }
      } catch {
        failed.push({ ...item, error: 'Envoi interrompu.' });
      }
    }
    setUploads({ active: false, position: queue.length, total: queue.length, sent, failed });
  }
  /* Sends the request once. `signIn` is the popup's path: the request is added to the existing
     account after its password is checked. Nothing is shown as done before the server confirms
     that the dossier is saved; the same key makes a repeated send return the same dossier. */
  async function send(signIn: boolean) {
    if (locked.current) return;
    const report = signIn ? setAccountError : setError;
    locked.current = true;
    setBusy(true);
    report('');
    key.current ||= crypto.randomUUID();
    try {
      const response = await submitDossier({
        type,
        answers,
        person,
        password: signIn ? accountPassword : password,
        confirmPassword: signIn ? undefined : confirmPassword,
        submissionKey: key.current,
        authenticateExisting: signIn,
      });
      if (response.reference) {
        setResult({ reference: response.reference, success: response.success || '' });
        setAccount(null);
        setPassword('');
        setConfirm('');
        setAccountPassword('');
        const queue = attachments();
        if (queue.length) void attach(response.reference, queue);
      } else if (response.existingAccount && !signIn) setAccount('detected');
      else report(response.error || submissionFailed);
    } catch {
      report(submissionFailed);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function next(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    for (const field of steps[step].fields)
      if (!field.optional && (!answers[field.key] || answers[field.key].length === 0)) {
        setError(fr(`Veuillez répondre : ${field.label}`));
        return;
      }
    if (!last) {
      setStep(step + 1);
      requestAnimationFrame(() => heading.current?.focus());
      return;
    }
    if (!profile && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    void send(false);
  }
  // "I already have an account": the popup needs the number, and the request needs the rest.
  function askSignIn() {
    const ready =
      person.fullName.trim().length >= 3 &&
      person.city.trim().length >= 2 &&
      person.phone.trim() &&
      (type !== 'INCENDIE_COMMERCE' || person.businessName.trim());
    if (!ready) {
      setError('Renseignez d’abord votre nom, votre ville et votre téléphone.');
      return;
    }
    setError('');
    setAccountError('');
    setAccount('asked');
  }
  if (result)
    return (
      <section className="wizard-section" id="demande">
        <div className="container">
          <div className="wizard success-screen">
            <CheckCircle2 size={46} strokeWidth={1.5} />
            <span className="eyebrow">DEMANDE BIEN REÇUE</span>
            <h2>Nous avons votre dossier.</h2>
            <p>{result.success}</p>
            <div className="reference-box">{result.reference}</div>
            <CopyButton value={result.reference} />
            <Link href={`/mon-espace/dossiers/${result.reference}`} className="btn btn-lg">
              Suivre mon dossier <ArrowRight size={17} />
            </Link>
            <div className="panel">
              <h3>Compléter avec vos documents</h3>
              <p>
                {uploads?.sent
                  ? `${joined(uploads.sent)} Vous pouvez en ajouter d’autres.`
                  : 'Vous pouvez maintenant joindre les pièces disponibles.'}
              </p>
              <UploadForm reference={result.reference} />
            </div>
          </div>
        </div>
        <Modal
          open={!dismissed}
          onClose={() => setDismissed(true)}
          labelledBy="demande-envoyee"
          locked={uploading}
        >
          <div className="modal-body">
            <span className="success-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="44" height="44">
                <circle cx="24" cy="24" r="21" pathLength={1} />
                <path d="M15 24.5l6.5 6.5L33.5 18" pathLength={1} />
              </svg>
            </span>
            <h2 id="demande-envoyee">Votre demande a bien été envoyée</h2>
            <p>Votre dossier a été créé avec succès.</p>
            <div className="modal-reference">
              <small>Référence du dossier</small>
              <strong className="reference-box">{result.reference}</strong>
              <CopyButton value={result.reference} />
            </div>
            {uploads?.active ? (
              <div className="upload-progress" role="status">
                <strong>
                  <span className="spinner" aria-hidden="true" /> Envoi de vos documents…{' '}
                  {uploads.position} sur {uploads.total}
                </strong>
                <small>Gardez cette page ouverte jusqu’à la fin de l’envoi.</small>
              </div>
            ) : (
              <>
                {!!uploads?.sent && (
                  <p className="alert success" role="status">
                    {joined(uploads.sent)}
                  </p>
                )}
                {!!uploads?.failed.length && (
                  <div className="alert upload-failures" role="alert">
                    <strong>
                      {uploads.failed.length > 1
                        ? `${uploads.failed.length} documents n’ont pas pu être envoyés`
                        : 'Un document n’a pas pu être envoyé'}
                    </strong>
                    <ul>
                      {uploads.failed.map((item, index) => (
                        <li key={index}>
                          {item.file.name}
                          <small>{fr(item.error || '')}</small>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => void attach(result.reference, uploads.failed, uploads.sent)}
                    >
                      Réessayer l’envoi
                    </button>
                    <p>
                      Vous pourrez aussi {uploads.failed.length > 1 ? 'les ajouter' : 'l’ajouter'}{' '}
                      plus tard, depuis votre dossier.
                    </p>
                  </div>
                )}
                <p>
                  Vous pouvez maintenant suivre l’avancement de votre dossier depuis votre espace
                  client.
                </p>
                <div className="modal-actions">
                  <Link href={`/mon-espace/dossiers/${result.reference}`} className="btn btn-lg">
                    Voir mon dossier <ArrowRight size={17} />
                  </Link>
                  <Link href="/mon-espace" className="btn btn-secondary btn-lg">
                    Aller à mon espace
                  </Link>
                </div>
              </>
            )}
          </div>
        </Modal>
      </section>
    );
  return (
    <section className="wizard-section" id="demande">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">VOTRE DEMANDE</span>
          <h2>
            {type === 'EXPERTISE_PREALABLE'
              ? 'Demandez votre expertise préalable.'
              : 'Décrivez votre situation.'}
          </h2>
          <p>Vos réponses arrivent directement à notre équipe, qui vous recontacte.</p>
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
                    {fr(field.label)}
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
                  {attachable(field).length > 0 && (
                    <div className="attachments">
                      <p>
                        <strong>Joignez vos documents</strong>
                        Facultatif&nbsp;: vous pourrez aussi les ajouter plus tard, depuis votre
                        espace.
                      </p>
                      {attachable(field).map((option) => (
                        <div className="attachment" key={option}>
                          <label className="upload-zone">
                            <Paperclip size={18} />
                            <span>{option}</span>
                            <small>Ajouter des fichiers</small>
                            <input
                              type="file"
                              multiple
                              accept={documentTypes.join(',')}
                              aria-label={`Ajouter des fichiers (${option})`}
                              onChange={(e) => {
                                pick(option, e.target.files);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {!!files[option]?.length && (
                            <ul>
                              {files[option].map((file, index) => (
                                <li key={index}>
                                  <FileIcon type={file.type} />
                                  <span>{file.name}</span>
                                  <small>{fileSize(file.size)}</small>
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={`Retirer ${file.name}`}
                                    onClick={() => unpick(option, index)}
                                  >
                                    <X size={16} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                      <small>
                        JPEG, PNG, WebP, PDF, MP4 ou MOV · 20 Mo maximum par fichier ·{' '}
                        {attachmentLimit} fichiers au total
                      </small>
                    </div>
                  )}
                </fieldset>
              ))}
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
                          onChange={(e) => setPerson({ ...person, [k]: e.target.value })}
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
                          Votre téléphone sera votre identifiant. Choisissez un mot de passe pour
                          suivre votre dossier.
                        </p>
                      </div>
                      <label>
                        Mot de passe (12 caractères minimum)
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          minLength={12}
                          required
                        />
                      </label>
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
                      <button type="button" className="text-link" onClick={askSignIn}>
                        J’ai déjà un compte
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
                {busy ? (
                  sending
                ) : (
                  <>
                    {last
                      ? type === 'EXPERTISE_PREALABLE'
                        ? 'Envoyer ma demande d’expertise'
                        : type === 'INCENDIE_COMMERCE'
                          ? 'Envoyer mon dossier pour analyse'
                          : 'Faire examiner mon dossier'
                      : 'Continuer'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
          <div className="wizard-footer">
            <LockKeyhole size={14} /> Vos informations restent confidentielles.
          </div>
        </div>
      </div>
      <Modal
        open={account !== null}
        onClose={() => setAccount(null)}
        labelledBy="compte-existant"
        locked={busy}
      >
        <form
          className="modal-body form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void send(true);
          }}
        >
          <span className="modal-icon" aria-hidden="true">
            <LockKeyhole size={24} strokeWidth={1.75} />
          </span>
          <h2 id="compte-existant">
            {account === 'asked'
              ? 'Connectez-vous à votre compte'
              : 'Un compte existe déjà avec ce numéro'}
          </h2>
          <p>Connectez-vous pour déposer cette nouvelle demande sur votre compte existant.</p>
          <label>
            Téléphone
            <input type="tel" value={person.phone} autoComplete="username" readOnly />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
              required
              data-autofocus
            />
          </label>
          {accountError && (
            <p className="alert error" role="alert">
              {accountError}
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-lg" type="submit" disabled={busy}>
              {busy ? sending : 'Se connecter et envoyer ma demande'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => setAccount(null)}
            >
              Modifier mes informations
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
