import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../state/store';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Stapel offener Dialoge – nur der oberste reagiert auf Escape und Tab. */
const openStack: string[] = [];
let scrollLocks = 0;

function lockScroll() {
  scrollLocks += 1;
  if (scrollLocks === 1) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  }
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

/** Hält den Fokus im Dialog und schließt ihn mit Escape. */
export function useDialogBehavior(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const stackId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openStack.push(stackId);
    lockScroll();

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = initialFocusRef?.current ?? panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
      target.focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== stackId) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      const index = openStack.lastIndexOf(stackId);
      if (index !== -1) openStack.splice(index, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, stackId, panelRef, initialFocusRef]);
}

export interface ModalConfirm {
  label: string;
  /** ID eines Formulars, das beim Klick abgeschickt wird */
  form?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Primäraktion rechts in der Titelleiste (z. B. „Sichern“) */
  confirm?: ModalConfirm;
  cancelLabel?: string;
  /** Zusätzlicher Bereich unter dem Inhalt (z. B. „Löschen“) */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Sheet im iOS-Stil: Titelleiste mit „Abbrechen“ links, Titel in der Mitte
 * und der Hauptaktion rechts. Auf dem Smartphone gleitet es von unten ein.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirm,
  cancelLabel,
  footer,
  size = 'md',
  initialFocusRef,
}: ModalProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useDialogBehavior(open, panelRef, onClose, initialFocusRef);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-[var(--backdrop)]" aria-hidden="true" onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`animate-sheet sm:animate-pop relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[16px] bg-surface shadow-pop outline-none sm:rounded-[16px] ${WIDTHS[size]}`}
      >
        <div className="mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full bg-fill-strong sm:hidden" aria-hidden="true" />
        <div className="grid h-[52px] shrink-0 grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-center gap-1 px-2 shadow-[inset_0_-0.5px_0_var(--separator)]">
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="justify-self-start whitespace-nowrap rounded-full px-2 py-1.5 text-[17px] text-primary-text transition-colors hover:bg-fill active:opacity-60 sm:px-3"
          >
            {cancelLabel ?? t.common.cancel}
          </button>
          <h2 id={titleId} className="truncate px-1 text-center text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {confirm ? (
            <button
              type={confirm.form ? 'submit' : 'button'}
              form={confirm.form}
              onClick={confirm.onClick}
              disabled={confirm.disabled}
              className="justify-self-end whitespace-nowrap rounded-full px-2 py-1.5 text-[17px] font-semibold text-primary-text transition-colors hover:bg-fill active:opacity-60 disabled:opacity-35 sm:px-3"
            >
              {confirm.label}
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-5 sm:px-6 sm:pb-6">
          {description && (
            <div id={descriptionId} className="mb-5 text-[15px] text-muted">
              {description}
            </div>
          )}
          {children}
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
