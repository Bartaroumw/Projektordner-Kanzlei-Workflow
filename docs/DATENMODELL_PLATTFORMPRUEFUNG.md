# Datenmodell – Plattformprüfung

## Gesamturteil

Das Datenmodell ist für die heutigen Rechnungswesen- und Jahresabschlussmodule fachlich tragfähig. Für ein Kanzlei Operating System fehlen jedoch ein Organisationsstamm, eine Trennung von Benutzerkonto und Mitarbeiterprofil sowie allgemeine, modulübergreifende Referenzen für Berechtigungen, Aufträge und Audit.

## Modellgruppen

| Gruppe | Modelle | Bewertung |
|---|---|---|
| Mandantenkern | `Client`, `AnnualProfile` | Gute fachliche Basis; `Client` enthält noch aktuelle Rollen, Textsnapshots und Altfelder. |
| Standardaufgaben | `TaskCategory`, `StandardTask`, `StandardTaskPlanningHistory` | Wiederverwendbar; Status und Mehrfachwerte sind teilweise freie Strings. |
| Ordo Campus | `StandardTaskKnowledge`, `StandardTaskKnowledgeLink`, `StandardTaskKnowledgeAttachment`, `StandardTaskKnowledgeHistory` | Klare Bindung an Standardaufgabe; kein allgemeiner Dokumentendienst. |
| Monatsworkflow | `AccountingPeriod`, `ChecklistTask`, `WorkflowHistory`, `CustomClientTask` | Starke Snapshot-Logik; technische Bezeichnung `AccountingPeriod` ist intern vertretbar. |
| Jahresabschluss | `AnnualChecklist`, `AnnualChecklistTask`, `AnnualWorkflowHistory`, `CustomAnnualTask` | Eigenständiger Workflow mit Freigabeebene; teilweise duplizierte Struktur zum Monatsworkflow. |
| Identität | `User`, `UserRole`, `Session` | Für lokale Anmeldung geeignet; Konto, Person und Mitarbeiterrolle sind gekoppelt. |
| Import | `TaskImportPreview`, `TaskImportHistory` | Sinnvolle kurzlebige Vorschau und dauerhafte Ergebnishistorie. |
| Altbestand | `FunctionSeparationException` und Referenzen | Historisch erhalten, fachlich nicht mehr aktiv verwenden. |

## Mandant als zentrale Plattformidentität

`Client.id` ist bereits die technische Referenz für Jahresprofile, Monats- und Jahresabschlusschecklisten sowie mandantenspezifische Aufgaben. Damit ist der Mandant der natürliche fachliche Aggregationspunkt.

Vor weiteren Modulen sollte getrennt werden:

- **Mandantenstamm:** Nummer, Name, Aktivstatus, zentrale Zuordnung zur Organisation.
- **Jahresbezogene Merkmale:** unverändert in `AnnualProfile`.
- **Verantwortlichkeiten:** künftig als zeitlich nachvollziehbare Zuordnungen statt nur als aktuelle Spalten am Mandanten.
- **Kontakte und externe Identitäten:** später eigene Modelle, nicht zusätzliche Felder an `Client`.
- **Mandantengruppen oder verbundene Unternehmen:** später additive Relation.

Die bestehende `Client.id` darf erhalten bleiben. Eine Neuschlüsselung ist unnötig.

## Fehlendes Organisationsobjekt

Ein `Organization`-Modell fehlt. Im heutigen Einzelkanzleibetrieb ist das funktional unkritisch, für Berechtigungs-Scopes, Einstellungen, externe Benutzer und spätere Mandantentrennung jedoch zentral.

Empfehlung vor oder zusammen mit dem nächsten großen Modul:

```text
Organization
  id
  name
  timezone
  locale
  active

Client.organizationId
Employee.organizationId
RoleAssignment.organizationId
```

Zunächst genügt genau ein Organisationsdatensatz. Das ist keine Mandantenfähigkeit im SaaS-Sinn, schafft aber eine saubere Eigentumsgrenze.

