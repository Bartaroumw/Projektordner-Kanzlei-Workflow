# Abnahmeprotokoll Ordo Caroli V1

> Der Dateiname folgt der vorgegebenen Bezeichnung. Der Produktname lautet korrekt **Ordo Caroli**.

## Rahmendaten

| Merkmal | Wert |
| --- | --- |
| Prüfdatum | 27.07.2026 |
| gesicherter Ausgangscommit | `28392ce` |
| Git-Tags | `v1.0-abnahme` (Ausgangsstand), `v1.0-abnahme-geprueft` (korrigierter Prüfstand) |
| Testdatenbank | `prisma/acceptance.db`, ausschließlich künstliche Daten |
| Campus-Speicher | `tmp/acceptance-campus`, getrennt vom Entwicklungsspeicher |
| Node.js | 24.18.0 |
| npm | 11.16.0 |
| Next.js | 16.2.12 |
| React | 19.2.4 |
| Prisma | 6.19.3 |
| SQLite | 3.46.0 |

## Prüfergebnisse

| Bereich | Status | Ergebnis |
| --- | --- | --- |
| Git-Sicherung und Tag | Bestanden | Ausgangsstand lokal committed und getaggt; kein Remote eingerichtet. |
| Anmeldung und Sitzungen | Bestanden | gültige und ungültige Anmeldung, Abmeldung, geschützte Direktaufrufe und HTTP-only-Session automatisiert beziehungsweise im Browser geprüft. |
| Benutzer und Rollen | Bestanden | mehrere Rollen, Zusatzberechtigungen, deaktivierte Benutzer und rein technischer Administrator geprüft. |
| Mandanten und Jahresprofile | Bestanden | Anlage, Bearbeitung, Suche, Rollenbesetzung, Jahresprofile und historische Isolation durch Tests abgedeckt. |
| Standardaufgaben und Excel-Import | Bestanden | Anlage, Änderung, Deaktivierung, Vorschau, Bestätigung, Dubletten und Fehlerfälle automatisiert geprüft. |
| Ausführungsrhythmen | Bestanden | monatlich, zwei Quartalszyklen, halbjährlich, jährlich und benutzerdefiniert einschließlich Validierung geprüft. |
| Rechnungswesenworkflow | Bestanden | Snapshotbildung, Bearbeitung, Nicht zutreffend, Übertrag, Prüfung, Nachbearbeitung, Abschluss und Wiederöffnung geprüft. |
| Jahresabschlussworkflow | Bestanden | Bearbeitung, Prüfung, Nachbearbeitung, fachlicher Abschluss, Freigabe und Wiederöffnung geprüft. |
| Ordo Campus | Bestanden | aktive Inhalte, Rollenanzeige, Live-Referenz, Suche, Links und Verlauf geprüft. |
| Campus-Anhänge | Bestanden | erlaubte Formate, Größenlimit, Signaturen, Archivierung, geschützter Download und Speicherung außerhalb `public` geprüft. |
| Dashboard, Suche und Filter | Bestanden | personenbezogene Zuordnung, zentrale Filter, leere Zustände und direkte Links geprüft. |
| Datenkonsistenz | Bestanden | keine verwaisten Aufgaben, Links, Anhänge, Verläufe oder Rollenreferenzen; keine Snapshot-Dubletten. |
| Migrationen | Bestanden mit Hinweis | alle zwölf SQL-Migrationen in Reihenfolge auf leerer Datenbank erfolgreich; Prisma `migrate deploy` liefert unter der lokalen Node-24-Umgebung nur einen Schema-Engine-Fehler. |
| Seed | Bestanden | mehrfach reproduzierbar; sechs künstliche Mandanten, alle Rollen und Rhythmusarten. |
| Performance | Bestanden | Grundtest mit 300 Mandanten, 1.200 Checklisten und 30.000 Aufgaben unter dem lokalen Grenzwert von 10 Sekunden. |
| Backup und Wiederherstellung | Bestanden | Datenbank und künstlicher Anhang nach Veränderung prüfsummengleich wiederhergestellt. |
| Responsive Darstellung | Bestanden | Dashboard bei 1.280, 1.024 und 600 Pixel ohne horizontales Seitenüberlaufen; Jahresabschluss bei 600 Pixel geprüft. |
| Produktions-Build und Start | Bestanden | Build und lokaler Produktionsstart erfolgreich. |

