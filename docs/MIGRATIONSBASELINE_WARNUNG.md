# Schutzstatus der Migrationsbaseline von `prisma/dev.db`

Stand: 01.08.2026

## Baseline hergestellt

Die Migrationsbaseline von `prisma/dev.db` wurde am 31.07.2026 nach vollständiger Kopienprüfung und ausdrücklicher Freigabe hergestellt. Prisma erkennt alle 15 unveränderten Projektmigrationen als erfolgreich angewendet. Das aktuelle Datenbankschema entspricht dem Endstand der 15. Migration; SQLite-Integrität und Fremdschlüsselprüfung sind ohne Befund.

Die Migrationen 1 bis 14 wurden einzeln mit `prisma migrate resolve --applied` registriert, ohne ihr SQL erneut auszuführen. Ausschließlich `20260728140000_workflow_navigation_payroll_positions` wurde regulär mit `prisma migrate deploy` ausgeführt. Keine bestehende Migration wurde verändert, gelöscht, umbenannt oder zusammengeführt.

Vollständige Nachweise:

- `docs/MIGRATIONSBASELINE_PLAN.md`
- `docs/MIGRATIONSBASELINE_TESTBERICHT.md`
- `docs/MIGRATIONSBASELINE_ABLAUFPROTOKOLL.md`
- `docs/MIGRATIONSBASELINE_ABSCHLUSSBERICHT.md`

## Zulässiger Prisma-Betrieb

`prisma migrate deploy` darf gegen `prisma/dev.db` wieder kontrolliert verwendet werden, wenn sämtliche folgenden Bedingungen erfüllt sind:

1. Die anzuwendenden Migrationen sind unverändert, geprüft und datenbewahrend.
2. Datenbank, `.env`, Campus-Speicher und vorhandener FiBu-Lohn-Speicher wurden gemeinsam gesichert und gehasht.
3. Alle Anwendungen und Datenbankzugriffe sind gestoppt.
4. `prisma migrate status` zeigt ausschließlich die erwarteten neuen Migrationen als ausstehend.
5. Nach dem Deploy werden Migrationstatus, SQLite-Integrität, Fremdschlüssel, Daten und Anwendung vollständig geprüft.

`prisma validate`, `prisma generate` und `prisma migrate status` sind weiterhin zulässige Prüfkommandos.

## Weiterhin ausdrücklich verboten

Bis zur separat beauftragten und auf Kopien geprüften Driftbereinigung dürfen gegen `prisma/dev.db` nicht ausgeführt werden:

```powershell
prisma migrate reset
prisma migrate dev
prisma db push
npm.cmd run db:reset
npm.cmd run db:reset:test
npm.cmd run db:migrate
```

Ebenso verboten sind Seeds, Testresets, improvisierte Direktreparaturen in SQLite sowie Änderungen, Umbenennungen, Löschungen oder Zusammenführungen vorhandener Migrationen.

## Verbleibender Schema-Historien-Drift

Die Baseline korrigiert den bekannten Drift ausdrücklich nicht:

- zusätzlicher nicht eindeutiger Index `AnnualChecklist_functionSeparationExceptionId_idx` neben der eindeutigen Regel,
- `AccountingPeriod.lastStatusChangedAt` ist in der Migrationshistorie nullable und ohne Standardwert, im Prisma-Schema verpflichtend mit `now()`,
- einzelne `User`-Fremdschlüssel in `AccountingPeriod`, `Client` und `WorkflowHistory` besitzen in SQLite `ON UPDATE NO ACTION`, während `schema.prisma` `CASCADE` beschreibt.

Dieser Drift ist kein Hindernis für den normalen lokalen Anwendungsstart oder kontrolliertes `migrate deploy`. Er verhindert jedoch weiterhin den sicheren Einsatz von `prisma migrate dev` und `prisma db push`.

## Lokale Dateispeicher und Rollback

Ein vollständiges Backup umfasst `prisma/dev.db`, `.env`, `storage/ordo-campus` und den vorhandenen Zustand von `storage/fibu-lohn` gemeinsam. Die beiden vorhandenen Campus-Dateien dürfen nicht ungeprüft gelöscht, verschoben oder überschrieben werden. Ein fehlender regulärer FiBu-Lohn-Speicher ist bei leerem Belegbestand zulässig.

Bei einem fehlgeschlagenen künftigen Migrationslauf wird nicht direkt repariert: Anwendung stoppen, fehlerhaften Datenbankstand separat sichern, vollständigen gemeinsamen Sicherungssatz physisch wiederherstellen und Hash, SQLite-Integrität, Fremdschlüssel, Migrationstatus und Anwendungsstart erneut prüfen.
