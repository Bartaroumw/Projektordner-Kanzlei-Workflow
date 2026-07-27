# Analyse der Geschäftslogik

## Erhaltenswerte Fachlogik

Unverändert zu schützen sind:

- Bearbeitungs-, Prüf- und Freigabestatus,
- Rückfragen, Beanstandungen und Nachbearbeitung,
- Abschlussbedingungen,
- Überträge in den Folgemonat,
- Ausführungsrhythmen und Monatsauswahl,
- Jahresprofile,
- Aufgaben- und Rollen-Snapshots,
- Ordo Campus und Campus-Anhänge,
- personengleiche Rollenbesetzungen mit getrennten Workflowaktionen.

## Gute Zentralisierung

| Regelbereich | Zentrale Stelle |
|---|---|
| Abschlussblocker | `lib/checklist-workflow-rules.ts` |
| Ausführungsplanung | `lib/task-execution-planning.ts` |
| Mandantenvalidierung | `lib/validation.ts`, `lib/client-service.ts` |
| Standardaufgaben | `lib/standard-task-validation.ts`, `lib/standard-task-service.ts` |
| Authentifizierung | `lib/auth-service.ts`, `lib/password.ts` |
| Berechtigungsgrundlage | `lib/permissions.ts` |
| Campus-Pflege | `lib/ordo-campus-service.ts` |
| Importprüfung | `lib/task-import.ts` |

## Konzentrationsrisiken

- `lib/monthly-checklist-service.ts` vereint Auswahl, Erzeugung, Bearbeitung, Rollenwechsel, Review, Rückfragen, Überträge und Vorlagen.
- Monats- und Jahresabschlussworkflow wiederholen Statuswechsel-, Verlaufs- und Aufgabenbearbeitungsmuster.
- Seiten berechnen Fortschritt, filtern Datensätze und prüfen Sichtbarkeit teilweise selbst.
- Namen werden an einigen älteren Servicegrenzen wieder über Volltext auf Benutzer zurückaufgelöst.
- UI-Actions übersetzen Fehler uneinheitlich in Query-Parameter.
- Dashboardfilter werden teilweise nach vollständigem Laden im Arbeitsspeicher angewendet.

## Ziel ohne Überarchitektur

Keine generische Workflowengine. Stattdessen je Fachmodul:

```text
UI / Route
  -> Application Service (Anwendungsfall und Transaktion)
  -> Domain Rules (reine getestete Funktionen)
  -> Repository/Prisma Query
```

Gemeinsam genutzt werden nur echte Querschnittsfunktionen:

- Identität und Autorisierung,
- Verlauf/Audit-Vertrag,
- Snapshot-Hilfen,
- Datums-/Zeitzonenregeln,
- Datei-Metadaten,
- einheitliche Fehler.

## Konkrete Zerlegung des Monatsservices

- `monthly-checklist-creation-service`
- `monthly-task-processing-service`
- `monthly-review-service`
- `monthly-transfer-service`
- `custom-monthly-task-service`
- `monthly-checklist-queries`

Die Aufteilung soll schrittweise erfolgen. Jede extrahierte Funktion behält Signatur und Tests, bis der aufrufende Anwendungsfall umgestellt ist.

## Transaktionen

Transaktionen existieren an wichtigen Schreibabläufen. Vor Mehrbenutzerbetrieb zusätzlich erforderlich:

- Statusvorbedingung in derselben Transaktion prüfen,
- bedingte Updates mit Versionsnummer,
- eindeutige Constraints als letzte Schutzschicht,
- nachvollziehbare Konfliktmeldung statt stiller Überschreibung,
- Datei und Datenbank über ein Outbox-/Kompensationsmuster koordinieren.

## Interne Ereignisse

Ein kleiner synchroner Ereignisvertrag ist später sinnvoll, etwa:

- `ChecklistCompleted`
- `ReviewIssueRaised`
- `AnnualChecklistReleased`
- `CampusAttachmentArchived`

Zunächst werden Ereignisse innerhalb derselben Transaktion als Audit-/Outbox-Datensatz gespeichert. Kein Message Broker und kein Event-Sourcing.

