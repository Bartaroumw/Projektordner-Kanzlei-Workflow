# Roadmap Kanzlei Operating System

## Phase 0 – Bestehenden Stand stabilisieren

- fachliche Abnahme abschließen,
- bestehende Fehler priorisiert beheben,
- Migrationsbaseline der Entwicklungsdatenbank verlustfrei herstellen,
- lokale Sicherung und Wiederherstellung wiederholen,
- aktuelle Security Advisories separat prüfen.

**Abschlusskriterium:** reproduzierbares Schema auf leerer und bestehender Datenbank, alle Regressionstests grün.

## Phase 1 – Plattformkern vorbereiten

- Modulverantwortlichkeiten und Application-Service-Grenzen festlegen,
- Organisation additiv einführen,
- Konto/Mitarbeiter-Trennung additiv vorbereiten,
- Rollen, Berechtigungen und Scopes konzeptionell und technisch trennen,
- AuditEvent-Grundvertrag,
- `prisma.config.ts` und feste Runtime-Matrix.

**Abschlusskriterium:** nächstes Modul kann zentrale Identitäten verwenden, ohne Benutzer- oder Mandantenlogik zu duplizieren.

## Phase 2 – Datenbank und Mehrbenutzerfähigkeit

- PostgreSQL-Testmigration,
- Indizes und Querypläne,
- Transaktions- und Concurrency-Regeln,
- Pagination und Read Models,
- zentraler interner Betrieb,
- automatisierte Backups, Monitoring und Restore-Test.

**Abschlusskriterium:** kontrollierter Betrieb für 20–40 interne Nutzer.

## Phase 3 – Erstes internes Erweiterungsmodul

Mögliche Kandidaten:

- allgemeine Auftragsgrundlage,
- interne Aufgaben,
- Fristen,
- Zeiterfassung.

Die Kanzlei entscheidet fachlichen Nutzen und Reihenfolge. Technisch empfiehlt sich ein begrenztes Modul, das Organisation, Mitarbeiter und Mandant erstmals sauber verwendet.

## Phase 4 – Weitere interne Kanzleimodule

- Planung und Kapazitäten,
- Controlling,
- Dokumentenübersichten,
- modulübergreifendes Kanzlei-Cockpit.

## Phase 5 – Externe Plattformgrundlage

- externe Identitäten und MFA,
- Mandantenscopes,
- sicherer Dokumentendienst,
- Malwareprüfung,
- HTTPS-/Internetbetrieb, Monitoring und Incident-Prozess.

## Phase 6 – Mandantenportal und Cloud

- Portal,
- Dokumentenaustausch,
- Kommunikation,
- externe Freigaben.

## Nicht vorziehen

Microservices, generische Workflowengine, Event-Sourcing, Kubernetes, KI und Pluginarchitektur sind keine Voraussetzungen für die nächsten Phasen.

