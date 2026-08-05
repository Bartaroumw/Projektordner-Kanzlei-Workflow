# Aktueller Systemstand

Stand: 05.08.2026

## Technischer Stand

- Next.js 16.2.12 und React 19.2.4
- Node.js 24.18.0 und npm 11.16.0
- Prisma und Prisma Client 6.19.3
- SQLite mit 17 unveränderten, chronologisch geordneten Migrationen
- TypeScript 5.9.3, ESLint 9.39.5 und Vitest 4.1.10
- lokaler App Router mit 45 `page.tsx`-Dateien, 9 Server-Action-Dateien und 7 Route Handlern
- 36 Prisma-Modelle

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

| Umgebung | Datenbank | Campus-Speicher | Rechnungswesen–Lohn-Speicher | Profilbildspeicher |
| --- | --- | --- | --- | --- |
| Entwicklung | `prisma/dev.db` | `storage/ordo-campus` | `storage/fibu-lohn` | `storage/profile-images` |
| Workflow-Test | `prisma/workflow-test.db` | `tmp/workflow-test-campus` | nicht maßgeblich | `tmp/profile-images-test` |
| FiBu-Lohn-Abnahme | `prisma/fibu-lohn-acceptance.db` | getrennt | `tmp/fibu-lohn-acceptance-storage/fibu-lohn` | nicht maßgeblich |
| Systemintegration | `prisma/system-integration.db` | `tmp/system-integration-storage/ordo-campus` | `tmp/system-integration-storage/fibu-lohn` | `tmp/system-integration-storage/profile-images` |

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

## Migrationsbaseline und Driftbereinigung der Entwicklungsdatenbank

Die Migrationsbaseline von `prisma/dev.db` wurde am 31.07.2026 nach bestätigter Kopienprüfung hergestellt. Die ersten 14 bereits strukturell vorhandenen Migrationen wurden ausschließlich mit `migrate resolve --applied` registriert; Migration 15 wurde regulär mit `migrate deploy` angewendet.

Der bekannte Schema-Historien-Drift wurde am 04.08.2026 nach bestätigter Kopienprüfung mit der ausschließlich additiven Migration `20260804080000_reconcile_schema_history_drift` bereinigt. Vor dem Deploy wurde der Sicherungscommit `3bf35266fcb7d3494535ce103d5b4b617cfe7d4d` sowie der vollständige Sicherungssatz `backups/schema-drift-deploy-20260804-081510` erstellt. Der unmittelbar geprüfte Ausgangshash war `508815CB010E904144DDC3AC3AC26ABB139A825FC6834D6ED42352371EA680B6`.

Der aktuelle Strukturstand umfasst 34 Anwendungstabellen, 565 Spalten, 92 Fremdschlüssel, 107 Indizes, 25 eindeutige Regeln und 16 erfolgreiche Prisma-Migrationseinträge. Unmittelbar vor den erlaubten Anwendungsprüfungen waren 353 Anwendungszeilen und der kanonische Geschäftsdatenhash `951FA79F5B64D7A361273D0C3BA0AF1ACFBCE93103FCDD757D1A7B726B6DA1DE` unverändert. `schema.prisma`, eine frische 1–16-Datenbank und `dev.db` stimmen strukturell überein.

Prisma-Schema und Client, geschützte Seed-Konsistenz, ESLint, TypeScript, 305 automatisierte Tests, Produktions-Build, authentifizierter Entwicklungsstart, Neustartpersistenz und produktionsnaher Start gegen `dev.db` wurden erfolgreich geprüft. Der große Performance-Smoke-Test blieb bewusst übersprungen. Die Serverprotokolle enthielten keine Anwendungsfehler. Nach dem planmäßigen Ende des ersten zeitbegrenzten Entwicklungsprozesses zeigte der Browser einmal erwartungsgemäß `Failed to fetch`; während des laufenden Servers waren die geprüften Hauptmodule ohne sichtbaren Laufzeitfehler erreichbar.

## Lokale Bestände

`prisma/dev.db` und die regulären Speicherordner gehören nicht in Git. Die beiden vorhandenen Dateien unter `storage/ordo-campus` dürfen nicht ungeprüft gelöscht werden. Sie stimmen mit der lokalen Sicherung überein, obwohl `dev.db` aktuell keine Campus-Anhangsreferenzen enthält.

`storage/fibu-lohn` muss bei einem leeren Bestand nicht vorab vorhanden sein. Der Ordner wird beim ersten regulären Upload kontrolliert erzeugt.

## Dashboard und operative Listen – Stand 05.08.2026

Der zentrale Einstieg heißt einheitlich **Dashboard**. Offene Rechnungswesen-, Jahresabschluss- und FiBu-Lohn-Vorgänge werden periodenübergreifend nach aktiver Verantwortung ermittelt. Vorgänge mit mehr als sechs Monaten Abstand zum aktuellen Kalendermonat stehen separat unter **Ältere offene Vorgänge** und werden nicht doppelt geführt. Die operativen Listen besitzen getrennte Ansichten für **Offen**, **Abgeschlossen** und **Alle**, kompakte Filter und eine vollständige serverseitige Pagination mit 100 Einträgen je Seite. Gesamtzahl, dargestellter Bereich und Seitenzahl bleiben zusammen mit Suche, Filtern, Sortierung und Rollenbegrenzung nachvollziehbar. Die Hauptnavigation verwendet einheitliche lokale SVG-Symbole; Logo, CONCILIUM-Marke und Einklapppfeil sind auf einer Achse ausgerichtet.

