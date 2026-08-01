# Abschlussbericht zur Prisma-Migrationsbaseline von `prisma/dev.db`

Stand: 01.08.2026

Ausführung: 31.07.2026

Branch: `codex/plattformbasis-phase-1`

Ausgangscommit: `57ab8838c3ab62b7b58317ba27151736888f3848`

## Abschlussurteil

Die bestätigte Prisma-Migrationsbaseline wurde auf der echten `prisma/dev.db` erfolgreich hergestellt. Der reale Ausgangsbestand entsprach exakt der zuvor geprüften Kopie und dem Schema nach Migration 14. Die ersten 14 Migrationen wurden ohne erneute SQL-Ausführung als angewendet registriert; ausschließlich Migration 15 wurde regulär ausgeführt. Alle strukturellen, fachlichen und technischen Abschlussprüfungen waren erfolgreich.

`prisma/dev.db` ist damit eine sichere Grundlage für den normalen lokalen Entwicklungsbetrieb. Der bekannte Drift zwischen `schema.prisma` und der Migrationshistorie wurde absichtlich nicht verändert. Deshalb bleiben `prisma migrate dev`, `prisma db push` und `prisma migrate reset` gesperrt.

## Gemeinsamer Sicherungssatz

Sicherungspfad:

`C:\Projekte\Kanzlei-Workflow\backups\migrationsbaseline-real-20260731-175418`

Zeitpunkt: 31.07.2026, 17:54:18 Uhr (Europe/Berlin). Der Pfad wurde neu erstellt und überschreibt keine vorhandene Sicherung.

| Quelle | Bytes | SHA-256 |
| --- | ---: | --- |
| `prisma/dev.db` | 712704 | `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796` |
| `.env` | 103 | `7E9017AD602FCD3A82303E633C6E79888A0C8F101E7F58F1D0C5974CDC715066` |
| `.env.integration` | 278 | `9053D6EF18F100E1E4D2056ACB6165C89117E2E2C5CAD17BB92A874AFF2F8F5E` |
| `storage/ordo-campus/6ce1de40-8ccf-4d2c-b159-3710e8350e02.xlsx` | 9707 | `B1516FC9295429C52DC908E7AF5BE82AD1C518D202CCBB44EB7E2647D62EF77B` |
| `storage/ordo-campus/fadf1d32-3003-4f5d-935d-5e649655eae9.png` | 513365 | `1063E3E22F800D8F70C7F16F24C6724DA1EB15834E97FC9276414162E93ABE66` |

`storage/fibu-lohn` war nicht vorhanden; dieser zulässige leere Speicherzustand ist im Manifest dokumentiert. Das Manifest enthält außerdem Branch, Commit und den Git-Status vor der realen Baseline.

Zusätzliche Datenbank-Rücksprungpunkte im Sicherungssatz:

- `checkpoint-after-resolve14.db`, SHA-256 `E72007CA7C5680221F0F0CE259947418BADB1A323AACC821CB476306E446D7B7`
- `final-after-migration15.db`, SHA-256 `D8E1B5221E621233C9571BEE7E10AFF871A15D7D8E4E656FA32F23425DF12C3B`
- `failed-attempt-after-resolve1.db`, SHA-256 `0BD3F298900AC31C811961B0CABB6C3B8CCC6F45663B78E4BD4D97F5D91F16F5`

## Ausgangscheckpoint

Unmittelbar vor der Baseline wurde die Datenbank bei exklusivem Dateizugriff erneut bytegenau kopiert und ausschließlich lesend analysiert.

| Merkmal | Ausgangswert |
| --- | ---: |
| Anwendungstabellen | 33 |
| Spalten | 544 |
| Fremdschlüssel | 86 |
| Indizes | 103 |
| eindeutige Regeln | 25 |
| Anwendungsdatensätze | 351 |
| Prisma-Migrationseinträge | 0; Tabelle fehlte |

`PRAGMA quick_check` meldete `ok`; `PRAGMA foreign_key_check` war leer. Die Zeilenzahlen und stabilen Datenhashes aller 33 Anwendungstabellen entsprachen exakt der Kopienprüfung. Der Schema-Diff zur Referenz aus den ersten 14 Migrationen war leer. `PayrollReconciliationPosition` und beide `positionId`-Erweiterungen fehlten; sämtliche FiBu-Lohn-Falltabellen waren leer.

## Registrierte Migrationen

