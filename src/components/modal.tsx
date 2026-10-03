'use client';
import { useEffect, useRef } from 'react';
/* A centred popup on the native <dialog>: while it is open the page behind is inert, focus
   stays inside and Escape or a click outside closes it. `locked` keeps it open while a
   request is being sent, `wide` gives it the room a picture needs. Styles: `.modal` in
   styles/components.css. */
export function Modal({
  open,
  onClose,
  labelledBy,
  locked = false,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  locked?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The dialog focuses its first field; `data-autofocus` names a better one.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal modal-wide' : 'modal'}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      onClick={(event) => {
        // The dialog has no padding: a click that lands on it is a click on the backdrop.
        if (event.target === event.currentTarget && !locked) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
