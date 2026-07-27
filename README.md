# Ordo Caroli

## Separater Workflow-Testbestand

Für die erneute fachliche Workflowprüfung steht ein dynamischer, ausschließlich künstlicher Bestand in `prisma/workflow-test.db` mit getrenntem Campus-Speicher `tmp/workflow-test-campus` bereit. Er wird mit `npm.cmd run testdata:workflow` reproduzierbar erstellt. Das Reset-Skript akzeptiert ausschließlich diese beiden fest definierten Ziele und verändert keine Entwicklungs-, Abnahme-, Pilot- oder Produktivdatenbank. Benutzer, Mandanten und erwartete Status sind in `docs/WORKFLOW_TESTBESTAND.md` beschrieben; `docs/WORKFLOW_PRUEFBOGEN.md` enthält die manuelle Prüfreihenfolge.

Das Dashboard verwendet beim ersten Aufruf den Vormonat (im Januar den Dezember des Vorjahres). Eine explizite Monatsauswahl bleibt in der URL erhalten. Aktive Bearbeitung, aktive Prüfung und Kanzleileitungsfreigaben werden über eine zentrale Statuslogik getrennt; derselbe Vorgang erscheint auch bei Mehrfachrollen nie gleichzeitig in zwei aktiven Funktionsbereichen. Offene ältere Vorgänge bleiben separat unter „Überfällige Altmonate“ sichtbar. Jahresabschlussvorgänge richten sich nach dem Wirtschaftsjahr und werden nicht durch den Rechnungswesen-Monatsfilter ausgeblendet.

## Projektziel

Ordo Caroli ist ein ausschließlich lokal betriebener Rechnungswesen-Workflow für eine deutsche Steuerberatungsgesellschaft. Die Anwendung unterstützt Mandantenstammdaten, Jahresprofile, Standardaufgaben, Excel-Importe sowie monatliche Checklisten mit Bearbeitungs- und Prüfworkflow.

Die Monatscheckliste umfasst den gesamten laufenden Rechnungswesenprozess: Kontenabstimmung, Kontonotizen, Unterlagenbezug, Bank, Kasse, Darlehen, Verrechnungskonten, Anlagenbuchführung, Plausibilitätsprüfungen und die unterjährige Vorbereitung späterer Abschlussarbeiten. Eine zukünftige Jahresabschlusscheckliste soll nur Tätigkeiten enthalten, die tatsächlich erst zum Abschlussstichtag oder bei Abschlusserstellung möglich sind.

Es dürfen ausschließlich künstliche Testdaten verwendet werden.

## Technischer Aufbau

- Next.js 16.2.12 mit App Router und React 19.2.4
- TypeScript und Tailwind CSS
- SQLite ausschließlich lokal unter `prisma/dev.db`
- Prisma 6.19.3
- Vitest für automatisierte Tests
- `read-excel-file` für den lokalen Standardaufgabenimport
- keine Cloud-Dienste oder externen Datendienste

