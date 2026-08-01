# Ablaufprotokoll der Migrationsbaseline-Kopienprüfung und realen Umsetzung

Ausführung: 31.07.2026
Abschlussdokumentation: 01.08.2026
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

## 9. Abschlusszustand der Kopienprüfung vor Freigabe

- `prisma/dev.db` weiterhin SHA-256 `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`,
- keine Originalmigration verändert,
- keine echte Baseline vorgenommen,
- alle Datenbank- und Speicherartefakte unter `backups` beziehungsweise `tmp` und damit außerhalb von Git,
- technisches Go mit Auflagen, operatives No-Go bis zur Bestätigung des Testberichts.

## 10. Ausdrückliche Freigabe und reale Sicherung

Nach ausdrücklicher Bestätigung der Kopienprüfung wurde ein neuer, nicht überschreibender Sicherungssatz erstellt:

`backups/migrationsbaseline-real-20260731-175418`

Zeitpunkt: `31.07.2026 17:54:18 Europe/Berlin`. Enthalten sind die bytegenaue `prisma/dev.db`, `.env`, `.env.integration`, beide Campus-Dateien, Git-Branch, Git-Commit, Git-Status und ein Hashmanifest. `storage/fibu-lohn` war nicht vorhanden und ist im Manifest ausdrücklich als solcher Zustand dokumentiert.

Vor der Sicherung und vor jedem Datenbankschritt waren keine Projektserver, SQLite-Prozesse, Listener sowie keine WAL-, SHM- oder Journaldateien vorhanden. Ein exklusiver Dateizugriff wurde erfolgreich geprüft.

## 11. Reale Ausgangsprüfung

Die unmittelbar vor der Änderung exklusiv erstellte Prüfkopie bestätigte exakt die getestete Ausgangslage:

- SHA-256 `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`,
- 33 Anwendungstabellen, 544 Spalten, 86 Fremdschlüssel, 103 Indizes und 25 eindeutige Regeln,
- 351 Anwendungsdatensätze,
- `_prisma_migrations` nicht vorhanden,
- `PayrollReconciliationPosition` sowie beide `positionId`-Erweiterungen nicht vorhanden,
- alle FiBu-Lohn-Falltabellen leer,
- `quick_check = ok`, keine Fremdschlüsselverletzung,
- leerer Schema-Diff zur Referenz aus Migrationen 1 bis 14.

## 12. Vorsorglicher Rücksprung nach dem ersten Resolve

Der erste reale `resolve`-Schritt für `20260726120000_init_clients` war erfolgreich. Die nachgeschaltete Automatisierungsprüfung behandelte jedoch den erwartbaren Exitcode 1 von `prisma migrate status` bei noch ausstehenden Migrationen irrtümlich als Abweichung. Entsprechend der Stop-Regel wurden keine weiteren Prisma-Befehle ausgeführt.

Der Zwischenstand wurde als `failed-attempt-after-resolve1.db` im Sicherungssatz beweisgesichert. Anschließend wurde `prisma/dev.db` physisch aus der Originalsicherung wiederhergestellt. Ausgangshash, SQLite-Integrität, Fremdschlüsselprüfung, 33 Anwendungstabellen, 351 Zeilen, fehlende Migrationstabelle und 15 ausstehende Migrationen wurden erneut bestätigt. Es handelte sich um eine Korrektur des Prüf-Harnesses, nicht um einen Migrations- oder Datenbankfehler.

## 13. Reale Baseline

Im frischen zweiten Lauf wurden diese 14 Migrationen einzeln und chronologisch ausschließlich mit `prisma migrate resolve --applied` registriert:

1. `20260726120000_init_clients`
2. `20260726153000_standard_tasks_import`
3. `20260726170000_monthly_checklists`
4. `20260726183000_monthly_review_workflow`
5. `20260726193000_ordo_caroli_consolidation`
6. `20260726194000_artificial_full_names`
7. `20260726213000_local_users_auth`
8. `20260727100000_annual_financial_statements`
9. `20260727140000_function_separation_exception`
10. `20260727170000_ordo_campus_foundation`
11. `20260727190000_ordo_campus_attachments`
12. `20260727210000_task_execution_planning`
13. `20260727230000_workflow_ux_corrections`
14. `20260728100000_fibu_payroll_reconciliation_foundation`

Nach jedem Schritt wurde die exakt verbleibende Migrationsliste geprüft. Der Checkpoint nach Migration 14 liegt als `checkpoint-after-resolve14.db` im Sicherungssatz; sein SHA-256 ist `E72007CA7C5680221F0F0CE259947418BADB1A323AACC821CB476306E446D7B7`. Schema, Zeilenzahlen und Datenhashes aller Anwendungstabellen waren unverändert, und ausschließlich Migration 15 stand aus.

Danach wurde ausschließlich `20260728140000_workflow_navigation_payroll_positions` mit `prisma migrate deploy` regulär ausgeführt. Der unmittelbare Abschlusscheckpoint liegt als `final-after-migration15.db` im Sicherungssatz; SHA-256 `D8E1B5221E621233C9571BEE7E10AFF871A15D7D8E4E656FA32F23425DF12C3B`.

## 14. Reale Abschlussprüfung

- Prisma meldet 15 Migrationen und `Database schema is up to date!`.
- 34 Anwendungstabellen, 565 Spalten, 92 Fremdschlüssel, 109 Indizes und 25 eindeutige Regeln sind vorhanden.
- `PayrollReconciliationPosition` ist vorhanden und leer.
- Beide `positionId`-Spalten besitzen die vorgesehenen Fremdschlüssel und Indizes.
- Alle 33 vorher vorhandenen Anwendungstabellen behielten Zeilenzahl und Datenhash.
- `quick_check = ok`; `foreign_key_check` ohne Befund.
- Der Schema-Diff zur frisch migrierten Systemintegrationsdatenbank ist leer.
- Prisma-Schema, Prisma Client 6.19.3, ESLint, TypeScript und Produktions-Build sind erfolgreich.
- 305 Tests sind erfolgreich; 1 großer Performance-Smoke-Test ist bewusst übersprungen.
- Authentifizierter Entwicklungsstart, Hauptmodule, Sammelspeicherung, Neustartpersistenz und produktionsnaher Start gegen `dev.db` funktionieren.
- Browserkonsole, Entwicklungsserverprotokoll und Produktionsserverprotokoll enthalten keine Schema- oder Anwendungsfehler.

Nach den strukturellen Datenhashprüfungen erzeugten die zwei authentifizierten Laufprüfungen bestimmungsgemäß zwei zusätzliche `Session`-Zeilen und aktualisierten `User.lastLoginAt`. Keine weitere Anwendungstabelle änderte sich. Der abschließende Live-Hash nach diesen kontrollierten Laufzeitänderungen lautet `508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`.
