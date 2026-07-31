# Serverfehleranalyse nach Einführung der FiBu-Lohn-Abstimmung

Stand: 28.07.2026

## Ausgangslage

Der fehlerhafte Bestand wurde ausschließlich auf einer Kopie der früheren lokalen Entwicklungsdatenbank reproduziert:

- Datenbankkopie: `prisma/system-repro-old-dev.db`
- Server: `http://localhost:3101`
- Benutzer: Maria Muster, Rolle Mitarbeiter/Prüfer
- Node.js: 24.18.0
- npm: 11.16.0
- Prisma und Prisma Client: 6.19.3
- Next.js: 16.2.12
- ursprüngliche Entwicklungsvariable: `DATABASE_URL=file:./dev.db`
- regulärer Campus-Speicher: `storage/ordo-campus`
- regulärer FiBu-Lohn-Speicher: `storage/fibu-lohn`

Das vollständige lokale Reproduktionsprotokoll liegt im ausgeschlossenen Arbeitsverzeichnis unter `tmp/system-repro-server.log`. Die aktive `prisma/dev.db` wurde während dieser Integrationsprüfung nicht verändert. Ihr SHA-256-Wert stimmt mit der vorher angelegten Sicherung überein:

`A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`

## Reproduzierte Fehler

| Route | Seite | Fehlerklasse | Fehlendes Schemaelement | Fundstelle | Ergebnis |
| --- | --- | --- | --- | --- | --- |
| `/` | Dashboard | `PrismaClientKnownRequestError`, `P2022` | `Client.payrollPreparedByFirm` | `lib/dashboard-service.ts:101`, `app/page.tsx:38` | technische Laufzeitfehlerseite |
| `/mandanten` | Mandantenübersicht | `PrismaClientKnownRequestError`, `P2022` | `Client.payrollPreparedByFirm` | `app/mandanten/page.tsx:23` | HTTP 500 |
| `/fibu-lohn` | FiBu-Lohn-Arbeitsübersicht | `PrismaClientKnownRequestError`, `P2021` | Tabelle `PayrollReconciliation` | `app/fibu-lohn/page.tsx:21` | HTTP 500 |
| `/fibu-lohn/fahrzeuge` | Fahrzeugübersicht | `PrismaClientKnownRequestError`, `P2022` | `Client.payrollUserId` | `app/fibu-lohn/fahrzeuge/page.tsx:14` | HTTP 500 |

Es wurden keine eigenständigen React-, Hydration- oder Browser-JavaScript-Fehler festgestellt. Die Browsermeldungen waren Folgen der nicht ausführbaren Prisma-Abfragen.

## Ursache

Die frühere Datenbank enthielt alle Modelle bis einschließlich Workflow-UX und Ordo Campus, jedoch nicht die additive Migration:

`20260728100000_fibu_payroll_reconciliation_foundation`

Damit fehlten insbesondere:

- die FiBu-Lohn-Felder am Mandanten,
- die FiBu-Lohn-Abstimmungen und Themen-Snapshots,
- Rückfragen und Belegreferenzen,
- Fahrzeuge und Fahrzeughistorie,
- die dazugehörigen Fremdschlüssel, Indizes und Eindeutigkeitsregeln.

Der aktuelle Prisma Client kannte diese Felder bereits. Schon eine `include`-Abfrage auf einen Mandanten verlangte deshalb Spalten, die in der alten SQLite-Datei nicht vorhanden waren. Das erklärt, warum auch Dashboard und Mandantenübersicht betroffen waren.

Die alte Entwicklungsdatenbank besitzt außerdem keine verlässliche Prisma-Migrationsbaseline. Das Schema war in früheren Entwicklungsschritten teilweise über kontrollierte SQL-Skripte aufgebaut worden; die Tabelle `_prisma_migrations` bildet diese Historie nicht vollständig ab. Ein ungeprüftes `prisma migrate deploy`, `prisma migrate reset` oder `prisma db push` ist daher für diesen Bestand weiterhin ausgeschlossen.

## Gegenprobe

Eine leere, getrennte Datenbank wurde mit allen 14 unveränderten Migrationen aufgebaut. Danach wurden Prisma Client, Gesamttestdaten, Campus-Anhang und FiBu-Lohn-Beleg neu erzeugt. Auf dieser Datenbank traten die vier Fehler nicht auf.

Damit ist die ursprüngliche Fehlergruppe ein Klasse-A-Datenbankblocker des alten Bestands und kein Fehler im FiBu-Lohn-Datenmodell. Zwei davon unabhängige Rollenfehler wurden bei der systemweiten Prüfung gefunden und im Anwendungscode behoben:

1. `requireRole` erzeugte bei einem unberechtigten Direktaufruf eine technische Next.js-Fehlerseite. Die Funktion leitet nun auf eine neutrale Zugriffsseite um.
2. Reine Lohnsachbearbeiter konnten die Rechnungswesen-, Mandanten- und Jahresabschlussübersichten direkt öffnen. Die drei Seiteneinstiege besitzen nun dieselbe serverseitige Rollenprüfung wie die schreibenden Aktionen.

## Empfehlung zur Entwicklungsdatenbank

Die aktuell vorhandene `prisma/dev.db` besitzt nach einer früheren, separat vorgenommenen lokalen Wiederherstellung strukturell die FiBu-Lohn-Elemente. Sie besitzt aber weiterhin keine belastbare Migrationsbaseline. Bis diese in einem eigenen, gesicherten Arbeitsschritt hergestellt wurde:

- keine Reset-, Push- oder Deploy-Befehle gegen `prisma/dev.db`,
- Entwicklung und Integrationsprüfung über `npm.cmd run dev:integration`,
- Integrationsbestand bei Bedarf ausschließlich mit `npm.cmd run testdata:system-integration` erneuern,
- vor einer Baseline Datenbank, Campus-Speicher und FiBu-Lohn-Speicher gemeinsam sichern.
