# Warnung zur Migrationsbaseline von `prisma/dev.db`

Stand: 31.07.2026

## Verbindlicher Schutzstatus

Die Datei `prisma/dev.db` ist strukturell lesbar und besteht die SQLite-Integritätsprüfung. Sie besitzt jedoch keine verlässlich registrierte Prisma-Migrationshistorie. `prisma migrate status` erkennt deshalb alle 15 im Projekt vorhandenen Migrationen als nicht angewendet, obwohl Teile oder der gesamte heutige Tabellenstand bereits vorhanden sind.

Gegen `prisma/dev.db` dürfen bis zu einer gesondert geprüften Baseline ausdrücklich nicht ausgeführt werden:

```powershell
prisma migrate reset
prisma migrate deploy
prisma db push
npm.cmd run db:reset
npm.cmd run db:reset:test
npm.cmd run db:migrate
```

Ebenso dürfen keine Seeds, Testresets oder manuell angepassten Migrationen gegen diesen Bestand ausgeführt werden.

## Sichere Entwicklungsumgebung

Für Entwicklung, Migrationstest, Seed und systemweite Prüfung ist ausschließlich die getrennte Systemintegrationsumgebung freigegeben:

- Datenbank: `prisma/system-integration.db`
- Campus-Speicher: `tmp/system-integration-storage/ordo-campus`
- FiBu-Lohn-Speicher: `tmp/system-integration-storage/fibu-lohn`

Zulässige Projektbefehle:

```powershell
npm.cmd run testdata:system-integration
npm.cmd run testdata:system-integration:diagnose
npm.cmd run dev:integration
npm.cmd run build:integration
npm.cmd run start:integration
```

Das Reset-Skript prüft die absoluten Zielpfade und muss bei jeder Abweichung abbrechen. Es darf weder `prisma/dev.db` noch reguläre Speicherordner verändern.

## Lokale Dateispeicher

Die beiden vorhandenen Dateien unter `storage/ordo-campus` besitzen derzeit keine Referenz in `prisma/dev.db`. Sie sind jedoch Bestandteil der übertragenen lokalen Sicherung und dürfen nicht ungeprüft gelöscht, verschoben oder überschrieben werden.

Der reguläre Ordner `storage/fibu-lohn` kann bei einem Bestand ohne Belegreferenzen fehlen. Er wird erst beim ersten regulären Upload durch den Belegservice angelegt. Sein Fehlen allein ist daher kein Nachweis eines unvollständigen Transfers.

## Herstellung einer späteren Baseline

Eine belastbare Baseline wird in einem eigenen technischen Auftrag ausschließlich auf einer vollständigen Datenbankkopie vorbereitet. Erforderlich sind mindestens:

1. vollständige Sicherung von Datenbank, Campus-Speicher, FiBu-Lohn-Speicher und lokaler Umgebungskonfiguration,
2. Schemaabgleich zwischen Datenbank und den 15 Migrationen,
3. dokumentierte Baseline-Entscheidung,
4. Probe-Anwendung auf einer Kopie,
5. vollständige Wiederherstellungsprobe,
6. festes Rollback-Verfahren.

Erst nach gesonderter Prüfung und Freigabe darf ein bestehender Entwicklungs- oder Pilotbestand in eine reguläre Prisma-Migrationshistorie überführt werden.
