# Analyse des Schema-Historien-Drifts

Stand: 04.08.2026

Branch: `codex/schema-drift-bereinigung`

Ausgangscommit: `0fad6e29e9750a1d37da27ebb0f402efd8737cfd`

## Schutzgrenze

Diese Analyse betrifft ausschließlich vollständige Kopien und neu aufgebaute Referenzdatenbanken. `prisma/dev.db` wird in diesem Arbeitsschritt nicht verändert. Die 15 bestehenden Migrationen bleiben bytegenau unverändert. Verboten sind insbesondere `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, Seeds gegen `dev.db` und direkte Änderungen an `_prisma_migrations`.

Der vollständige Ausgangssatz liegt unter:

`backups/schema-drift-20260804-074246`

Das Manifest enthält SHA-256-Prüfsummen für `dev.db`, Umgebungsdateien, Prisma-Schema, alle 15 Migrationen und den Campus-Speicher.

## Vergleichsquellen

Verglichen wurden:

1. `prisma/schema.prisma`,
2. die unveränderten SQL-Dateien unter `prisma/migrations`,
3. eine bytegenaue Kopie der baselined `prisma/dev.db`,
4. eine leere Referenzdatenbank, auf die alle 15 Migrationen mit `migrate deploy` angewendet wurden.

Die dev-Kopie und die frisch migrierte Referenz besitzen denselben Schemahash `8A957E42C2B2779F487B2C39C52200B35CC171EA3F0C0A5D6F7C3F5A20D14364`. Der Drift liegt damit nicht zwischen `dev.db` und der Historie, sondern zwischen beiden Datenbankständen und dem deklarativen Prisma-Schema.

Prisma beschreibt `migrate diff` als lesenden Vergleich beliebiger Schemaquellen. Die Migrationshistorie ist eigenständige technische Wahrheit und muss vollständig versioniert werden; angepasste SQL-Migrationen können Informationen enthalten, die das Prisma-Schema nicht ausdrückt:

- [Prisma: migrate diff](https://docs.prisma.io/docs/cli/migrate/diff)
- [Prisma: Migration histories](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories)
- [Prisma: Mental model](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model)

## Driftpunkt 1: redundante Indizes

### Aktueller Zustand

Migration `20260727140000_function_separation_exception` erzeugt für `functionSeparationExceptionId` sowohl einen nicht eindeutigen als auch einen eindeutigen Index:

- `AnnualChecklist_functionSeparationExceptionId_idx`
- `AnnualChecklist_functionSeparationExceptionId_key`
- `AccountingPeriod_functionSeparationExceptionId_idx`
- `AccountingPeriod_functionSeparationExceptionId_key`

`schema.prisma` enthält für beide Felder nur `@unique` und keinen zusätzlichen `@@index`. Die dev-Kopie und die frisch migrierte Referenz enthalten jeweils beide Indizes. Prisma meldet den AnnualChecklist-Index ausdrücklich als zu entfernen; der gleichartige AccountingPeriod-Index verschwindet als Teil der ohnehin erforderlichen Tabellenrekonstruktion.

### Ursache

Die historische Migration hat neben der eindeutigen Regel jeweils einen zweiten Index auf derselben Einzelspalte angelegt. Der eindeutige SQLite-Index kann dieselben Gleichheits- und Joinzugriffe bedienen. Der zusätzliche Index erhöht nur Speicher- und Schreibaufwand.

### Empfohlener Zielzustand

Beide nicht eindeutigen Indizes werden in einer neuen Migration 16 entfernt. Die eindeutigen Regeln bleiben vollständig erhalten. `schema.prisma` muss hierfür nicht geändert werden.

## Driftpunkt 2: `AccountingPeriod.lastStatusChangedAt`

### Aktueller Zustand

`schema.prisma` definiert:

```prisma
lastStatusChangedAt DateTime @default(now())
```

Migration `20260726183000_monthly_review_workflow` fügte dagegen eine nullable Spalte ohne Datenbankdefault hinzu und befüllte nur die damals bestehenden Zeilen mit `CURRENT_TIMESTAMP`. Dev-Kopie und frische Referenz besitzen daher `DATETIME` ohne `NOT NULL` und ohne Default. In der dev-Kopie existieren sechs Perioden; keine besitzt einen Nullwert.

### Ursache

Die additive Alt-Migration vermied beim ersten Hinzufügen der Spalte eine SQLite-Tabellenrekonstruktion und ergänzte anschließend ein Backfill. Die gewünschte dauerhafte Spaltendefinition aus `schema.prisma` wurde nie mit einer Folgemigration in die SQL-Historie überführt.

### Empfohlener Zielzustand

Die fachliche Bedeutung ist ein immer vorhandener Zeitpunkt der letzten Statusänderung. Neue Perioden sollen ohne zusätzlichen Aufrufercode einen Ausgangswert erhalten. Deshalb bleibt `schema.prisma` unverändert: `NOT NULL` und `DEFAULT CURRENT_TIMESTAMP` sind der Zielzustand. Migration 16 rekonstruiert ausschließlich `AccountingPeriod`, kopiert alle Spalten und verwendet für den Sicherheitsfall `coalesce(lastStatusChangedAt, CURRENT_TIMESTAMP)`.

## Driftpunkt 3: `ON UPDATE` an sieben älteren Benutzerrelationen

### Aktueller Zustand

Migration `20260726213000_local_users_auth` fügte diese Fremdschlüssel per `ALTER TABLE ... ADD COLUMN ... REFERENCES` ohne `ON UPDATE` hinzu:

- `Client.processorUserId`
- `Client.reviewerUserId`
- `Client.managementUserId`
- `AccountingPeriod.processorUserId`
- `AccountingPeriod.reviewerUserId`
- `AccountingPeriod.managementUserId`
- `WorkflowHistory.actorUserId`

SQLite verwendet deshalb `ON UPDATE NO ACTION`. Dev-Kopie und frisch migrierte Referenz stimmen darin überein. Da `schema.prisma` keine `onUpdate`-Angabe enthält, interpretiert Prisma diese Relationen als `CASCADE` und würde drei Tabellen rekonstruieren.

`Client.payrollUserId` ist nicht betroffen: Die spätere Migration 14 definierte dort ausdrücklich `ON UPDATE CASCADE`.

### Ursache

Die sieben älteren Spalten wurden mit verkürzter SQLite-Fremdschlüsselsyntax angelegt. Das Prisma-Schema übernahm die Löschregel `SetNull`, dokumentierte die historische Aktualisierungsregel jedoch nicht ausdrücklich.

### Empfohlener Zielzustand

Benutzer-IDs sind unveränderliche technische Primärschlüssel; die Anwendung aktualisiert Benutzerattribute, aber keine Benutzer-ID. `NO ACTION` ist daher die strengere und datenbewahrende Regel. Eine Rekonstruktion von `Client` und `WorkflowHistory` nur für eine praktisch ungenutzte Primärschlüssel-Kaskade wäre unverhältnismäßig.

`schema.prisma` wird an diesen sieben Relationen ausdrücklich um `onUpdate: NoAction` ergänzt. Migration 16 behält bei der ohnehin erforderlichen Rekonstruktion von `AccountingPeriod` dieselbe Regel bei. Für `Client` und `WorkflowHistory` ist keine Datenbankänderung erforderlich.

## SQLite-Besonderheiten

SQLite kann `NOT NULL`, Default und Fremdschlüsseldefinitionen einer bestehenden Spalte nicht mit einem einfachen `ALTER COLUMN` ändern. Die offizielle sichere Vorgehensweise ist: neue Tabelle anlegen, Daten kopieren, alte Tabelle löschen, neue Tabelle umbenennen, Indizes rekonstruieren und anschließend `foreign_key_check` ausführen. Das erstmalige Umbenennen der alten Tabelle ist ausdrücklich nicht die sichere Variante:

- [SQLite: ALTER TABLE – Making Other Kinds Of Table Schema Changes](https://sqlite.org/lang_altertable.html)

Für `AccountingPeriod` existieren keine Trigger oder Views. Die Migration muss trotzdem alle Spalten, Fremdschlüssel, eindeutigen Regeln und Indizes vollständig rekonstruieren und vor sowie nach der Kopie Integritätsprüfungen bestehen.

## Technische Entscheidung

Eine neue additive Migration 16 ist erforderlich. Sie soll ausschließlich:

1. `AnnualChecklist_functionSeparationExceptionId_idx` entfernen,
2. `AccountingPeriod` datenbewahrend mit `lastStatusChangedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` rekonstruieren,
3. dabei die sieben bewusst gewählten `NO ACTION`-Regeln konsistent mit dem angepassten Prisma-Schema halten,
4. den ebenfalls redundanten `AccountingPeriod_functionSeparationExceptionId_idx` bei der Indexrekonstruktion nicht wieder anlegen.

Keine andere Tabelle und keine fachliche Logik werden verändert.
