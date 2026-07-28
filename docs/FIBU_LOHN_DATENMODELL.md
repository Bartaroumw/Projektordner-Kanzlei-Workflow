# FiBu-Lohn-Abstimmung – Datenmodell

## Mandantenkonfiguration

`Client` wurde additiv ergänzt um:

- `payrollPreparedByFirm`
- `payrollUserId`
- `payrollServiceStart`
- `payrollServiceEnd`
- `payrollResponsibilityNote`

Bestehende Mandanten erhalten standardmäßig `payrollPreparedByFirm = false`. `ClientPayrollResponsibilityHistory` hält Änderungen der Lohnzuständigkeit mit Benutzer- und Namenssnapshot historisch fest.

## Themenkatalog

`PayrollReconciliationTopic` enthält Schlüssel, Bezeichnung, Beschreibung, Prüffrage, Sortierung, Status, Gültigkeit, Themenart, Fahrzeugbezug, eine ausdrückliche Nachreichungserlaubnis, optionale Campus-Verknüpfung sowie serialisierte Pflichtfelder und Belegarten. `PayrollReconciliationTopicHistory` dokumentiert Änderungen und Archivierungen.

Die Konfiguration erzeugt keinen dynamischen Formulargenerator. Die sechs Startthemen können weiterhin fachlich strukturierte Eingabemasken besitzen.

## Monatsabstimmung

`PayrollReconciliation` verbindet Mandant, Rechnungswesenmonat, Lohnabrechnungsmonat, Monatscheckliste und Checklistenaufgabe. Bearbeiter, Prüfer und Lohnsachbearbeiter werden als Benutzerreferenzen und Namenssnapshots gespeichert.

Zentrale Datenbankregeln:

- `accountingPeriodId` ist eindeutig.
- `checklistTaskId` ist eindeutig.
- `(clientId, payrollYear, payrollMonth)` ist eindeutig.

Damit kann pro Mandant und Lohnabrechnungsmonat keine zweite Abstimmung gespeichert werden – auch nicht durch einen direkten Serveraufruf.

## Themen-Snapshots

`PayrollReconciliationItem` speichert Herkunftsthema und Snapshots von Schlüssel, Titel, Beschreibung, Prüffrage, Reihenfolge, Themenart, Fahrzeugbezug, Pflichtfeldern und Belegarten. Zentrale Themenänderungen wirken nicht rückwirkend.

Themenspezifische Werte werden in `detailsJson` strukturiert abgelegt. Dies ist bewusst eine begrenzte Version-1-Lösung für sechs definierte Formulare und keine allgemeine Workflowengine.

## Rückfragen und Dokumente

`PayrollReconciliationQuestion` enthält Absender, Empfänger, Fachbereiche, Nachricht, Antwort und Status.

`PayrollDocumentReference` enthält fachliche Metadaten und eine lokale Speicherreferenz. Das Modell trennt fachliche Referenz und physischen Speicherpfad, sodass ein späterer Dokumentendienst die lokale Ablage ersetzen kann. FiBu-Lohn-Belege sind fachlich und technisch von `StandardTaskKnowledgeAttachment` getrennt.

## Fahrzeuge

`ClientVehicle` ist dauerhaft am Mandanten gespeichert. `ClientVehicleChange` dokumentiert wesentliche Änderungen mit Gültig-ab-Datum, vorherigem und neuem Zustand. Eine Änderung kann optional mit einer Themenkarte verbunden werden.

## Verlauf

`PayrollReconciliationHistory` verbindet Ereignisse mit Abstimmung und optional Thema oder Fahrzeug. Gespeichert werden Benutzer-ID, Namenssnapshot, Fachbereich, Aktion, Zusammenfassung und Wertänderung.

## Migration

Die additive Migration heißt `20260728100000_fibu_payroll_reconciliation_foundation`. Sie ändert keine bestehende Migration und löscht keine vorhandenen Daten.

Wegen der bekannten Baseline-Abweichung wird sie nicht ungeprüft auf `prisma/dev.db` angewandt. Verifiziert wird sie auf:

1. leerer Datenbank mit allen Migrationen,
2. separater Workflow-Testdatenbank,
3. vollständiger Kopie der Entwicklungsdatenbank.
