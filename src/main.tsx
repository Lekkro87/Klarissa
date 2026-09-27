import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';
import './index.css';
import { STORAGE_KEY } from './lib/storage';
import { AppProvider } from './state/store';

/** Fängt unerwartete Fehler ab, damit die App nie komplett leer bleibt. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Klarissa – unerwarteter Fehler', error, info.componentStack);
  }

  private resetData = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) window.localStorage.setItem(`${STORAGE_KEY}.backup-${Date.now()}`, raw);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorieren */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
        <div className="card max-w-md p-8 text-center">
          <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Etwas ist schiefgelaufen</p>
          <p className="mt-2 text-[15px] text-muted">
            Die Anwendung ist auf einen unerwarteten Fehler gestoßen. Lade die Seite neu. Hilft das nicht, kannst du die
            gespeicherten Daten zurücksetzen – eine Sicherung bleibt im Browser erhalten.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary h-11 rounded-full px-5 font-semibold"
            >
              Neu laden
            </button>
            <button
              type="button"
              onClick={this.resetData}
              className="h-11 rounded-full bg-fill px-5 font-semibold text-primary-text hover:bg-fill-strong"
            >
              Daten zurücksetzen
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <AppProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </AppProvider>
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
