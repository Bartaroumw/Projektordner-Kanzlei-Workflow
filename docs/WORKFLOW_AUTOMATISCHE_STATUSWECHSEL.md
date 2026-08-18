# Automatische Statuswechsel

Stand: 18.08.2026

## Grundsatz

Ein Seitenaufruf ist keine fachliche Handlung. Rechnungswesen-, Jahresabschluss- und Lohnstatus ändern sich deshalb nicht beim Öffnen oder Lesen, sondern erst nach einer erfolgreich gespeicherten fachlichen Aktion. Die früheren regulären Aktionen **Bearbeitung beginnen**, **Prüfung beginnen** und **Gesehen** sind entfernt.

## Rechnungswesen und Jahresabschluss

- Eine offene Monatscheckliste wechselt mit der ersten gespeicherten Aufgabenänderung von **Offen** nach **In Bearbeitung**.
- Eine offene Jahresabschlusscheckliste wechselt entsprechend von **Offen** nach **In Vorbereitung**.
- **Zur Prüfung** wechselt mit der ersten gültigen, gespeicherten Prüfentscheidung nach **In Prüfung**.
- Unveränderte Eingaben, reine Seitenaufrufe und lokal noch nicht gespeicherte Entwürfe lösen keinen Wechsel aus.
- Der Start wird atomar nur einmal beansprucht. Weitere Änderungen erzeugen keinen zweiten Startverlauf.

Die Prüf-Sticky-Leiste verarbeitet jede geänderte Aufgabe getrennt. Gültige Entscheidungen werden gespeichert; fehlerhafte oder konkurrierend geänderte Aufgaben bleiben mit ihrer Eingabe und Fehlermeldung offen. Rückfrage und Beanstandung verlangen eine Prüfnotiz.

## Rechnungswesen–Lohn

Die Erstansicht einer vollständig übergebenen Abstimmung durch den zugeordneten Lohnsachbearbeiter setzt einmalig `firstViewedAt` und `firstViewedByUserId`; spätere Ansichten aktualisieren `lastViewedAt`. Der fachliche Lohnstatus bleibt dabei **Neu**.

Die erste erfolgreiche Lohnhandlung startet **In Bearbeitung**. Dazu zählen insbesondere das Verarbeiten eines Sachverhalts, eine Rückfrage und eine zulässige Abschlussaktion. Eine offene Rückfrage setzt **Rückfrage offen**, ihre vollständige Bearbeitung führt zu **In Bearbeitung** zurück. Der Abschluss setzt **Erledigt**.

## Verlauf und Berechtigungen

Jeder automatische Start speichert Benutzer-ID, Namenssnapshot, ausgeübte Funktion, Zeitpunkt, Ausgangs- und Zielstatus sowie den fachlichen Auslöser. Alle schreibenden Dienste prüfen die gespeicherte Zuständigkeit serverseitig; eine reine Administratorrolle reicht nicht aus.
