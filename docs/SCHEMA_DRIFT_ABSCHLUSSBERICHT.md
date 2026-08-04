# Abschlussbericht zur Schema-Historien-Driftbereinigung

Stand: 04.08.2026

Branch: `codex/schema-drift-bereinigung`

## Ergebnis

Die bekannte Schema-Historien-Drift von `prisma/dev.db` wurde nach bestätigter Kopienprüfung verlustfrei bereinigt. Ausschließlich die additive Migration

`20260804080000_reconcile_schema_history_drift`

wurde mit `prisma migrate deploy` auf die echte Entwicklungsdatenbank angewendet. Prisma meldet 16 von 16 Migrationen als aktuell. Keine bestehende Migration und keine fachliche Anwendungslogik wurden geändert.

## Ausgangscheckpoint und Sicherung

- bestätigter Ausgangshash von `prisma/dev.db`: `508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`
- Sicherungscommit vor der Datenbankänderung: `3bf35266fcb7d3494535ce103d5b4b617cfe7d4d`
- Commitnachricht: `Schema-Historien-Drift analysiert und Migration 16 vorbereitet`
- neuer Sicherungssatz: `backups/schema-drift-deploy-20260804-081510`
- Sicherungsumfang: `dev.db`, `.env`, `.env.integration`, `schema.prisma`, alle 16 Migrationen und `storage/ordo-campus`
- `storage/fibu-lohn` war nicht vorhanden; dieser Zustand ist im Sicherungsmanifest dokumentiert
- Manifest enthält SHA-256, Dateigrößen, Git-Branch, Commit, Status und Rücksprungbeschreibung
- alle 23 inventarisierten Dateien wurden automatisch gegen das Manifest geprüft; keine Abweichung

Unmittelbar vor dem Deploy waren alle Server gestoppt, exklusiver Datenbankzugriff möglich und keine WAL-, SHM- oder Journaldatei vorhanden. Prisma meldete ausschließlich Migration 16 als ausstehend.

## Schemawerte vor und nach Migration 16

| Prüfwert | Vorher | Nachher |
| --- | ---: | ---: |
| Anwendungstabellen | 34 | 34 |
| Spalten | 565 | 565 |
| Fremdschlüssel | 92 | 92 |
| Indizes | 109 | 107 |
| eindeutige Regeln | 25 | 25 |
| Anwendungszeilen vor Anwendungstests | 353 | 353 |
| `AccountingPeriod`-Zeilen | 6 | 6 |
| `AccountingPeriod`-Spalten | 34 | 34 |
| Prisma-Migrationseinträge | 15 | 16 |

Kanonischer Geschäftsdatenhash vor und unmittelbar nach Migration 16:

`951FA79F5B64D7A361273D0C3BA0AF1ACFBCE93103FCDD757D1A7B726B6DA1DE`

Alle tabellenweisen Zeilenzahlen und Datenhashes waren unmittelbar nach der Migration unverändert. Die Migration erzeugte den Datenbank-Dateihash `68A2356A1944659EA6527007D505E36FBC1A1F5AD23FBBFAAF2D4375680A6738`.

## Entfernte Indizes und Tabellenrekonstruktion

Genau diese redundanten nicht eindeutigen Indizes wurden entfernt:

- `AnnualChecklist_functionSeparationExceptionId_idx`
- `AccountingPeriod_functionSeparationExceptionId_idx`

Die zugehörigen eindeutigen Regeln blieben erhalten. `AccountingPeriod` wurde nach dem geprüften SQLite-Verfahren vollständig rekonstruiert. Alle sechs Zeilen und alle 34 Spalten wurden übernommen. `lastStatusChangedAt` besitzt jetzt `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`.

## Fremdschlüsselregeln

Diese sieben Benutzerrelationen besitzen in Prisma-Schema und SQLite bewusst `ON UPDATE NO ACTION`:

- `Client.processorUserId`
- `Client.reviewerUserId`
- `Client.managementUserId`
- `AccountingPeriod.processorUserId`
- `AccountingPeriod.reviewerUserId`
- `AccountingPeriod.managementUserId`
- `WorkflowHistory.actorUserId`

