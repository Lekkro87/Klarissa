import { createContext, type ReactNode, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../state/store';
import { useDialogBehavior } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hinweis-Dialog im Stil einer iOS-Warnung (zentriert, zwei Tasten). */
function AlertDialog({ options, onResult }: { options: ConfirmOptions; onResult: (result: boolean) => void }) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  useDialogBehavior(true, panelRef, () => onResult(false), cancelRef);
  const danger = (options.tone ?? 'danger') === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-6">
      <div className="animate-fade absolute inset-0 bg-[var(--backdrop)]" aria-hidden="true" onMouseDown={() => onResult(false)} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="animate-pop material relative w-[min(100%,300px)] overflow-hidden rounded-[16px] text-center shadow-pop outline-none"
      >
        <div className="px-5 pb-4 pt-5">
          <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {options.title}
          </h2>
          <div id={messageId} className="mt-1.5 text-[13px] leading-snug text-ink-2">
            {options.message}
          </div>
        </div>
        <div className="grid grid-cols-2 shadow-[inset_0_0.5px_0_var(--separator)]">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onResult(false)}
            className={`h-11 text-[17px] text-primary-text transition-colors hover:bg-fill active:bg-fill-strong ${danger ? 'font-semibold' : ''}`}
          >
            {options.cancelLabel ?? t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => onResult(true)}
            className={`h-11 text-[17px] shadow-[inset_0.5px_0_0_var(--separator)] transition-colors hover:bg-fill active:bg-fill-strong ${
              danger ? 'text-danger-ink' : 'font-semibold text-primary-text'
            }`}
          >
            {options.confirmLabel ?? t.common.delete}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {options && <AlertDialog options={options} onResult={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm muss innerhalb von ConfirmProvider verwendet werden.');
  return context;
}
