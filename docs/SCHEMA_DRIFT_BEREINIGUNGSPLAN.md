# Plan zur verlustfreien Schema-Drift-Bereinigung

Stand: 04.08.2026

## Ziel

Nach Migration 16 sollen `schema.prisma`, die vollständige SQL-Historie, eine frisch migrierte Datenbank und eine Kopie der bestehenden `dev.db` dieselben bewusst gewählten Definitionen besitzen. Die echte `dev.db` bleibt bis zur ausdrücklichen Bestätigung des Testberichts unverändert.

## Geplante Änderungen

### Prisma-Schema

An sieben bereits mit `ON UPDATE NO ACTION` bestehenden Benutzerrelationen wird `onUpdate: NoAction` ausdrücklich dokumentiert. `AccountingPeriod.lastStatusChangedAt` bleibt verpflichtend mit `@default(now())`.

### Neue Migration 16

Vorgesehener Name:

`20260804080000_reconcile_schema_history_drift`

Die Migration wird manuell aus dem geprüften `migrate diff`-Entwurf abgeleitet und vor der ersten Anwendung vollständig gelesen. Sie verändert keine bestehende Migration.

Vorgesehene SQL-Schritte:

1. redundanten AnnualChecklist-Index löschen,
2. Fremdschlüsselprüfung verzögern und für die SQLite-Rekonstruktion kontrolliert deaktivieren,
3. `new_AccountingPeriod` mit allen 34 Spalten und dem Zielzustand anlegen,
4. alle Zeilen spaltengenau kopieren; `lastStatusChangedAt` nur im theoretischen Nullfall mit `CURRENT_TIMESTAMP` ergänzen,
5. alte Tabelle löschen und neue Tabelle in `AccountingPeriod` umbenennen,
6. sämtliche benötigten eindeutigen Regeln und Indizes neu anlegen, jedoch nicht den redundanten Einzelindex,
7. Fremdschlüsselprüfung wieder aktivieren.

## Kopienprüfung

1. Ausgangskopie aus dem Sicherungssatz erzeugen und vollständig analysieren.
2. Frische Referenzdatenbank aus Migrationen 1–16 aufbauen.
3. Migration 16 mit `migrate deploy` ausschließlich auf einer bytegenauen dev-Kopie anwenden.
4. Vorher/Nachher vergleichen:
   - Tabellen und Spalten,
   - Fremdschlüssel und Aktualisierungsregeln,
   - Indizes und eindeutige Regeln,
   - Zeilenzahlen und Datenhashes,
   - `quick_check`, `integrity_check` und `foreign_key_check`,
   - Migrationsstatus und Migrationseinträge.
5. Datenbank-zu-Datenbank-Diff zwischen migrierter dev-Kopie und frischer Referenz prüfen.
6. Datenbank-zu-Schema-Diff muss leer sein.
7. Anwendung gegen eine Laufzeitkopie starten und die Hauptmodule prüfen.

## Folgemigrationstest

Auf einer weiteren Kopie wird außerhalb des versionierten Migrationsordners eine künstliche Migration 17 ergänzt. Prisma muss sie als einzige ausstehende Migration erkennen, regulär anwenden und danach wieder einen aktuellen Status melden. Die künstliche Migration und ihre Datenbank bleiben unter `tmp` und werden nicht committed.

## Abbruchkriterien

Sofortiger Abbruch bei:

- anderem Ausgangsschema oder unerwarteten Nullwerten,
- Datenverlust oder verändertem Datenhash einer bestehenden Anwendungstabelle,
- fehlender oder zusätzlicher Fremdschlüssel-/Indexänderung,
- SQLite-Integritäts- oder Fremdschlüsselfehler,
- mehr als einer ausstehenden Migration,
- Anwendungs-, Test- oder Buildfehlern.

Bei einem Fehlschlag wird nur der betroffene Kopienstand beweisgesichert. Die echte `dev.db` benötigt in dieser Phase keinen Rollback, weil sie nicht verändert wird.

## Späteres Rollback der echten Bereinigung

Nach einer gesonderten Freigabe wäre der garantierte Rollback eine physische Wiederherstellung des gemeinsamen Sicherungssatzes:

1. Anwendung und Datenbankzugriffe stoppen.
2. Fehlerhaften Stand separat sichern.
3. Datenbank, `.env`, Campus-Speicher und FiBu-Lohn-Speicherzustand gemeinsam aus dem Sicherungssatz wiederherstellen.
4. SHA-256, SQLite-Integrität, Fremdschlüssel, Datenhashes und Prisma-Status prüfen.
5. Erst danach die Anwendung kontrolliert starten.

Es erfolgt keine Rückwärtsänderung an Migrationen und keine improvisierte Direktreparatur.

## Freigabegrenze

Erst ein vollständig erfolgreicher Kopientest begründet eine Go-/No-Go-Empfehlung. Die Anwendung von Migration 16 auf `prisma/dev.db` erfordert anschließend eine neue ausdrückliche Bestätigung.

## Durchführungsergebnis

Die ausdrückliche Bestätigung wurde erteilt. Der Plan wurde am 04.08.2026 ohne Abweichung ausgeführt:

- Sicherungscommit: `3bf35266fcb7d3494535ce103d5b4b617cfe7d4d`
- Sicherungssatz: `backups/schema-drift-deploy-20260804-081510`
- Ausgangshash: `508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`
- ausschließlich angewendet: `20260804080000_reconcile_schema_history_drift`
- Ergebnis: 16 von 16 Migrationen aktuell, kein Schema-Drift, Daten und Integrität erhalten
- Rollback: nicht erforderlich

Die vollständigen Nachweise stehen in `docs/SCHEMA_DRIFT_ABSCHLUSSBERICHT.md`.
