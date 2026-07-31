# FiBu-Lohn-Abstimmung – technischer Modulabnahmebericht

> Ergänzung vom 28.07.2026: Die anschließende systemweite Integrationsprüfung aller Ordo-Caroli-Module ist in `docs/SYSTEMINTEGRATION_ABNAHMEBERICHT.md` dokumentiert. Für weitere technische und fachliche Prüfungen ist bis zur Migrationsbaseline die dort beschriebene Systemintegrationsumgebung zu verwenden.

Stand: 27.07.2026

## Geprüfter Stand

- Git-Basiscommit: `61b55de91392d39c55b95bee0f170115adb9f7e3`
- Branch: `feature/fibu-lohn-grundlage`
- Git-Tag: noch nicht vergeben
- Prüfgegenstand: Basiscommit zuzüglich des noch nicht eingecheckten FiBu-Lohn-Arbeitsstands Teil 1 bis 3
- Testdatenbank: `prisma/fibu-lohn-acceptance.db`
- Dateispeicher: `tmp/fibu-lohn-acceptance-storage`
- Campus-Testspeicher: `tmp/fibu-lohn-acceptance-campus`

Die aktive Datei `prisma/dev.db` und die regulären Speicher unter `storage/` wurden für Reset, Seed, Browserprüfung, Sicherung und Wiederherstellung nicht verändert.

## Geprüfte künstliche Rollen

- Anna Rechnungswesen – Rechnungswesenbearbeitung
- Peter Prüfer – Rechnungswesenprüfung
- Laura Lohn – Lohnsachbearbeitung
- Leon Lohn – getrennte zweite Lohnzuständigkeit
- Klaus Kanzleileitung – Kanzleileitung ohne Lohnbearbeitung
- Admin Test – technische Administration ohne Fachrecht
- Campus Verantwortlich – Campus-Pflege ohne Lohnrecht

## Geprüfte künstliche Mandanten

Die Mandanten 92001 bis 92008 bilden vollständige Übergabe, neue Lohnübergabe, Rückfrage, offene Nachreichung, Fahrzeugänderung, fehlenden Kanzleilohn, Zuständigkeitswechsel und erledigte Lohnbearbeitung ab. Der Bestand wird relativ zum aktuellen Berlin-Datum erzeugt und funktioniert auch über einen Januar-/Dezember-Wechsel.

## Geprüfte Themen und Workflows

Alle sechs Themen-Snapshots wurden in Reihenfolge, Status, Pflichtfeldern, Belegarten, Nachreichung, Verlauf und Campus-Zugang geprüft:

1. Arbeitnehmerbezogene Vorteile
2. Reisekosten
3. Fahrzeuge
4. Scheinselbstständigkeit
5. Geschenke an Nichtarbeitnehmer
6. Künstlersozialkasse

Geprüft wurden außerdem Gesamtübergabe, getrennte Rechnungswesen- und Lohnstatus, Gesehen-Status, Verarbeitung, Rückfrage und Antwort, Nachreichungssperre, Lohnabschluss, Zuständigkeitswechsel, Fahrzeughistorie, Rollen- und Mandantentrennung sowie geschützter Belegzugriff. Das Modul erzeugt keine automatische steuerliche oder rechtliche Bewertung.

## Migration und Datenkonsistenz

- Historische FiBu-Lohn-Modulabnahme: die damals vorhandenen 14 Migrationen erfolgreich
- Historische Workflow-Testdatenbank: die damals vorhandenen 14 Migrationen erfolgreich
- Vollständige Kopie der vorhandenen Entwicklungsdatenbank: Prisma beendet `migrate deploy` erwartungsgemäß mit `P3005`, weil die bekannte Migrationsbaseline für das bereits bestehende Schema fehlt
- Migration `20260728100000_fibu_payroll_reconciliation_foundation`: unverändert
- Abnahmeseed: erfolgreich und reproduzierbar
- Diagnose: 8 Mandanten, 7 Kanzleilohn-Mandanten, 8 Abstimmungen, 48 Themen-Snapshots, 12 Belege, 1 Rückfrage und 2 Fahrzeuge
- Gefundene Dubletten, verwaiste Referenzen, falsche Zuständigkeiten, fehlende Dateien oder unzulässige Rollenüberschneidungen: 0

