# Systemintegration nach Einführung der FiBu-Lohn-Abstimmung

Stand: 28.07.2026

Die additive Migration `20260728140000_workflow_navigation_payroll_positions` ergänzt strukturierte FiBu-Lohn-Positionen sowie optionale Positionsreferenzen an Belegen und Verlaufseinträgen. Die Integrationsprüfung muss weiterhin ausschließlich `prisma/system-integration.db` und `tmp/system-integration-storage` verwenden.

## Ergebnis

Ordo Caroli funktioniert mit allen bisherigen Modulen gemeinsam auf einer frisch migrierten Gesamtdatenbank. Die ursprünglichen Serverfehler entstehen auf dem alten Datenbankschema, nicht auf der frischen Integrationsdatenbank.

## Integrationsbestand

- Datenbank: `prisma/system-integration.db`
- Campus: `tmp/system-integration-storage/ordo-campus`
- FiBu-Lohn: `tmp/system-integration-storage/fibu-lohn`
- Kennzeichnung: `ORDO_ENVIRONMENT_LABEL=Systemintegration`
- Reset: `npm.cmd run testdata:system-integration`
- Start Entwicklung: `npm.cmd run dev:integration`
- Build: `npm.cmd run build:integration`
- Start Produktion: `npm.cmd run start:integration`

Der Gesamttestbestand enthält 12 Benutzer, 9 Mandanten, 13 Rechnungswesenchecklisten mit 83 Aufgaben, 6 Jahresabschlusschecklisten mit 62 Aufgaben, 36 Standardaufgaben, 8 Campus-Wissenseinträge, einen Campus-Anhang, 6 FiBu-Lohn-Abstimmungen, einen FiBu-Lohn-Beleg und 3 Fahrzeuge.

## Migrationskette

Alle Migrationen wurden unverändert und in dieser Reihenfolge angewendet:

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
15. `20260728140000_workflow_navigation_payroll_positions`

`prisma migrate status` bestätigt 15 angewendete Migrationen und ein aktuelles Schema.

## Systemweite Diagnose

Die Diagnose arbeitet ausschließlich lesend. Sie prüft:

- Mandanten- und Benutzerreferenzen,
- aktive Benutzer und fachliche Rollen,
- doppelte Checklisten und echte doppelte Standardaufgaben-Snapshots,
- ungültige Checklisten-, Prüf- und Lohnstatus,
- offene Prüfpunkte bei abgeschlossenen Checklisten,
- automatisch oder unzulässig als geprüft markierte Aufgaben,
- doppelte FiBu-Lohn-Abstimmungen,
- Lohnzuständigkeiten und Mandantenzuordnungen,
- mandantenfremde Fahrzeugbezüge,
- erledigte Lohnabstimmungen mit offenen Rückfragen,
- fehlende und verwaiste Campus- und FiBu-Lohn-Dateien,
- unvollständige Migrationshistorie.

Der deterministische Integrationsbestand erzeugt in allen Prüfkategorien null Befunde.

## Rollenprüfung

- Maria Muster: Dashboard, eigene Rechnungswesen- und Jahresabschlussbearbeitung, Mandanten, FiBu-Lohn-Rechnungswesensicht; keine Standardaufgaben- oder Benutzerverwaltung.
- Peter Prüfer: Prüfbereiche, Campus-Prüferhinweise und lesende FiBu-Lohn-Prüfsicht; keine Lohnstatusaktion und keine Standardaufgabenverwaltung.
- Klara Leitung: Kanzleiübersicht, Jahresabschlussfreigabe, Standardaufgaben, Excel-Import, Campus und FiBu-Lohn-Themen; keine technische Benutzerverwaltung.
- Laura Lohn: eigenes Lohn-Dashboard, eigene Abstimmungen, Rückfragen, Belege und erforderliche Fahrzeuge; kein Zugriff auf Mandanten-, Rechnungswesen-, Jahresabschluss-, Standardaufgaben- oder Administrationsmodule.
- Anton Administration: Benutzerverwaltung; keine fachlichen Rechnungswesen-, Jahresabschluss- oder Prüfrechte.

## Nachgewiesene Korrekturen

### Neutrale serverseitige Zugriffsbehandlung

`requireRole` warf bisher bei direkten unberechtigten Seitenaufrufen einen allgemeinen Fehler. Das erzeugte in Next.js eine technische Fehlerseite. Die zentrale Prüfung leitet nun ohne Datenoffenlegung auf `/zugriff-verweigert` um.