Die folgenden Migrationen wurden einzeln und in dieser Reihenfolge ausschließlich mit `prisma migrate resolve --applied` registriert. Ihr SQL wurde nicht erneut ausgeführt:

1. `20260726120000_init_clients`
2. `20260726153000_standard_tasks_import`
3. `20260726170000_monthly_checklists`
4. `20260726183000_monthly_review_workflow`
5. `20260726193000_ordo_caroli_consolidation`
6. `20260726194000_artificial_full_names`
7. `20260726213000_local_users_auth`
8. `20260727100000_annual_financial_statements`
9. `20260727140000_function_separation_exception`
10. `20260727170000_ordo_campus_foundation`
11. `20260727190000_ordo_campus_attachments`
12. `20260727210000_task_execution_planning`
13. `20260727230000_workflow_ux_corrections`
14. `20260728100000_fibu_payroll_reconciliation_foundation`

Nach jedem Schritt wurde der Status gegen die exakt erwartete Restliste geprüft. Nach Schritt 14 stand ausschließlich `20260728140000_workflow_navigation_payroll_positions` aus. Der Zwischencheckpoint bestand Integritäts- und Fremdschlüsselprüfung; Schema, Zeilenzahlen und Datenhashes aller Anwendungstabellen waren unverändert.

## Regulär angewendete Migration

Ausschließlich diese Migration wurde mit dem auf Kopien geprüften Deploy-Verfahren ausgeführt:

`20260728140000_workflow_navigation_payroll_positions`

Keine andere Migration wurde ausgeführt, erzeugt oder verändert. Es wurden weder `migrate reset`, `migrate dev`, `db push` noch Seed- oder Testreset-Befehle gegen `dev.db` verwendet.

## Schema und Daten nach der Baseline

| Merkmal | Vorher | Nachher |
| --- | ---: | ---: |
| Anwendungstabellen | 33 | 34 |
| Spalten | 544 | 565 |
| Fremdschlüssel | 86 | 92 |
| Indizes | 103 | 109 |
| eindeutige Regeln | 25 | 25 |
| erfolgreiche Migrationseinträge | 0 | 15 |

`PayrollReconciliationPosition` ist vorhanden und leer. `PayrollDocumentReference.positionId` und `PayrollReconciliationHistory.positionId` sind einschließlich der vorgesehenen Fremdschlüssel und Indizes vorhanden. Alle 33 vorher vorhandenen Anwendungstabellen behielten beim unmittelbaren Vorher-/Nachher-Vergleich ihre Zeilenzahlen und Datenhashes. Der Datenbank-zu-Datenbank-Schema-Diff zur frisch migrierten Systemintegration war leer.

Die Abschlusskopie bestand `quick_check` und `foreign_key_check`; Prisma meldete `Database schema is up to date!` und 15 erfolgreiche Migrationen.

## Anwendung und technische Gesamtprüfung

| Prüfung | Ergebnis |
| --- | --- |
| Prisma-Schema | gültig |
| Prisma Client | 6.19.3 erfolgreich erzeugt |
| ESLint | erfolgreich |
| TypeScript | erfolgreich |
| automatisierte Tests | 305 erfolgreich, 1 bewusst übersprungen |
| Performance-Smoke-Test | bewusst nicht mit `RUN_PERFORMANCE_SMOKE=1` aktiviert |
| Produktions-Build | erfolgreich; 31 statisch generierte Seiten |
| Entwicklungsstart gegen `dev.db` | erfolgreich |
| Neustart und Persistenz | erfolgreich |
| produktionsnaher Start gegen `dev.db` | erfolgreich |
| Browserkonsole | keine Fehler oder Warnungen |
| Entwicklungsserverprotokoll | HTTP 200, keine Prisma-, Schema- oder Anwendungsfehler |
| Produktionsserverprotokoll | Server bereit, keine Prisma-, Schema- oder Anwendungsfehler |

Authentifiziert geprüft wurden Anmeldung, Dashboard, Mandanten, Rechnungswesenaufgaben, Jahresabschlussaufgaben, Rechnungswesen-Statusübersicht, Verwaltung, Standardaufgaben, Ordo Campus, FiBu ↔ Lohn, Lohn-Dashboard, offene Rückfragen, Fahrzeuge und die Checklisten-Sammelspeicherung. Die früheren Fehlerbilder P2021/P2022 und fehlende `PayrollReconciliationPosition`-Strukturen traten nicht auf.