## Installation und Start

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev
```

Die Anwendung ist danach unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Datenbank und Migrationen

Die lokale Verbindungsangabe steht in `.env`; `.env.example` enthält nur eine Vorlage. Datenbankdateien und lokale Umgebungsdateien werden nicht versioniert.

```powershell
npm.cmd run db:generate
npm.cmd run db:seed
npm.cmd run db:reset
npm.cmd run db:reset:test
npm.cmd run db:diagnose
```

Das Schema steht in `prisma/schema.prisma`, die SQL-Migrationen unter `prisma/migrations`.

Die Migration `20260726193000_ordo_caroli_consolidation`:

- ergänzt den USt-Voranmeldungszeitraum,
- ergänzt die zuständige Kanzleileitung,
- ergänzt deren unveränderlichen Checklisten-Snapshot,
- überführt historische Quartalsbezeichnungen sicher in Monatsnamen,
- ergänzt Übertragungsgrund, Zielmonat, Person, Zeitpunkt und Ursprungsbezug,
- löscht keine Checklistenaufgaben, Snapshots oder Verlaufseinträge.

Die ergänzende Migration `20260726194000_artificial_full_names` überführt ausschließlich die bekannten neutralen Kürzel der mitgelieferten künstlichen Testdaten in vollständige künstliche Namen und ergänzt deren Kanzleileitungs-Snapshots. Sie löscht ebenfalls keine fachlichen Daten.

Die früheren technischen Felder `team` und `cadence` bleiben vorerst ausschließlich zur verlustfreien Altdaten-Kompatibilität im Datenmodell. Neue Oberflächen und Fachregeln verwenden sie nicht mehr.

## Ausschließlich monatliche Checklisten

Jeder aktive Mandant kann für Januar bis Dezember eine Monatscheckliste erhalten. Der USt-Voranmeldungszeitraum `Monatlich`, `Vierteljährlich`, `Jährlich` oder `Keine Voranmeldung` beschreibt ausschließlich die umsatzsteuerliche Einordnung und verhindert keinen Bearbeitungsmonat.

Vierteljährliche Standard- und Zusatzaufgaben verwenden vier konkret gespeicherte Ausführungsmonate. Der bisherige Zyklus März, Juni, September und Dezember bleibt als Voreinstellung verfügbar, kann aber fachlich abweichend gewählt werden.

## Eine aktive Checkliste und Monatsfolge

Ein Mandant darf grundsätzlich nur eine nicht abgeschlossene Monatscheckliste besitzen. Die nächste Checkliste wird erst nach Abschluss der vorherigen zugelassen und immer als direkter Folgemonat vorgeschlagen. Bei einem neuen Mandanten kann der Startmonat einmalig gewählt werden.

Eine deutlich gekennzeichnete administrative Ausnahme ist nur mit vollständigem Namen, Begründung und ausdrücklicher Verwendung zulässig. Sie wird im unveränderlichen fachlichen Verlauf gespeichert.

## Übertrag in den Folgemonat

Eine Aufgabe kann mit dem Status `In Folgemonat übertragen` fachlich abgeschlossen werden. Erforderlich sind:

- verpflichtende Begründung,
- vollständiger Name,
- direkter Folgemonat,
- Zeitpunkt,
- optional erwartete Unterlage oder nächste Handlung.

Die ursprüngliche Aufgabe bleibt unverändert erhalten. Beim ausdrücklichen Anlegen der nächsten Checkliste entsteht eine eigenständige Aufgabe mit Herkunft `Übertrag aus Vormonat` und Referenz auf die ursprüngliche Aufgabe. Bearbeitungs- und Prüfnotizen werden kopiert, aber nicht gemeinsam referenziert. Eine doppelte Übertragung in dasselbe Ziel wird verhindert.

Pflichtaufgaben gelten als behandelt, wenn sie `Erledigt`, begründet `Nicht zutreffend` oder ordnungsgemäß `In Folgemonat übertragen` sind. Ein übertragener Prüfpunkt bleibt als Prüfnotiz und offener Prüfstatus in der neuen Aufgabe erhalten.

## Rollen und Kanzleileitung

Mandanten speichern aktive Benutzerreferenzen und vollständige Namen für Bearbeiter, Prüfer und zuständige Kanzleileitung. Beim Anlegen einer Checkliste werden alle drei Benutzer-IDs und Namen als historische Snapshots gespeichert. Stammdatenänderungen verändern bestehende Checklisten nicht.

Eine ausdrückliche Rollenänderung in einer laufenden Checkliste verlangt Änderungsgrund und handelnde Person. Vorherige und neue Werte werden im Verlauf gespeichert.

Bearbeitungs- und Prüfaktionen verwenden den angemeldeten Benutzer. Serverseitige Prüfungen vergleichen dessen Benutzer-ID mit der Checklistenzuordnung; historische Textnamen bleiben zusätzlich erhalten.

Die Kanzleileitung wird bereits in Stammdaten, Übersichten, Dashboard und Checklistenkopf angezeigt, ist aber noch nicht Teil des monatlichen Prüfworkflows oder einer Jahresfreigabe.

## Mandantenbezogener Einstieg

Die Mandantenübersicht zeigt die aktuelle aktive Monatscheckliste, Status, Fortschritt, offene Pflichtaufgaben, offene Prüfpunkte und letzte Änderung. Die vollständig anklickbare Zeile führt direkt zur aktiven Checkliste; ohne aktive Checkliste zur Mandantendetailseite.

Die Mandantendetailseite zeigt alle Monatschecklisten absteigend und bietet nach einem Abschluss die Aktion für den automatisch ermittelten Folgemonat.

Tabellenzeilen auf Dashboard, Mandanten- und Checklistenübersicht sind per Maus, Enter und Leertaste bedienbar. Eingebettete Links oder Formulare lösen keine zusätzliche Zeilennavigation aus; Textmarkierung bleibt möglich.

## Bearbeitungs- und Prüfworkflow

Checklistenstatus: `Offen`, `In Bearbeitung`, `Zur Prüfung`, `In Prüfung`, `Nachbearbeitung`, `Abgeschlossen`.

Aufgabenstatus: `Offen`, `In Bearbeitung`, `Erledigt`, `Nicht zutreffend`, `In Folgemonat übertragen`.

Prüfstatus: `Nicht geprüft`, `In Prüfung`, `In Ordnung`, `Rückfrage`, `Beanstandung`, `Erledigt nach Nachbearbeitung`.

Abgeschlossene Checklisten bleiben sichtbar und gesperrt. Eine Wiederöffnung verlangt vollständigen Namen, Begründung und ausdrückliche Bestätigung.

## Meldungssystem

Erfolg, Warnung und Fehler werden als kompakte, schließbare Toast-Meldung im sichtbaren Bereich angezeigt. Die Meldungen besitzen passende ARIA-Rollen und ausreichende Anzeigedauer. Bei fachlichen Fehlern wird zusätzlich der betroffene Bereich markiert beziehungsweise fokussiert; Formulareingaben bleiben bei der clientseitigen Mandantenvalidierung erhalten. Browser-Alerts werden nicht verwendet.

## Ordo-Caroli-Design

Das eigenständige Anwendungsthema wurde aus der öffentlich erkennbaren grünen Concilium-Anmutung abgeleitet, ohne Logo oder geschützte Websitebestandteile zu kopieren.

Zentrale CSS-Variablen:

| Token | Wert | Zweck |
| --- | --- | --- |
| `--color-primary` | `#4f7f38` | Primärgrün |
| `--color-primary-dark` | `#234c2b` | Navigation und dunkle Akzente |
| `--color-primary-light` | `#e8f1e3` | Tabellenköpfe und ruhige Flächen |
| `--color-background` | `#f4f6f1` | Seitenhintergrund |
| `--color-surface` | `#ffffff` | Oberflächen |
| `--color-text` | `#18251c` | Haupttext |
| `--color-text-muted` | `#617066` | dezenter Text |
| `--color-border` | `#cbd5ca` | Rahmen |
| `--color-success` | `#2f6b3c` | Erfolg |
| `--color-warning` | `#9a6500` | Warnung |
| `--color-error` | `#a83832` | Fehler |
| `--color-focus` | `#d79b22` | Tastaturfokus |

