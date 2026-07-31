# Navigation und Modulstruktur

## Hauptnavigation

Die Hauptnavigation ist dauerhaft auf wenige Arbeits- und Verwaltungsbereiche begrenzt:

- **Übersicht**: personenbezogenes operatives Dashboard
- **Mandanten**: gezielter Mandanteneinstieg
- **Rechnungswesen**: laufendes Rechnungswesen, Jahresabschluss und Statusübersicht
- **FiBu ↔ Lohn**: Abstimmungen, offene Lohnrückfragen und Fahrzeuge
- **Ordo Campus**: Wissensübersicht und aufgabenbezogenes Kanzleiwissen
- **Verwaltung**: zentrale fachliche Grundlagen, Benutzer und Rechte, Daten und Import sowie Systeminformationen

Die Einträge werden aus den aktiven Rollen und Zusatzberechtigungen des angemeldeten Benutzers abgeleitet. Mehrfachrollen erzeugen keine doppelten Menüpunkte.

## Rechnungswesen

Innerhalb des Moduls stehen die Reiter **Laufendes Rechnungswesen**, **Jahresabschluss** und **Statusübersicht** zur Verfügung. Ein reiner Lohnsachbearbeiter sieht diese Daten nicht.

## FiBu ↔ Lohn

Das Modul enthält **Abstimmungen**, **Offene Lohnrückfragen** und **Fahrzeuge**. Die zentrale Themenpflege ist keine Monatsbearbeitung und liegt deshalb unter **Verwaltung → Fachliche Grundlagen → FiBu-Lohn-Themen**.

## Ordo Campus

Ordo Campus bleibt in der Hauptnavigation, weil es im Arbeitsalltag gelesen und durchsucht wird. Berechtigte Pflegeeinstiege führen direkt zur jeweiligen Standardaufgabe. Verwaltung ist kein verpflichtender Umweg.

## Verwaltung

Die Reiter **Fachliche Grundlagen**, **Benutzer und Rechte**, **Daten und Import** und **System** erscheinen nur, wenn der Benutzer dort mindestens eine Funktion verwenden darf. Der erste zulässige Reiter ist die Standardansicht. Details stehen in `docs/VERWALTUNGSSTRUKTUR.md`.

Mandantenspezifische Aufgaben bleiben primär beim Mandanten. Die zentrale Verwaltungsübersicht unterstützt Suche, Filterung und Qualitätskontrolle, aber keine losgelöste Neuanlage.

## Direkte Einstiege und Schutz

Bestehende Fachrouten bleiben erhalten, damit gespeicherte Links und direkte Einstiege aus Checklisten weiter funktionieren. Verwaltungs-Breadcrumbs zeigen die neue Einordnung. Navigation und ausgeblendete Schaltflächen ersetzen niemals die serverseitige Berechtigungsprüfung; unberechtigte Zugriffe führen neutral auf die Zugriffsseite.

## Persönliche Funktionen

Passwortänderung und künftige persönliche Präferenzen sind nicht Teil der Kanzleiverwaltung. Sie bleiben im persönlichen Kontokontext.

## Responsive Verhalten

Auf Desktopbreiten bleibt die Seitenleiste kompakt. Verwaltungsreiter sind horizontal scrollbar und Karten wechseln bei schmalen Ansichten in eine einspaltige Darstellung. Tabellen bleiben horizontal zugänglich, ohne Überschriften oder Aktionen abzuschneiden.
