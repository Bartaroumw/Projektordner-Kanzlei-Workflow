# Technische Übergabe nach PC-Übertragung

Stand: 01.08.2026
Projektpfad: `C:\Projekte\Kanzlei-Workflow`
Branch bei Übernahme: `feature/fibu-lohn-grundlage`
Ausgangscommit: `c9ad6faf69bca18ee4d47676f26b82418faf8eb5`

## Zweck dieser Sicherung

Der bereits vor dem Rechnerwechsel entwickelte, aber noch nicht gesicherte Arbeitsstand wurde auf dem neuen Windows-PC vollständig inventarisiert. Es wurden keine fachlichen Funktionen neu entwickelt und keine vorhandenen Änderungen verworfen. Lokale Datenbanken, Dateispeicher, Backups und generierte Prüfartefakte bleiben außerhalb von Git.

Vor der Sicherung zeigte Git 48 geänderte, 34 ungetrackte und keine gelöschten Dateien. Keine Änderung war gestaged. Die nachstehende Klassifikation umfasst alle diese Dateien.

## Klassifikation der Projektänderungen

### Fachlicher Anwendungscode

- `app/fibu-lohn/[id]/page.tsx`
- `app/fibu-lohn/[id]/reconciliation-item-form.tsx`
- `app/fibu-lohn/actions.ts`
- `app/fibu-lohn/fahrzeuge/page.tsx`
- `app/fibu-lohn/page.tsx`
- `app/fibu-lohn/themen/[id]/bearbeiten/page.tsx`
- `app/fibu-lohn/themen/neu/page.tsx`
- `app/fibu-lohn/themen/page.tsx`
- `app/jahresabschluesse/[id]/page.tsx`
- `app/jahresabschluesse/actions.ts`
- `app/jahresabschluesse/page.tsx`
- `app/mandanten/page.tsx`
- `app/monatschecklisten/[id]/page.tsx`
- `app/monatschecklisten/actions.ts`
- `app/monatschecklisten/page.tsx`
- `app/standardaufgaben/[id]/bearbeiten/page.tsx`
- `app/standardaufgaben/[id]/page.tsx`
- `app/standardaufgaben/import/page.tsx`
- `app/standardaufgaben/kategorien/page.tsx`
- `app/standardaufgaben/neu/page.tsx`
- `app/standardaufgaben/page.tsx`
- `app/ordo-campus/page.tsx`
- `app/rechnungswesen/status/page.tsx`
- `app/verwaltung/mandantenspezifische-aufgaben/page.tsx`
- `app/verwaltung/page.tsx`
- `lib/accounting-status-service.ts`
- `lib/annual-checklist-service.ts`
- `lib/monthly-checklist-service.ts`
- `lib/payroll-reconciliation-service.ts`

### Technische Anwendungskomponenten

- `app/administration/benutzer/[id]/page.tsx`
- `app/administration/benutzer/neu/page.tsx`
- `app/administration/benutzer/page.tsx`
- `app/administration/diagnose/page.tsx`
- `app/anmelden/page.tsx`
- `app/api/fibu-lohn/belege/route.ts`
- `app/components/administration-navigation.tsx`
- `app/components/app-shell.tsx`
- `app/components/checklist-batch-provider.tsx`
- `app/components/module-card.tsx`
- `app/components/module-tabs.tsx`
- `app/components/task-processing-form.tsx`
- `app/components/task-transfer-form.tsx`
- `app/zugriff-verweigert/page.tsx`
- `lib/administration-navigation.ts`
- `lib/auth.ts`
- `lib/checklist-batch.ts`
- `lib/payroll-document-service.ts`

### Prisma-Schema und Migration

- `prisma/schema.prisma`
- `prisma/migrations/20260728140000_workflow_navigation_payroll_positions/migration.sql`

Die Migration ist additiv. Sie führt FiBu-Lohn-Einzel- und Sammelpositionen sowie optionale Positionsreferenzen an Belegen und Verläufen ein. Keine bestehende Migration wurde verändert oder zusammengeführt.

### Tests und Seeds

- `prisma/seed.ts`
- `prisma/system-integration-seed.ts`
- `tests/fibu-lohn-ui.test.ts`
- `tests/workflow-ux-corrections.test.ts`
- `tests/workflow-ux.test.ts`
- `tests/administration-navigation.test.ts`
- `tests/checklist-batch.test.ts`
- `tests/system-integration-environment.test.ts`
- `tests/workflow-navigation-positions.test.ts`

### npm-Skripte und Konfiguration

- `.env.integration.example`
- `.gitignore`
- `package.json`
- `scripts/diagnose-system-integration.ts`
- `scripts/reset-system-integration.mjs`
- `scripts/run-system-integration-diagnose.mjs`
- `scripts/run-system-integration.mjs`
- `scripts/system-integration-environment.mjs`

