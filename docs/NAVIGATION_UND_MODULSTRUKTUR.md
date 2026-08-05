# Navigation und Modulstruktur

## Hauptnavigation

Die Hauptnavigation ist dauerhaft auf wenige Arbeits- und Verwaltungsbereiche begrenzt:

- **Dashboard**: personenbezogene, periodenübergreifende operative Steuerung
- **Mandanten**: gezielter Mandanteneinstieg
- **Rechnungswesen**: laufendes Rechnungswesen, Jahresabschluss und Statusübersicht
- **FiBu ↔ Lohn**: Abstimmungen, offene Lohnrückfragen und Fahrzeuge
- **Ordo Campus**: Wissensübersicht und aufgabenbezogenes Kanzleiwissen
- **Verwaltung**: zentrale fachliche Grundlagen, Benutzer und Rechte, Daten und Import sowie Systeminformationen

Die Einträge werden aus den aktiven Rollen und Zusatzberechtigungen des angemeldeten Benutzers abgeleitet. Mehrfachrollen erzeugen keine doppelten Menüpunkte.

Der Markenblock besteht ausschließlich aus dem OC-Zeichen, dem Produktnamen **Ordo Caroli** und der direkt darunter ausgerichteten Kanzleimarke **CONCILIUM**. Es gibt keinen Produktuntertitel. Auf Desktopbreiten kann die Navigation über einen Randbutton auf eine schmale Iconleiste reduziert werden. Ein-/Ausklappbutton und Logo bleiben in beiden Zuständen auf derselben horizontalen Achse und überlagern sich nicht. Tooltip, zugänglicher Name und sichtbarer Fokus beschreiben die jeweilige Aktion eindeutig.

Alle Module verwenden dieselbe lokale SVG-Symbolsprache mit identischer Größe, Strichstärke und Ausrichtung; Buchstaben und Emoji werden nicht gemischt. Modulicons, Benutzerzugang und Abmeldung bleiben im eingeklappten Zustand erreichbar. Der Zustand liegt nur in `localStorage`; es gibt keine Datenbankpräferenz. Auf mobilen Breiten bleibt die horizontale, scrollbar nutzbare Navigation erhalten und die Desktop-Einklappsteuerung ist ausgeblendet.

## Mandant als Arbeitskontext

Der normale Klick auf eine Mandantenzeile öffnet immer `/mandanten/[id]`. Der Mandantenarbeitsbereich bietet rollenabhängige Einstiege in Übersicht, laufendes Rechnungswesen, Jahresabschluss, FiBu ↔ Lohn, Fahrzeuge, mandantenspezifische Aufgaben und Historie. Allgemeines Ordo-Campus-Wissen bleibt an Standardaufgaben und FiBu-Lohn-Themen gebunden und wird nicht als künstlicher Mandantenreiter dupliziert.

Gezielte Links wie **Aktuelle Monatscheckliste öffnen**, Dashboardaufgaben, Rückfragen und Prüfungen bleiben direkte Fachlinks. Diese Unterscheidung bewahrt gespeicherte Links und reduziert gleichzeitig unbeabsichtigte Sprünge aus dem Mandantenkontext.

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
