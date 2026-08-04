# Testbericht zur Schema-Drift-Bereinigung

Stand: 04.08.2026

Branch: `codex/schema-drift-bereinigung`

Ausgangscommit: `0fad6e29e9750a1d37da27ebb0f402efd8737cfd`

Status: Kopienprüfung vollständig erfolgreich

## Schutzstatus und Ablaufprotokoll

`prisma/dev.db` wurde nicht verändert. Ihr SHA-256-Wert ist vor und nach allen Prüfungen unverändert:

`508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`

Der vollständige Sicherungssatz wurde am 04.08.2026 um 07:42:46 Uhr unter `backups/schema-drift-20260804-074246` erstellt. Das dortige `MANIFEST.md` enthält die SHA-256-Werte von Datenbank, Schema, allen 15 Ausgangsmigrationen, Umgebungsprofilen und Campus-Speicher. `storage/fibu-lohn` war im Ausgangsstand nicht vorhanden und wurde deshalb als fehlend protokolliert.

Die technische Prüfung verlief in dieser Reihenfolge:

1. exklusiver Lesezugriff, Hash und bytegenaue Sicherung der echten Datenbank,
2. bytegenaue Arbeitskopie `dev-copy-before.db`,
3. frische Referenz `fresh15.db` aus den unveränderten Migrationen 1 bis 15,
4. Driftanalyse zwischen Prisma-Schema, beiden Datenbanken und SQL-Historie,
5. Anpassung der sieben deklarativen `onUpdate`-Regeln und Erstellung der additiven Migration 16,
6. Anwendung der Migration 16 ausschließlich auf `dev-copy-migration16.db`,
7. Neuaufbau von `fresh16.db` aus den Migrationen 1 bis 16,
8. vollständiger Vorher-/Nachher- und Datenbank-zu-Datenbank-Vergleich,
9. Nullwert-Sicherheitstest auf `null-backfill-copy.db`,
10. künstliche Folgemigration 17 in einem isolierten Harness unter `tmp`,
11. Wiederherstellungstest des Sicherungssatzes in ein isoliertes Ziel unter `tmp`,
12. Prisma-, Qualitäts-, Test-, Build- und Laufzeitprüfungen gegen Kopien.

Alle Arbeitsdatenbanken und die künstliche Migration 17 liegen ausschließlich unter `tmp/schema-drift-20260804-074246` und sind vom Git-Stand ausgeschlossen.

## Migration 16

Neue additive Migration:

`20260804080000_reconcile_schema_history_drift`

Sie führt genau zwei Datenbankänderungen aus:

- Entfernung der redundanten nicht eindeutigen Indizes auf `AnnualChecklist.functionSeparationExceptionId` und `AccountingPeriod.functionSeparationExceptionId`; die eindeutigen Regeln bleiben bestehen.
- datenbewahrende SQLite-Rekonstruktion von `AccountingPeriod`, damit `lastStatusChangedAt` künftig `NOT NULL DEFAULT CURRENT_TIMESTAMP` besitzt.

Die bestehenden Migrationen 1 bis 15 wurden nicht geändert, gelöscht, umbenannt oder zusammengeführt. Für `Client` und `WorkflowHistory` ist keine Datenbankänderung erforderlich; ihre vorhandenen `ON UPDATE NO ACTION`-Regeln werden im Prisma-Schema nur ausdrücklich dokumentiert.

## Vorher-/Nachher-Vergleich der dev-Kopie

| Prüfwert | Vor Migration 16 | Nach Migration 16 | Ergebnis |
| --- | ---: | ---: | --- |
| Anwendungstabellen | 34 | 34 | unverändert |
| Spalten | 565 | 565 | unverändert |
| Fremdschlüssel | 92 | 92 | unverändert |
| Indizes | 109 | 107 | genau zwei redundante Indizes entfernt |
| Eindeutige Indizes/Regeln | 25 | 25 | unverändert |
| Anwendungszeilen | 353 | 353 | unverändert |
| Prisma-Migrationseinträge | 15 | 16 | Migration 16 regulär protokolliert |

