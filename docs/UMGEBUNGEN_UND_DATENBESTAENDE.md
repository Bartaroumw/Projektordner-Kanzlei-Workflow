# Umgebungen und Datenbestände

Stand: 28.07.2026

| Betriebsart | Datenbank | Campus-Speicher | FiBu-Lohn-Speicher | Reset |
| --- | --- | --- | --- | --- |
| Entwicklung | `prisma/dev.db` aus `.env` | `storage/ordo-campus` | `storage/fibu-lohn` | Nein |
| Workflow-Test | `prisma/workflow-test.db` | `tmp/workflow-test-campus` | nicht maßgeblich | nur `testdata:workflow` |
| FiBu-Lohn-Abnahme | `prisma/fibu-lohn-acceptance.db` | getrennt im Abnahmebestand | `tmp/fibu-lohn-acceptance-storage/fibu-lohn` | nur `testdata:fibu-lohn` |
| Systemintegration | `prisma/system-integration.db` | `tmp/system-integration-storage/ordo-campus` | `tmp/system-integration-storage/fibu-lohn` | nur `testdata:system-integration` |
| Pilot | noch nicht eingerichtet | noch nicht eingerichtet | noch nicht eingerichtet | Nein |

Alle genannten Datenbanken und lokalen Speicherinhalte sind von Git ausgeschlossen.

Nach der PC-Übertragung wurden zwei unveränderte Dateien unter `storage/ordo-campus` festgestellt, denen `prisma/dev.db` aktuell keine Anhangsreferenz zuordnet. Sie stimmen mit der lokalen Sicherung überein und dürfen nicht ungeprüft gelöscht werden. `storage/fibu-lohn` kann bei einem Bestand ohne Belegreferenzen fehlen und wird beim ersten regulären Upload automatisch erzeugt.

## Entwicklung

```powershell
npm.cmd run dev
```

Dieser Befehl verwendet `.env` und damit den vorhandenen Entwicklungsbestand. Er löscht oder migriert nichts. Wegen der noch fehlenden Migrationsbaseline der `dev.db` dürfen keine Prisma-Reset-, Push- oder Deploy-Befehle gegen diesen Bestand ausgeführt werden.

## Systemintegration

```powershell
# Löscht ausschließlich die klar benannte Integrationsdatenbank und deren zwei Speicherordner.
npm.cmd run testdata:system-integration

# Lesende Konsistenzprüfung
npm.cmd run testdata:system-integration:diagnose

# Entwicklungsserver mit Integrationsbestand
npm.cmd run dev:integration

# Produktions-Build und lokaler Produktionsstart mit Integrationsbestand
npm.cmd run build:integration
npm.cmd run start:integration
```

Das Reset-Skript prüft die absoluten Zielpfade. Es bricht ab, wenn Entwicklungs-, Workflow-, Abnahme-, Pilot- oder Produktivpfade übergeben werden. Es führt `prisma migrate deploy`, Prisma-Client-Erzeugung, Hauptseed, Integrationsergänzungen, Diagnose und `prisma migrate status` aus.

Unter Windows mit Node.js 24 und Prisma 6 wird die zuvor pfadgeprüfte Integrationsdatei leer angelegt, bevor `migrate deploy` startet. Das vermeidet einen reproduzierten Schema-Engine-Fehler beim erstmaligen Erstellen einer SQLite-Datei und verändert die Migrationen nicht.

## Sicherung

Ein vollständiger Bestand besteht aus:

1. SQLite-Datenbank,
2. Ordo-Campus-Dateispeicher,
3. FiBu-Lohn-Dateispeicher,
4. passender lokaler Umgebungsdatei.

Nur die SQLite-Datei zu kopieren ist nach Einführung der geschützten Anhänge unvollständig. Die Sicherung vor der Integrationsprüfung liegt lokal und ausgeschlossen unter `backups/2026-07-28_before_system_integration`.

## Pilot und Migrationsbaseline

Ein Pilotbestand darf nicht durch Kopieren der gegenwärtigen `dev.db` zum Dauerbestand erklärt werden. Zuerst ist eine eigene Migrationsbaseline mit:

- vollständiger Sicherung,
- dokumentiertem Schemaabgleich,
- Probe-Wiederherstellung,
- Anwendung auf einer Kopie,
- festem Rollback-Verfahren

herzustellen. Danach kann ein getrennter Pilotpfad mit eigenem Backup- und HTTPS-/Netzwerkkonzept eingerichtet werden.
