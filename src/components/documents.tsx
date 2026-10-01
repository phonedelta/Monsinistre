'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2 } from 'lucide-react';
import { documentCategories } from '@/lib/constants';
export function UploadForm({ reference }: { reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
        <label className="upload-zone">
          <Upload size={24} />
          <span>Joindre un document</span>
          <small>JPEG, PNG, WebP, PDF, MP4, MOV · 20 Mo maximum</small>
          <input
            aria-label="Fichier à joindre"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime"
            required
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
