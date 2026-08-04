# Schutzstatus der Migrationsbaseline von `prisma/dev.db`

Stand: 04.08.2026

## Baseline und Driftbereinigung hergestellt

Die Migrationsbaseline von `prisma/dev.db` wurde am 31.07.2026 nach vollständiger Kopienprüfung und ausdrücklicher Freigabe hergestellt. Die Migrationen 1 bis 14 wurden mit `prisma migrate resolve --applied` registriert, ohne ihr SQL erneut auszuführen. Migration 15 wurde regulär mit `prisma migrate deploy` ausgeführt.

Der anschließend dokumentierte Schema-Historien-Drift wurde am 04.08.2026 nach erfolgreicher Kopienprüfung und erneutem vollständigem Sicherungssatz ausschließlich durch die additive Migration

`20260804080000_reconcile_schema_history_drift`

verlustfrei bereinigt. Prisma erkennt jetzt alle 16 Projektmigrationen als erfolgreich angewendet. `schema.prisma`, eine frisch aus Migrationen 1 bis 16 aufgebaute Datenbank und die echte `prisma/dev.db` stimmen strukturell überein. Keine bestehende Migration wurde verändert, gelöscht, umbenannt oder zusammengeführt.

Vollständige Nachweise:

- `docs/MIGRATIONSBASELINE_ABSCHLUSSBERICHT.md`
- `docs/SCHEMA_DRIFT_ANALYSE.md`
- `docs/SCHEMA_DRIFT_BEREINIGUNGSPLAN.md`
- `docs/SCHEMA_DRIFT_TESTBERICHT.md`
- `docs/SCHEMA_DRIFT_ABSCHLUSSBERICHT.md`

## Zulässiger Prisma-Betrieb

Diese Prüfkommandos sind weiterhin zulässig:

```powershell
prisma validate
prisma generate
prisma migrate status
prisma migrate diff
```

`prisma migrate deploy` darf gegen `prisma/dev.db` nur kontrolliert verwendet werden, wenn:

1. die anzuwendenden Migrationen unverändert, geprüft und datenbewahrend sind,
2. Datenbank, `.env`, Campus-Speicher und vorhandener FiBu-Lohn-Speicher gemeinsam gesichert und gehasht wurden,
3. Anwendung und Datenbankzugriffe gestoppt sind,
4. `prisma migrate status` ausschließlich die erwarteten neuen Migrationen meldet,
5. nach dem Deploy Status, Drift, SQLite-Integrität, Fremdschlüssel, Daten und Anwendung erneut geprüft werden.

`prisma migrate dev` beziehungsweise `npm.cmd run db:migrate` darf für künftige additive Entwicklungsarbeit wieder kontrolliert eingesetzt werden, aber nur nach demselben Sicherungs- und Preflight-Verfahren, bei sauberem Git-Stand und leerem Driftvergleich. Sobald Prisma einen Reset anbietet, Drift meldet oder eine unerwartete Migration erzeugen will, muss der Lauf abgebrochen werden. Ein Reset darf niemals bestätigt werden.

## Weiterhin ausdrücklich verboten

Gegen `prisma/dev.db` bleiben verboten:

```powershell
prisma migrate reset
prisma db push
npm.cmd run db:reset
npm.cmd run db:reset:test
npm.cmd run db:seed
```

Ebenso verboten sind Testresets, improvisierte Direktreparaturen in SQLite, direkte Änderungen an `_prisma_migrations` sowie Änderungen, Umbenennungen, Löschungen oder Zusammenführungen vorhandener Migrationen.

## Bereinigte Driftpunkte

Migration 16 hat genau diese historischen Abweichungen bereinigt:

- die redundanten nicht eindeutigen Indizes `AnnualChecklist_functionSeparationExceptionId_idx` und `AccountingPeriod_functionSeparationExceptionId_idx` wurden entfernt; die eindeutigen Regeln blieben erhalten,
- `AccountingPeriod.lastStatusChangedAt` besitzt jetzt `NOT NULL DEFAULT CURRENT_TIMESTAMP`,
- sieben bestehende Benutzerrelationen sind in Datenbank und `schema.prisma` bewusst mit `ON UPDATE NO ACTION` definiert,
- `Client.payrollUserId` behält `ON UPDATE CASCADE`.

Der bekannte Drift aus diesen drei Bereichen ist vollständig beseitigt. Ein isolierter `prisma migrate dev`-Test auf einer vollständigen Kopie meldete „Already in sync“; eine künstliche additive Migration 17 wurde anschließend regulär erkannt und angewendet.

## Lokale Dateispeicher und Rollback

Ein vollständiges Backup umfasst `prisma/dev.db`, `.env`, `.env.integration`, `storage/ordo-campus` und den vorhandenen Zustand von `storage/fibu-lohn` gemeinsam. Die beiden vorhandenen Campus-Dateien dürfen nicht ungeprüft gelöscht, verschoben oder überschrieben werden. Ein fehlender regulärer FiBu-Lohn-Speicher ist bei leerem Belegbestand zulässig und als Zustand zu dokumentieren.

Bei einem fehlgeschlagenen künftigen Migrationslauf wird nicht direkt repariert: Anwendung stoppen, fehlerhaften Datenbankstand separat sichern, vollständigen gemeinsamen Sicherungssatz physisch wiederherstellen und Hash, SQLite-Integrität, Fremdschlüssel, Migrationsstatus und Anwendungsstart erneut prüfen. Es erfolgt keine Rückwärtsmigration.
