# Platform Readiness Review – Ordo Caroli

Stand: 27.07.2026  
Geprüfter Commit: `ec2b4d63badc040e58d372e99adfb7c79e9e47df`  
Geprüfter Branch: `architecture/platform-readiness-review`  
Letzter Abnahme-Tag in der Historie: `v1.0-abnahme-geprueft` auf Commit `8307928`

## Management Summary

**Entscheidung: Die bestehende Anwendung nach begrenztem, gezieltem Plattform-Refactoring weiter ausbauen.**

Ordo Caroli ist als fachliche und technische Ausgangsbasis für ein Kanzlei Operating System geeignet. Ein kompletter Neustart wäre weder erforderlich noch wirtschaftlich: Die wichtigsten Rechnungswesen- und Jahresabschlussprozesse, Aufgaben-Snapshots, Verläufe, Berechtigungen, Ordo Campus und die Regressionstests bilden bereits einen substanziellen Wert.

Vor dem nächsten großen Modul müssen jedoch fünf Grundlagen kontrolliert vorbereitet werden:

1. Migrationsbaseline der bestehenden Datenbank herstellen.
2. Modulgrenzen und Anwendungsservice-Grenzen verbindlich definieren.
3. Organisation als Plattformwurzel einführen.
4. Benutzerkonto und Mitarbeiteridentität additiv trennen.
5. Rollen, Berechtigungen und Scopes in einem einheitlichen Policy-Vertrag abbilden.

PostgreSQL ist für die lokale Abnahme nicht erforderlich, aber vor einem breiten internen Mehrbenutzerbetrieb. Internet- oder Portalbetrieb benötigt eine weitere eigenständige Sicherheits- und Betriebsstufe.

## Ausgangslage

Ordo Caroli umfasst heute:

- Mandanten und jahresbezogene Profile,
- Standardaufgaben, Kategorien und Excel-Import,
- Rechnungswesen- und Jahresabschlusschecklisten,
- Bearbeitung, Prüfung, Nachbearbeitung und Freigabe,
- Aufgabenüberträge, Ausführungsrhythmen und unveränderliche Snapshots,
- lokale Benutzer, Rollen, Berechtigungen und Sitzungen,
- Ordo Campus einschließlich lokaler Anhänge,
- operative Dashboards,
- deterministische künstliche Testdaten und umfangreiche automatisierte Tests.

Technischer Stand:

- Next.js 16.2.12 / React 19.2.4 / App Router,
- Node.js 24.18.0 LTS,
- Prisma 6.19.3 und SQLite,
- TypeScript strict, ESLint, Vitest,
- 30 Seiten, 23 Prisma-Modelle und 13 Migrationen.

## Gesamtbewertung

| Entscheidungsoption | Bewertung |
|---|---|
| unverändert weiter ausbauen | nicht empfohlen |
| nach begrenztem Refactoring weiter ausbauen | **empfohlen** |
| größere Plattformrestrukturierung | derzeit nicht erforderlich |
| kompletter Neustart | ausdrücklich nicht empfohlen |

### Begründung

Die Fachlogik ist spezifisch, getestet und sinnvoll modelliert. Das Risiko liegt nicht in einem falschen Produktkern, sondern in wachsenden Querschnittsbelangen: Identität, Organisation, Berechtigungs-Scopes, Migrationen, Audit, Concurrency und Dateispeicher. Diese können additiv und schrittweise verbessert werden.

## Stärken

### Fachlich

- klare getrennte Monats- und Jahresabschlussworkflows,
- Aufgaben- und Rollen-Snapshots schützen historische Inhalte,
- kontrollierte Nachbearbeitung, Rückfragen und Freigaben,
- konkrete Ausführungsmonate statt starrer Sonderfälle,
- Jahresprofile als historisierte Mandantenmerkmale,
- Ordo Campus vermeidet doppelte Wissenspflege,
- keine physische Löschung historischer Checklisten.

### Technisch

- serverseitige Sitzungen und Berechtigungsprüfungen,
- scrypt-Passworthashes und Tokenhashes,
- Transaktionen an wichtigen Schreibabläufen,
- eindeutige Datenbankconstraints,
- additive Migrationen,
- deterministische Seeds und Konsistenzdiagnosen,
- breiter Testbestand,
- lokale Daten, Anhänge und Geheimnisse sauber aus Git ausgeschlossen.

