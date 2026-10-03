'use client';
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, Eye, Upload, Trash2, X } from 'lucide-react';
import { documentCategories, documentTypes, fileSize } from '@/lib/constants';
import { Modal } from './modal';
import { PdfView } from './pdf-view';
import { FileIcon } from './ui';
/* Adds one file to a dossier. The file field covers the whole dashed zone without being seen:
   a click anywhere on the zone opens it, a file dropped on the zone is taken, and the zone then
   names the file that was chosen. */
export function UploadForm({ reference }: { reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className="form-stack upload-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setMessage('');
        try {
          const r = await fetch('/api/documents', { method: 'POST', body: new FormData(form) });
          const data = await r.json();
          setMessage(data.error || data.success);
          if (r.ok) {
            form.reset();
            setFile(null);
            router.refresh();
          }
        } catch {
          setMessage('Envoi interrompu. Réessayez.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <input type="hidden" name="reference" value={reference} />
        <label>
          Type de document
          <select name="category">
            {documentCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="upload-zone" data-chosen={file ? '' : undefined}>
          {file ? <FileIcon type={file.type} size={24} /> : <Upload size={24} />}
          <span>{file ? file.name : 'Joindre un document'}</span>
          <small>
            {file
              ? `${fileSize(file.size)} · choisir un autre fichier`
              : 'JPEG, PNG, WebP, PDF, MP4, MOV · 20 Mo maximum'}
          </small>
          <input
            aria-label="Fichier à joindre"
            name="file"
            type="file"
            accept={documentTypes.join(',')}
            required
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          />
        </label>
      </fieldset>
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
      )}
      <button className="btn btn-secondary" disabled={busy}>
        {busy ? 'Envoi en cours…' : 'Envoyer le document'}
      </button>
    </form>
  );
}
/* Shows a document of a dossier in a popup, with its download: a picture, a video in its
   player, a PDF in the site's own reader (pdf-view.tsx). The file is only fetched when the
   popup opens. It is a private file served as it is behind the session, hence the plain <img>:
   the image optimizer does not forward the session to fetch its source. `children` is the line
   under the name (who deposited the file, when). */
export function DocumentPreview({
  id,
  name,
  mime,
  children,
}: {
  id: string;
  name: string;
  mime: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'shown' | 'failed'>('loading');
  const title = useId();
  const source = `/api/documents/${id}?preview=1`;
  const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'pdf';
  return (
    <>
      <button
        type="button"
        className="text-link"
        onClick={() => {
          // The PDF reader shows its own progress, then its pages.
          setStatus(kind === 'pdf' ? 'shown' : 'loading');
          setOpen(true);
        }}
      >
        <Eye size={15} /> Visualiser
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={title} wide>
        {open && (
          <div className="viewer">
            <header>
              <div>
                <h2 id={title}>{name}</h2>
                {children && <p>{children}</p>}
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Fermer l’aperçu"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <figure data-status={status} data-kind={kind}>
              {status === 'loading' && <span className="spinner" aria-hidden="true" />}
              {status === 'failed' ? (
                <p role="alert">
                  {kind === 'pdf'
                    ? 'Ce PDF ne peut pas être affiché ici. Ouvrez-le dans un onglet, ou téléchargez-le.'
                    : kind === 'video'
                      ? 'Cette vidéo ne peut pas être lue dans ce navigateur. Vous pouvez la télécharger.'
                      : 'L’aperçu n’a pas pu être chargé. Vous pouvez télécharger le fichier.'}
                </p>
              ) : kind === 'image' ? (
                <img
                  src={source}
                  alt={name}
                  onLoad={() => setStatus('shown')}
                  onError={() => setStatus('failed')}
                />
              ) : kind === 'video' ? (
                <video
                  src={source}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={name}
                  onLoadedMetadata={() => setStatus('shown')}
                  onError={() => setStatus('failed')}
                />
              ) : (
                <PdfView source={source} onFailed={() => setStatus('failed')} />
              )}
            </figure>
            <footer>
              {kind === 'pdf' && (
                <a className="btn btn-secondary" href={source} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Ouvrir dans un onglet
                </a>
              )}
              <a className="btn" href={`/api/documents/${id}`}>
                <Download size={16} /> Télécharger
              </a>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </>
  );
}
export function DeleteDocument({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span>
      {confirm ? (
        <>
          <button
            disabled={busy}
            className="text-link danger"
            onClick={async () => {
              setBusy(true);
              try {
                const r = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                if (!r.ok) throw new Error();
                router.refresh();
              } catch {
                setError('Suppression impossible.');
              } finally {
                setBusy(false);
                setConfirm(false);
              }
            }}
          >
            Confirmer la suppression
          </button>
          <button className="text-link" onClick={() => setConfirm(false)}>
            Annuler
          </button>
        </>
      ) : (
        <button
          aria-label="Supprimer le document"
          className="icon-btn"
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={16} />
        </button>
      )}
      {error && <small role="alert">{error}</small>}
    </span>
  );
}