### Dokumentation und Projektregeln

- `AGENTS.md`
- `README.md`
- `docs/FIBU_LOHN_ABNAHMEBERICHT.md`
- `docs/FIBU_LOHN_BEDIENANLEITUNG.md`
- `docs/WORKFLOW_TESTBESTAND.md`
- `docs/ARCHITEKTUR_ISTZUSTAND.md` (Aktualisierung im Rahmen der Übergabe)
- `docs/PLATFORM_READINESS_REVIEW.md` (Aktualisierung im Rahmen der Übergabe)
- `docs/CHECKLISTEN_SAMMELSPEICHERUNG.md`
- `docs/CHECKLISTEN_UX.md`
- `docs/FIBU_LOHN_MEHRFACHSACHVERHALTE.md`
- `docs/NAVIGATION_UND_MODULSTRUKTUR.md`
- `docs/RECHNUNGSWESEN_STATUSUEBERSICHT.md`
- `docs/SERVERFEHLER_ANALYSE.md`
- `docs/SYSTEMINTEGRATION_ABNAHMEBERICHT.md`
- `docs/SYSTEMINTEGRATION_NACH_FIBU_LOHN.md`
- `docs/SYSTEMINTEGRATION_PRUEFBOGEN.md`
- `docs/UMGEBUNGEN_UND_DATENBESTAENDE.md`
- `docs/VERWALTUNGSSTRUKTUR.md`
- `docs/TECHNISCHE_UEBERGABE.md`
- `docs/AKTUELLER_SYSTEMSTAND.md`
- `docs/MIGRATIONSBASELINE_WARNUNG.md`

### Lokale Datenbanken, lokaler Dateispeicher und Sicherungen

Diese Bestände sind vorhanden, aber ausdrücklich nicht Teil des Git-Commits:

- alle `*.db`-Dateien unter `prisma/`, insbesondere `prisma/dev.db`,
- `storage/ordo-campus`,
- der bei Bedarf automatisch entstehende Ordner `storage/fibu-lohn`,
- `tmp` einschließlich künstlicher Integrations- und Abnahmespeicher,
- `backups` einschließlich der Sicherung vor der Systemintegration.

### Generierte Build- und Prüfartefakte

Diese Bestände werden nicht versioniert:

- `.next`, `out`, `build`,
- `node_modules`,
- `prisma/test.db` und SQLite-Nebendateien,
- `coverage`, `outputs`, temporäre Logs und `*.tsbuildinfo`,
- `next-env.d.ts`,
- lokale Umgebungsdateien wie `.env` und `.env.integration`.

### Unklar und manuell zu prüfen

Keine Datei. Alle sichtbaren Änderungen konnten einer fachlichen, technischen, prüfbezogenen oder dokumentarischen Funktion zugeordnet werden.

## Enthaltener Funktionsstand

Der gesicherte Stand enthält nach Code-, Schema-, Test- und Dokumentationsabgleich:

- vollständige FiBu-Lohn-Abstimmungen mit getrenntem Rechnungswesen- und Lohnstatus,
- mehrere Einzelpositionen und fachlich begrenzte Sammelpositionen,
- Positionsentwürfe, Duplizierung, Archivierung und geschützte Belegzuordnung,
- gebündelte Hauptnavigation und rollenabhängige Verwaltungsstruktur,
- lückenbasierte Rechnungswesen-Statusübersicht,
- überarbeitete Checklistenbedienung,
- zentrale Sammelspeicherung mit Teilresultaten und Konfliktschutz über `updatedAt`,
- geschützte Systemintegrationsumgebung mit 15 Migrationen,
- neue Regressionstests und zugehörige Betriebs- und Fachunterlagen.

## Weiterarbeit

Die Migrationsbaseline von `prisma/dev.db` wurde am 31.07.2026 nach bestätigter Kopienprüfung hergestellt. Migrationen 1 bis 14 sind mit `migrate resolve --applied` registriert; ausschließlich Migration 15 wurde regulär ausgeführt. Prisma meldet 15 erfolgreiche Migrationen und einen aktuellen Status. Entwicklungsstart, Neustart und produktionsnaher Start gegen `dev.db` sind geprüft.

Für isolierte systemweite Prüfungen bleiben diese Befehle vorgesehen:

```powershell
npm.cmd run testdata:system-integration
npm.cmd run dev:integration
```

Kontrolliertes `prisma migrate deploy` ist gegen `dev.db` nach vollständiger gemeinsamer Sicherung und Prüfung zulässig. Wegen des weiterhin dokumentierten Schema-Historien-Drifts bleiben `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, Seeds und Testresets gegen `dev.db` gesperrt. Details und Rollbackverfahren stehen in `docs/MIGRATIONSBASELINE_ABSCHLUSSBERICHT.md`.