Die zwei Testanmeldungen erzeugten erst nach dem abgeschlossenen fachlichen Datenhashvergleich bestimmungsgemäß zwei zusätzliche `Session`-Zeilen und aktualisierten `User.lastLoginAt`. Keine andere Anwendungstabelle änderte sich. Der abschließende Live-Hash nach diesen kontrollierten Laufzeitänderungen ist `508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`.

## Vorsorglicher Rollback im ersten realen Versuch

Ein vorsorglicher physischer Rollback war einmal erforderlich. Der erste `resolve`-Befehl war erfolgreich; `prisma migrate status` gab wegen der erwartungsgemäß noch ausstehenden 14 Migrationen Exitcode 1 zurück. Der Prüf-Harness wertete diesen semantisch erwartbaren Status zunächst als Fehler. Entsprechend der Stop-Regel wurde der Zwischenstand separat gesichert und die echte Datenbank bytegenau aus dem gemeinsamen Sicherungssatz wiederhergestellt.

Ausgangshash, SQLite-Integrität, Fremdschlüssel, Zeilenzahlen, fehlende Migrationstabelle und 15 ausstehende Migrationen wurden danach erneut bestätigt. Erst anschließend begann ein vollständiger frischer Lauf mit korrigierter Statusauswertung. Nach der erfolgreichen Baseline selbst war kein Rollback erforderlich.

## Wiederherstellungsverfahren

1. Alle Entwicklungs-, Produktions- und sonstigen Zugriffsprozesse stoppen.
2. Prüfen, dass kein Listener, SQLite-Prozess und keine WAL-, SHM- oder Journaldatei aktiv ist.
3. Den fehlgeschlagenen Datenbankstand separat und bytegenau beweissichern.
4. `prisma/dev.db`, `.env`, Campus-Speicher und den dokumentierten FiBu-Lohn-Speicherzustand gemeinsam aus `backups/migrationsbaseline-real-20260731-175418` physisch wiederherstellen.
5. SHA-256 gegen `MANIFEST.md` prüfen.
6. `PRAGMA quick_check`, `PRAGMA foreign_key_check`, Tabellen-, Zeilen- und Datenhashvergleich ausführen.
7. `prisma migrate status` prüfen und erst danach einen kontrollierten Anwendungsstart durchführen.

Keine Migration wird rückwärts geändert und keine improvisierte Direktreparatur auf dem fehlerhaften Bestand vorgenommen.

## Verbleibender Schema-Historien-Drift

Unverändert offen bleiben:

- zusätzlicher nicht eindeutiger Index `AnnualChecklist_functionSeparationExceptionId_idx` neben der eindeutigen Regel,
- `AccountingPeriod.lastStatusChangedAt`: in der Migrationshistorie nullable und ohne Standardwert, im Prisma-Schema verpflichtend mit `now()`,
- einzelne `User`-Fremdschlüssel in `AccountingPeriod`, `Client` und `WorkflowHistory`: SQLite `ON UPDATE NO ACTION`, Prisma-Schema `CASCADE`.

Die Punkte wurden weder korrigiert noch in eine neue Migration überführt.

## Zulässige und verbotene Prisma-Befehle

Zulässig sind lesende oder generierende Prüfkommandos wie `prisma validate`, `prisma generate` und `prisma migrate status`. `prisma migrate deploy` ist für zuvor geprüfte, unveränderte und datenbewahrende Migrationen nach vollständiger gemeinsamer Sicherung kontrolliert zulässig.

Weiterhin verboten gegen `prisma/dev.db` sind:

- `prisma migrate reset`
- `prisma migrate dev`
- `prisma db push`
- `npm.cmd run db:reset`
- `npm.cmd run db:reset:test`
- `npm.cmd run db:migrate`
- Seeds und Testresets
- manuelle Änderungen an Migrationen oder `_prisma_migrations`

## Go-/No-Go-Empfehlung

**Go:** Die echte `prisma/dev.db` kann als sichere Grundlage für den normalen lokalen Entwicklungsbetrieb verwendet werden. Künftige Migrationen benötigen weiterhin eine vollständige gemeinsame Sicherung, Kopienprüfung und kontrolliertes Deploy. **No-Go:** Driftbereinigung und Einsatz von `migrate dev`, `db push` oder Reset-Verfahren bleiben einem gesonderten Auftrag vorbehalten.
