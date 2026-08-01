# Plan zur Prisma-Migrationsbaseline von `prisma/dev.db`

Stand: 01.08.2026

## Ziel und Schutzgrenze

Dieser Plan dokumentiert die vorbereitete und am 31.07.2026 nach ausdrücklicher Bestätigung exakt ausgeführte Migrationsbaseline der bestehenden Entwicklungsdatenbank. Die Umsetzung erfolgte ohne Änderung einer vorhandenen Migration und ohne Driftbereinigung.

Unabhängig von der nun hergestellten Baseline bleiben gegen `prisma/dev.db` verboten:

- `prisma migrate reset`,
- `prisma db push`,
- `prisma migrate dev`,
- Seeds und Testresets,
- manuelle Änderungen an `_prisma_migrations`,
- Änderungen, Umbenennungen, Löschungen oder Zusammenführungen der 15 vorhandenen Migrationen.

`prisma migrate deploy` darf seit der erfolgreichen Baseline ausschließlich kontrolliert für zuvor geprüfte, unveränderte Migrationen und erst nach vollständiger gemeinsamer Sicherung verwendet werden.

## Ausgangslage

- `prisma/dev.db` ist eine intakte SQLite-Datenbank mit relevanten Anwendungsdaten.
- SHA-256 vor der Kopienprüfung: `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`.
- Es bestehen keine Dateien `dev.db-wal`, `dev.db-shm` oder `dev.db-journal`.
- `_prisma_migrations` fehlt vollständig.
- Prisma meldet deshalb alle 15 Projektmigrationen als nicht angewendet.
- Das tatsächliche Datenbankschema entspricht exakt dem Endstand der ersten 14 Migrationen.
- Die 15. Migration `20260728140000_workflow_navigation_payroll_positions` fehlt strukturell.

## Maßgebliche Migrationsquelle

Für die Baseline ist der unveränderte Ordner `prisma/migrations` die technische Quelle der Wahrheit. Ein neues `0_init` aus `schema.prisma` wird nicht erzeugt, weil dies die bestehende Historie ersetzen würde und weil das deklarative Prisma-Schema an einzelnen Stellen vom Endstand der vorhandenen Migrationen abweicht.

Die offizielle Prisma-Baseline-Funktion ist `prisma migrate resolve --applied`. Prisma dokumentiert, dass damit vorhandene Migrationen als bereits behandelt registriert werden, ohne ihr SQL erneut auszuführen:

- [Prisma: Baselining a database](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/baselining)
- [Prisma CLI: migrate resolve](https://docs.prisma.io/docs/cli/migrate/resolve)
- [Prisma: Migration histories](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/migration-histories)

## Empfohlene Baseline-Methode

1. Anwendung und alle Prozesse mit Zugriff auf `dev.db` beenden.
2. Sicherstellen, dass keine WAL-, SHM- oder Journaldatei vorhanden ist.
3. Datenbank, `.env`, Campus-Speicher und vorhandenen FiBu-Lohn-Speicher gemeinsam sichern.
4. SHA-256 aller Originale und Sicherungen vergleichen.
5. Auf einer aktuellen Kopie erneut nachweisen, dass deren Schema exakt dem Endstand der ersten 14 Migrationen entspricht.
6. Die ersten 14 Migrationen in chronologischer Reihenfolge jeweils mit `prisma migrate resolve --applied <Migrationsname>` registrieren.
7. Daten-, Schema-, Integritäts- und Fremdschlüsselhashes prüfen. Erwartung: nur `_prisma_migrations` wurde ergänzt; 14 Einträge sind vorhanden und die 15. Migration ist als ausstehend gemeldet.
8. Einen weiteren bytegenauen Rücksprungpunkt erstellen.
9. Ausschließlich die 15. Migration mit `prisma migrate deploy` anwenden.
10. Prüfen, dass alle 15 Migrationen als aktuell erkannt werden, die Datenbank schemaidentisch zur frisch migrierten Referenz ist und sämtliche bestehenden Tabelleninhalte unverändert sind.
11. Prisma, Tests, Build sowie Entwicklungs- und Produktionsstart prüfen.

Die 15. Migration darf nicht als bereits angewendet markiert werden, weil ihre Tabelle, Spalten, Fremdschlüssel und Indizes im Ausgangsbestand fehlen.

## Behandlung der 15 Migrationen

- Migrationen 1 bis 14: als bereits angewendet registrieren; ihr SQL nicht erneut ausführen.
- Migration 15: nach kontrolliertem Zwischenstatus regulär anwenden.
- Keine Migration bearbeiten oder durch eine Sammelbaseline ersetzen.

## Schemaabweichungen

### Gegenüber allen 15 Migrationen

Der Ausgangsbestand benötigt ausschließlich die 15. Migration:

- neue Tabelle `PayrollReconciliationPosition` mit 18 Spalten, 4 Fremdschlüsseln und 4 Indizes,
- neue Spalte `positionId` samt Fremdschlüssel und Index in `PayrollDocumentReference`,
- neue Spalte `positionId` samt Fremdschlüssel und Index in `PayrollReconciliationHistory`.

Damit steigt der Bestand von 33 auf 34 Anwendungstabellen, von 544 auf 565 Spalten, von 86 auf 92 Fremdschlüssel und von 103 auf 109 Indizes. Die 25 eindeutigen Regeln bleiben erhalten.

### Deklaratives Prisma-Schema gegenüber Migrationshistorie

Nach allen 15 Migrationen besteht weiterhin ein bereits im Projekt angelegter Schema-Historien-Drift:

- zusätzlicher nicht eindeutiger Index `AnnualChecklist_functionSeparationExceptionId_idx` neben der eindeutigen Regel,
- `AccountingPeriod.lastStatusChangedAt` ist in der Migrationshistorie nullable und ohne Standardwert, im Prisma-Schema jedoch verpflichtend mit `now()`,
- einzelne `User`-Fremdschlüssel in `AccountingPeriod`, `Client` und `WorkflowHistory` besitzen in SQLite `ON UPDATE NO ACTION`, während das Prisma-Schema `CASCADE` beschreibt.

Dieser Drift wird in Phase 1 nicht korrigiert. Vor einem späteren `prisma migrate dev` ist dafür ein eigener, datenbewahrender Migrationsauftrag erforderlich.

## Rollback und Wiederherstellung

SQLite-Migrationen werden nicht rückwärts manipuliert. Der garantierte Rollback ist eine vollständige physische Wiederherstellung:

1. Anwendung und Datenbankzugriffe stoppen.
2. Den fehlgeschlagenen Bestand zur Beweissicherung umbenennen oder separat kopieren, nicht überschreiben.
3. Die vor dem Versuch erstellte bytegenaue Datenbankkopie an den dokumentierten Pfad zurückkopieren.
4. Campus- und FiBu-Lohn-Speicher sowie `.env` aus demselben Sicherungssatz wiederherstellen.
5. SHA-256 gegen das Sicherungsmanifest prüfen.
6. SQLite-Integrität, Fremdschlüssel, Datenhashes und Anwendungsstart prüfen.

## Freigabekriterium

Das Freigabekriterium wurde am 31.07.2026 erfüllt. Die echte `dev.db` besitzt nun 15 erfolgreiche Migrationseinträge und das Schema nach Migration 15. Sie ist für den normalen lokalen Entwicklungsbetrieb technisch freigegeben. `prisma migrate dev`, `prisma db push` und `prisma migrate reset` bleiben bis zur separat beauftragten, datenbewahrenden Driftbereinigung gesperrt.