Kanonischer Gesamtdatenhash aller 34 Anwendungstabellen vor und nach Migration 16:

`951FA79F5B64D7A361273D0C3BA0AF1ACFBCE93103FCDD757D1A7B726B6DA1DE`

Auch sämtliche tabellenweisen Zeilenzahlen und Datenhashes sind identisch. Der kanonische Hash sortiert Spalten unabhängig von ihrer physischen SQLite-Position; damit wird eine reine Spaltenreihenfolge bei einer Tabellenrekonstruktion nicht fälschlich als Datenänderung gewertet.

## Schema- und Integritätsprüfung

- `dev-copy-before.db` und `fresh15.db` hatten denselben Ausgangsschemahash `8A957E42C2B2779F487B2C39C52200B35CC171EA3F0C0A5D6F7C3F5A20D14364`.
- Migrierte dev-Kopie und `fresh16.db` haben denselben Zielschemahash `BA1AFB71E5C80323684A53CDDCFCC1D4BBE648A1F6E0116262825249794DE3C0`.
- `prisma migrate diff` meldet weder zwischen aktualisiertem Prisma-Schema und `fresh16.db` noch zwischen Prisma-Schema und migrierter dev-Kopie einen Unterschied.
- Der Datenbank-zu-Datenbank-Diff zwischen `fresh16.db` und migrierter dev-Kopie ist leer.
- `PRAGMA quick_check`: `ok`.
- `PRAGMA integrity_check`: `ok`.
- `PRAGMA foreign_key_check`: keine Verletzung.
- Alle 92 Fremdschlüssel bleiben vorhanden.
- Die sieben ausgewählten Benutzerrelationen besitzen `ON UPDATE NO ACTION`; `Client.payrollUserId` behält das abweichende und bereits historisch korrekte `ON UPDATE CASCADE`.
- Der zusätzliche Nullwerttest ersetzte auf einer gesonderten Kopie einen der sechs vorhandenen Werte von `AccountingPeriod.lastStatusChangedAt` vorübergehend durch `NULL`. Migration 16 übernahm alle sechs Zeilen und ersetzte genau diesen Nullwert sicher durch `CURRENT_TIMESTAMP`.

## Migrationsstatus und Folgemigration 17

Sowohl `dev-copy-migration16.db` als auch `fresh16.db` werden mit 16 von 16 Migrationen als aktuell erkannt.

Für den Folgetest wurde in einem isolierten, nicht versionierten Migrationsverzeichnis eine künstliche Migration `20990101000000_schema_drift_follow_up_probe` ergänzt. Prisma erkannte genau diese eine Migration als ausstehend, wendete sie regulär an und meldete danach 17 von 17 Migrationen als aktuell. Die künstliche Tabelle blieb leer; Zeilenzahlen und Datenhashes aller zuvor vorhandenen Tabellen blieben unverändert. SQLite-Integrität und Fremdschlüsselprüfung blieben erfolgreich.

Damit ist eine normale additive Folgemigration nach Migration 16 technisch möglich. Die künstliche Migration 17 gehört nicht zum Projektstand und wird nicht committed.

## Wiederherstellungstest

Die gesicherte Datenbank und beide Campus-Dateien wurden in ein isoliertes Wiederherstellungsziel kopiert. Die wiederhergestellten SHA-256-Werte stimmen bytegenau mit dem Manifest überein. Die wiederhergestellte Datenbank besitzt denselben Datei-, Schema- und Geschäftsdatenhash wie der Ausgangsstand; `quick_check` und `integrity_check` ergeben `ok`, `foreign_key_check` meldet keine Verletzung und Prisma enthält wieder die ursprünglichen 15 Einträge.

Ein späterer Rollback der echten Bereinigung erfolgt deshalb nicht durch Rückwärtsmigration, sondern durch gemeinsame physische Wiederherstellung des vor dem Deploy erzeugten Sicherungssatzes bei gestoppter Anwendung.