Statustexte bleiben immer sichtbar; Farbe ist nie die einzige Information.

## Künstliche Testdaten

Die deterministischen Seed-Daten verwenden nur künstliche Mandanten und neutrale vollständige Namen. Enthalten sind sechs Monatschecklisten, Standardaufgaben, eine Zusatzaufgabe und nachvollziehbare Workflowzustände. Alle aktiven Mandanten und Checklisten besitzen konsistente Benutzerreferenzen.

Vollständiger lokaler Reset:

```powershell
npm.cmd run db:reset:test
```

Dabei gehen eigene lokale Testeingaben verloren. Der Befehl ist ausschließlich für die künstliche lokale Testdatenbank bestimmt. Er führt alle vorhandenen Migrationen in Reihenfolge aus, erzeugt den Seed neu und bricht bei einer fehlerhaften Konsistenzprüfung ab.

Unterschiede:

- `npm.cmd run dev`: normaler Entwicklungsstart ohne Datenänderung.
- `npm.cmd run db:migrate`: Migration ohne beabsichtigte Löschung bestehender Daten.
- `npm.cmd run db:reset:test`: vollständiges Löschen und Neuaufbauen ausschließlich der lokalen künstlichen Testdaten.
- `npm.cmd run db:diagnose`: lesender Diagnosebericht ohne Passwörter, Hashes oder Sitzungstoken.

## Lokale Anmeldung und Benutzerrollen

Ordo Caroli verwendet ausschließlich lokale Benutzerkonten in SQLite. Passwörter werden mit Node.js `scrypt` und einem je Passwort zufällig erzeugten Salt gespeichert. Das Klartextpasswort wird weder gespeichert noch protokolliert. Nach der Anmeldung wird ein zufälliges, opakes Sitzungstoken gesetzt; in der Datenbank liegt ausschließlich dessen SHA-256-Hash. Das Cookie ist `HttpOnly`, `SameSite=Lax`, auf acht Stunden begrenzt und im Produktionsmodus `Secure`.

Mehrfachrollen sind möglich:

- `Mitarbeiter`: Mandanten anlegen und bearbeiten, eigene zugeordnete Mandate bearbeiten, Rückfragen beantworten und zur Prüfung übergeben.
- `Prüfer`: Mandanten sowie mandantenspezifische Aufgabenvorlagen verwalten und zugeordnete Checklisten prüfen.
- `Kanzleileitung`: kanzleiweite Fachsicht, Standardaufgaben, begründete Ausnahmen, Rollenänderungen und Wiederöffnungen.
- `Administrator`: lokale Benutzerkonten und Passwörter verwalten, jedoch keine fachliche Prüfung allein aufgrund der Administratorrolle.
- `Standardaufgaben verwalten`: zusätzliche ausdrückliche Fachberechtigung für Standardaufgaben und Excel-Import.
- `Mandanten verwalten`: ausdrückliche Zusatzberechtigung für Benutzer ohne fachliche Standardrolle.
- `Mandantenspezifische Aufgaben verwalten`: ausdrückliche Zusatzberechtigung neben Prüfer und Kanzleileitung.

Ein rein technischer Administrator besitzt keine fachlichen Mandanten-, Checklisten-, Prüf- oder Aufgabenrechte. Mandantenspezifische Aufgaben und kanzleiweite Standardaufgaben werden strikt getrennt berechtigt.

### Personelle Mehrfachbesetzung

Bearbeiter, Prüfer und Kanzleileitung dürfen drei unterschiedliche Personen, jede beliebige Zweierkombination oder dieselbe Person sein. Dafür sind weder Zusatzberechtigung noch Begründung oder Sonderbestätigung erforderlich. Die ausgewählte Person muss aktiv sein und die fachlich erforderliche Rolle besitzen: Bearbeitung erfordert Mitarbeiter, Prüfer oder Kanzleileitung; Prüfung erfordert Prüfer oder Kanzleileitung; die Leitungsfunktion erfordert Kanzleileitung.

