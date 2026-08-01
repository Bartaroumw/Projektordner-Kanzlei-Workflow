# Testbericht zur Prisma-Migrationsbaseline

Stand: 31.07.2026

## Prüfurteil

Die Baseline wurde ausschließlich auf bytegenauen Kopien geprüft. `prisma/dev.db` blieb unverändert. Die getestete Methode ist technisch geeignet: 14 bestehende Migrationen werden als angewendet registriert, die tatsächlich noch fehlende 15. Migration wird anschließend regulär auf der Kopie angewendet.

Aktuelle Entscheidung: **No-Go für die echte `dev.db` bis zur ausdrücklichen Bestätigung dieses Berichts; danach technisches Go mit den im Plan genannten Auflagen.**

## Schutz- und Sicherungsnachweis

| Bestand | SHA-256 |
| --- | --- |
| originale `prisma/dev.db` | `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796` |
| unveränderte Originalsicherung | `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796` |
| ursprüngliche Arbeitskopie | `A7EAE68B946262B7985C7690DEFA6BC39FD1251D4B2A71F7E872DAFA9B91A796` |
| Kopie nach 14 `resolve`-Schritten | `81300E25CAD493FDDDB63AE7B00AAFBB8B4FC6A05A083DCA8223F88B637158BA` |
| vollständig baselined Kopie nach Migration 15 | `40B34B7597F4E9065ED6B60B9219F29A78A2128D431714E9877A4B139E53C65F` |

Auch `.env` und beide Campus-Dateien wurden bytegenau gesichert. Der reguläre FiBu-Lohn-Speicher war und ist leer beziehungsweise noch nicht vorhanden.

## Tatsächliches Ausgangsschema

| Merkmal | Ausgangskopie | Nach allen 15 Migrationen |
| --- | ---: | ---: |
| Anwendungstabellen | 33 | 34 |
| Spalten | 544 | 565 |
| Fremdschlüssel | 86 | 92 |
| Indizes | 103 | 109 |
| eindeutige Indizes/Regeln | 25 | 25 |
| Anwendungsdatensätze einschließlich Sitzungen | 351 | 351 |
| `_prisma_migrations` | fehlt | 15 erfolgreiche Einträge |

SQLite meldete vor und nach der Prüfung `integrity_check = ok` und keine Fremdschlüsselfehler.

## Datenmengen im Ausgangsbestand

| Bereich | Datensätze |
| --- | ---: |
| Benutzer / Rollen / Sitzungen | 6 / 10 / 6 |
| Mandanten / Jahresprofile | 4 / 12 |
| Monatsperioden / Monatsaufgaben / Monatsverlauf | 6 / 37 / 65 |
| Jahreschecklisten / Jahresaufgaben / Jahresverlauf | 6 / 62 / 59 |
| Standardaufgaben / Kategorien | 35 / 20 |
| Campus-Wissen / Links / Wissensverlauf / Anhänge | 7 / 7 / 7 / 0 |
| mandantenspezifische Monats-/Jahresaufgaben | 1 / 1 |
| FiBu-Lohn-Themen, Abstimmungen, Positionen, Belege und Fahrzeuge | jeweils 0 |
| weitere Historien-, Import- und Ausnahmebestände | 0 |

Der Bestand enthält damit einen konsistenten fachlichen Kern aus Mandanten, Monats- und Jahresabschlussworkflows, Standardaufgaben und Ordo Campus. Er enthält bewusst noch keine FiBu-Lohn-Falldaten. Vor Anwendung der 15. Migration ist er nicht strukturell vollständig für den aktuellen Programmstand; nach der getesteten Migration ist er strukturell aktuell, ohne künstlich neue Fachdaten zu erzeugen.

## Gefundene Unterschiede

Die Ausgangskopie ist schemaidentisch zu einer Referenzdatenbank aus exakt den ersten 14 Migrationen. Gegenüber der frisch mit allen 15 Migrationen erzeugten Systemintegrationsdatenbank fehlen ausschließlich:

