# Klarissa – Budget-Tracker

Klarissa ist eine moderne, vollständig funktionsfähige Budget-Tracker-Webanwendung. Sie läuft komplett im Browser, speichert alle Daten lokal (`localStorage`) und funktioniert auf Desktop, Laptop, Tablet und Smartphone.

## Funktionen

- **Einrichtung beim ersten Start**: Du gibst deinen aktuellen Kontostand an (Pflicht, auch negativ möglich), wählst die Währung und optional deinen Namen. Danach startest du mit deinen eigenen Daten oder mit Beispieldaten zum Ausprobieren. Der Kontostand ergibt sich aus Startguthaben + Einnahmen − Ausgaben und lässt sich in den Einstellungen jederzeit korrigieren.
- **Dashboard**: Kontostand, Einnahmen, Ausgaben und Sparquote mit Vergleich zum Vormonat, Diagramm „Einnahmen & Ausgaben“ (6 oder 12 Monate), Ausgaben nach Kategorie, Monatsvergleich, Budgetübersicht, letzte Transaktionen und Sparziele. Alle Werte werden live aus den gespeicherten Daten berechnet.
- **Transaktionen**: Einnahmen und Ausgaben hinzufügen, bearbeiten und löschen (mit Bestätigung und „Rückgängig“). Suche nach Beschreibung, Kategorie, Zahlungsmethode oder Betrag. Die Filter für Zeitraum (inkl. benutzerdefiniert), Typ, Kategorie und Zahlungsmethode lassen sich kombinieren. Sortierung nach Datum oder Betrag. Auf Mobilgeräten erscheint eine Kartenansicht, bei vielen Einträgen eine Seitennavigation.
- **Budget**: Monatliche Budgets pro Kategorie plus ein Monatsbudget. Fortschrittsbalken und dezente Warnungen bei 75 %, 90 %, 100 % und bei Überschreitung (auch als Hinweis direkt beim Erfassen einer Ausgabe und in der Benachrichtigungsglocke). Budgets lassen sich aus dem Vormonat übernehmen.
- **Statistiken**: Zeiträume 7 Tage, 30 Tage, 6 und 12 Monate. Verlauf der Einnahmen, der Ausgaben und des Kontostands, Donut-Diagramme nach Kategorie, größte Ausgaben sowie durchschnittliche monatliche und tägliche Ausgaben.
- **Sparziele**: Ziele erstellen, bearbeiten, löschen und Beträge einzahlen oder entnehmen. Fortschritt, Zieldatum und die nötige Sparrate pro Monat werden angezeigt.
- **Einstellungen**: Name, Kontostand korrigieren, Währung (EUR, USD, GBP, CHF), Erscheinungsbild (Hell, Dunkel, System), Sprache (Deutsch, Englisch), Datenexport und -import (JSON), Demo-Daten zurücksetzen, alle Daten löschen.

Weitere Eigenschaften:

- Kategorien für Einnahmen (z. B. Gehalt, Nebenjob) und Ausgaben (z. B. Wohnen, Lebensmittel, Restaurants, Transport)
- Optionale, realistische Beispieldaten der letzten 12 Monate
- Leere Zustände, Formularvalidierung und Toast-Benachrichtigungen
- Beschädigte Daten im Speicher werden erkannt und bereinigt, die App stürzt nicht ab
- Barrierefreiheit: semantisches HTML, Labels, Tastaturbedienung (Taste `/` fokussiert die Suche, `Esc` schließt Dialoge), sichtbare Fokusrahmen und ARIA-Attribute

## Benutzung

### Direkt im Browser öffnen

```bash
npm install
npm run build
```

Der Build erzeugt eine einzige, eigenständige Datei: `dist/index.html`. Sie lässt sich per Doppelklick im Browser öffnen, ohne Server. Sie kann auch auf jedem statischen Hosting veröffentlicht werden.

### Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver mit Hot Reload
npm test           # Unit-Tests der Rechen- und Datenlogik
npm run typecheck  # TypeScript-Prüfung
```

### Veröffentlichen mit GitHub Pages

1. Im Repository unter **Settings → Pages** als Quelle **GitHub Actions** wählen.
2. Unter **Actions → Deploy to GitHub Pages → Run workflow** die Veröffentlichung starten.

## Technik

- React 19, TypeScript, Vite
- Tailwind CSS 4 mit Design-Tokens (CSS-Variablen) für das helle und das dunkle Schema
- Recharts für Diagramme und lucide-react für Icons
- Vitest für Unit-Tests

## Projektstruktur

```text
src/
  App.tsx                 App-Hülle: Navigation, Header, Seiten, globale Dialoge
  state/store.tsx         Zentraler Zustand, Validierung, localStorage-Synchronisierung
  lib/                    Reine Logik: Berechnungen, Datum, Beträge, Filter, Speicher, Demo-Daten
  i18n/                   Texte auf Deutsch und Englisch
  pages/                  Dashboard, Transaktionen, Budget, Statistiken, Sparziele, Einstellungen
  components/
    layout/               Sidebar, mobiles Menü, Header mit Suche und Benachrichtigungen
    transactions/         Formular-Modal, Filterleiste, Liste/Tabelle
    budget/               Budgetkarten, Budget-Modal, Warntexte
    goals/                Sparziel-Karten und -Dialoge
    charts/               Balken-, Flächen- und Donut-Diagramme
    dashboard/            Kennzahlen-Karten
    onboarding/           Einrichtung mit Kontostand-Abfrage beim ersten Start
    ui/                   Button, Card, Modal, ConfirmDialog, Toast, EmptyState, ProgressBar …
```

## Datenmodell

```text
Transaktion: id, type, amount, category, description, date, paymentMethod, createdAt
Budget:      id, category, amount, month, year
Sparziel:    id, name, targetAmount, currentAmount, deadline, createdAt, color
Konto:       openingBalance (Startguthaben)
```

Alle Beträge werden intern centgenau summiert, damit keine Rundungsfehler entstehen.