Die bekannte Baseline-Abweichung blockiert eine ungeprüfte Aktualisierung der bestehenden Entwicklungsdatenbank. Ein Pilot muss deshalb auf einer sauber aus Migrationen aufgebauten, getrennten Pilotdatenbank beginnen oder zuvor ein eigenes Baseline-Projekt durchführen.

## Automatisierte Prüfungen

- Prisma-Schema: erfolgreich
- Prisma-Client 6.19.3: erfolgreich erzeugt
- ESLint: erfolgreich
- TypeScript: erfolgreich
- Produktions-Build mit Next.js 16.2.12: erfolgreich
- Historischer Modulstand: 249 Tests erfolgreich, 1 bewusst übersprungen
- Aktuelle Systemprüfung nach PC-Übertragung: 15 Migrationen, 305 Tests erfolgreich, 1 bewusst übersprungen

Der übersprungene Test `tests/performance-smoke.test.ts` ist ein optionaler großer Lasttest. Er läuft nur mit `RUN_PERFORMANCE_SMOKE=1`, damit der reguläre Testlauf schnell und deterministisch bleibt. Für diese Abnahme wurde stattdessen der gezielte FiBu-Lohn-Lastbestand mit `npm.cmd run testdata:fibu-lohn:performance` ausgeführt.

## Browserprüfung

Im Entwicklungs- und Produktionsstart wurden geprüft:

- Anmeldung als Anna, Laura, Leon und Peter
- Gesamtübergabe des Mandanten 92001
- Lohnstatus `Neu → Gesehen → Erledigt`
- Verarbeitung aller drei Sachverhalte
- Rückfrage, Antwort, Rückfragenabschluss und Lohnabschluss bei Mandant 92003
- verständliche Sperre des Lohnabschlusses bei offener Nachreichung für Mandant 92004
- Zugriffssperre für Leon auf eine Laura zugeordnete Abstimmung
- Peter mit vollständiger Prüfersicht, aber ohne Lohnaktionsschaltflächen
- Ordo-Campus-Anzeige einschließlich Prüferhinweisen
- responsive Grunddarstellung bei 1.280, 1.024 und 600 Pixel Breite
- lokale Produktionsansicht unter einem getrennten Port

Browserkonsole und Serverprotokolle enthielten keine Anwendungsfehler. Die Browserprüfung veränderte ausschließlich den künstlichen Abnahmebestand; anschließend wird dieser wieder deterministisch zurückgesetzt.

## Datei- und Zugriffssicherheit

Automatisiert geprüft wurden PDF, DOCX, XLSX, PNG und JPG/JPEG, Größenbegrenzung, EXE-Ablehnung, MIME- und Signaturprüfung, leere Dateien, manipulierte Namen und kollisionssichere UUID-Speichernamen. Fremde Lohnsachbearbeiter, nicht angemeldete Benutzer und reine Administratoren erhalten keinen fachlichen Zugriff. Interne Pfade werden nicht in der Oberfläche ausgegeben.

Eine Virenscannerintegration ist nicht vorhanden. Für einen Pilot dürfen deshalb nur kontrollierte interne Testdateien verwendet werden.

## Backup und Wiederherstellung

Die Abnahmedatenbank und alle 12 künstlichen Belege wurden gemeinsam gesichert, kontrolliert verändert und vollständig wiederhergestellt. Datenbank- und Dateiprüfsummen entsprachen danach exakt dem Ausgangszustand. Die anschließende Konsistenzdiagnose blieb ohne Befund.

Ein vollständiges betriebliches Backup muss immer Datenbank, `storage/ordo-campus` und `storage/fibu-lohn` im selben Sicherungslauf umfassen.

## Performance-Grundprüfung

Der getrennte synthetische Bestand umfasste:

- 500 Mandanten
- 300 Kanzleilohn-Mandanten
- 3.600 Abstimmungen
- 21.600 Themen
- 600 Rückfragen
- 300 Fahrzeuge