## Gefundene Abweichungen und Korrekturen

### B-01 – Rücksprung nach geschütztem Download

- Klasse: B
- Ursache: Die Anmeldung bewahrte beim Rücksprung nur den Pfad, nicht die für den Download erforderlichen Query-Parameter.
- Korrektur: Der interne Pfad einschließlich Query-String wird nun sicher erhalten. Offene externe Weiterleitungen bleiben ausgeschlossen.
- Test: `tests/acceptance-security.test.ts`

### B-02 – Seed deckte nicht alle vorgegebenen Abnahmeprofile ab

- Klasse: B
- Ursache: Der bestehende deterministische Seed enthielt vier statt sechs getrennte Mandantenprofile.
- Korrektur: künstlicher MVZ-Testmandant und künstlicher Quartalsmandant einschließlich wiederkehrender und einmaliger Mandantenaufgabe ergänzt.

### B-03 – Prisma-Standardmigration unter Node 24

- Klasse: B, nicht datenverändernd
- Ursache: `prisma migrate deploy` beendet sich in dieser lokalen Kombination aus Prisma 6.19.3, SQLite und Node 24.18.0 mit einem nicht weiter aufgeschlüsselten Schema-Engine-Fehler.
- Umgang: Die identischen Migrationsdateien wurden über den bereits im Projekt verwendeten lokalen Migrationslauf in korrekter Reihenfolge erfolgreich angewendet. Vor einem Pilot-Upgrade ist Node LTS beziehungsweise eine kompatible Prisma-Version verbindlich festzulegen.

## Testdaten

- 10001: Einzelunternehmen, EÜR, getrennte Funktionen
- 10002: Kapitalgesellschaft, Bearbeiter und Prüfer identisch
- 10003: Personengesellschaft, Prüfer und Kanzleileitung identisch
- 10004: vollständige personengleiche Funktionsbesetzung
- 10005: künstliches Medizinisches Versorgungszentrum mit wiederkehrender und einmaliger Mandantenaufgabe
- 10006: künstlicher Quartalsmandant mit quartalsbezogener Aufgabenstruktur

Alle Daten, Namen, Dateien und Inhalte sind künstlich.

## Sicherheitshinweise

`npm audit --omit=dev` meldet drei hohe Hinweise:

| Paket | Abhängigkeit | Praktische Auswirkung | Spätere Behebung |
| --- | --- | --- | --- |
| Next.js 16.2.12 | direkt | fasst die beiden indirekten Hinweise zusammen; relevant für Build und lokalen Server | kompatibles stabiles Next.js-Update nach vollständiger Regression |
| PostCSS bis 8.5.17 | indirekt über Next.js | Risiko bei Verarbeitung angreifergesteuerter CSS- und Source-Map-Inhalte; Ordo Caroli verarbeitet solche Uploads nicht | Aktualisierung über eine kompatible Next.js-Version |
| Sharp unter 0.35.0 | indirekt/optional über Next.js | libvips-Risiken bei fremden Bilddaten; Ordo Caroli verarbeitet keine Bild-Uploads über Next-Bildoptimierung | Aktualisierung über eine kompatible Next.js-Version |

`npm audit fix --force` wurde nicht ausgeführt, weil npm nur ein inkompatibles Next.js-Downgrade als automatische Korrektur ausweist. Die Hinweise werden nicht als erledigt betrachtet.

## Empfehlung

Es verbleibt kein bekannter Klasse-A-Einführungsblocker. Ein begrenzter Pilotbetrieb wird technisch empfohlen, wenn die im Abnahmebericht genannten Betriebsbedingungen vorab erfüllt werden. Die fachliche Endabnahme durch die Kanzlei bleibt erforderlich.
