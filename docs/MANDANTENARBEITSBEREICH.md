# Mandantenarbeitsbereich

Die Mandantenliste verwendet eine dauerhaft sichtbare Suche und einen direkten Statusfilter. Zuständigkeiten und Sortierung liegen platzsparend unter **Weitere Filter und Sortierung**. Aktive Filter erscheinen einzeln entfernbar als Chips. Der frühere erklärende Untertitel zur aktuellen Monatscheckliste entfällt; der Zeilenklick bleibt der eindeutige Einstieg in den Mandantenarbeitsbereich. Der Detailkopf zeigt `Mandantennummer · Mandantenname`.

## Zweck

`/mandanten/[id]` ist der zentrale Arbeitskontext eines Mandanten. Der normale Zeilenklick in der Mandantenliste führt hierher. Direkte Fachlinks zu Checklisten, Prüfungen, Rückfragen, Jahresabschlüssen und FiBu-Lohn-Abstimmungen bleiben unverändert.

## Kopf und Übersicht

Der Kopf zeigt Mandantennummer, Name, Aktivstatus, vorhandenes Jahresprofil mit Rechtsform und Gewinnermittlungsart sowie Bearbeiter, Prüfer, Kanzleileitung und bei Kanzleilohn den Lohnsachbearbeiter. Da das aktuelle Schema kein eigenes Feld „Mandantengruppe“ besitzt, wird verlustfrei „Nicht hinterlegt“ angezeigt; es wurde keine Migration erzeugt.

Die Übersicht verwendet ausschließlich vorhandene Daten und zentrale Statusfunktionen:

- Rechnungswesen: lückenloser Abschluss, Bearbeitungs- und Prüfstand, offener Zeitraum und Prüfpunkte.
- Jahresabschluss: Wirtschaftsjahr, Status, Zuständigkeiten und Freigabestand.
- FiBu ↔ Lohn: nur bei Kanzleilohn, mit Zuständigkeit, letzter Abstimmung und offenen Rückfragen.
- Stammdaten und Qualität: fehlende Rollen, Jahresprofil, Lohnzuordnung und erkennbare Monatslücke.

## Reiter und Rechte

Übersicht, laufendes Rechnungswesen, Jahresabschluss, FiBu ↔ Lohn, Fahrzeuge, mandantenspezifische Aufgaben und Historie werden nur angeboten, wenn Rolle und Mandantenkonfiguration passen. Die Links ersetzen keine serverseitige Berechtigungsprüfung. Administratoren ohne Fachrolle erhalten keine fachlichen Aktionen.

Ordo Campus bleibt bewusst an Standardaufgaben und FiBu-Lohn-Themen gebunden. Ein mandantenbezogener Campus-Reiter wird erst eingeführt, wenn ein echtes mandantenbezogenes Wissensmodell besteht.

## Direkte Aktionen

Abhängig von Berechtigung und Datenbestand stehen Mandant bearbeiten, laufendes Rechnungswesen öffnen, nächste Checkliste anlegen, Jahresabschluss öffnen oder anlegen, FiBu-Lohn-Abstimmungen öffnen sowie mandantenspezifische Aufgaben zur Verfügung.
