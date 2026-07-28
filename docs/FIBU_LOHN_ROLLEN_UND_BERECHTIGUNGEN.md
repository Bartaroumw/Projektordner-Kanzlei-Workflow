# FiBu-Lohn – Rollen und Berechtigungen

## Lohnsachbearbeiter

Die neue Rolle `LOHNSACHBEARBEITER` darf ausschließlich zugeordnete Abstimmungen:

- sehen und öffnen,
- Informationen und Belege lesen,
- als gesehen markieren,
- Rückfragen stellen und nach einer Antwort erledigen,
- übergebene Themen als verarbeitet kennzeichnen,
- aus Sicht von Lohn als erledigt markieren,
- den erforderlichen Fahrzeugbestand lesen.

Die Rolle verleiht keine Rechte an Rechnungswesen- oder Jahresabschlusschecklisten, Standardaufgaben, Ordo Campus, Mandantenstammdaten, Kanzleileitung oder Benutzerverwaltung.

## Rechnungswesen

Der zugeordnete Bearbeiter darf Themen bearbeiten, Pflichtangaben erfassen, Belege bereitstellen, Fahrzeugänderungen dokumentieren, die Gesamtübergabe auslösen und Rückfragen beantworten.

Der zugeordnete Prüfer und die Kanzleileitung dürfen die Abstimmung und Belege im Rahmen der bestehenden Rechnungswesenprüfung lesen. Sie verändern keinen Lohnstatus.

## Themenverwaltung

`FIBU_LOHN_THEMEN_VERWALTEN` ist eine gesonderte fachliche Berechtigung. Kanzleileitung oder Benutzer mit dieser Berechtigung dürfen Themen erstellen, ändern, sortieren und archivieren. Ein reiner Administrator erhält dieses Recht nicht automatisch.

## Personelle Trennung

Die bestehende personelle Mehrfachbesetzung innerhalb der Rechnungswesenfunktionen bleibt unverändert zulässig. Die Lohnzuständigkeit ist davon getrennt:

- der Lohnsachbearbeiter darf am selben Mandanten nicht zugleich Bearbeiter, Prüfer oder Kanzleileitung sein,
- ein ausgewählter Lohnsachbearbeiter muss aktiv sein und die Rolle `LOHNSACHBEARBEITER` besitzen,
- historische Abstimmungen behalten ihre frühere Benutzer-ID und den damaligen vollständigen Namen.

## Serverseitige Prüfung

Jede schreibende Fachfunktion prüft Benutzer-ID, aktive Rolle, konkrete Abstimmungszuordnung und gültigen Status serverseitig. Ausgeblendete Schaltflächen sind kein Sicherheitsmechanismus.

Ein technischer Administrator besitzt ohne zusätzliche fachliche Rolle weder Rechnungswesen- noch Lohnrechte. Ein Lohnsachbearbeiter kann Fahrzeugstammdaten lesen, aber nicht frei verändern.

## Lokaler Sicherheitsrahmen

Sitzungen und Passwörter verwenden die bestehende lokale Authentifizierung. Für einen späteren Netzwerkbetrieb bleiben HTTPS, Betriebsschutz, Datensicherung, Malwareprüfung und ein abgesichertes Berechtigungskonzept erforderlich.
