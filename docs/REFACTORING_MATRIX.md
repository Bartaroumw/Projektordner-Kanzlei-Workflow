# Refactoring-Matrix

| Änderung | Aktueller Zustand | Zielzustand | Betroffene Bereiche | Aufwand | Migrationsrisiko | Testbedarf | Priorität |
|---|---|---|---|---:|---:|---|---|
| Migrationsbaseline | DB kennt Migrationen nicht | nachgewiesene `_prisma_migrations`-Baseline | Prisma, Skripte, Betrieb | M | hoch | Schema-/Datenvergleich, Upgradeprobe | sofort vor neuem Modul |
| Modulgrenzen | Konvention und Direktzugriffe | dokumentierte Eigentümer und öffentliche Services | `app/`, `lib/`, Prisma | M | niedrig | Architektur- und Regressionstests | sofort vor neuem Modul |
| Policy-Vertrag | Funktionssammlung | benannte Aktion/Ressource/Context-Policy | Auth, Actions, APIs | M | mittel | negative Direktaufrufe | sofort vor neuem Modul |
| Organisation | fehlt | ein zentraler Organisationsdatensatz | neue additive Modelle/FKs | M | mittel | Migrations- und Scope-Tests | beim nächsten Modul |
| Mitarbeiterprofil | `User` ist Konto und Person | `UserAccount` + `Employee` | User, Zuordnungen, Snapshots | L | hoch | Auth-, Zuordnungs-, Verlaufstests | beim nächsten Modul |
| Monatsservice teilen | >1.000 Zeilen, viele Belange | Dienste je Anwendungsfall | Monatsworkflow | M | mittel | bestehende Workflowtests | beim nächsten Modul |
| UI-Direktzugriffe | Pages laden Prisma direkt | modulare Query-/Read-Model-Services | Listen, Details, Dashboard | M | niedrig | Ergebnis- und Berechtigungstests | beim nächsten Modul |
| Auditvertrag | mehrere Verlaufsmodelle | gemeinsame AuditEvents zusätzlich | alle Schreibmodule | M | mittel | Unveränderbarkeit/Actor-Tests | beim nächsten Modul |
| Concurrency | nur `updatedAt` | Version + bedingte Updates | mutable Aggregate | M | mittel | parallele Updatefälle | vor Mehrbenutzerbetrieb |
| PostgreSQL | SQLite | getestete PostgreSQL-DB | Prisma, SQL, Betrieb | L | hoch | komplette Dual-DB-Regression | vor Mehrbenutzerbetrieb |
| Pagination | überwiegend vollständige Listen | Cursor/Seiten + DB-Filter | Dashboards/Listen | M | niedrig | Grenz-/Sortiertests | vor Datenwachstum |
| Dateireferenzvertrag | Campus-spezifisch lokal | gemeinsamer Metadatenvertrag | Campus, spätere Dokumente | M | mittel | Datei-/Backup-/Policy-Tests | vor weiteren Dateiarten |
| Objektdateispeicher | lokaler Ordner | sicherer Objektspeicher | Betrieb, Files | L | hoch | Migration/Download/Scan | vor Mandanten-Cloud |
| Externe Identität | fehlt | separate Portalidentität | Auth, Client, Portal | L | hoch | Isolation/MFA/Scope | vor Mandanten-Cloud |
| Prisma-Konfiguration | `package.json#prisma` | `prisma.config.ts` | Tooling | S | niedrig | Seed/Migrate/Test | vor Prisma 7 |
| Statusdomänen | freie Strings | TypeScript-Konstanten, ggf. DB-Enums/Lookup | Schema/Services | M | mittel | Datenmigration/Regression | vor PostgreSQL |
| Interne Events | direkte Kopplung | kleine synchrone Events/Outbox | Audit/Integrationen | M | mittel | Idempotenz/Transaktion | später |

Legende: S = klein, M = mittel, L = groß. Kein Eintrag verlangt einen Big-Bang-Umbau.

