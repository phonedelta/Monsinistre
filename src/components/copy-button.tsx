'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
/* Copies a dossier reference to the clipboard and says so for two seconds.
   `compact` is the icon-only form, for use next to the reference in a heading.
   "Copied" is only shown when the copy really happened. */
export function CopyButton({ value, compact = false }: { value: string; compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    let done = false;
    try {
      await navigator.clipboard.writeText(value);
      done = true;
    } catch {
      // No clipboard access (older browser, permission refused): copy from a hidden selection.
      // It is added next to the button, so that it also works inside an open popup.
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      button.current?.parentElement?.appendChild(area);
      area.select();
      try {
        done = document.execCommand('copy');
      } catch {
        done = false;
      }
      area.remove();
      button.current?.focus();
    }
    setStatus(done ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }
  const text =
    status === 'copied'
      ? compact
        ? 'Copié'
        : 'Référence copiée'
      : status === 'failed'
        ? 'Copie impossible'
        : compact
          ? ''
          : 'Copier la référence';
  return (
    <button
      ref={button}
      type="button"
      className="copy-button"
      data-compact={compact ? '' : undefined}
      data-status={status}
      onClick={copy}
      aria-label={status === 'idle' ? 'Copier la référence' : undefined}
      title={status === 'idle' ? 'Copier la référence' : undefined}
    >
      {status === 'copied' ? <Check size={16} /> : <Copy size={16} />}
      <span aria-live="polite">{text}</span>
    </button>
  );
}