`Client.payrollUserId` besitzt weiterhin `ON UPDATE CASCADE`. Insgesamt blieben 92 Fremdschlüssel erhalten.

## SQLite- und Prisma-Prüfungen

- `PRAGMA quick_check`: `ok`
- `PRAGMA integrity_check`: `ok`
- `PRAGMA foreign_key_check`: keine Verletzung
- `prisma migrate status`: 16 von 16 aktuell
- frischer Neuaufbau einer leeren Datenbank aus Migrationen 1 bis 16: erfolgreich
- Diff frische Datenbank zu `schema.prisma`: kein Unterschied
- Diff frische Datenbank zu echter `dev.db`: kein Unterschied
- Zielschemahash der frischen und der migrierten Datenbank: `BA1AFB71E5C80323684A53CDDCFCC1D4BBE648A1F6E0116262825249794DE3C0`

Der bekannte Drift aus Index-, Default-/Null- und `ON UPDATE`-Definitionen ist vollständig beseitigt.

## Anwendungstests und erwartete Testdatenänderungen

Der authentifizierte Entwicklungs-Smoke-Test mit dem künstlichen Konto Klara Leitung bestätigte ohne sichtbaren Anwendungsfehler:

- Dashboard,
- Mandanten,
- Rechnungswesenaufgaben,
- Jahresabschlussaufgaben,
- Statusübersicht,
- Verwaltung,
- Standardaufgaben,
- Ordo Campus,
- FiBu-Lohn-Arbeitsübersicht,
- Lohnrückfragen,
- Fahrzeuge.

Ein normaler Checklistenwert wurde über die reguläre Anwendungsservice-Schicht an Aufgabe 10 gespeichert. Der künstliche Hinweis `Kuenstlicher technischer Persistenztest nach Schema-Drift-Bereinigung am 04.08.2026.` blieb nach vollständigem Entwicklungsneustart erhalten. Dabei traten weder `AccountingPeriod`- noch Fremdschlüssel- oder Indexfehler auf.

Die Anwendungstests nach dem unveränderten Datenhashcheckpoint änderten erwartungsgemäß ausschließlich:

- `User.lastLoginAt` für Klara Leitung,
- `ChecklistTask.processingNote` und `updatedAt` für Aufgabe 10,
- zwei nachvollziehbare `WorkflowHistory`-Einträge aus den beiden technischen Speichervorgängen.

Dadurch stieg die Anwendungszeilenzahl nach den Anwendungstests von 353 auf 355. Der abschließende Datei-Hash der realen `dev.db` lautet `65C4029A5CA204870E790183EAA2AE3D85220EED82B4605DDEEC16849A28482C`. SQLite-Integrität und Fremdschlüsselprüfung blieben erfolgreich.

Die geschützte Systemintegrationsumgebung wurde aus allen 16 Migrationen neu aufgebaut und deterministisch befüllt. Ihre Diagnose enthielt keine Befunde. Sie deckte insbesondere die lange Checkliste, zentrale Sammelspeicherung, Folgeperiodenübernahme, Lohnrolle, Rückfragen, Fahrzeuge sowie Mehrfach- und Sammelpositionen mit künstlichen Daten ab.

Beim Wechsel des Browser-Testkontos endete der erste Entwicklungsprozess nach seinem vorgegebenen 120-Sekunden-Prüflimit. Der Browser zeigte danach einmal `Failed to fetch`; im Serverprotokoll lag kein Anwendungs- oder Datenbankfehler vor. Der anschließend neu gestartete Entwicklungs- und Produktionsbetrieb war fehlerfrei. Dieser Befund ist eine Prüfablaufunterbrechung, kein Produktfehler.

## Technische Gesamtprüfung