## Wesentliche Risiken

### Vor dem nächsten großen Modul

- Die bestehende Entwicklungsdatenbank besitzt keine nachgewiesene Prisma-Migrationsbaseline.
- Modulgrenzen werden nicht technisch erzwungen; UI, Services und Prisma sind teilweise direkt gekoppelt.
- `User` ist zugleich Konto, Mitarbeiter und fachliche Person.
- Ein `Organization`-Objekt fehlt.
- Rollen und Zusatzberechtigungen sind ungescopte Strings.
- Der Monatsservice bündelt zu viele Verantwortlichkeiten.

### Vor Mehrbenutzerbetrieb

- SQLite-Schreibkonkurrenz,
- keine optimistischen Versionsfelder,
- unpaginierte und teilweise speicherbasierte Filter,
- manuelle Sicherung und lokaler Dateispeicher,
- kein zentraler Betriebs-, Patch- und Monitoringprozess.

### Vor Internetbetrieb

- keine MFA und kein Rate Limiting,
- kein durchgängiger CSRF-/Security-Header-Vertrag,
- keine externen Identitäten und Mandantenscopes,
- kein Malware-Scan oder Objektdateispeicher,
- kein Security Monitoring oder Incident-Prozess.

## Plattformfähige Bestandteile

Unverändert oder mit nur schmalen Schnittstellen weiterzuverwenden:

- `Client.id` als stabile Mandantenidentität,
- `AnnualProfile`,
- Standardaufgaben und Kategorien,
- Snapshot-Prinzip,
- Monats- und Jahresabschlussstatus,
- Workflowregeln,
- Ausführungsplanung,
- Campus-Wissensmodell,
- fachliche Verlaufsdaten,
- lokale Authentifizierung als Pilotbasis,
- bestehende Tests.

## Zwingende Maßnahmen

### Zwingend vor dem nächsten großen Modul

1. Migrationsbaseline auf einer Datenkopie nachweisen und herstellen.
2. Modulkarte, Eigentümer und erlaubte Abhängigkeiten verbindlich festlegen.
3. Schreibzugriffe über Application Services und benannte Policies führen.
4. Zielmodell für Organisation und Mitarbeiter beschließen.
5. neues Modul nur gegen zentrale Mandanten- und Identitätsschnittstellen entwickeln.

### Sinnvoll vor dem nächsten großen Modul

- Monatsservice entlang vorhandener Anwendungsfälle teilen.
- einheitliche Fehler und AuditEvent-Struktur ergänzen.
- `prisma.config.ts` vorbereiten.
- feste Node-/Prisma-Kompatibilitätsmatrix dokumentieren.

### Während des nächsten Moduls

- `Organization` und `Employee` additiv einführen,
- erste gescopte Rollenvergabe,
- modulare Read Models,
- zentrale AuditEvents zusätzlich zu Fachverläufen.

### Erst vor Mehrbenutzerbetrieb

- PostgreSQL,
- Concurrency-/Versionsschutz,
- zentrale Backups, Monitoring und HTTPS,
- Pagination und Lasttests mit realistischer Datenmenge.

### Erst vor Mandanten-Cloud

- externe Identitäten, MFA und Mandantenscopes,
- sicherer Dokumentendienst, Malwareprüfung und Objektspeicher,
- Internet-Härtung, Incident-Prozess und externer Sicherheitstest.

### Langfristige Option

- interne Events/Outbox bei konkreten Integrationen,
- erweiterte Analysen,
- KI-Assistenz,
- Microservices nur bei später nachgewiesenem Betriebsbedarf.

## Zielarchitektur

Der empfohlene modulare Monolith besteht aus:

- Next.js UI,
- Server Actions/Route Handler als Transportgrenze,
- Anwendungsservices je Use Case,
- reine fachliche Regelfunktionen,
- Prisma als Persistenzadapter,
- Plattformkern für Organisation, Mandant, Identität, Autorisierung, Audit und Dateireferenzen,
- klar getrennte Fachmodule,
- Read Models für Dashboard und globale Suche.

Details: `ARCHITEKTUR_ZIELBILD_KANZLEI_OS.md`.