## Benutzerkonto und Mitarbeiter

`User` enthält heute Login, Passwort, Sitzungssteuerung, vollständigen Namen und fachliche Rollen. Zielbild:

- `UserAccount`: Anmeldung, Passwort, Status, letzter Login, Session-Version.
- `Employee`: Personalidentität, Anzeigename, Kurzbezeichnung, Organisation, Beschäftigungsstatus.
- `ExternalIdentity`: später Mandantenportal oder Identitätsanbieter.
- `RoleAssignment`: Rolle/Berechtigung plus Scope.

Historische Namenssnapshots bleiben unverändert. Die Umstellung soll additiv erfolgen: zunächst `Employee` ergänzen und `User.employeeId` setzen, erst später Fachreferenzen auf Mitarbeiter umstellen.

## Snapshots

Die bestehenden Snapshots sind plattformfähig:

- Aufgabeninhalt wird bei Checklistenerzeugung kopiert.
- Rollenname und Benutzerreferenz werden gespeichert.
- Änderungen an Standardaufgaben oder Mandanten überschreiben historische Checklisten nicht.
- Campus-Wissen wird bewusst nicht kopiert und bleibt die aktuelle zentrale Wissensquelle.

Diese unterschiedliche Semantik muss erhalten bleiben und dokumentiert werden: **Prozessinhalt ist Snapshot, Wissen ist Referenz.**

## PostgreSQL- und Skalierungsrisiken

- Viele Status-, Rollen- und Mehrfachwerte sind Strings; vor PostgreSQL sind kontrollierte Domänentypen oder Lookup-Tabellen zu prüfen.
- Semikolonlisten (`legalFormGroups`, `executionMonths`) sind für kleine Regelmengen praktikabel, aber schlecht indexierbar.
- `Int`-IDs reichen für die geplante Größenordnung, solange externe URLs keine Sicherheitsannahme daraus ableiten.
- Datumswerte benötigen eine klare UTC-Speicher-/Europe-Berlin-Anzeigeregel.
- Bei mehreren Millionen Verlaufs- und Aufgabenzeilen werden zusammengesetzte Indizes, Pagination und Archivierungsstrategien erforderlich.
- `updatedAt` ist noch keine Versionsnummer und verhindert keine verlorenen Aktualisierungen.

## Löschung und Archivierung

| Objekt | Heute | Ziel |
|---|---|---|
| Mandant | Aktiv/Inaktiv | Archivstatus, Grund und Zeitpunkt; keine Kaskadenlöschung |
| Benutzer | Aktiv/Inaktiv | Beibehalten; Zuordnungsprüfung und Aufbewahrung |
| Standardaufgabe | Aktiv/Inaktiv | Beibehalten; Archivstatus vereinheitlichen |
| Checklisten/Aufgaben | keine physische Fachlöschung | Beibehalten |
| Campus-Wissen/Anhänge | Status `Archiviert` | Beibehalten, später Aufbewahrungsregel |
| Sitzungen/Importvorschauen | physisch löschbar | Aufräumjobs definieren |
| Rollen | derzeit ersetzbar/löschbar | Änderungen künftig auditieren |

## Datenklassen

- **Stammdaten:** Organisation, Mandanten, Mitarbeiter, spätere Kontakte.
- **Prozessdaten:** Aufgaben, Status, Notizen, Prüfungen, Freigaben.
- **Dokumente:** Campus-Anhänge; später getrennte Mandantendokumente.
- **Sicherheitsdaten:** Passwort-Hashes, Sitzungen, Berechtigungen, Sicherheitsaudit.
- **Spätere Steuerungsdaten:** Aufträge, Zeiten, Budgets und Kapazitäten.

Für jede Klasse müssen später getrennte Aufbewahrungs-, Zugriffs-, Sicherungs- und Löschregeln möglich sein. Die empfohlene Modul- und Organisationszuordnung schafft dafür die technische Grundlage.