Auch bei personengleicher Besetzung bleiben Bearbeitung, Prüfung, fachlicher Abschluss und Freigabe getrennte Statusaktionen. Die jeweils zugeordnete Person darf diese Schritte nacheinander in der passenden Funktion ausführen. Jeder Schritt wird separat mit Benutzer-ID, Namenssnapshot, ausgeübter Funktion, Zeitpunkt sowie vorherigem und neuem Status protokolliert. Ordo Caroli erzwingt damit ausdrücklich kein Vier-Augen-Prinzip. Eine reine Administratorrolle verleiht weiterhin keine fachliche Bearbeitungs-, Prüf- oder Freigabeberechtigung.

Historische Datensätze und Verlaufseinträge früher dokumentierter Ausnahmen bleiben lesbar. Die zugehörigen nullable Datenbankfelder gelten als technischer Altbestand; neue Zuordnungen und neue Verlaufseinträge verwenden sie nicht mehr.

In der Mandantenübersicht bleibt die gesamte Zeile der direkte Einstieg in die aktive Monatscheckliste. Das Drei-Punkte-Menü am Zeilenende bietet abhängig von Berechtigung und Datenbestand Stammdaten, Details, Checklisten, Jahresprofile und mandantenspezifische Aufgaben. Es ist per Tastatur bedienbar und wird mit Escape oder durch einen Klick außerhalb geschlossen.

Das Dashboard verwendet breite persönliche Arbeitslisten anstelle kleiner Karten. Bearbeitungen, Prüfungen, Rückfragen, Jahresabschlüsse und Freigaben zeigen Anzahl, nächsten Schritt, Priorität und letzte Änderung. Direkte Links führen zum Workflowbereich oder – bei Rückfragen und offenen Pflichtaufgaben – zur konkreten Aufgabe. Die Farbgebung wird zentral über die Ordo-Caroli-Tokens in `app/globals.css` gesteuert; ältere blaue Hilfsklassen werden zentral auf das Grünsystem abgebildet.

Mandanten und Monatschecklisten speichern optionale Benutzerreferenzen sowie weiterhin vollständige Namen. Beim Erzeugen einer Checkliste werden Benutzer-IDs und Namen als Rollen-Snapshot gespeichert. Neue Verlaufseinträge erhalten Benutzer-ID, Namenssnapshot und Rollen zum Aktionszeitpunkt. Historische Namen und bestehende Verlaufstexte bleiben unverändert.

Benutzer werden nie physisch gelöscht. Eine Deaktivierung beendet Sitzungen und verhindert neue Anmeldung und Zuordnung; historische Bezüge bleiben erhalten. Bestehende aktive Zuordnungen werden nicht automatisch umverteilt.

### Ausschließlich künstliche lokale Zugänge

| Benutzername | Rolle(n) | Erstpasswort |
| --- | --- | --- |
| `maria.muster` | Mitarbeiter, Prüfer | `Test-Maria-2026!` |
| `paul.pruefung` | Prüfer | `Test-Paul-2026!` |
| `klara.leitung` | Kanzleileitung, Prüfer | `Test-Klara-2026!` |
| `anton.admin` | Administrator | `Test-Anton-2026!` |
| `max.beispiel` | Mitarbeiter | `Test-Max-2026!` |
| `nina.test` | deaktiviertes Testkonto | `Test-Nina-2026!` |

Diese Zugangsdaten sind ausschließlich für lokale Tests bestimmt. Vor einem echten Kanzleieinsatz müssen die künstlichen Benutzer entfernt oder abgesichert und alle Erstpasswörter geändert werden. Nach einer administrativen Passwortzurücksetzung muss das temporäre Passwort beim nächsten Login geändert werden.

Jeder Benutzer kann sein Passwort mit aktuellem Passwort, neuem Passwort und Bestätigung ändern. Andere Sitzungen werden dabei ungültig. Passwörter müssen mindestens zwölf Zeichen enthalten; unnötig starre Zeichenklassen werden nicht erzwungen.

Die Migration `20260726213000_local_users_auth` ergänzt Benutzer, Mehrfachrollen, Sitzungen, Benutzerreferenzen an Mandanten und Checklisten sowie Benutzer-Snapshots im Verlauf. Sie entfernt keine historischen Daten.

Der lokale Entwicklungsbetrieb verwendet HTTP. Für einen späteren Netzwerkbetrieb sind HTTPS, geregelte Datensicherung, Zugriffsschutz des Windows-PCs und ein abgesichertes internes Betriebskonzept erforderlich.

## Prüfungen

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Ordo Campus

Ordo Campus ist der aufgabenbezogene Wissensbereich von Ordo Caroli. Die Standardaufgabe bleibt die einzige führende Wissensquelle; Monats- und Jahresabschlussaufgaben speichern weiterhin nur ihre bestehende Referenz zur Standardaufgabe. Campus-Inhalte werden nicht in Checklisten-Snapshots kopiert und daher nicht doppelt gepflegt.

