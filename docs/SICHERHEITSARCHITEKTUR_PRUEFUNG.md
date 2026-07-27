# Sicherheitsarchitektur – Prüfung

## Geltungsbereich

Statische Architektur- und Codeprüfung des lokalen Projektstands. Kein externer Penetrationstest und keine Freigabe für Internetbetrieb.

## Positivbefunde

- Passwörter nicht im Klartext; scrypt mit zufälligem Salt.
- Zeitkonstanter Hashvergleich.
- Opake 256-Bit-Sitzungstokens; in der Datenbank nur SHA-256-Hash.
- `HttpOnly`, `SameSite=Lax`, acht Stunden Laufzeit, `Secure` im Produktionsmodus.
- Sitzungsinvalidierung bei Deaktivierung und Passwortwechsel.
- neutrale Loginfehlermeldung.
- Schutz gegen offene Weiterleitung nach Anmeldung.
- serverseitige Berechtigungsprüfungen an fachlichen Schreibaktionen.
- Datei-Pfadbegrenzung, zufällige Storage-Keys, Größen-, Typ- und Signaturprüfung.
- keine Geheimnisse in `.env.example`; lokale Geheimnisse sind aus Git ausgeschlossen.
- keine HTML-Rohübernahme für Campus-Texte.

## Befunde

| Befund | Lokal | Intern mehrfach | Internet |
|---|---|---|---|
| Proxy prüft nur Cookie-Anwesenheit; echte Prüfung erfolgt in Seiten/Actions | vertretbar | beobachten | zentral härten |
| kein einheitlicher CSRF-Vertrag für alle Schreibaktionen | vertretbar bei lokalem SameSite-Betrieb | erforderlich | zwingend |
| kein Rate Limiting/Lockout am Login | vertretbar | sinnvoll | zwingend |
| keine MFA | vertretbar | je Risiko | zwingend |
| Rollen als Strings ohne Scope | vertretbar | vor Ausbau beheben | zwingend |
| kein Sicherheits-Audit für Login/Autorisierungsfehler | begrenzt | erforderlich | zwingend |
| lokale Dateien ohne Malwareprüfung | nur kontrollierte Testdateien | erforderlich bei Uploads | zwingend |
| SQLite-Datei und lokaler Ordner | vertretbar | ungeeignet | ungeeignet |
| keine Security-Header-Konfiguration in `next.config.ts` | vertretbar | sinnvoll | zwingend |
| keine zentrale Secret-Verwaltung | vertretbar | erforderlich | zwingend |
| keine optimistische Sperre | Einzelplatz vertretbar | erforderlich | erforderlich |

## Autorisierungsbewertung

`permissions.ts` ist nachvollziehbar und serverseitig genutzt. Kritische direkte Endpunkte prüfen Berechtigungen. Risiken entstehen durch:

- verteilte Aufrufe in Pages, Actions und Services,
- keine zentrale Aktionsliste,
- keine Organisations-/Mandantenscopes außerhalb aktueller Funktionszuordnungen,
- keine automatisierte Vollständigkeitsprüfung, dass jede schreibende Route eine Policy besitzt.

Empfehlung: jede schreibende Operation ausschließlich über einen Anwendungsservice mit benannter Policy.

## Sitzungen

Vor internem Mehrbenutzerbetrieb:

- regelmäßiges Löschen abgelaufener Sitzungen,
- absolute und optional inaktive Laufzeit,
- Rotation nach Anmeldung und Passwortwechsel,
- Security-Log für Login, Logout, Deaktivierung und Passwortreset,
- zentraler Server mit HTTPS.

## Dateiupload

Die Signaturprüfung erkennt nur grundlegende Dateiformate und ersetzt keinen Virenscanner. Office-ZIP-Dateien werden nicht inhaltlich auf Makros oder Schadobjekte geprüft. Campus-Dateien dürfen daher lokal nur aus vertrauenswürdigen internen Quellen stammen.

## Sicherheitsklassen

- **Aktuell ausreichend für lokalen Testbetrieb:** lokale Anmeldung, Sessionhash, grundlegende Rollenprüfung, kontrollierte Campus-Anhänge.
- **Vor internem Mehrbenutzerbetrieb erforderlich:** PostgreSQL, HTTPS, zentrale Betriebsrechte, Audit, Concurrency, Backupautomatisierung, Patchprozess.
- **Vor Internetbetrieb zwingend:** MFA, Rate Limit, vollständiger CSRF-/Header-Schutz, externe Identitäten, Mandantenscopes, Malwareprüfung, Objektspeicher, Monitoring, Incident-Prozess und externer Sicherheitstest.

