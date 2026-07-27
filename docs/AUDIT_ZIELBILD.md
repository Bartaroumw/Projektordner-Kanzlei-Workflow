# Audit – Zielbild

## Istzustand

Ordo Caroli besitzt getrennte fachliche Verläufe:

- `WorkflowHistory` für Rechnungswesen,
- `AnnualWorkflowHistory` für Jahresabschluss,
- `StandardTaskKnowledgeHistory` für Ordo Campus,
- `StandardTaskPlanningHistory` für Ausführungsplanung,
- Importhistorie.

Diese Verläufe sind wertvoll und bleiben erhalten. Sie sind fachlich nachvollziehbar, aber kein revisionssicherer Audit-Trail.

## Drei getrennte Zwecke

1. **Fachlicher Verlauf**
   - verständliche Anzeige für Bearbeiter und Prüfer.
2. **Sicherheitsaudit**
   - Login, fehlgeschlagene Autorisierung, Rollen- und Passwortadministration, Datenexporte.
3. **Revisionsrelevante Aufzeichnung**
   - nur nach rechtlicher/fachlicher Festlegung; benötigt Manipulationsschutz, Aufbewahrung und Betriebskontrollen.

Diese Zwecke dürfen nicht in ein einziges unstrukturiertes Textfeld gepresst werden.

## Gemeinsamer Ereignisvertrag

```text
AuditEvent
  id
  organizationId
  occurredAt
  actorUserId
  actorEmployeeId
  actorNameSnapshot
  actorFunction
  moduleKey
  action
  entityType
  entityId
  clientId?
  result
  reason?
  correlationId?
  metadataJson?
```

Keine Passwörter, Tokens, vollständigen Dateiinhalte oder unnötigen personenbezogenen Inhalte speichern.

## Umsetzung

- Bestehende Fachverläufe nicht migrieren oder umschreiben.
- Neue Anwendungsservices erzeugen zusätzlich einen einheitlichen AuditEvent-Datensatz.
- Ereignisse innerhalb derselben Datenbanktransaktion speichern.
- Nur append-only aus der Anwendung; kein Bearbeiten oder Löschen über UI.
- Aufbewahrungs- und Zugriffskonzept vor Internetbetrieb festlegen.
- Für echte Revisionssicherheit später technische Unveränderbarkeit, Export, Signierung/WORM und organisatorische Kontrollen gesondert bewerten.