Pro Standardaufgabe kann ein strukturierter Wissensdatensatz mit Kurzbeschreibung, Ziel, Bearbeitungshinweisen, hervorgehobenem Kanzleistandard, Prüferhinweisen, typischen Fehlern und internen Hinweisen geführt werden. Der Wissensstatus lautet `Entwurf`, `Aktiv` oder `Archiviert`. Reguläre Leser sehen nur aktive Inhalte; berechtigte Campus-Pfleger können auch Entwürfe und archivierte Inhalte einsehen.

Wissenslinks speichern ausschließlich Titel, URL, Typ, Beschreibung, Reihenfolge und Aktivstatus. Unterstützt werden DATEV-Hilfe, DATEV-Info-Dokument, DATEV-Lernplattform, DATEV-Lernvideo, Gesetz, Verwaltungsanweisung, interne Wissensseite, externe Fachquelle und sonstiger Link. DATEV-Inhalte selbst werden weder kopiert noch lokal gespeichert.

Die Zusatzberechtigung `Ordo Campus verwalten` erlaubt Wissen und Links anzulegen, zu ändern, zu aktivieren und zu archivieren. Administratoren können diese Berechtigung vergeben, erhalten sie aber nicht automatisch. Jede Änderung erzeugt einen unveränderlichen Verlaufseintrag mit Benutzer-ID, Namenssnapshot, Zeitpunkt, Standardaufgabe und geändertem Bereich. Eine vollständige Artikelversionierung und ein Freigabeworkflow sind noch nicht Bestandteil dieser Stufe.

Die Suche der Standardaufgaben umfasst zusätzlich Kurzbeschreibung, Bearbeitungshinweise, Kanzleistandard, Prüferhinweise, typische Fehler sowie Linktitel und Linkbeschreibung. Die Übersicht kennzeichnet den Campus-Status und kann nach vorhandenem Wissen, Wissensstatus sowie DATEV-Link gefiltert werden.

In Monats- und Jahresabschlusschecklisten öffnet `Ordo Campus` ein responsives Seitenpanel innerhalb der Arbeitsansicht. Die vollständigen Inhalte werden erst beim Öffnen geschützt vom Server geladen. Kurzbeschreibung, Ziel, verbindlicher Kanzleistandard, Bearbeitungshinweise, rollenabhängige Prüferhinweise, häufige Fehler, Links und interne Hinweise erscheinen immer in derselben Reihenfolge. Der Kanzleistandard ist in den Ordo-Caroli-/Concilium-Farben hervorgehoben. Prüferhinweise sehen nur Prüfer und Kanzleileitung; diese Einschränkung wird serverseitig durchgesetzt.

Die Pflege erfolgt in den sieben Reitern `Übersicht`, `Bearbeitung`, `Kanzleistandard`, `Prüfung`, `Links`, `Anhänge` und `Verlauf`. Absätze, Listen, Nummerierungen, `**Fettschrift**` und Weblinks werden ohne unsichere HTML-Übernahme lesbar dargestellt. Externe Links öffnen mit den Sicherheitsattributen `noopener noreferrer` in einem neuen Tab. Das künstliche Seed-Beispiel `MON-BANK-001` enthält aktive Monatsinhalte; `JA-TEST-001` enthält aktive Jahresabschlussinhalte. Alle Links und Inhalte sind ausdrücklich künstlich.

### Interne Campus-Anhänge

Die Campus-Pflege besitzt zusätzlich den Reiter `Anhänge`. Zulässig sind ausschließlich PDF, DOCX, XLSX, PNG, JPG und JPEG bis maximal 15 MB je Datei. Endung, MIME-Type und eine grundlegende Dateisignatur werden serverseitig geprüft. Ausführbare, aktive, komprimierte und makrofähige Formate werden nicht über eine Negativliste, sondern durch die verbindliche Positivliste ausgeschlossen.

Anhänge werden nicht unter `public`, sondern standardmäßig im lokalen Ordner `storage/ordo-campus` gespeichert. Der Speicherort kann lokal mit `ORDO_CAMPUS_STORAGE_DIR` abweichend konfiguriert werden. Originaldateinamen dienen nur als bereinigte Metadaten. Physisch verwendet die Anwendung einen kryptografisch zufälligen UUID-Dateinamen; freie Pfade des Benutzers werden nicht übernommen. Der aufgelöste Zielpfad muss stets innerhalb des konfigurierten Anhangsordners liegen.

Uploads sind ausschließlich mit der Zusatzberechtigung `Ordo Campus verwalten` möglich. Datenbankdatensatz und Verlauf werden gemeinsam in einer Transaktion geschrieben. Scheitert die Datenbankoperation nach dem Speichern, wird die neue Datei wieder entfernt. Anhänge werden nicht regulär gelöscht, sondern mit Benutzer und Zeitpunkt archiviert. Archivierte Dateien bleiben für Campus-Verwalter in der Pflege nachvollziehbar, erscheinen aber nicht mehr im regulären Seitenpanel.

