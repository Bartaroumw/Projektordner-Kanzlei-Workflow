# Berechtigungskonzept – Zielbild

## Istzustand

Die Anwendung prüft Schreibaktionen serverseitig und verbindet Rollen mit konkreten Funktionszuordnungen an Mandant und Checkliste. Das ist eine gute Basis. Rollen und Zusatzberechtigungen sind heute jedoch gleichartige Strings in `UserRole`; ein Scope fehlt.

## Zielprinzip

Eine Berechtigung ergibt sich künftig aus:

```text
aktives Benutzerkonto
+ aktive Mitarbeiteridentität
+ fachliche Rolle/Berechtigung
+ Scope (Organisation, Modul, Mandant oder konkretes Objekt)
+ Funktionszuordnung
+ gültiger Workflowstatus
+ fachliche Vorbedingungen
```

Die UI darf Aktionen passend ausblenden, aber die Entscheidung bleibt immer serverseitig.

## Rollen, Berechtigungen und Funktionen

- **Rolle:** Mitarbeiter, Prüfer, Kanzleileitung, Administrator.
- **Berechtigung:** etwa `standard_tasks.manage`, `campus.manage`, `clients.manage`.
- **Funktion:** Bearbeiter, Prüfer oder Kanzleileitung an einem konkreten Mandanten oder Vorgang.
- **Scope:** Organisation, Modul, Mandant oder Objekt.

Personengleiche Funktionen bleiben zulässig. Jede Workflowaktion wird getrennt nach aktueller Funktion und Status autorisiert und protokolliert.

## Empfohlenes Modell

```text
Role
Permission
RolePermission
RoleAssignment
  employeeId
  roleId
  organizationId
  optional clientId
  optional moduleKey
  validFrom / validUntil
```

Kein universeller Policy-Editor ist erforderlich. Die fachlichen Regeln bleiben als getestete TypeScript-Policies im Code.

## Zentrale Policy-Schnittstelle

### Ordo Campus 2

Aktive interne Benutzer dürfen grundsätzlich alle aktiven Wissensinhalte lesen; Zielgruppen steuern Empfehlungen und Filter. Dies gilt auch für reine Lohnsachbearbeiter. `ORDO_CAMPUS_VERWALTEN` schützt Anlage, Änderung, Zuordnung, Link-, Anhangs-, Gebiets- und Lernpfadpflege. Eine Administratorrolle allein erzeugt kein Campus-Pflegerecht. Prüferhinweise werden unabhängig von der allgemeinen Leseberechtigung ausschließlich an Prüfer und Kanzleileitung ausgeliefert. Alle Lese- und Schreibregeln werden serverseitig geprüft; Navigation und ausgeblendete Schaltflächen sind keine Autorisierung.

Für jedes Modul:

```text
authorize(actor, action, resource, context) -> erlaubt / fachlicher Fehler
```

Beispiele:

- `monthlyChecklist.editTask`
- `annualChecklist.release`
- `standardTask.update`
- `campus.downloadAttachment`

Policies dürfen keine Clientwerte als Identitätsnachweis verwenden. `actor` stammt ausschließlich aus der serverseitig validierten Sitzung.

## Entwicklungsstufen

1. Heutige `permissions.ts`-Funktionen durch benannte Aktionen und einheitliche Fehler erweitern.
2. Organisation und Mitarbeiterprofil ergänzen.
3. Rollen und Berechtigungen getrennt modellieren.
4. Mandanten-/Modul-Scopes erst ergänzen, wenn der erste konkrete Anwendungsfall vorliegt.
5. Externe Portalrollen vollständig getrennt von internen Rollen modellieren.

## Externe Benutzer

Mandantenportal-Benutzer dürfen niemals bloß einen internen `UserRole`-Wert erhalten. Benötigt werden:

- eigene externe Identität,
- explizite Zuordnung zu genau erlaubten Mandanten,
- separates Session-/MFA-Niveau,
- eingeschränkte Portalaktionen,
- lückenlose Sicherheitsprotokollierung.

## Bewertung

| Zeitraum | Bewertung |
|---|---|
| lokaler Testbetrieb | ausreichend |
| nächstes internes Modul | Policy-Grenzen und Rollen/Berechtigungen trennen |
| breiter Mehrbenutzerbetrieb | Organisations- und Objekt-Scopes erforderlich |
| Mandantenportal | neues externes Identitäts- und Autorisierungsmodell zwingend |
