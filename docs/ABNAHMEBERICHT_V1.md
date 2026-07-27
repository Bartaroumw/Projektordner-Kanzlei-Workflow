# Abnahmebericht Ordo Caroli V1

Stand: 27.07.2026

## Ausgangsstand

- gesicherter Ausgangscommit: `28392ce`
- lokale Git-Tags: `v1.0-abnahme` für den Ausgangsstand und `v1.0-abnahme-geprueft` für den korrigierten Prüfstand
- keine Cloud-Veröffentlichung und kein Remote-Repository
- getrennte Abnahmedatenbank: `prisma/acceptance.db`
- getrennter Anhangsspeicher: `tmp/acceptance-campus`
- technische Versionen: Node.js 24.18.0, npm 11.16.0, Next.js 16.2.12, React 19.2.4, Prisma 6.19.3, SQLite 3.46.0

## Geprüfte Bereiche

| Bereich | Ergebnis |
| --- | --- |
| Authentifizierung und Sitzungen | Bestanden |
| Benutzer, Rollen und Berechtigungen | Bestanden |
| Mandanten und Jahresprofile | Bestanden |
| Standardaufgaben und Excel-Import | Bestanden |
| Ausführungsrhythmen | Bestanden |
| Rechnungswesenworkflow | Bestanden |
| Jahresabschlussworkflow | Bestanden |
| Ordo Campus und Anhänge | Bestanden |
| Dashboard, Suche und Filter | Bestanden |
| Historie und Datenkonsistenz | Bestanden |
| Migration | Bestanden mit Hinweis |
| deterministischer Seed | Bestanden |
| Performance-Grundprüfung | Bestanden |
| Backup und Wiederherstellung | Bestanden |
| Entwicklungs- und Produktionsstart | Bestanden |

## Technische Nachweise

- 18 Testdateien mit 183 erfolgreichen automatisierten Tests einschließlich Performance-Grundtest
- Prisma-Schema validiert
- zwölf additive Migrationen auf leerer Abnahmedatenbank in Reihenfolge ausgeführt
- Seed und Konsistenzprüfung mehrfach erfolgreich
- keine verwaisten Aufgaben, Wissenslinks, Anhänge, Verläufe oder Benutzerreferenzen
- keine doppelten Standardaufgaben-Snapshots innerhalb einer Checkliste
- ESLint, TypeScript und Produktions-Build erfolgreich
- Browserprüfung bei 1.280, 1.024 und 600 Pixel
- keine Browserfehler, React-Warnungen oder nicht abgefangenen Serverfehler in den geprüften Abläufen
- geschützter Campus-Download angemeldet erfolgreich und ohne Anmeldung abgewiesen
- Backup und Wiederherstellung anhand identischer SHA-256-Prüfsummen nachgewiesen

## Behobene Fehler

1. Rücksprungziel eines geschützten Campus-Downloads verlor Query-Parameter.
   - Klasse B
   - Query-String wird nun erhalten; externe Rücksprungziele bleiben gesperrt.
   - zwei Sicherheitstests ergänzt.
2. Abnahme-Seed enthielt nicht alle sechs geforderten Mandantenprofile.
   - Klasse B
   - künstlicher MVZ- und Quartalsmandant sowie passende Mandantenaufgaben ergänzt.

## Verbleibende Punkte

### Klasse A

Keine bekannten offenen Einführungsblocker.

### Klasse B

- Der Prisma-Befehl `migrate deploy` ist in der vorhandenen Node-24-Umgebung nicht nutzbar. Die SQL-Migrationskette selbst ist vollständig erfolgreich. Vor einem späteren Schema-Upgrade im Pilotbetrieb muss eine freigegebene Node-LTS-/Prisma-Kombination festgelegt und erneut geprüft werden.
- Prisma warnt vor der zukünftig entfallenden `package.json#prisma`-Konfiguration. Der Wechsel auf `prisma.config.ts` ist vor Prisma 7 einzuplanen.
- Der lokale HTTP-Betrieb ist nur für den Entwicklungsrechner geeignet.

### Klasse C

Siehe [ROADMAP_NACH_PILOT.md](./ROADMAP_NACH_PILOT.md).

## Pilotempfehlung

Ein technisch begrenzter Pilotbetrieb wird empfohlen unter folgenden Bedingungen:

1. fachliche Endabnahme der Kanzlei;
2. 2 bis 3 geschulte Mitarbeitende;
3. zunächst 5 bis 10 künstliche oder ausdrücklich freigegebene Pilotmandanten;
4. ein vollständiger Monatsdurchlauf und mindestens ein Jahresabschluss-Testfall;
5. tägliches gemeinsames Backup von SQLite-Datenbank und Campus-Anhangsspeicher;
6. abgesicherter Einzelrechner oder internes HTTPS-/Netzwerkbetriebskonzept;
7. künstliche Standardzugänge vor echtem Einsatz entfernen oder mit individuellen Passwörtern absichern;
8. dokumentierte Rückmeldungen und definierter Ansprechpartner;
9. vor späteren Migrationen eine freigegebene Node-LTS-/Prisma-Kombination verwenden;
10. npm-Sicherheitshinweise beobachten und ein kompatibles Update nach Regression einspielen.

Eine automatische Übernahme aller Kanzleimandanten wird nicht empfohlen.