Downloads erfolgen ausschließlich über eine geschützte Serverroute. Für reguläre Benutzer müssen Wissen und Anhang aktiv sein, die konkrete Checklistenaufgabe muss auf dieselbe Standardaufgabe verweisen und der angemeldete Benutzer muss diese Checkliste sehen dürfen. Die Antwort setzt `Content-Type`, sichere `Content-Disposition`, `X-Content-Type-Options: nosniff` und `Cache-Control: private, no-store`. Interne Speicherpfade und technische Dateinamen werden nicht ausgegeben.

Der Info-Button neben `Ordo Campus` erläutert Zweck und Umgang direkt in einem tastaturbedienbaren Popover. Mandantenspezifische Aufgaben verwenden in Version 1.0 weiterhin ihre bestehenden Beschreibungen. Eine zweite Campus- und Anhangsarchitektur für solche Vorlagen wurde bewusst nicht provisorisch dupliziert.

Der deterministische Seed enthält vollständige, ausschließlich künstliche Campus-Inhalte für `MON-BANK-001`, `MON-KASSE-001`, `MON-BIL-001`, `MON-DARL-001` und `MON-EUER-001` sowie das Jahresabschlussbeispiel `JA-TEST-001`. Binäre Seed-Dateien werden bewusst nicht dauerhaft erzeugt; Uploadtests erstellen kleine künstliche Dateien kontrolliert im Testordner.

### Backup und Wiederherstellung

Ein vollständiges Backup von Ordo Caroli umfasst mindestens:

- die SQLite-Datenbank aus `prisma/`,
- den vollständigen Ordner `storage/ordo-campus`,
- die lokal verwendete, nicht versionierte Umgebungskonfiguration.

**Das Sichern ausschließlich der SQLite-Datenbank reicht nach Einführung der Campus-Anhänge nicht mehr aus.** Datenbank und Anhangsordner sollten im selben konsistenten Sicherungslauf kopiert werden. Bei einer Wiederherstellung oder einem Rechnerumzug werden Datenbank und Anhangsordner an ihre dokumentierten Pfade zurückgespielt; danach sind Migrationen, Diagnose und ein kontrollierter Download zu prüfen. Der Speicherordner ist absichtlich von Git ausgeschlossen.

Ordo Campus ist für allgemeine Kanzleistandards und fachliche Anleitungen bestimmt. Echte Mandantendaten, personenbezogene Testdaten und mandantenbezogene Originalunterlagen gehören nicht in zentrale Standardaufgaben-Anhänge. DATEV-Dokumente werden grundsätzlich verlinkt und nicht kopiert. Eine Virenscanner-Integration, Dokumentversionierung, Office-Vorschau, OCR, DMS-Integration und Dateivolltextsuche sind noch nicht Bestandteil von Version 1.0.

## Jahresabschlusschecklisten

Das separate Modul `Jahresabschlüsse` enthält ausschließlich stichtagsbezogene Abschlussarbeiten. Laufende Kontenabstimmungen, Kontonotizen, Anlagenbuchführung und andere unterjährig mögliche Tätigkeiten bleiben in den Monatschecklisten. Standardaufgaben besitzen dafür den Bereich `Monat`, `Jahresabschluss` oder – nur nach ausdrücklicher fachlicher Entscheidung – `Beide`.

Voraussetzungen für die Anlage sind ein aktiver Mandant, ein Jahresprofil für das Wirtschaftsjahr und drei aktive, fachlich passende Funktionszuordnungen. Personengleiche Zuordnungen sind zulässig. Pro Mandant und Wirtschaftsjahr ist nur eine Jahresabschlusscheckliste erlaubt. Rollen, Profilwerte und Aufgabeninhalte werden bei der Anlage als eigenständige Snapshots gespeichert.

Statusfolge:

`Offen → In Vorbereitung → Zur Prüfung → In Prüfung → Fachlich abgeschlossen → Zur Freigabe → Freigegeben`

Bei Rückfragen führt der Weg von `In Prüfung` über `Nachbearbeitung` erneut zu `Zur Prüfung`. Eine begründete Wiederöffnung einer freigegebenen Checkliste wird nicht als dauerhafter eigener Zustand gespeichert, sondern führt nachvollziehbar in `Nachbearbeitung`. Der Verlauf hält Benutzer-ID, vollständigen Namenssnapshot, Rolle, Zeitpunkt, Werte und Begründung fest.

- Bearbeiter bearbeiten eigene Aufgaben, beantworten Rückfragen und übergeben zur Prüfung.
- Prüfer prüfen zugeordnete Abschlüsse und führen den fachlichen Abschluss aus; eine personengleich zugeordnete Person darf dies nach dem getrennten Bearbeitungsschritt in ihrer Prüferfunktion tun.
- Die zuständige Kanzleileitung übernimmt die zusätzliche endgültige Freigabe.
- Ein technischer Administrator erhält dadurch keine fachliche Prüf- oder Freigabeberechtigung.