### Reine Lohnrolle

Die Übersichtsseiten für Mandanten, Rechnungswesen und Jahresabschluss hatten noch keine zentrale Seiteneingangsprüfung. Die Rollenprüfung wurde an diesen drei Einstiegen ergänzt. Schreibende Aktionen waren bereits geschützt.

Beide Änderungen besitzen automatisierte Regressionstests.

## Browser- und Produktionsprüfung

Der Entwicklungsbetrieb wurde auf Port 3200 und der Produktionsbetrieb auf Port 3300 geprüft. Anmeldung, Rollennavigation, sämtliche Hauptmodule, Campus-Panel, geschützte Anhänge, FiBu-Lohn-Detail, Fahrzeuge, Excel-Import und Benutzerverwaltung waren erreichbar. Unberechtigte Direktaufrufe endeten auf der neutralen Zugriffsseite.

Die Darstellung wurde bei 1.280, 1.024 und 600 Pixel geprüft. Campus nutzt bei schmalen Ansichten nahezu die volle Breite; Dashboard und Navigation bleiben bedienbar. Browserkonsole und Serverausgaben enthielten nach den Korrekturen keine unbehandelten Prisma-, React-, Hydration- oder HTTP-500-Fehler.

Nach Neustart des Produktionsservers blieben Sitzung, Datenbankinhalte und Dateireferenzen erhalten.

## Performance-Smoke-Test

Der getrennte synthetische FiBu-Lohn-Bestand enthielt 500 Mandanten, 3.600 Abstimmungen, 21.600 Themen, 600 Rückfragen und 300 Fahrzeuge. Gemessen wurden lokal:

- Lohn-Dashboard: 30,8 ms für 100 Zeilen
- Mandantensuche: 10,2 ms für 100 Zeilen
- Abstimmungsdetail: 4,0 ms
- Fahrzeugliste: 15,6 ms für 200 Zeilen
- Rückfragenübersicht: 12,1 ms für 100 Zeilen

Der Smoke-Test bleibt bewusst separat und wird nicht beim normalen Seed ausgeführt.

## Ergebnis für Entwicklung und Pilot

Die Anwendung ist technisch für die fachliche FiBu-Lohn-Endabnahme geeignet. Ein produktiver oder dauerhafter Pilotbestand wird noch nicht empfohlen, solange für die vorhandene Entwicklungsdatenbank keine geprüfte Migrationsbaseline, gemeinsame Datensicherung und Wiederherstellung sowie ein abgesichertes internes HTTPS-/Betriebskonzept bestehen.

Bis dahin erfolgt die sichere Weiterentwicklung über die Systemintegrationsumgebung. Nächster technischer Schritt ist ein gesonderter Baseline-Arbeitsschritt auf einer Kopie der Entwicklungsdatenbank.

## Zentrale Verwaltungsnavigation

Die später ergänzte Verwaltungsstruktur ändert weder Datenmodelle noch die Integrationsumgebung. Standardaufgaben, Kategorien, FiBu-Lohn-Themen, Benutzerverwaltung, Import und sichere Systeminformationen sind unter einem rollenabhängigen Hauptpunkt **Verwaltung** gebündelt. Bestehende direkte Routen und ihre serverseitigen Berechtigungsprüfungen bleiben erhalten.

Ordo Campus bleibt als Arbeits- und Wissensmodul in der Hauptnavigation. Mandantenspezifische Aufgaben werden weiterhin beim Mandanten angelegt; ihre zentrale Verwaltungsansicht ist ausschließlich eine Such-, Filter- und Qualitätsübersicht. Für diese Strukturänderung war keine weitere Prisma-Migration erforderlich.

## Sammelspeicherung

Rechnungswesen- und Jahresabschlussaufgaben verwenden eine gemeinsame lokale Dirty-State- und Ergebnisstruktur. Die Batch-Serveraktionen prüfen jede Aufgaben-ID erneut gegen die Checkliste, verarbeiten SQLite-Schreibvorgänge stabil sequenziell und liefern Teil-Ergebnisse. Die vorhandenen Fachdienste erzeugen weiterhin die fachlichen Einzelverläufe.

Das vorhandene `updatedAt` dient als optimistisches Versionsmerkmal. Daher war auch hierfür keine weitere Migration erforderlich. Die aktive `prisma/dev.db` bleibt unangetastet; Entwicklung und Prüfung erfolgen weiterhin über den deterministischen Systemintegrationsbestand.
