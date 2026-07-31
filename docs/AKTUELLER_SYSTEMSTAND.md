# Aktueller Systemstand

Stand: 31.07.2026

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

## Lokale Bestände

`prisma/dev.db` und die regulären Speicherordner gehören nicht in Git. Die beiden vorhandenen Dateien unter `storage/ordo-campus` dürfen nicht ungeprüft gelöscht werden. Sie stimmen mit der lokalen Sicherung überein, obwohl `dev.db` aktuell keine Campus-Anhangsreferenzen enthält.

`storage/fibu-lohn` muss bei einem leeren Bestand nicht vorab vorhanden sein. Der Ordner wird beim ersten regulären Upload kontrolliert erzeugt.

## Bekannte Warnungen

- `prisma/dev.db` besitzt keine belastbare Prisma-Migrationshistorie.
- Prisma warnt vor der in Version 7 entfallenden Prisma-Konfiguration in `package.json`; dafür wird künftig eine eigene Prisma-Konfigurationsdatei benötigt.
- Die TypeScript-Ausführung über Node verwendet derzeit die experimentelle Transform-Types-Funktion.
- Für TypeScript-Skripte ohne gesetzten Pakettyp erscheint eine `MODULE_TYPELESS_PACKAGE_JSON`-Warnung.
- `npm audit --omit=dev` meldet weiterhin 3 hoch eingestufte betroffene Produktions-Abhängigkeitsknoten; die vollständige Installationsprüfung meldet einschließlich Entwicklungsabhängigkeiten 12 hohe Hinweise. Die angebotene erzwungene Korrektur wäre inkompatibel; `npm audit fix --force` ist unzulässig.
- Der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail.
- Vor einem Pilot- oder Mehrbenutzerbetrieb bleiben Migrationsbaseline, Backup/Restore, HTTPS, Zugriffsschutz und Betriebskonzept erforderlich.

## Freigabe für die Weiterentwicklung

Der Projektstand ist für die konsistente lokale Weiterentwicklung auf Basis der Systemintegrationsumgebung geeignet. Neue fachliche Arbeiten beginnen erst nach Bestätigung dieser Sicherung und auf einem gesonderten Entwicklungsbranch.