## Prisma, Qualität und Anwendung

| Prüfung | Ergebnis |
| --- | --- |
| `prisma validate` | erfolgreich |
| `prisma generate` | erfolgreich, Prisma Client 6.19.3 |
| `prisma migrate status` auf migrierter Kopie | erfolgreich, 16/16 aktuell |
| vollständige Migration auf leerer Datenbank | erfolgreich, 16/16 aktuell |
| ESLint | erfolgreich, keine Fehler |
| TypeScript | erfolgreich, keine Fehler |
| automatisierte Tests | 305 erfolgreich, 1 übersprungen |
| Produktions-Build | erfolgreich, Next.js 16.2.12 |
| Entwicklungsstart | erfolgreich gegen Kopie, `/anmelden` HTTP 200 |
| Produktionsstart | erfolgreich gegen Kopie, `/anmelden` HTTP 200 |

Der erste Testlauf enthielt genau einen Fehler: Ein technischer Umgebungstest erwartete noch fest 15 Migrationen und den bisherigen letzten Ordner. Diese Erwartung wurde minimal auf 16 und `20260804080000_reconcile_schema_history_drift` aktualisiert. Der anschließende vollständige Lauf war erfolgreich.

Prisma weist weiterhin darauf hin, dass die Konfiguration unter `package.json#prisma` für Prisma 7 veraltet sein wird. Das betrifft die Driftbereinigung nicht und wurde in diesem Arbeitsschritt bewusst nicht restrukturiert.

## Bestätigung und Ausführung auf `prisma/dev.db`

Die Kopienprüfung und das technische Go wurden ausdrücklich bestätigt. Nach Sicherungscommit und neuem vollständigem Sicherungssatz wurde am 04.08.2026 ausschließlich Migration 16 mit `prisma migrate deploy` auf die echte `prisma/dev.db` angewendet.

Die unmittelbare Nachprüfung bestätigte:

- 16 von 16 Migrationen aktuell,
- 34 Anwendungstabellen, 565 Spalten, 92 Fremdschlüssel und 25 eindeutige Regeln,
- 353 Anwendungszeilen vor den ausdrücklich erlaubten Anwendungsprüfungen,
- sechs unveränderte `AccountingPeriod`-Zeilen und 34 Spalten,
- identische tabellenweise Datenhashes und unveränderten Geschäftsdatenhash,
- genau zwei entfernte redundante Indizes,
- `lastStatusChangedAt` als `NOT NULL DEFAULT CURRENT_TIMESTAMP`,
- sieben Benutzerrelationen mit `ON UPDATE NO ACTION` und `Client.payrollUserId` weiterhin mit `ON UPDATE CASCADE`,
- `quick_check` und `integrity_check` jeweils `ok`, keine Fremdschlüsselverletzung,
- keinen Unterschied zwischen Prisma-Schema, frischer 1–16-Datenbank und echter `dev.db`.

Die danach erlaubten Anwendungstests änderten ausschließlich künstliche Testdaten: `User.lastLoginAt` für Klara Leitung, eine klar gekennzeichnete Bearbeitungsnotiz an Aufgabe 10 sowie zwei zugehörige Workflow-Historieneinträge. Diese Änderungen erfolgten nach dem unveränderten Migrations-Datenhashcheckpoint und sind keine Migrationsabweichung.

Ein isolierter `prisma migrate dev`-Lauf auf einer vollständigen Kopie meldete „Already in sync“. Eine ebenfalls isolierte künstliche Migration 17 wurde als einzige ausstehende Migration erkannt, angewendet und ergab anschließend erneut einen leeren Driftvergleich.

**Abschlussergebnis:** technisch und operativ erfolgreich; kein Rollback erforderlich. Künftige additive Migrationen sind wieder möglich, müssen wegen der relevanten lokalen Daten aber weiterhin mit vollständiger gemeinsamer Sicherung, sauberem Git-Stand und Drift-/Statusprüfung vorbereitet werden.
