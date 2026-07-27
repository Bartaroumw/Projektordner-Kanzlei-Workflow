# Backup und Wiederherstellung

Stand: 27.07.2026

Diese Anleitung gilt für den lokalen Betrieb von Ordo Caroli. Vor jedem Eingriff muss die Anwendung beendet werden. Das Backup enthält ausschließlich lokale Daten und wird nicht in eine Cloud übertragen.

## Was gesichert werden muss

- `prisma/dev.db`: SQLite-Datenbank mit Benutzern, Mandanten, Checklisten, Wissen und Verläufen
- `storage/ordo-campus`: interne Ordo-Campus-Anhänge
- `.env`: lokale Konfiguration; diese Datei enthält keine Testdaten und darf nicht in Git eingecheckt werden
- Quellcode und Migrationen: über das lokale Git-Repository

Die Datenbank und der Anhangsordner gehören fachlich zusammen. Beide müssen immer zum selben Zeitpunkt gesichert und gemeinsam wiederhergestellt werden.

## Vollständiges Backup

1. Den Entwicklungs- oder Produktionsserver mit `Strg+C` beenden.
2. Im Projektordner einen neuen, eindeutig datierten Ordner unter `backups` anlegen, beispielsweise `backups/2026-07-27_ordo-caroli`.
3. `prisma/dev.db` in diesen Ordner kopieren.
4. Den vollständigen Ordner `storage/ordo-campus` in diesen Ordner kopieren. Ist er noch nicht vorhanden, existieren noch keine lokalen Anhänge.
5. `.env` in diesen Ordner kopieren.
6. Für die drei Sicherungsbestandteile Dateigröße und Änderungsdatum kontrollieren.
7. Optional mit `Get-FileHash -Algorithm SHA256` Prüfsummen erzeugen.

Der Ordner `backups` ist durch `.gitignore` ausgeschlossen.

## Wiederherstellung

1. Ordo Caroli vollständig beenden.
2. Vom aktuellen Zustand nochmals ein separates Sicherheitsbackup anlegen.
3. Die gesicherte Datenbank nach `prisma/dev.db` kopieren.
4. Den aktuellen Ordner `storage/ordo-campus` nur innerhalb des Projektordners durch die gesicherte Fassung ersetzen.
5. Die gesicherte `.env` nach `.env` kopieren.
6. `npm.cmd run db:diagnose:acceptance` mit der richtigen `DATABASE_URL` und dem richtigen `ORDO_CAMPUS_STORAGE_DIR` ausführen.
7. Anwendung mit `npm.cmd run dev` starten.
8. Anmeldung, Mandanten, Rechnungswesenaufgaben, Jahresabschlussaufgaben, Campus-Wissen, Anhänge und Verlauf stichprobenartig prüfen.

## Geprüfter Wiederherstellungstest

Am 27.07.2026 wurde eine getrennte künstliche Abnahmedatenbank zusammen mit einem künstlichen PDF-Anhang gesichert. Anschließend wurden Mandantenname und Dateiinhalt verändert. Datenbank und Anhang wurden aus der Sicherung wiederhergestellt. Die SHA-256-Prüfsummen entsprachen danach wieder exakt dem Ausgangszustand:

- Datenbank: `38E529DD1C1AF4151231CD9296E2D6AF9F8183802D4AE4B7BF13F1E190FD8EBC`
- künstlicher PDF-Anhang: `CE9554A6A6057ECFCFCC38CA27DC9B2A844443C08B629FB6CAAF3E4C4DA39B29`

Die anschließende Konsistenzdiagnose meldete keine verwaisten Datensätze, fehlenden Dateien oder ungültigen Rollenreferenzen.

## Wichtige Grenzen

- Nicht bei laufendem Server kopieren oder wiederherstellen.
- Datenbank und Anhänge nicht aus unterschiedlichen Sicherungszeitpunkten mischen.
- `npm.cmd run db:reset:test` ist kein Backup. Der Befehl löscht die lokale künstliche Entwicklungsdatenbank.
- Vor einem Netzwerk- oder Pilotbetrieb sind ein täglicher Sicherungsplan, Aufbewahrungsfristen, verschlüsselte Sicherungsmedien und ein verantwortlicher Administrator festzulegen.
