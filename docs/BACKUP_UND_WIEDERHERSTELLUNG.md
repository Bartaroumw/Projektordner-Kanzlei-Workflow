# Backup und Wiederherstellung

Stand: 05.08.2026

Diese Anleitung gilt für den lokalen Betrieb von Ordo Caroli. Vor jedem Eingriff muss die Anwendung beendet werden. Das Backup enthält ausschließlich lokale Daten und wird nicht in eine Cloud übertragen.

## Was gesichert werden muss

- `prisma/dev.db`: SQLite-Datenbank mit Benutzern, Mandanten, Checklisten, Wissen und Verläufen
- `storage/ordo-campus`: interne Ordo-Campus-Anhänge
- `storage/fibu-lohn`: geschützte Belege der FiBu-Lohn-Abstimmung
- `storage/profile-images`: geschützte Profilbilder lokaler Benutzer
- `.env`: lokale Konfiguration; diese Datei enthält keine Testdaten und darf nicht in Git eingecheckt werden
- Quellcode und Migrationen: über das lokale Git-Repository

Die Datenbank und alle drei Dateispeicher gehören fachlich zusammen. Sie müssen immer zum selben Zeitpunkt gesichert und gemeinsam wiederhergestellt werden.

Seit Ordo Campus 2 verweist das neue Wissensmodell auf dieselben physischen Dateien unter `storage/ordo-campus`; Migration 18 kopiert keine Anhänge. Deshalb müssen bei Sicherung und Wiederherstellung alte und neue Campus-Referenzen zusammen mit genau demselben Campus-Speicherstand erhalten bleiben.

**Nur die SQLite-Datenbank zu sichern ist nicht ausreichend.** Ohne die gleichzeitig gesicherten Ordner `storage/ordo-campus`, `storage/fibu-lohn` und `storage/profile-images` fehlen die zugehörigen lokalen Dateien.

## Vollständiges Backup

Der geprüfte Projektbefehl erstellt nach bewusster Freigabe einen neuen datierten Sicherungssatz mit SHA-256-Manifest, ohne einen vorhandenen Satz zu überschreiben:

```powershell
npm.cmd run backup:local -- --confirm-dev
```

1. Den Entwicklungs- oder Produktionsserver mit `Strg+C` beenden.
2. Im Projektordner einen neuen, eindeutig datierten Ordner unter `backups` anlegen, beispielsweise `backups/2026-07-27_ordo-caroli`.
3. `prisma/dev.db` in diesen Ordner kopieren.
4. Den vollständigen Ordner `storage/ordo-campus` in diesen Ordner kopieren. Ist er noch nicht vorhanden, existieren noch keine lokalen Anhänge.
5. Den vollständigen Ordner `storage/fibu-lohn` in diesen Ordner kopieren. Ist er noch nicht vorhanden, existieren noch keine FiBu-Lohn-Belege.
6. Den vollständigen Ordner `storage/profile-images` in diesen Ordner kopieren. Ist er noch nicht vorhanden, wurden noch keine Profilbilder hinterlegt.
7. `.env` in diesen Ordner kopieren.
8. Für alle Sicherungsbestandteile Dateigröße und Änderungsdatum kontrollieren.
9. Mit `Get-FileHash -Algorithm SHA256` Prüfsummen für Datenbank und Dateien erzeugen.

Der Ordner `backups` ist durch `.gitignore` ausgeschlossen.

## Wiederherstellung

1. Ordo Caroli vollständig beenden.
2. Vom aktuellen Zustand nochmals ein separates Sicherheitsbackup anlegen.
3. Die gesicherte Datenbank nach `prisma/dev.db` kopieren.
4. Den aktuellen Ordner `storage/ordo-campus` nur innerhalb des Projektordners durch die gesicherte Fassung ersetzen.
5. Den aktuellen Ordner `storage/fibu-lohn` nur innerhalb des Projektordners durch die gesicherte Fassung ersetzen.
6. Den aktuellen Ordner `storage/profile-images` nur innerhalb des Projektordners durch die gesicherte Fassung ersetzen.
7. Die gesicherte `.env` nach `.env` kopieren.
8. Die passende Konsistenzdiagnose mit den richtigen Datenbank- und Speicherpfaden ausführen.
9. Anwendung mit `npm.cmd run dev` starten.
10. Anmeldung, Profilbilder, Mandanten, Rechnungswesenaufgaben, Jahresabschlussaufgaben, Campus-Wissen, Rechnungswesen–Lohn-Belege, Fahrzeuge und Verläufe stichprobenartig prüfen.

## Isolierter FiBu-Lohn-Wiederherstellungstest

Der ausschließlich künstliche Abnahmebestand kann ohne Zugriff auf die Entwicklungsdatenbank geprüft werden:

```powershell
npm.cmd run testdata:fibu-lohn
npm.cmd run testdata:fibu-lohn:backup-test
```

Der zweite Befehl sichert die getrennte Abnahmedatenbank und den getrennten FiBu-Lohn-Dateispeicher, verändert beide kontrolliert, stellt beide wieder her und vergleicht anschließend SHA-256-Prüfsummen. Er bricht ab, wenn die erwarteten isolierten Pfade nicht exakt erkannt werden oder ein laufender SQLite-Schreibzugriff erkennbar ist.

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
- Ein Rollback von Migration 18 erfolgt durch die gemeinsame Wiederherstellung des unmittelbar vorher erzeugten Sicherungssatzes, nicht durch manuelles Löschen der neuen Tabellen.