1. `PayrollReconciliationPosition`,
2. `PayrollDocumentReference.positionId` mit Fremdschlüssel und Index,
3. `PayrollReconciliationHistory.positionId` mit Fremdschlüssel und Index.

Nach Anwendung der 15. Migration war der Datenbank-zu-Datenbank-Diff leer. Der separate Drift zwischen `schema.prisma` und der Migrationshistorie ist im Baseline-Plan dokumentiert und wurde nicht verändert.

## Baseline-Ergebnis

1. Vor dem Versuch meldete Prisma alle 15 Migrationen als ausstehend.
2. Die ersten 14 Migrationen wurden einzeln und chronologisch mit `migrate resolve --applied` registriert.
3. Danach meldete Prisma exakt die 15. Migration als ausstehend.
4. Fachschema und Fachdaten waren zu diesem Zeitpunkt unverändert; nur `_prisma_migrations` war neu.
5. Nach einem weiteren bytegenauen Checkpoint wurde ausschließlich Migration 15 mit `migrate deploy` angewendet.
6. Prisma meldete anschließend `Database schema is up to date!` und 15 erfolgreiche Migrationseinträge.
7. Alle 33 vorher bestehenden Tabellen behielten Zeilenzahl und Datenhash. Die neue Tabelle war leer.

## Künstliche Folgemigration

Auf einer weiteren Kopie wurde außerhalb des versionierten Migrationsordners die temporäre Migration `20990101000000_baseline_follow_up_probe` angelegt. Prisma erkannte sie als einzige ausstehende Migration, wendete sie erfolgreich an und meldete danach 16 behandelte Migrationen. Die neue Prüftabelle und ihr eindeutiger Index waren vorhanden; sämtliche zuvor bestehenden Fachdaten blieben unverändert. Die temporäre Migration liegt ausschließlich unter `tmp` und wird nicht committed.

## Anwendung und Qualität

- Prisma-Schema: gültig
- Prisma Client 6.19.3: erfolgreich erzeugt
- ESLint: erfolgreich
- TypeScript: erfolgreich
- automatisierte Tests: 305 erfolgreich, 1 bewusst übersprungen
- übersprungen: großer Performance-Smoke-Test in `tests/performance-smoke.test.ts`
- Produktions-Build: erfolgreich, 31 statische Seiten erzeugt
- Entwicklungsstart gegen Laufzeitkopie: erfolgreich
- Produktionsstart gegen Laufzeitkopie: erfolgreich
- authentifizierter Modul-Smoke-Test: Dashboard, Mandanten, Monatschecklisten, Jahresabschlüsse, Standardaufgaben, Ordo Campus, Rechnungswesenstatus, FiBu-Lohn, Fahrzeuge, Verwaltung und Benutzeradministration jeweils HTTP 200
- lokale Diagnoseseite: Entwicklung HTTP 200; Produktion erwartungsgemäß HTTP 404, da sie dort ausdrücklich deaktiviert ist

## Backup- und Wiederherstellungstest

Die vollständig baselined Datenbank, `.env`-Kopie, beide Campus-Dateien und der leere FiBu-Lohn-Speicherzustand wurden gemeinsam gesichert und in ein neues Ziel wiederhergestellt. Datenbank- und Dateihashes waren identisch. Die wiederhergestellte Datenbank war schema- und datenidentisch, besaß 15 Migrationseinträge, bestand Integritäts- und Fremdschlüsselprüfung und wurde von Prisma als aktuell erkannt.

## Go-/No-Go-Empfehlung

- **Technisches Go mit Auflagen:** Die echte `dev.db` kann nach ausdrücklicher Freigabe mit der exakt getesteten Methode baselined und um Migration 15 ergänzt werden.
- **Aktuelles operatives No-Go:** In diesem Arbeitsschritt wird die echte Datenbank nicht verändert.
- **Weiteres No-Go:** Kein `migrate dev`, `db push` oder allgemeines Refactoring, bevor der dokumentierte Schema-Historien-Drift in einem eigenen Auftrag bewertet und mit einer datenbewahrenden Migration geprüft wurde.