| Prüfung | Ergebnis |
| --- | --- |
| Prisma validate | erfolgreich |
| Prisma generate | erfolgreich, Prisma Client 6.19.3 |
| Prisma migrate status | 16/16 aktuell |
| Neuaufbau 1–16 | erfolgreich |
| Driftvergleich | kein Unterschied |
| Seed-Konsistenz auf Systemintegrationsbestand | erfolgreich |
| Systemintegrationsdiagnose | keine Befunde |
| ESLint | erfolgreich |
| TypeScript | erfolgreich |
| automatisierte Tests | 305 erfolgreich, 1 bewusst übersprungen |
| Produktions-Build | erfolgreich |
| Entwicklungsstart gegen `dev.db` | erfolgreich, HTTP 200 |
| Entwicklungsneustart und Persistenz | erfolgreich |
| produktionsnaher Start gegen `dev.db` | erfolgreich, Login HTTP 200 |

Der bewusst übersprungene Test ist weiterhin `tests/performance-smoke.test.ts`; er erfordert `RUN_PERFORMANCE_SMOKE=1`.

## Prüfung von `migrate dev` und Folgemigration

`prisma migrate dev` wurde nicht gegen die echte `dev.db` ausgeführt. Auf einer vollständigen Kopie meldete Prisma nach Migration 16:

`Already in sync, no schema change or pending migration was found.`

In einem ausschließlich unter `tmp` liegenden Harness wurde anschließend die künstliche Migration `20990101000000_schema_drift_follow_up_probe` ergänzt. Prisma erkannte genau diese Migration als ausstehend, wendete sie regulär an, meldete danach 17 von 17 Migrationen als aktuell und zeigte keinen Drift zum isolierten Testschema. Die künstliche Migration gehört nicht zum Projektstand.

Empfehlung: `prisma migrate dev` darf künftig für bewusst vorbereitete additive Entwicklung wieder kontrolliert verwendet werden. Voraussetzung sind ein vollständiger gemeinsamer Sicherungssatz, sauberer Git-Stand, aktueller Migrationsstatus und ein leerer Driftvergleich. Bei einer Reset-Aufforderung, unerwartetem Drift oder unerwarteter Migration ist sofort abzubrechen.

## Künftig zulässige und gesperrte Prisma-Befehle

Lesend beziehungsweise generierend zulässig:

- `prisma validate`
- `prisma generate`
- `prisma migrate status`
- `prisma migrate diff`

Nur kontrolliert nach vollständigem Backup und Preflight:

- `prisma migrate deploy`
- `prisma migrate dev` beziehungsweise `npm.cmd run db:migrate`

Gegen `prisma/dev.db` weiterhin verboten:

- `prisma migrate reset`
- `prisma db push`
- Seeds
- Testresets
- direkte Änderungen an `_prisma_migrations`
- nachträgliche Änderungen vorhandener Migrationen

## Rollback

Ein Rollback war nicht erforderlich. Falls sich nachträglich ein migrationsbedingter Fehler zeigen sollte:

1. Anwendung und Datenbankzugriffe stoppen.
2. Fehlerhaften Stand separat sichern.
3. Keine weiteren Prisma-Befehle ausführen.
4. `dev.db`, Umgebungsdateien und lokale Speicher gemeinsam aus `backups/schema-drift-deploy-20260804-081510` physisch wiederherstellen.
5. Manifest-Hashes, SQLite-Integrität, Fremdschlüssel, Geschäftsdatenhash und Prisma-Status prüfen.
6. Erst danach die Anwendung kontrolliert starten.

Es erfolgt keine Rückwärtsmigration und keine manuelle Reparatur der echten Datenbank.

## Verbleibende Warnungen

- Prisma 6.19.3 warnt, dass `package.json#prisma` mit Prisma 7 entfällt.
- Node meldet für TypeScript-Skripte weiterhin die experimentelle Transform-Types- und `MODULE_TYPELESS_PACKAGE_JSON`-Warnung.
- Der große Performance-Smoke-Test bleibt bewusst opt-in.
- `storage/fibu-lohn` ist im regulären Entwicklungsbestand mangels Belegen noch nicht vorhanden.
- Vollständige gemeinsame Backups bleiben wegen der fachlich relevanten lokalen Daten zwingend.

## Abschlussbewertung

`prisma/dev.db` ist nach Baseline und Driftbereinigung eine konsistente Entwicklungsgrundlage. Schema, Migrationshistorie, frischer Neuaufbau und Bestandsdatenbank stimmen überein. Weitere fachliche Entwicklung war nicht Teil dieses Auftrags.
