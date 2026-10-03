'use client';
import { useActionState } from 'react';
import type { ActionResult } from '@/lib/errors';
export function ActionForm({
  action,
  children,
  label = 'Enregistrer',
  className = '',
  secondary = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  label?: string;
  className?: string;
  secondary?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className={`form-stack ${className}`}>
      <fieldset disabled={pending}>{children}</fieldset>
      {state.error && (
        <p className="alert error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="alert success" role="status">
          {state.success}
        </p>
      )}
      {state.resetLink && (
        <div className="alert">
          <p>Lien valable 30 minutes. À transmettre au client après vérification.</p>
          <input aria-label="Lien de réinitialisation" readOnly value={state.resetLink} />
        </div>
      )}
      <button className={secondary ? 'btn btn-secondary' : 'btn'} disabled={pending} type="submit">
        {pending ? 'Enregistrement…' : label}
      </button>
    </form>
  );
}
