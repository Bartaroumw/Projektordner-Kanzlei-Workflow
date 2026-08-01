# Ablaufprotokoll der Migrationsbaseline-Kopienprüfung

Datum: 31.07.2026
Branch: `codex/plattformbasis-phase-1`
Ausgangscommit: `57ab8838c3ab62b7b58317ba27151736888f3848`

## 1. Schutzkontrolle

- sauberer Git-Ausgangspunkt und Tag `v1.0-neuer-pc-uebernommen` bestätigt,
- neuer Branch erstellt,
- keine WAL-, SHM- oder Journaldatei neben `prisma/dev.db`,
- Originalhash `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`,
- keine Änderung, kein Seed und kein Migrationskommando gegen `prisma/dev.db`.

## 2. Vollständige Sicherung

Lokales, von Git ausgeschlossenes Sicherungsziel:

`backups/migrationsbaseline-phase1-20260731`

Gesichert wurden:

- `dev.db`,
- `.env`,
- beide Dateien aus `storage/ordo-campus`,
- der Zustand des nicht vorhandenen regulären FiBu-Lohn-Speichers.

Alle vorhandenen Dateien wurden per SHA-256 bytegenau bestätigt.

## 3. Lesende Bestandsanalyse

Das neue Skript `scripts/analyze-migration-baseline.mjs`:

- lehnt den echten Pfad `prisma/dev.db` ausdrücklich ab,
- öffnet Kopien mit SQLite `mode=ro`,
- prüft Tabellen, Spalten, Fremdschlüssel, Indizes, eindeutige Regeln, Zeilenzahlen und stabile Datenhashes,
- prüft `integrity_check`, `foreign_key_check` und `_prisma_migrations`,
- schreibt Detailausgaben ausschließlich unter `tmp`.

Ergebnis: 33 Tabellen, 544 Spalten, 86 Fremdschlüssel, 103 Indizes, 25 eindeutige Regeln, 351 Anwendungsdatensätze, keine Migrationstabelle.

## 4. Referenzvergleiche

1. Der geschützte Systemintegrationsbestand wurde frisch mit allen 15 Migrationen erzeugt.
2. Ein erster Versuch wurde nach erfolgreicher Migration wegen einer lokal gesperrten Prisma-Engine-Datei beim Client-Generate beendet. Ausschließlich die zu diesem Prüflauf gehörenden Node-Prozesse wurden beendet; der vorgesehene Integrationsbefehl lief danach vollständig erfolgreich.
3. Eine zusätzliche temporäre Referenzdatenbank wurde aus exakt den ersten 14 unveränderten Migrationen aufgebaut.
4. Der Diff `dev.db`-Kopie zu dieser Referenz war leer.
5. Der Diff zur vollständigen Systemintegration enthielt ausschließlich Migration 15.

## 5. Baseline auf der Kopie

Arbeitsziel:

`tmp/migrationsbaseline-phase1-20260731/baseline-attempt.db`

Durchgeführt:

1. bytegenaue Kopie mit Ausgangshash erstellt,
2. Migrationen 1 bis 14 einzeln mit `prisma migrate resolve --applied` registriert,
3. Status geprüft: 14 behandelt, nur Migration 15 ausstehend,
4. Schema-, Daten-, Integritäts- und Fremdschlüsselprüfung ohne Abweichung,
5. weiterer Checkpoint `baseline-after-resolve14.db` erstellt,
6. Migration 15 mit `prisma migrate deploy` angewendet,
7. Status geprüft: alle 15 Migrationen behandelt,
8. Diff zur frischen Systemintegration geprüft: leer,
9. bestehende Tabellenzeilen und Datenhashes geprüft: unverändert.

## 6. Folgemigrationstest

Auf `follow-up-copy.db` wurde mit einem vollständig temporären Migrations-Harness die künstliche Migration `20990101000000_baseline_follow_up_probe` angewendet. Vorher wurde sie als einzige ausstehende Migration erkannt; danach war der Status aktuell. Prüftabelle und eindeutiger Index waren vorhanden, bestehende Fachdaten unverändert.

## 7. Anwendungsprüfung

- Entwicklungsstart auf einer weiteren Laufzeitkopie erfolgreich,
- erster HTTP-Smoke-Aufruf ohne wirksamen PowerShell-Cookie führte korrekt zu 307-Anmeldeumleitungen,
- korrigierter Test mit Cookie-Container: 13 Entwicklungsrouten erfolgreich,
- Prisma, ESLint und TypeScript erfolgreich,
- 305 Tests erfolgreich, 1 Performance-Test übersprungen,
- Produktions-Build erfolgreich,
- Produktionsstart erfolgreich,
- alle Fachmodule HTTP 200; Diagnose in Produktion absichtlich HTTP 404.

## 8. Wiederherstellungsprüfung

Die baselined Datenbank und der vollständige lokale Bestand wurden nach `tmp/migrationsbaseline-phase1-20260731/restore-test` wiederhergestellt. Hashes, Schema, Fachdaten und Migrationseinträge waren identisch; Prisma meldete den restaurierten Bestand als aktuell.

## 9. Abschlusszustand

- `prisma/dev.db` weiterhin SHA-256 `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`,
- keine Originalmigration verändert,
- keine echte Baseline vorgenommen,
- alle Datenbank- und Speicherartefakte unter `backups` beziehungsweise `tmp` und damit außerhalb von Git,
- technisches Go mit Auflagen, operatives No-Go bis zur Bestätigung des Testberichts.
