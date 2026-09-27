import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../state/store';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  kind?: ToastKind;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Anzeigedauer in Millisekunden */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'kind' | 'message' | 'duration'>> {
  id: number;
  title?: string;
  action?: ToastOptions['action'];
}

interface ToastApi {
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

const ToastApiContext = createContext<ToastApi | null>(null);
const ToastStateContext = createContext<ToastState | null>(null);

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    const item: ToastItem = {
      id,
      kind: options.kind ?? 'success',
      title: options.title,
      message: options.message,
      action: options.action,
      duration: options.duration ?? (options.action ? 6500 : options.kind === 'error' ? 6000 : 3800),
    };
    setToasts((current) => [...current.filter((toast) => toast.message !== item.message), item].slice(-MAX_TOASTS));
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const state = useMemo(() => ({ toasts, dismiss }), [toasts, dismiss]);

  return (
    <ToastApiContext.Provider value={api}>
      <ToastStateContext.Provider value={state}>{children}</ToastStateContext.Provider>
    </ToastApiContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastApiContext);
  if (!context) throw new Error('useToast muss innerhalb von ToastProvider verwendet werden.');
  return context;
}

const ICONS = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info } as const;

/* Farbige Symbolkreise wie in iOS-Mitteilungen */
const TONES: Record<ToastKind, string> = {
  success: 'bg-income',
  error: 'bg-danger',
  warning: 'bg-serious',
  info: 'bg-primary',
};

function ToastCard({ toast, dismiss }: { toast: ToastItem; dismiss: (id: number) => void }) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const Icon = ICONS[toast.kind];
  const onDismiss = () => dismiss(toast.id);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [paused, toast.duration, toast.id, dismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className="animate-toast material pointer-events-auto flex w-full items-center gap-3 rounded-[22px] py-2.5 pl-2.5 pr-1.5 text-[15px] shadow-pop sm:w-[400px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-white ${TONES[toast.kind]}`} aria-hidden="true">
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        {toast.title && <p className="font-semibold text-ink">{toast.title}</p>}
        <p className={toast.title ? 'text-[14px] text-ink-2' : 'text-ink'}>{toast.message}</p>
      </div>
      {toast.action && (
        <button
          type="button"
          className="shrink-0 rounded-full px-3 py-1.5 text-[15px] font-semibold text-primary-text hover:bg-fill"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-fill hover:text-ink"
        aria-label={t.toasts.dismiss}
        title={t.toasts.dismiss}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Rendert die Toasts – muss innerhalb des I18n-Kontexts liegen. */
export function ToastViewport() {
  const context = useContext(ToastStateContext);
  if (!context) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] sm:px-6 sm:pt-4"
    >
      {context.toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} dismiss={context.dismiss} />
      ))}
    </div>
  );
}
