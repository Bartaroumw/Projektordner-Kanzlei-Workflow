# Ordo Campus 2 – Migration und Wiederherstellung

Stand: 05.08.2026

## Migration 18

`20260805160000_ordo_campus_2_knowledge_platform` ist eine additive SQLite-Migration. Sie legt die neuen Campus-2-Tabellen und Indizes an, erzeugt 42 stabile Wissensgebiete und vier initiale Lernpfade und übernimmt anschließend jeden vorhandenen alten Wissensdatensatz genau einmal.

Für jeden Altinhalt werden übertragen:

- sämtliche Textfelder, Status-, Benutzer- und Zeitangaben,
- die bisherige Standardaufgabe als Hauptanleitung,
- vorhandene Verknüpfungen aus Rechnungswesen–Lohn-Themen über die gespeicherte `campusStandardTaskId`, ohne Titelraten,
- alle Linkmetadaten,
- alle Anhangsmetadaten mit unverändertem `storageKey` und `storedFileName`,
- alle Verlaufseinträge mit eindeutiger Alt-ID,
- ein zusätzlicher, nachvollziehbarer Migrationsvermerk,
- ein fachlich passendes Hauptgebiet und gegebenenfalls das Gebiet Kanzleistandards,
- passende Lernpfadzuordnungen ohne Textkopie.

Die alten Tabellen, Dateien, Aufgaben, Checklisten, Abstimmungen und Snapshots werden nicht geändert oder gelöscht. Eindeutige Herkunftsschlüssel verhindern künstliche Dubletten. Die SQL-Migration ist nach erfolgreicher Anwendung durch Prisma genau einmal registriert; die ergänzende Seed-Hilfe ist ebenfalls idempotent.

## Kopienprüfung

Der Projektbefehl

```powershell
npm.cmd run test:migration:ordo-campus-2-copy
```

arbeitet ausschließlich mit einer bytegenauen Kopie von `prisma/dev.db`. Er prüft vor und nach der Migration SHA-256, `quick_check`, `foreign_key_check`, Tabellen, Zeilenzahlen und Inhalts-Hashes, wendet alle Migrationen kontrolliert an, wiederholt den Deploy zur Idempotenzprüfung und testet die bytegenaue Wiederherstellung. Die Quelle und die regulären Speicherordner bleiben unverändert.

Im bestätigten Kopientest wurden 8 Altinhalte, 7 Links, 0 referenzierte Altanhänge und 8 Altverlaufseinträge eindeutig übernommen. Es entstanden 8 unabhängige Inhalte, 8 Aufgabenverknüpfungen, 6 Themenverknüpfungen, 42 Gebiete und 4 Lernpfade. Alle 36 bereits vorhandenen Tabellen blieben einschließlich Zeilenzahlen und Inhalts-Hashes unverändert. Der zweite Deploy erzeugte keine Änderung; SQLite-Integrität und Fremdschlüsselprüfung waren erfolgreich. Der geprüfte Quellhash der unveränderten `dev.db` lautete `97f008e33a78c334395378c8df2c84bbcc95986c03ddca3c7de29de59cc6743a`.

## Kontrollierte Anwendung auf `dev.db`

Vor dem Deploy müssen Anwendung und Schreibzugriffe beendet, Git sauber und der Prisma-Migrationsstatus erwartungsgemäß sein. Anschließend ist zwingend ein gemeinsamer Sicherungssatz zu erstellen:

```powershell
npm.cmd run backup:local -- --confirm-dev
npm.cmd exec prisma migrate status
npm.cmd exec prisma migrate deploy
```

Ein vollständiger Satz enthält `prisma/dev.db`, `storage/ordo-campus`, `storage/fibu-lohn`, `storage/profile-images` und `.env` samt SHA-256-Manifest. `migrate reset`, `db push`, vollständige Seeds und Testresets gegen `dev.db` bleiben verboten.

## Rollback

1. Anwendung vollständig beenden.
2. Den fehlgeschlagenen Zustand zusätzlich sichern und nicht überschreiben.
3. Datenbank und alle drei Speicherordner gemeinsam aus demselben vor Migration 18 erzeugten Sicherungssatz wiederherstellen.
4. `.env` aus demselben Satz wiederherstellen, sofern sie abweicht.
5. SHA-256 mit dem Manifest vergleichen.
6. SQLite-`quick_check`, `foreign_key_check`, Prisma-Migrationsstatus und Dateireferenzen prüfen.
7. Erst danach die Anwendung wieder starten.

Ein SQL-Rückwärtsumbau der echten Datenbank ist nicht das vorgesehene Rollback. Die sichere Rückkehr erfolgt über den vollständigen gemeinsamen Sicherungssatz.
