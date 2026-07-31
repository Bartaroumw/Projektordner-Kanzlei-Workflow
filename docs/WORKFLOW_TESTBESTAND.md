# Workflow-Testbestand

Der Workflow-Testbestand ist ein vollständig künstlicher, reproduzierbarer Prüfbestand für Rechnungswesen-, Prüfungs-, Jahresabschluss- und Ordo-Campus-Abläufe. Er ist strikt von Entwicklungs-, Abnahme-, Pilot- und Produktivdaten getrennt.

Die ergänzende UX-Prüfung umfasst die lückenbasierte Rechnungswesen-Statusübersicht, die feste Prüferadressierung bei Rückfragen, den wiederholbaren Verwerfen-Zustand und mehrere FiBu-Lohn-Positionen. Reguläre Entwicklungsdaten werden dafür nicht verändert.

## Erstellung

```powershell
npm.cmd run testdata:workflow
```

Der Befehl löscht ausschließlich `prisma/workflow-test.db`, führt alle vorhandenen Migrationen aus, erzeugt den deterministischen Seed und startet anschließend die Konsistenzprüfung. Der Campus-Speicher liegt unter `tmp/workflow-test-campus`. Beide Pfade sind fest im Reset-Skript geprüft. Datenbanken `dev.db`, `acceptance.db`, `pilot.db` oder `production.db` werden weder geöffnet noch verändert.

Zum Start mit diesem Bestand:

```powershell
$env:DATABASE_URL="file:./workflow-test.db"
$env:ORDO_CAMPUS_STORAGE_PATH="tmp/workflow-test-campus"
npm.cmd run dev
```

## Künstliche Benutzer

| Benutzername | Vollständiger Name | Rolle/Funktion | Testpasswort |
|---|---|---|---|
| `anna.bearbeiter` | Anna Bearbeiter | Mitarbeiter | `Workflow-anna-2026!` |
| `peter.pruefer` | Peter Prüfer | Prüfer | `Workflow-peter-2026!` |
| `maria.kombiniert` | Maria Kombiniert | Mitarbeiter, Prüfer, Kanzleileitung | `Workflow-maria-2026!` |
| `klaus.leitung` | Klaus Leitung | Kanzleileitung, Prüfer | `Workflow-klaus-2026!` |
| `admin.test` | Admin Test | Administrator | `Workflow-admin-2026!` |
| `campus.verantwortlich` | Campus Verantwortlich | Campus- und Standardaufgabenpflege | `Workflow-campus-2026!` |

Diese Zugänge sind ausschließlich für lokale Tests bestimmt.

## Künstliche Mandanten

Die Zeiträume werden beim Reset aus dem aktuellen Datum berechnet: Vormonat als Standard, Vorvormonat als Altmonat und Januar für die Jahresvorbereitung.

| Nr. | Zweck und Ausgangsstatus |
|---|---|
| 10000 | Februar 2026 zur gezielten Regression „Prüfungsstart bleibt Nicht geprüft“ |
| 90001 | Bearbeitung im Vormonat offen |
| 90002 | Vormonat zur Prüfung |
| 90003 | Vormonat in Prüfung |
| 90004 | Nachbearbeitung mit Beanstandung |
| 90005 | Altmonat mit offener Rückfrage |
| 90006 | kombinierte Rolle, in Bearbeitung |
| 90007 | alle Funktionen identisch, zur Prüfung |
| 90008 | Quartalsrhythmus und Jahresabschluss zur Freigabe |
| 90009 | jährliche Januarvorbereitung |
| 90010 | Jahresabschluss zur Prüfung |
| 90011 | Jahresabschluss in Nachbearbeitung |
| 90012 | Rechnungswesen abgeschlossen und Jahresabschluss freigegeben |

Die Diagnose bricht ab, wenn Rollenreferenzen oder Aufgaben fehlen oder mehr als eine aktive Rechnungswesencheckliste je Mandant besteht.

## Korrigierter Prüfablauf

Eine Beanstandung oder Prüfer-Rückfrage setzt die Checkliste unmittelbar auf `Nachbearbeitung`; sie ist damit aktiv beim Bearbeiter und beim Prüfer nur wartend. Erst nach beantworteter Nachbearbeitung und erneuter Übergabe wird sie wieder aktive Prüfaufgabe. Eine Bearbeiter-Rückfrage an den Prüfer speichert Absender, Empfänger und offene Verantwortung getrennt.

Beim Prüfungsstart bleibt jede Aufgabe `Nicht geprüft`. Ein Abschluss ist erst möglich, wenn alle Bearbeitungen abgeschlossen, alle Pflichtbegründungen vorhanden, alle Rückfragen und Beanstandungen geschlossen und alle prüfungsrelevanten Aufgaben ausdrücklich `In Ordnung` sind.

Mandant 10000 besitzt eine künstliche Februarcheckliste im Status `Zur Prüfung`. Sie dient ausschließlich dazu, den früheren automatischen Prüfstatuswechsel reproduzierbar auszuschließen.

## Beispielaufgaben und Ordo Campus

Der Bestand enthält bewusst unterschiedliche Aufgaben:

- monatliche Bankabstimmung und Dokumentation,
- quartalsweise Plausibilitätsprüfung,
- halbjährliche Dauerbuchungskontrolle,
- individuelle Meldemonate,
- jährliche Januar- und Dezemberaufgaben,
- merkmalsabhängige Aufgaben für Lohn und Anlagevermögen,
- Jahresabschlussaufgaben für EÜR, Bilanzierung, Forderungen, Rückstellungen und Anlagevermögen.

Aktive Campus-Beispiele bestehen für Bankabstimmung, Quartalsprüfung, Januarvorbereitung und Jahresabschlussprüfung. Sie zeigen Kurzbeschreibung, Ziel, ausführliche Bearbeitungshinweise, verbindlichen Kanzleistandard, Prüferhinweise, typische Fehler, interne Hinweise sowie verschiedene Linktypen. Zusätzlich besteht ein Entwurf zur halbjährlichen Dauerbuchungskontrolle, der nur Benutzern mit Pflegeberechtigung angezeigt wird.