Die Jahresabschlussdetailseite zeigt die Monatschecklisten des Wirtschaftsjahres, offene Pflichtaufgaben, Überträge und offene Prüfpunkte. Diese Daten werden nur gelesen. Offene Monatspunkte können durch Prüfer oder Kanzleileitung kontrolliert als neue eigenständige Jahresabschlussaufgabe übernommen werden; dabei bleiben Herkunftsmonat und Notizen als Snapshot erhalten.

Prüfer und Kanzleileitung können dauerhafte mandantenspezifische Jahresabschlussvorlagen verwalten. Diese Vorlagen sind von mandantenspezifischen Monatsaufgaben getrennt. Bereits erzeugte Aufgaben werden durch spätere Vorlagenänderungen nicht verändert.

Die Migration `20260727100000_annual_financial_statements` ergänzt Jahresabschlusschecklisten, Aufgaben-Snapshots, Rollenreferenzen, Freigaben, Verlauf und mandantenspezifische Vorlagen. Bestehende Monatsdaten werden nicht geändert.

Künstliche Ausgangslage:

- Mandant 10001, 2025: `In Vorbereitung`
- Mandant 10002, 2025: `Zur Prüfung`
- Mandant 10003, 2025: `Zur Freigabe`
- Mandant 10004, 2025: `Nachbearbeitung` mit künstlicher Rückfrage
- Mandant 10004, 2024: `Freigegeben`
- Mandant 10001, 2026: offener Monatspunkt wurde kontrolliert als Jahresabschlussaufgabe übernommen

Der vollständige Testdatenreset erzeugt diese Fälle deterministisch. Für eine bereits bestehende künstliche Entwicklungsdatenbank kann ausschließlich das neue Modul mit `npm.cmd run db:seed:annual` neu befüllt werden; dabei werden nur künstliche Jahresabschluss-Testdaten dieses Moduls ersetzt.

## Workflowkorrekturen und Bedienung

Bearbeitungsstatus und Prüfstatus werden strikt getrennt. Der Prüfstatus einer erledigten Aufgabe lautet zunächst `Nicht geprüft`; der Prüfer muss jede Aufgabe ausdrücklich auf `In Ordnung`, `Rückfrage` oder `Beanstandung` setzen. Rückfrage und Beanstandung geben die Checkliste unmittelbar in die Nachbearbeitung zurück. Nach der Antwort lautet der Prüfstatus `Erledigt nach Nachbearbeitung` und erfordert eine erneute ausdrückliche Prüfung.

Der serverseitige Abschluss prüft zentral alle Aufgaben. Offene Bearbeitungen, fehlende Nicht-zutreffend-Begründungen, offene Rückfragen oder Beanstandungen sowie nicht abschließend geprüfte Aufgaben verhindern den Abschluss und werden in einer verständlichen Sammelmeldung genannt. Direkte Serveraufrufe verwenden dieselbe Regel.

Aufgabenbearbeitungen werden ohne sichtbaren Seitenwechsel gespeichert. Scrollposition und geöffnete Aufgabe bleiben erhalten; direkt an der Aufgabe erscheinen `Ungespeicherte Änderungen`, `Wird gespeichert …`, `Gespeichert` oder eine Fehlermeldung. Beim Verlassen mit ungespeicherten Änderungen warnt der Browser.

Eine Bearbeitungsnotiz wird nur bei aktivierter Option `In Folgeperiode übernehmen` in die nächste tatsächliche Ausführung derselben Standard- oder mandantenspezifischen Aufgabe übernommen. Bei quartalsweisen, halbjährlichen oder jährlichen Aufgaben ist dies der nächste passende Ausführungsmonat. Status, Prüfstatus und Nicht-zutreffend-Begründung werden nicht übernommen. Bereits bestehende Folgechecklisten werden nicht automatisch verändert; die Übernahme erfolgt beim Anlegen oder über `Fehlende Standardaufgaben übernehmen`.

Die Mandantenübersicht ist natürlich nach Nummer auf- oder absteigend sowie nach Name A–Z oder Z–A sortierbar. In der Übersicht der Rechnungswesenaufgaben reduziert `Nur neueste Checkliste je Mandant` die zuvor durch Suche und weitere Filter gebildete Treffermenge anschließend auf den chronologisch neuesten Treffer je Mandant.

Übertragene Aufgaben zeigen Ursprungsmonat und Link zur Ursprungsaufgabe. Ordo Campus kennzeichnet mit Text, Symbol und Tooltip eindeutig `Verfügbar` oder `Nicht hinterlegt`.

Die additive Migration `20260727230000_workflow_ux_corrections` ergänzt ausschließlich Workflow-Metadaten; historische Aufgaben, Snapshots, Campus-Inhalte und Verläufe bleiben erhalten. Eine ältere, mit `db push` erzeugte Entwicklungsdatenbank kann eine abweichende Migrationshistorie besitzen. In diesem Fall darf sie nicht ungeprüft zurückgesetzt werden.

## Bekannte Einschränkungen

