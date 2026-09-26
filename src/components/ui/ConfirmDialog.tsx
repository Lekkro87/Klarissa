import { TriangleAlert } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../state/store';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

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
  const tone = options?.tone ?? 'danger';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => close(false)}
        role="alertdialog"
        size="sm"
        title={options?.title ?? ''}
        description={options?.message}
        initialFocusRef={cancelRef}
        icon={
          tone === 'danger' ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger-ink">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
          ) : undefined
        }
        footer={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => close(false)}>
              {options?.cancelLabel ?? t.common.cancel}
            </Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
              {options?.confirmLabel ?? t.common.delete}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm muss innerhalb von ConfirmProvider verwendet werden.');
  return context;
}