## Mandant, Benutzer und Mitarbeiter

- `Client` bleibt die fachliche Mandantenidentität und erhält `organizationId`.
- `AnnualProfile` bleibt jahresbezogen.
- `UserAccount` trägt künftig nur Anmelde- und Sicherheitsdaten.
- `Employee` trägt Name, Organisation und Beschäftigungsidentität.
- historische Namenssnapshots bleiben unverändert.
- externe Portalidentitäten werden später als eigener Typ eingeführt.

## Berechtigungsmodell

Das aktuelle Modell ist für den lokalen Testbetrieb ausreichend und serverseitig deutlich besser als reine UI-Rechte. Für den Ausbau müssen Rolle, Zusatzberechtigung, konkrete Funktion und Scope getrennt werden. Personengleiche Funktionsbesetzungen bleiben zulässig; jeder Statusschritt wird dennoch separat autorisiert und protokolliert.

## Campus-Dateiablage

Für interne lokale Campus-Anhänge ist die Lösung vertretbar. Sie ist keine Dokumentenplattform. Mandantendokumente und externe Uploads benötigen später einen eigenen Speicherdienst mit Quarantäne, Malwareprüfung, Verschlüsselung, Prüfsummen und Mandantenscopes.

## PostgreSQL

Empfehlung:

- jetzt Migrationsbaseline reparieren,
- in Plattformphase einen PostgreSQL-Prototyp bauen,
- vor breitem Mehrbenutzerbetrieb umstellen,
- nicht zusammen mit Prisma 7 migrieren.

## Node und Prisma

Node 24 ist aktuell LTS und für Next.js 16 passend. Prisma 6.19.3 funktioniert im geprüften Projekt, die `package.json#prisma`-Konfiguration ist aber bereits als veraltet markiert. Upgrades werden getrennt von Fachmodulen und Datenbankwechseln durchgeführt.

## Mehrbenutzerfähigkeit

Vor internem Einsatz:

- PostgreSQL und Connection-Pool,
- Versionsspalten und bedingte Statusupdates,
- kurze Transaktionen,
- Konfliktmeldungen,
- Pagination/Indizes,
- zentrale Backups und Restore-Tests,
- Monitoring und geregeltes Deployment.

Für die Zielgröße 20–40 Mitarbeitende und 500–1.000 Mandanten ist ein modularer Monolith ausreichend. Mehrere Millionen Aufgaben- und Verlaufseinträge erfordern PostgreSQL, Indizes, Pagination und Archivierung, aber keine Microservices.

## Datenschutz, Archivierung und Löschung

Stamm-, Prozess-, Dokument-, Sicherheits- und spätere Zeitdaten benötigen getrennte Schutz- und Aufbewahrungsklassen. Historische Fachobjekte bleiben logisch archiviert. Physische Löschung ist auf kurzlebige technische Daten wie abgelaufene Sitzungen und Importvorschauen zu begrenzen. Ein globales Löschsystem ist erst nach fachlicher und rechtlicher Festlegung sinnvoll.

## Benutzeroberfläche und Arbeitskontext

Die bestehende Mandantenroute ist eine gute Basis für einen künftigen Mandantenarbeitsbereich:

```text
Mandant
├── Übersicht
├── Rechnungswesen
├── Jahresabschluss
├── spätere Aufträge, Zeiten und Fristen
├── spätere Dokumente und Kontakte
└── Historie
```

Die Navigation soll künftig Module gruppieren. Das heutige Rechnungswesendashboard bleibt als Modulansicht erhalten; ein späteres Kanzlei-Cockpit aggregiert nur Read Models.

## Testarchitektur

Stärken:

- echte temporäre SQLite-Datenbank,
- Migrationen werden in Reihenfolge angewendet,
- sequenzielle Tests vermeiden Dateikonflikte,
- viele Fach- und Berechtigungsregeln sind abgedeckt.

Ausbau:

- Application-Service-Integrationstests,
- Architekturtests für Modulimporte,
- Migrationspfade von Vorgängerdatenbanken,
- PostgreSQL-Testmatrix,
- Browser-Smoke-Tests,
- gezielte parallele Update- und Konflikttests.

## Technische Abschlussprüfung

Am 27.07.2026 wurde nach Erstellung der Dokumentation geprüft:

| Prüfung | Ergebnis |
|---|---|
| `prisma validate` | erfolgreich |
| `prisma migrate status` | 13 Migrationen vorhanden; aktive Entwicklungsdatenbank ohne registrierte Baseline |
| ESLint | erfolgreich |
| TypeScript | erfolgreich |
| automatisierte Tests | 210 erfolgreich, 1 bewusst übersprungen |
| Produktions-Build | erfolgreich |
| Entwicklungsstart | erfolgreich auf lokalem Prüfport; `/` leitet zur Anmeldung, Anmeldung ist erreichbar |
| produktionsnaher Start | erfolgreich auf lokalem Prüfport; `/` leitet zur Anmeldung, Anmeldung ist erreichbar |
| `npm audit --omit=dev` | Registry-Abfrage technisch fehlgeschlagen; letzter dokumentierter Stand unverändert |

Es wurden keine Framework-, Datenbank- oder Abhängigkeitsversionen geändert und keine Migration ausgeführt.

## Entscheidungsmatrix

| Empfehlung | Einstufung |
|---|---|
| Migrationsbaseline | zwingend vor dem nächsten großen Modul |
| Modul-/Application-Service-Grenzen | zwingend vor dem nächsten großen Modul |
| Policy-Vertrag | zwingend vor dem nächsten großen Modul |
| Organisation und Employee additiv | kann während des nächsten Moduls umgesetzt werden, Ziel vorher festlegen |
| Monatsservice teilen | sinnvoll vor bzw. während des nächsten Moduls |
| AuditEvent-Vertrag | kann während des nächsten Moduls umgesetzt werden |
| PostgreSQL | erst vor Mehrbenutzerbetrieb erforderlich |
| Objektdateispeicher und externe Identität | erst vor Mandanten-Cloud erforderlich |
| Microservices/Event-Sourcing | langfristige Option, derzeit nicht empfohlen |

## Entscheidungen der Kanzlei

Vor Start des nächsten großen Moduls:

1. Welches fachliche Modul erzeugt den höchsten Nutzen?
2. Soll der nächste interne Pilot Einzelplatz bleiben oder zentral mehrbenutzerfähig werden?
3. Wer ist fachlich und technisch Eigentümer des Plattformkerns?
4. Welche Mitarbeiter- und Rollenstammdaten dürfen in Ordo Caroli geführt werden?
5. Welche Datenaufbewahrung gilt für Verläufe, Notizen und Anhänge?
6. Wann ist ein Mandantenportal realistisch vorgesehen?

## Konkret nächster technischer Arbeitsschritt

Ein begrenztes Vorhaben **„Plattformbasis Phase 1“**:

1. bestehende Datenbank sichern und Migrationsbaseline auf einer Kopie herstellen,
2. Modul- und Policy-Grenzen als automatisierbare Regeln festlegen,
3. additive Schemaentwürfe für `Organization` und `Employee` erstellen,
4. einen kleinen bestehenden Anwendungsfall probeweise über die Zielschichten führen,
5. alle vorhandenen Fachtests unverändert grün halten.

Erst danach wird das nächste Fachmodul begonnen.

## Verwandte Dokumente

- `ARCHITEKTUR_ISTZUSTAND.md`
- `DATENMODELL_PLATTFORMPRUEFUNG.md`
- `BERECHTIGUNGSKONZEPT_ZIELBILD.md`
- `GESCHAEFTSLOGIK_ANALYSE.md`
- `MODULABHAENGIGKEITEN.md`
- `PLATTFORMKERN_ZIELBILD.md`
- `DOKUMENTENARCHITEKTUR_ZIELBILD.md`
- `AUDIT_ZIELBILD.md`
- `POSTGRESQL_MIGRATIONSSTRATEGIE.md`
- `TECHNOLOGIE_UPGRADE_STRATEGIE.md`
- `INTERNETBEREITSTELLUNG_ZIELBILD.md`
- `SICHERHEITSARCHITEKTUR_PRUEFUNG.md`
- `ARCHITEKTUR_ZIELBILD_KANZLEI_OS.md`
- `PLATTFORM_RISIKEN.md`
- `REFACTORING_MATRIX.md`
- `ROADMAP_KANZLEI_OS.md`