- keine externe Identitätsverwaltung, Mehrfaktor-Anmeldung oder zentrale Kennwortrichtlinie
- lokale Konten setzen den gesicherten Zugriff auf den Windows-PC und die SQLite-Datei voraus
- Sitzungen sind auf eine einzelne lokale Installation ausgelegt
- keine automatische Jahresabschlusserstellung oder Übertragung offener Jahresabschlussaufgaben in das Folgejahr
- keine Stellvertreterregelung für die Kanzleileitungsfreigabe
- keine Datei-Uploads außer dem vorhandenen lokalen `.xlsx`-Import für Standardaufgaben
- keine Exporte, Benachrichtigungen oder E-Mails
- der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail
- veraltete technische Felder bleiben zur Altdaten-Kompatibilität im Schema
- keine Live-Aktualisierung mehrerer gleichzeitig geöffneter Browserfenster

## Bekannte Sicherheitshinweise

`npm audit --omit=dev` meldete zuletzt drei hoch eingestufte betroffene Pakete im Abhängigkeitsbaum:

| Paket | Art | Betrieb | Kompatible Korrektur |
| --- | --- | --- | --- |
| Next.js 16.2.12 | direkt | Entwicklung, Build und möglicher lokaler Produktionsbetrieb | keine kompatible stabile Korrektur ausgewiesen; kein erzwungenes Downgrade |
| PostCSS | indirekt über Next.js | vor allem Entwicklung und Build bei fremden CSS-Dateien | keine fremden CSS-Dateien verarbeiten und stabiles Next.js-Update abwarten |
| Sharp/libvips | indirekt/optional über Next.js | Bildverarbeitung | keine Bild-Uploads oder fremden Bilder verarbeiten und stabiles Next.js-Update abwarten |

`npm audit fix --force` darf nicht verwendet werden.

## Abnahme und Betrieb

Die systemweite Abnahmevorbereitung und die Betriebsunterlagen befinden sich unter:

- `docs/ABNAHME_ORIDO_CAROLI_V1.md`
- `docs/ABNAHMEBERICHT_V1.md`
- `docs/BACKUP_UND_WIEDERHERSTELLUNG.md`
- `docs/ROADMAP_NACH_PILOT.md`

Die technische Abnahmevorbereitung ersetzt nicht die fachliche Endabnahme durch die Kanzlei.

## Rechnungswesenaufgaben und Ausführungsplanung

Die Hauptmodule heißen in der Oberfläche **Rechnungswesenaufgaben** und **Jahresabschlussaufgaben**. Technische Modelle und einzelne fachlich passende Detailtexte dürfen weiterhin den Begriff Checkliste verwenden.

Rechnungswesen-Standardaufgaben besitzen einen Rhythmus und eine konkrete Liste von Kalendermonaten. Unterstützt werden:

- Monatlich: alle zwölf Monate
- Vierteljährlich: genau vier frei wählbare Monate
- Halbjährlich: genau zwei frei wählbare Monate
- Jährlich: genau ein Monat
- Benutzerdefinierte Monate: ein bis zwölf Monate

Die konkreten Ausführungsmonate sind die maßgebliche technische Grundlage. Der Rhythmus dient der verständlichen Anzeige und Validierung. Bestehende Rechnungswesenaufgaben wurden bei der additiven Migration standardmäßig monatlich eingeordnet; ältere feste Quartals- und Einzelmonatsangaben wurden kontrolliert in konkrete Monatslisten überführt. Jahresabschluss-Standardaufgaben bleiben davon unberührt.

Neue Checklisten übernehmen nur aktive, zum Monatsprofil passende Standardaufgaben, deren Ausführungsmonate den Checklistenmonat enthalten. Spätere Rhythmusänderungen entfernen oder verändern keine vorhandenen Snapshots. Die Aktion **Fehlende Standardaufgaben übernehmen** ergänzt ausschließlich aktuell passende und noch nicht enthaltene Aufgaben und protokolliert die Ergänzung.

Januarvorbereitungen werden als jährliche Rechnungswesenaufgaben mit Ausführungsmonat Januar und optionalem Aufgabenbereich **Jahresvorbereitung** geführt. Die vorhandene Kategorie bleibt für Gruppierung und Sortierung maßgeblich; es entsteht keine zusätzliche Checklistenart.

Mandantenspezifische wiederkehrende Aufgaben unterstützen dieselben Ausführungsrhythmen und Monatslisten. Einmalige Aufgaben behalten ihre feste Kombination aus Jahr und Monat.

Bei **Nicht zutreffend** wird die Begründung nur nach Auswahl dieses Status eingeblendet und serverseitig verlangt. Eine gespeicherte Begründung bleibt bei späteren Statuswechseln erhalten und erscheint bei erneuter Auswahl wieder. **Aufgabe übertragen** ist als geschlossene Zusatzaktion ausgeführt; erst nach dem Öffnen erscheinen Begründung und Folgemonat.

Bekannte Einschränkung: Die Ausführungsmonate beziehen sich in dieser Version auf das Kalenderjahr. Eine relative Verschiebung anhand eines abweichenden Wirtschaftsjahres ist noch nicht implementiert.