Für diese Umsetzung waren weder Prisma-Schemaänderungen noch eine Migration erforderlich. `prisma/dev.db`, Speicherordner und bestehende Fachdaten wurden nicht verändert.

Prisma Validate, Prisma Client und Migrationsstatus, ESLint, TypeScript, 331 reguläre automatisierte Tests, Produktions-Build sowie Entwicklungs- und produktionsnaher Start waren erfolgreich. Der für die Mengenprüfung ausdrücklich aktivierte Performance-Smoke-Test ergab insgesamt 332 erfolgreiche Tests und bestätigte 1.200 offene Checklisten, darunter 300 ältere Vorgänge, bei 30.000 Aufgaben. Der separate FiBu-Lohn-Performancebestand bestätigte die Erreichbarkeit aller 3.600 Abstimmungen über 36 Seiten. Die künstlichen Rollenprofile und die Zielbreiten 1440, 1280, 1024 und 600 Pixel wurden ohne sichtbaren Anwendungsfehler oder Seitenüberlauf geprüft.

## Navigation, Benutzerprofile und Profilbilder – Stand 05.08.2026

Die Desktop-Navigation ist in Markenbereich, unabhängig scrollbar bleibende Hauptnavigation und festen persönlichen Kontobereich gegliedert. Das sichtbare Lohnmodul heißt einheitlich **Rechnungswesen ↔ Lohn**; technische Routen und Datenmodellnamen unter `fibu-lohn` bleiben kompatibel. Der persönliche Bereich `/profil` zeigt Identität, geordnete Hauptrollen, getrennte Zusatzberechtigungen, Sicherheitseinstellungen und Kontodaten. Die Rollenbezeichnung `MITARBEITER` erscheint in der Oberfläche als **Bearbeiter**.

Migration 17 `20260805120000_user_profile_images` ergänzt ausschließlich die optionale Profilbildreferenz und ihren Auditverlauf. Profilbilder liegen geschützt unter `storage/profile-images`, werden serverseitig vollständig geprüft und nur über eine authentifizierte Route ausgeliefert. Die Migration wurde frisch in der Systemintegration und verlustfrei auf einer bytegenauen Kopie von `dev.db` geprüft. Alle 34 zuvor vorhandenen Anwendungstabellen blieben einschließlich Zeilenzahlen und Dateninhalten unverändert; SQLite-Integrität und Fremdschlüsselprüfung waren erfolgreich.

Prisma Validate, Prisma Client, ESLint, TypeScript, 346 automatisierte Tests, Integrations-Build sowie Entwicklungs- und produktionsnaher Integrationsstart waren erfolgreich. Hinzufügen, Ersetzen und Entfernen eines künstlichen Profilbilds wurden im Browser geprüft; nach Austausch und Entfernung blieben keine verwaisten Dateien zurück. Die künstlichen Rollenprofile Bearbeiter/Prüfer, Lohnsachbearbeiter und Administrator sowie die Zielbreiten 1440, 1280, 1024 und 600 Pixel wurden ohne horizontalen Seitenüberlauf oder Browserfehler geprüft.

## Bekannte Warnungen

- Die Migrationsbaseline und die dokumentierte Schema-Historien-Driftbereinigung von `prisma/dev.db` sind hergestellt. `prisma migrate dev` ist für künftige additive Entwicklung nur nach vollständigem gemeinsamen Backup, sauberem Git-Stand und leerer Drift-/Statusprüfung zulässig; eine Reset-Aufforderung darf niemals bestätigt werden. `prisma db push` bleibt gesperrt.
- Prisma warnt vor der in Version 7 entfallenden Prisma-Konfiguration in `package.json`; dafür wird künftig eine eigene Prisma-Konfigurationsdatei benötigt.
- Die TypeScript-Ausführung über Node verwendet derzeit die experimentelle Transform-Types-Funktion.
- Für TypeScript-Skripte ohne gesetzten Pakettyp erscheint eine `MODULE_TYPELESS_PACKAGE_JSON`-Warnung.
- `npm audit --omit=dev` meldet weiterhin 3 hoch eingestufte betroffene Produktions-Abhängigkeitsknoten; die vollständige Installationsprüfung meldet einschließlich Entwicklungsabhängigkeiten 12 hohe Hinweise. Die angebotene erzwungene Korrektur wäre inkompatibel; `npm audit fix --force` ist unzulässig.
- Der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail.
- Vor einem Pilot- oder Mehrbenutzerbetrieb bleiben eine erneut geprüfte gemeinsame Backup/Restore-Prozedur, HTTPS, Zugriffsschutz und Betriebskonzept erforderlich.

## Freigabe für die Weiterentwicklung

Der Projektstand ist für die konsistente lokale Weiterentwicklung gegen die baselined und driftbereinigte `prisma/dev.db` sowie weiterhin gegen die geschützte Systemintegrationsumgebung geeignet. Kontrolliertes `prisma migrate deploy` und kontrolliertes `prisma migrate dev` sind unter den dokumentierten Sicherungs- und Preflight-Bedingungen zulässig. `migrate reset`, `db push`, Seeds und Testresets gegen `dev.db` bleiben verboten. Neue fachliche Arbeiten beginnen nur in gesonderten Aufträgen und auf geeigneten Entwicklungsbranches.