Gemessene lokale Abfragezeiten:

| Bereich | Zeit | Ergebnisgrenze |
| --- | ---: | ---: |
| Lohn-Dashboard | 30,1 ms | 100 |
| Mandantensuche | 9,2 ms | 100 |
| Abstimmungsdetail | 4,1 ms | 1 |
| Fahrzeugliste | 13,6 ms | 200 |
| Rückfragenübersicht | 14,4 ms | 100 |

Die Listen verwenden begrenzte Prisma-Abfragen. Binäre Belegdateien werden in Übersichten nicht geladen. Es wurden keine auffälligen N+1-Muster festgestellt.

## Gefundene und behobene Fehler

- Der Lohnabschluss berücksichtigte eine dokumentierte, aber noch nicht fachlich abgeschlossene Nachreichung nicht ausdrücklich. Die zentrale serverseitige Abschlussprüfung sperrt diesen Fall jetzt.
- Der Abnahmeseed konnte Next.js-Pfadaliase außerhalb der Anwendung nicht auflösen. Ein eng begrenzter lokaler Pfadauflöser ermöglicht die Wiederverwendung derselben Fachservices.
- Die Zugriffssperrseite enthielt bei FiBu-Lohn eine unklare grammatikalische Formulierung. Sie verwendet nun die neutrale Bezeichnung „Bereich“.
- Große Arbeitslisten waren nicht ausdrücklich begrenzt. Abstimmungen, Rückfragen und Fahrzeuge besitzen nun nachvollziehbare Obergrenzen.

## Verbleibende Punkte

### Klasse A – Einführungsblocker

Keine innerhalb des geprüften, getrennten lokalen Pilotaufbaus.

### Klasse B – wichtige Bedingungen vor einem Pilot

- Fachliche Endabnahme des Themenkatalogs, der Pflichtangaben, Belegarten und Campus-Inhalte steht aus.
- Für die bestehende Entwicklungsdatenbank fehlt weiterhin eine Prisma-Migrationsbaseline. Sie darf nicht als Pilotdatenbank fortgeschrieben werden.
- Vor einem Netzwerkbetrieb sind HTTPS, Zugriffsschutz, tägliche verschlüsselte Sicherung, Wiederherstellungsroutine und ein Betriebskonzept erforderlich.
- Die drei dokumentierten hohen npm-Hinweise zu Next.js, indirektem PostCSS und Sharp bleiben bestehen; es wird kein erzwungenes inkompatibles Downgrade ausgeführt.

### Klasse C – Verbesserungen

- Prisma warnt vor der künftig entfallenden `package.json#prisma`-Konfiguration.
- Eine Virenscanner-, DMS-, OCR-, Export- und Benachrichtigungsintegration ist nicht vorhanden.
- Der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail.

## Pilotempfehlung

Das Modul ist technisch für einen begrenzten lokalen Pilotbetrieb auf einer frisch aus Migrationen aufgebauten, getrennten Pilotdatenbank bereit. Empfohlen werden zwei Rechnungswesenbearbeiter, ein Rechnungswesenprüfer, ein bis zwei Lohnsachbearbeiter, fünf bis zehn künstliche oder ausdrücklich freigegebene Pilotmandanten und mindestens ein vollständiger Abrechnungsmonat.

Voraussetzungen sind die dokumentierte fachliche Endabnahme, ausschließlich kontrollierte Dateien, tägliche gemeinsame Sicherung von Datenbank und Dateispeichern, benannte Verantwortlichkeiten und dokumentierte Rückmeldungen. Eine automatische Aktivierung bei allen Kanzleilohn-Mandanten erfolgt nicht.

**Klasse-A-Blocker:** nein, bezogen auf den getrennten lokalen Pilotaufbau.  
**Technische Pilotbereitschaft:** ja, unter den genannten Bedingungen.  
**Fachliche Endabnahme:** steht noch aus.  
**Freigabeentscheidung:** durch die Kanzlei im Dokument `FIBU_LOHN_FACHLICHE_ENDABNAHME.md`.
