# Abnahmebericht Systemintegration nach FiBu-Lohn

Stand: 31.07.2026

## Versionsstand und Sicherung

- Branch: `feature/fibu-lohn-grundlage`
- Ausgangsstand vor der FiBu-Lohn-Erweiterung: `61b55de`
- Sicherungscommit vor der Integrationsprüfung: `c9ad6faf69bca18ee4d47676f26b82418faf8eb5`
- Commitbezeichnung: `Sicherung vor systemweiter FiBu-Lohn-Integrationsprüfung`
- lokale Sicherung: `backups/2026-07-28_before_system_integration`
- kein Remote eingerichtet und nichts veröffentlicht

## Fehlerbild und Ursache

Auf einer Kopie des früheren Entwicklungsbestands wurden vier Klasse-A-Fehler reproduziert:

- Dashboard: `P2022`, `Client.payrollPreparedByFirm` fehlt
- Mandanten: `P2022`, `Client.payrollPreparedByFirm` fehlt
- FiBu-Lohn: `P2021`, `PayrollReconciliation` fehlt
- Fahrzeuge: `P2022`, `Client.payrollUserId` fehlt

Ursache war die nicht enthaltene Migration `20260728100000_fibu_payroll_reconciliation_foundation`. Die vollständigen Fundstellen stehen in `docs/SERVERFEHLER_ANALYSE.md`.

Auf der frisch migrierten Integrationsdatenbank trat keiner dieser Fehler auf.

## Behobene Integrationsfehler

| Klasse | Fehler | Korrektur | Regressionstest |
| --- | --- | --- | --- |
| B | Rollenverstoß konnte technische Next.js-Fehlerseite erzeugen | zentrale Weiterleitung auf neutrale Zugriffsseite | ja |
| B | reine Lohnrolle konnte drei leere/fremde Fachübersichten direkt öffnen | serverseitige Rollenprüfung an Mandanten-, Rechnungswesen- und Jahresabschlussübersicht | ja |

Es wurden keine Fachregeln, Statusmodelle oder Daten-Snapshots verändert.

## Prüfumgebung

- `prisma/system-integration.db`
- `tmp/system-integration-storage/ordo-campus`
- `tmp/system-integration-storage/fibu-lohn`
- 15 Migrationen
- deterministischer Gesamttestbestand
- read-only Diagnose ohne Befund

## Qualitätsnachweise

| Prüfung | Ergebnis |
| --- | --- |
| Prisma-Schema | erfolgreich |
| Prisma Client | erfolgreich neu erzeugt |
| Migration auf leerer SQLite-Datenbank | 14 von 14 erfolgreich |
| wiederholter Reset und Seed | erfolgreich und deterministisch |
| Konsistenzdiagnose | null Befunde |
| ESLint | erfolgreich |
| TypeScript | erfolgreich |
| automatisierte Tests | 305 erfolgreich, 1 bewusst übersprungen |
| Produktions-Build | erfolgreich |
| Entwicklungsstart | erfolgreich |
| Produktionsstart | erfolgreich |
| Neustart/Persistenz | erfolgreich |
| Browser 1.280/1.024/600 Pixel | erfolgreich |
| Browser-/Serverfehler nach Korrektur | keine unbehandelten Fehler |
| Performance-Smoke-Test | erfolgreich |

## Module und Rollen

Gemeinsam geprüft wurden Anmeldung, Dashboard, Mandanten, Rechnungswesenaufgaben, Jahresabschlussaufgaben, Standardaufgaben, Excel-Import, Ordo Campus, Campus-Anhänge, FiBu-Lohn-Abstimmungen, Belege, Rückfragen, Fahrzeuge und Benutzerverwaltung.

Die erneute Prüfung nach der PC-Übertragung umfasst zusätzlich FiBu-Lohn-Einzel- und Sammelpositionen, die lückenbasierte Rechnungswesen-Statusübersicht, die gebündelte Navigation, die rollenabhängige Verwaltungsstruktur und die zentrale Checklisten-Sammelspeicherung. Der bewusst übersprungene Test ist der nur mit `RUN_PERFORMANCE_SMOKE=1` aktivierte große Performance-Grundtest in `tests/performance-smoke.test.ts`.

Geprüfte Rollen: Mitarbeiter, Prüfer, Kanzleileitung, Lohnsachbearbeiter und Administrator sowie Rechnungswesen-Mehrfachrollen.

## Offene Punkte

### Klasse A

Keine bekannten Klasse-A-Fehler in der Systemintegrationsumgebung.

### Klasse B

Keine bekannten offenen Klasse-B-Integrationsfehler.

### Klasse C

- Die vorhandene `dev.db` besitzt keine belastbare Prisma-Migrationsbaseline.
- Prisma 6 warnt vor der in `package.json` hinterlegten Seed-Konfiguration für das spätere Prisma 7.
- Unter Windows/Node 24 muss eine leere, geprüfte SQLite-Zieldatei vor `migrate deploy` angelegt werden, damit der Prisma-6-Schema-Engine-Start deterministisch ist.
- Drei hoch eingestufte npm-Hinweise bestehen in indirekten Next.js-Abhängigkeiten. Die angebotene Korrektur wäre ein inkompatibles erzwungenes Downgrade und wurde nicht ausgeführt.
- Der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail.
- Pilotbetrieb benötigt Baseline, gemeinsames Backup/Restore und abgesichertes internes Betriebskonzept.

## Empfehlung

1. Fachliche FiBu-Lohn-Endabnahme auf der Integrationsumgebung durchführen.
2. Bis zur Baseline nur `dev:integration` für sichere Weiterentwicklung verwenden.
3. In einem eigenen technischen Auftrag eine Migrationsbaseline auf einer Datenbankkopie erstellen und rücksicherbar prüfen.
4. Erst danach einen separaten lokalen Pilotbestand mit Backup-, Wiederherstellungs-, HTTPS- und Zugriffskonzept einrichten.

Der Gesamtstand ist für die fachliche Endabnahme geeignet. Ein dauerhafter Pilotbetrieb wird vor Schritt 3 und 4 noch nicht empfohlen.
