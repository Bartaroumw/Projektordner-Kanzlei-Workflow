# Prüfbogen Systemintegration nach FiBu-Lohn

Stand: 28.07.2026

## Schutz und Aufbau

- [x] Git-Status, Branch und Ausgangscommit dokumentiert
- [x] Sicherungscommit `c9ad6fa` erstellt
- [x] `dev.db`, Campus-Speicher und lokale Umgebung gesichert
- [x] aktive `dev.db` während der Integrationsprüfung unverändert
- [x] getrennte Integrationsdatenbank und getrennte Speicherpfade
- [x] geschützter, wiederholbarer Reset
- [x] alle 15 Migrationen unverändert angewendet
- [x] Prisma Client neu erzeugt
- [x] deterministischer Gesamttestbestand zweimal erfolgreich erzeugt
- [x] lesende Gesamtdiagnose ohne Befund

## Module

- [x] Anmeldung, Abmeldung und geschützte Weiterleitung
- [x] Dashboard
- [x] Mandantenübersicht und Mandantendetail
- [x] Rechnungswesenaufgaben und Aufgaben-Snapshots
- [x] Jahresabschlussaufgaben
- [x] Standardaufgaben und Excel-Import
- [x] Ordo Campus einschließlich Prüferhinweisen
- [x] geschützter Campus-Anhang
- [x] FiBu-Lohn-Arbeitsübersicht und Abstimmungsdetail
- [x] getrennte Rechnungswesen- und Lohnstatus
- [x] Lohnrückfragen und Nachreichungen
- [x] Fahrzeuge und Fahrzeughistorie
- [x] Benutzerverwaltung
- [x] Rollen- und Direktzugriffsschutz

## Rollen

- [x] Mitarbeiter/Rechnungswesenbearbeiter
- [x] Rechnungswesenprüfer
- [x] Kanzleileitung
- [x] reine Lohnsachbearbeiterin
- [x] reiner Administrator
- [x] Mehrfachrollen ohne Vermischung mit Lohnrechten

## Qualität

- [x] Prisma-Schema gültig
- [x] Prisma Client erzeugt
- [x] ESLint erfolgreich
- [x] TypeScript erfolgreich
- [x] 256 automatisierte Tests erfolgreich
- [x] ein bewusst optionaler Test übersprungen
- [x] Produktions-Build erfolgreich
- [x] Entwicklungsstart gegen Integrationsbestand erfolgreich
- [x] Produktionsstart gegen Integrationsbestand erfolgreich
- [x] Neustart und Persistenz erfolgreich
- [x] Browserprüfung bei 1.280, 1.024 und 600 Pixel
- [x] keine verbleibenden HTTP-500-, Prisma-, React- oder Hydrationfehler
- [x] separater FiBu-Lohn-Performance-Smoke-Test erfolgreich

## Manuelle fachliche Endabnahme

Die technische Systemintegration ersetzt nicht die fachliche Freigabe durch die Kanzlei. Für die fachliche FiBu-Lohn-Endabnahme sind zusätzlich die Abläufe in `docs/FIBU_LOHN_FACHLICHE_ENDABNAHME.md` mit den dort benannten Rollen vollständig durchzuführen und zu protokollieren.
# Ergänzende Prüfung der Sammelspeicherung

- Mehrere Rechnungswesenaufgaben ändern; Anzahl in der Sticky-Leiste prüfen.
- Eine Aufgabe lokal verwerfen; übrige Änderungen müssen erhalten bleiben.
- Gültige und ungültige Aufgabe gemeinsam speichern; Teil-Erfolg und Sprung zur Fehlerkarte prüfen.
- Nach erfolgreichem Speichern erneut ändern und verwerfen; Rücksprung muss auf den zuletzt gespeicherten Stand erfolgen.
- Interne Navigation und Browser-Neuladen bei offenen Änderungen prüfen.
- Workflowaktion bei offenen Änderungen prüfen.
- Mehrere Jahresabschlussaufgaben gesammelt speichern.
- Einen `updatedAt`-Konflikt simulieren und sicherstellen, dass die neuere Serverfassung nicht überschrieben wird.
