import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['dashboard', 'transactions', 'budget', 'statistics', 'goals', 'settings'] as const;
export type Route = (typeof ROUTES)[number];

const isRoute = (value: string): value is Route => (ROUTES as readonly string[]).includes(value);

function readHash(): Route | null {
  const value = window.location.hash.replace(/^#\/?/, '');
  return isRoute(value) ? value : null;
}

/**
 * Einfache Hash-Navigation (#dashboard, #transactions, …).
 * Funktioniert ohne Server-Konfiguration – auch beim direkten Öffnen der Datei.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => readHash() ?? 'dashboard');

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    setRoute(next);
    try {
      if (readHash() !== next) window.location.hash = next;
    } catch {
      /* In eingeschränkten Umgebungen bleibt die Navigation rein lokal. */
    }
  }, []);

  return [route, navigate];
}
