# Aktueller Systemstand

Stand: 01.08.2026

## Technischer Stand

- Next.js 16.2.12 und React 19.2.4
- Node.js 24.18.0 und npm 11.16.0
- Prisma und Prisma Client 6.19.3
- SQLite mit 15 unveränderten, chronologisch geordneten Migrationen
- TypeScript 5.9.3, ESLint 9.39.5 und Vitest 4.1.10
- lokaler App Router mit 44 `page.tsx`-Dateien, 9 Server-Action-Dateien und 6 Route Handlern
- 34 Prisma-Modelle

## Fachlicher Stand

Der aktuelle Stand umfasst Mandanten, Jahresprofile, Standard- und Zusatzaufgaben, Rechnungswesenaufgaben, Jahresabschlussaufgaben, Rollen- und Prüfworkflows, Ordo Campus, lokale Benutzerverwaltung sowie FiBu-Lohn-Abstimmungen mit Rückfragen, Belegen und Fahrzeugen.

Neu im gegenüber `c9ad6faf69bca18ee4d47676f26b82418faf8eb5` gesicherten Arbeitsstand sind insbesondere:

- FiBu-Lohn-Mehrfachsachverhalte mit Einzel- und zulässigen Sammelpositionen,
- die additive Migration `20260728140000_workflow_navigation_payroll_positions`,
- eine lückenbasierte Rechnungswesen-Statusübersicht,
- die Hauptbereiche `Rechnungswesen`, `FiBu ↔ Lohn`, `Ordo Campus` und `Verwaltung`,
- rollenabhängige Verwaltungsreiter und eine zentrale Qualitätsübersicht mandantenspezifischer Aufgaben,
- zentrale Sammelspeicherung normaler Checklistenfelder mit Einzelresultaten und Konfliktschutz,
- erweiterte Systemintegrationsdiagnose und Regressionstests.

## Umgebungen

| Umgebung | Datenbank | Campus-Speicher | FiBu-Lohn-Speicher |
| --- | --- | --- | --- |
| Entwicklung | `prisma/dev.db` | `storage/ordo-campus` | `storage/fibu-lohn` |
| Workflow-Test | `prisma/workflow-test.db` | `tmp/workflow-test-campus` | nicht maßgeblich |
| FiBu-Lohn-Abnahme | `prisma/fibu-lohn-acceptance.db` | getrennt | `tmp/fibu-lohn-acceptance-storage/fibu-lohn` |
| Systemintegration | `prisma/system-integration.db` | `tmp/system-integration-storage/ordo-campus` | `tmp/system-integration-storage/fibu-lohn` |

Die Systemintegration wird ausschließlich mit den dafür vorgesehenen npm-Skripten erzeugt und gestartet:

```powershell
npm.cmd run testdata:system-integration
npm.cmd run dev:integration
npm.cmd run build:integration
npm.cmd run start:integration
```

## Prüfstand nach PC-Übertragung

- Prisma-Schema: erfolgreich
- Prisma Client: erfolgreich erzeugt
- Abhängigkeiten: mit `npm ci` exakt aus der unveränderten `package-lock.json` wiederhergestellt; direkte Pakete vollständig auflösbar
- ESLint: erfolgreich
- TypeScript: erfolgreich
- automatisierte Tests: 305 erfolgreich, 1 bewusst übersprungen
- übersprungen: `tests/performance-smoke.test.ts` – „wertet 300 Mandanten, 1.200 Checklisten und 30.000 Aufgaben flüssig aus“; Ausführung nur mit `RUN_PERFORMANCE_SMOKE=1`
- Integrations-Build: erfolgreich
- Entwicklungsstart der Integration: erfolgreich
- produktionsnaher Integrationsstart: erfolgreich
- Systemintegrationsdiagnose: keine Inkonsistenzen

## Migrationsbaseline der Entwicklungsdatenbank

Die Migrationsbaseline von `prisma/dev.db` wurde am 31.07.2026 nach bestätigter Kopienprüfung hergestellt. Ausgangshash war `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796`. Die ersten 14 bereits strukturell vorhandenen Migrationen wurden ausschließlich mit `migrate resolve --applied` registriert; ausschließlich Migration 15 wurde regulär mit `migrate deploy` angewendet.

Der aktuelle Strukturstand umfasst 34 Anwendungstabellen, 565 Spalten, 92 Fremdschlüssel, 109 Indizes, 25 eindeutige Regeln und 15 erfolgreiche Prisma-Migrationseinträge. Die neue Tabelle `PayrollReconciliationPosition` ist erwartungsgemäß leer. Alle 33 vorher vorhandenen Anwendungstabellen behielten beim strukturellen Vorher-/Nachher-Vergleich ihre Zeilenzahlen und Datenhashes.

Prisma-Schema und Client, ESLint, TypeScript, 305 automatisierte Tests, Produktions-Build, authentifizierter Entwicklungsstart, Neustartpersistenz und produktionsnaher Start gegen `dev.db` wurden erfolgreich geprüft. Der große Performance-Smoke-Test blieb bewusst übersprungen. Browserkonsole sowie aufgezeichnete Entwicklungs- und Produktionsserverprotokolle waren fehlerfrei.

## Lokale Bestände

`prisma/dev.db` und die regulären Speicherordner gehören nicht in Git. Die beiden vorhandenen Dateien unter `storage/ordo-campus` dürfen nicht ungeprüft gelöscht werden. Sie stimmen mit der lokalen Sicherung überein, obwohl `dev.db` aktuell keine Campus-Anhangsreferenzen enthält.

`storage/fibu-lohn` muss bei einem leeren Bestand nicht vorab vorhanden sein. Der Ordner wird beim ersten regulären Upload kontrolliert erzeugt.

## Bekannte Warnungen

- Die Migrationsbaseline von `prisma/dev.db` ist hergestellt. Der separate, dokumentierte Drift zwischen `schema.prisma` und Migrationshistorie bleibt bestehen; `prisma migrate dev` und `prisma db push` bleiben bis zu dessen gesonderter Bereinigung gesperrt.
- Prisma warnt vor der in Version 7 entfallenden Prisma-Konfiguration in `package.json`; dafür wird künftig eine eigene Prisma-Konfigurationsdatei benötigt.
- Die TypeScript-Ausführung über Node verwendet derzeit die experimentelle Transform-Types-Funktion.
- Für TypeScript-Skripte ohne gesetzten Pakettyp erscheint eine `MODULE_TYPELESS_PACKAGE_JSON`-Warnung.
- `npm audit --omit=dev` meldet weiterhin 3 hoch eingestufte betroffene Produktions-Abhängigkeitsknoten; die vollständige Installationsprüfung meldet einschließlich Entwicklungsabhängigkeiten 12 hohe Hinweise. Die angebotene erzwungene Korrektur wäre inkompatibel; `npm audit fix --force` ist unzulässig.
- Der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail.
- Vor einem Pilot- oder Mehrbenutzerbetrieb bleiben eine erneut geprüfte gemeinsame Backup/Restore-Prozedur, HTTPS, Zugriffsschutz und Betriebskonzept erforderlich.

## Freigabe für die Weiterentwicklung

Der Projektstand ist für die konsistente lokale Weiterentwicklung gegen die baselined `prisma/dev.db` sowie weiterhin gegen die geschützte Systemintegrationsumgebung geeignet. Kontrolliertes `prisma migrate deploy` ist nach vollständiger Sicherung und Prüfung zulässig. Neue fachliche Arbeiten und die Driftbereinigung beginnen nur in gesonderten Aufträgen und auf geeigneten Entwicklungsbranches.
