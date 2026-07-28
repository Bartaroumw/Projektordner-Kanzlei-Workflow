# FiBu-Lohn-Abstimmung – Abnahmeprüfbogen

Stand: 27.07.2026  
Testbestand: ausschließlich künstliche Daten aus `npm.cmd run testdata:fibu-lohn`

Fehlerklassen:

- **A – Einführungsblocker:** Datenschutz-, Berechtigungs-, Datenverlust- oder fachlicher Kernfehler
- **B – wichtiger Fehler:** wesentliche Einschränkung ohne unmittelbaren Datenverlust
- **C – Verbesserung:** Bedien- oder Darstellungsverbesserung
- **fachliche Rückfrage:** Entscheidung der Kanzlei erforderlich
- **Campus-Inhalt fehlt:** technische Funktion vorhanden, Inhalt fachlich zu ergänzen

| Nr. | Benutzerrolle | Mandant | Abrechnungsmonat | Ausgangsstatus | Handlung | Erwartetes Ergebnis | Tatsächliches Ergebnis | Bestanden | Abweichung | Fehlerklasse | Bemerkung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Rechnungswesen | 92001 | dynamischer Vormonat | Übergabebereit | Abstimmung öffnen | Sechs Themen, drei Sachverhalte und drei Negativentscheidungen sichtbar |  | ☐ |  |  |  |
| 2 | Rechnungswesen | 92001 | Vormonat | Übergabebereit | Gesamtübergabe bestätigen | Rechnungswesenstatus vollständig übergeben, Lohnstatus Neu |  | ☐ |  |  |  |
| 3 | Lohn | 92002 | Vormonat/Folgemonat | Neu | Als gesehen markieren | Lohnstatus Gesehen, Rechnungswesenstatus unverändert |  | ☐ |  |  |  |
| 4 | Lohn | 92003 | Vormonat/Folgemonat | Rückfrage offen | Rückfrage prüfen | Richtige Themenkarte, Absender und Empfänger |  | ☐ |  |  |  |
| 5 | Rechnungswesen | 92003 | Vormonat | abgeschlossen/übergeben | Rückfrage beantworten | Antwort gespeichert, Monatscheckliste bleibt geschlossen |  | ☐ |  |  |  |
| 6 | Lohn | 92003 | Vormonat/Folgemonat | Beantwortet | Rückfrage schließen | Status Erledigt durch Lohn |  | ☐ |  |  |  |
| 7 | Rechnungswesen | 92004 | Vormonat | Nachreichung offen | Beleg nachreichen | Beleg als nachträglich ergänzt sichtbar |  | ☐ |  |  |  |
| 8 | Lohn | 92004 | Vormonat/Folgemonat | Nachreichung offen | Abstimmung erledigen | Abschluss bis fachlichem Abschluss der Nachreichung gesperrt |  | ☐ |  |  |  |
| 9 | Rechnungswesen | 92005 | Vormonat | offen | Fahrzeugbestand öffnen | Nutzer- und Methodenwechsel historisch sichtbar |  | ☐ |  |  |  |
| 10 | Rechnungswesen | 92006 | Vormonat | kein Kanzleilohn | Monatscheckliste öffnen | Keine FiBu-Lohn-Abstimmung vorhanden |  | ☐ |  |  |  |
| 11 | Lohn Laura | 92007 | Vorvormonat | historisch | Alte Abstimmung öffnen | Historischer Snapshot bleibt Laura zugeordnet |  | ☐ |  |  |  |
| 12 | Lohn Leon | 92007 | Vormonat | aktuell | Neue Abstimmung öffnen | Neue Abstimmung ist Leon zugeordnet |  | ☐ |  |  |  |
| 13 | Lohn Leon | 92002 | Vormonat/Folgemonat | fremd | Direkten Link öffnen | Zugriff verweigert, keine Datenänderung |  | ☐ |  |  |  |
| 14 | Prüfer | 92001 | Vormonat | Übergabebereit | Prüfsicht öffnen | Alle Themen und Belege lesbar, keine Lohnstatusaktion |  | ☐ |  |  |  |
| 15 | Administrator | 92002 | Vormonat/Folgemonat | Neu | Direkten Link öffnen | Kein automatischer Fachzugriff |  | ☐ |  |  |  |
| 16 | Rechnungswesen | 92001 | Vormonat | Sachverhalt | PDF hochladen | Geschützt gespeichert und abrufbar |  | ☐ |  |  |  |
| 17 | Rechnungswesen | 92001 | Vormonat | Sachverhalt | EXE/falsche Signatur hochladen | Verständlich abgelehnt |  | ☐ |  |  |  |
| 18 | Prüfer | 92001 | Vormonat | Sachverhalt | Ordo Campus öffnen | Prüferhinweise sichtbar |  | ☐ |  |  |  |
| 19 | Lohn | 92001 | Vormonat | übergeben | Ordo Campus öffnen | Arbeitswissen sichtbar, Prüferhinweise verborgen |  | ☐ |  |  |  |
| 20 | System | alle 920xx | dynamisch | Seed | Diagnose ausführen | Keine Daten- oder Dateikonsistenzfehler |  | ☐ |  |  |  |
| 21 | System | alle 920xx | dynamisch | Seed | Backup/Wiederherstellung | Datenbank und Dateien mit identischen SHA-256-Prüfsummen wiederhergestellt |  | ☐ |  |  |  |
| 22 | System | Performancebestand | aktuelles Jahr | künstlich | Performanceprüfung | 500 Mandanten und 3.600 Abstimmungen mit begrenzten Listen geprüft |  | ☐ |  |  |  |
| 23 | Browser | 92001 | Vormonat | Übergabebereit | Darstellung 1.280 px | Arbeitsoberfläche vollständig bedienbar |  | ☐ |  |  |  |
| 24 | Browser | 92001 | Vormonat | Übergabebereit | Darstellung 1.024 px | Tabellen und Themenkarten nutzbar |  | ☐ |  |  |  |
| 25 | Browser | 92001 | Vormonat | Übergabebereit | Darstellung 600 px | Zentrale Funktionen erreichbar, kein unzugänglicher Inhalt |  | ☐ |  |  |  |

Die fachliche Abnahme wird nicht durch das technische Ausfüllen dieses Prüfbogens ersetzt.
