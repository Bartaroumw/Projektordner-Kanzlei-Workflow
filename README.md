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

Wichtig: Der normale Start verwendet die bestehende `.env` und die am 31.07.2026 erfolgreich baselined sowie am 04.08.2026 driftbereinigte `prisma/dev.db`. Nach der Workflowvereinfachung erkennt Prisma alle 19 Migrationen als angewendet; `schema.prisma`, eine frische 1–19-Datenbank und `dev.db` stimmen strukturell überein. Kontrolliertes `prisma migrate deploy` und `prisma migrate dev` sind nur nach vollständiger gemeinsamer Sicherung, sauberem Git-Stand und erfolgreicher Status-/Driftprüfung zulässig. `prisma db push`, `prisma migrate reset`, Seeds und Testresets gegen `dev.db` bleiben ausdrücklich gesperrt. Für isolierte systemweite Prüfungen steht weiterhin die getrennte Integrationsumgebung bereit:

```powershell
npm.cmd run testdata:system-integration
npm.cmd run dev:integration
```

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

Der Bearbeiter schlägt eine Übertragung mit Zielperiode, Begründung und erwarteter Handlung vor. Erst der zugeordnete Prüfer genehmigt oder lehnt ab. Vor der Genehmigung entsteht keine Zielaufgabe. Bei Genehmigung wird sie in der bereits vorhandenen Zielperiode oder kontrolliert beim späteren Anlegen dieser Periode mit Herkunft `Übertrag aus Vormonat` und Referenz auf die ursprüngliche Aufgabe erzeugt. Eine Ablehnung erzeugt keine Zielaufgabe und führt zwingend in die Nachbearbeitung. Dubletten werden serverseitig verhindert.

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

Vollständiger Reset des geschützten künstlichen Systemintegrationsbestands:

```powershell
npm.cmd run testdata:system-integration
```

Dabei gehen ausschließlich Eingaben im geschützten Systemintegrationsbestand verloren. Das Skript prüft feste Datenbank- und Speicherpfade, führt alle vorhandenen Migrationen in Reihenfolge aus, erzeugt den künstlichen Seed neu und bricht bei einer fehlerhaften Konsistenzprüfung ab. `prisma/dev.db` und die regulären Speicherordner dürfen dadurch nicht verändert werden.

Unterschiede:

- `npm.cmd run dev`: normaler Entwicklungsstart ohne Datenänderung.
- `prisma migrate deploy`: kontrollierte Anwendung zuvor geprüfter Migrationen nach vollständiger Sicherung; kein allgemeiner Entwicklungsbefehl.
- `npm.cmd run db:migrate`: für künftige additive Entwicklung nur kontrolliert nach vollständigem gemeinsamen Backup, sauberem Git-Stand und leerer Drift-/Statusprüfung; eine Reset-Aufforderung darf niemals bestätigt werden.
- `npm.cmd run db:reset` und `npm.cmd run db:reset:test`: gegen `prisma/dev.db` ausdrücklich verboten.
- `npm.cmd run db:diagnose`: lesender Diagnosebericht ohne Passwörter, Hashes oder Sitzungstoken.

## Lokale Anmeldung, Benutzerrollen und Profile

Ordo Caroli verwendet ausschließlich lokale Benutzerkonten in SQLite. Passwörter werden mit Node.js `scrypt` und einem je Passwort zufällig erzeugten Salt gespeichert. Das Klartextpasswort wird weder gespeichert noch protokolliert. Nach der Anmeldung wird ein zufälliges, opakes Sitzungstoken gesetzt; in der Datenbank liegt ausschließlich dessen SHA-256-Hash. Das Cookie ist `HttpOnly`, `SameSite=Lax`, auf acht Stunden begrenzt und im Produktionsmodus `Secure`.

Mehrfachrollen sind möglich:

- `Bearbeiter` (technische Rolle `MITARBEITER`): Mandanten anlegen und bearbeiten, eigene zugeordnete Mandate bearbeiten, Rückfragen beantworten und zur Prüfung übergeben.
- `Prüfer`: Mandanten sowie mandantenspezifische Aufgabenvorlagen verwalten und zugeordnete Checklisten prüfen.
- `Kanzleileitung`: kanzleiweite Fachsicht, Standardaufgaben, begründete Ausnahmen, Rollenänderungen und Wiederöffnungen.
- `Administrator`: lokale Benutzerkonten und Passwörter verwalten, jedoch keine fachliche Prüfung allein aufgrund der Administratorrolle.
- `Lohnsachbearbeiter`: ausschließlich zugeordnete Rechnungswesen–Lohn-Abstimmungen, Belege, Rückfragen und den erforderlichen Fahrzeugbestand bearbeiten beziehungsweise einsehen; keine Rechnungswesen-, Jahresabschluss-, Leitungs- oder Administrationsrechte.
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
| `anna.rechnungswesen` | Mitarbeiter | `Test-Anna-2027!` |
| `peter.pruefer` | Prüfer | `Test-Peter-2027!` |
| `laura.lohn` | Lohnsachbearbeiter | `Test-Laura-2027!` |
| `leon.lohn` | Lohnsachbearbeiter | `Test-Leon-2027!` |
| `klaus.leitung` | Kanzleileitung, Prüfer, FiBu-Lohn-Themen verwalten | `Test-Klaus-2027!` |
| `admin.test` | Administrator | `Test-Admin-2027!` |

Diese Zugangsdaten sind ausschließlich für lokale Tests bestimmt. Vor einem echten Kanzleieinsatz müssen die künstlichen Benutzer entfernt oder abgesichert und alle Erstpasswörter geändert werden. Nach einer administrativen Passwortzurücksetzung muss das temporäre Passwort beim nächsten Login geändert werden.

Jeder Benutzer kann sein Passwort mit aktuellem Passwort, neuem Passwort und Bestätigung ändern. Andere Sitzungen werden dabei ungültig. Passwörter müssen mindestens zwölf Zeichen enthalten; unnötig starre Zeichenklassen werden nicht erzwungen.

Die Migration `20260726213000_local_users_auth` ergänzt Benutzer, Mehrfachrollen, Sitzungen, Benutzerreferenzen an Mandanten und Checklisten sowie Benutzer-Snapshots im Verlauf. Sie entfernt keine historischen Daten.

Der persönliche Kontobereich `/profil` zeigt Identität, Hauptrollen, getrennte Zusatzberechtigungen, Kontodaten und Sicherheitseinstellungen. Die Seitenleiste verwendet denselben geschützten Avatar beziehungsweise den Initialen-Fallback. Profilbilder können ausschließlich von Administratoren in der Benutzerverwaltung gepflegt werden. Zulässig sind JPG/JPEG, PNG und WebP bis 5 MB; die Dateien werden vollständig dekodiert, neutral benannt und unter `storage/profile-images` gespeichert. Die authentifizierte Auslieferung erfolgt über `/api/profile-images/[userId]` nur für aktive Benutzer. Einzelheiten stehen in `docs/BENUTZERPROFILE_UND_PROFILBILDER.md`.

Der lokale Entwicklungsbetrieb verwendet HTTP. Für einen späteren Netzwerkbetrieb sind HTTPS, geregelte Datensicherung, Zugriffsschutz des Windows-PCs und ein abgesichertes internes Betriebskonzept erforderlich.

## Prüfungen

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Ordo Campus

Ordo Campus ist seit Migration 18 die eigenständige Wissens- und Lernplattform von Ordo Caroli. Der Wissensinhalt ist die führende Quelle; Standardaufgaben und Rechnungswesen–Lohn-Themen sind wiederverwendbare Anwendungsorte. Ein Inhalt kann mehreren Aufgaben, Themen, Wissensgebieten und Lernpfaden zugeordnet sein. Campus-Inhalte werden weiterhin nicht in Checklisten- oder Abstimmungssnapshots kopiert.

Ein Wissensinhalt besitzt stabilen Schlüssel, Kurzbeschreibung, Ziel, Hauptinhalt, Bearbeitungshinweise, hervorgehobenen Kanzleistandard, Prüferhinweise, typische Fehler und interne Hinweise. Mehrfachzuordnungen für Inhaltstypen, Zielgruppen, Wissensgebiete, Tags und Anwendungsorte sind möglich. Der Status lautet `Entwurf`, `Aktiv` oder `Archiviert`. Reguläre Leser sehen grundsätzlich alle aktiven Inhalte; Zielgruppen steuern Empfehlungen und Filter. Prüferhinweise bleiben serverseitig auf Prüfer und Kanzleileitung begrenzt.

Wissenslinks speichern ausschließlich Titel, URL, Typ, Beschreibung, Reihenfolge und Aktivstatus. Unterstützt werden DATEV-Hilfe, DATEV-Info-Dokument, DATEV-Lernplattform, DATEV-Lernvideo, Gesetz, Verwaltungsanweisung, interne Wissensseite, externe Fachquelle und sonstiger Link. DATEV-Inhalte selbst werden weder kopiert noch lokal gespeichert.

Die Zusatzberechtigung `Ordo Campus verwalten` erlaubt Wissensinhalte, Gebiete, Lernpfade, Zuordnungen, Links und Anhänge anzulegen, zu ändern, zu aktivieren und zu archivieren. Administratoren können diese Berechtigung vergeben, erhalten sie aber nicht automatisch. Jede Änderung erzeugt einen unveränderlichen Verlaufseintrag. Die Pflege liegt zentral unter `Verwaltung → Wissensmanagement`.

Die Campus-Suche umfasst alle zulässigen Inhaltsfelder, Links, Tags, Wissensgebiete sowie verknüpfte Aufgaben und Rechnungswesen–Lohn-Themen. Filter für Gebiet, Inhaltstyp, Zielgruppe und Aktualität sind kombinierbar. Die Startseite bündelt Wissensgebiete, Lernpfade, Kanzleistandards, neue beziehungsweise aktualisierte und zuletzt angesehene Inhalte.

In Monats- und Jahresabschlusschecklisten sowie Rechnungswesen–Lohn-Abstimmungen öffnet `Ordo Campus` ein responsives Seitenpanel. Die Inhalte werden erst beim Öffnen geschützt vom Server geladen. Hauptanleitung und weitere Inhalte bleiben getrennt erreichbar; der Kanzleistandard ist in den Ordo-Caroli-/Concilium-Farben hervorgehoben.

Benutzer können Inhalte freiwillig als gelesen markieren; Aufrufe erscheinen unter `Zuletzt angesehen`. Diese persönliche Orientierung ist kein Schulungs- oder Pflichtnachweis. Absätze, Listen, Nummerierungen, `**Fettschrift**` und Weblinks werden ohne unsichere HTML-Übernahme dargestellt. Externe Links öffnen mit `noopener noreferrer` in einem neuen Tab. Alle Seed-Inhalte und Links sind ausdrücklich künstlich.

Fachkonzept, Datenmodell, Migration, Bedienung und Pflege sind unter `docs/ORDO_CAMPUS_2_*.md` dokumentiert. Migration 18 übernimmt alle bisherigen Inhalte, Links, Anhänge und Verläufe eindeutig, lässt die alten Tabellen unverändert bestehen und dupliziert keine physischen Anhangsdateien.

### Interne Campus-Anhänge

Die Campus-Pflege besitzt zusätzlich den Reiter `Anhänge`. Zulässig sind ausschließlich PDF, DOCX, XLSX, PNG, JPG und JPEG bis maximal 15 MB je Datei. Endung, MIME-Type und eine grundlegende Dateisignatur werden serverseitig geprüft. Ausführbare, aktive, komprimierte und makrofähige Formate werden nicht über eine Negativliste, sondern durch die verbindliche Positivliste ausgeschlossen.

Anhänge werden nicht unter `public`, sondern standardmäßig im lokalen Ordner `storage/ordo-campus` gespeichert. Der Speicherort kann lokal mit `ORDO_CAMPUS_STORAGE_DIR` abweichend konfiguriert werden. Originaldateinamen dienen nur als bereinigte Metadaten. Physisch verwendet die Anwendung einen kryptografisch zufälligen UUID-Dateinamen; freie Pfade des Benutzers werden nicht übernommen. Der aufgelöste Zielpfad muss stets innerhalb des konfigurierten Anhangsordners liegen.

Uploads sind ausschließlich mit der Zusatzberechtigung `Ordo Campus verwalten` möglich. Datenbankdatensatz und Verlauf werden gemeinsam in einer Transaktion geschrieben. Scheitert die Datenbankoperation nach dem Speichern, wird die neue Datei wieder entfernt. Anhänge werden nicht regulär gelöscht, sondern mit Benutzer und Zeitpunkt archiviert. Archivierte Dateien bleiben für Campus-Verwalter in der Pflege nachvollziehbar, erscheinen aber nicht mehr im regulären Seitenpanel.

Downloads erfolgen ausschließlich über eine geschützte Serverroute. Für reguläre Benutzer müssen Wissensinhalt und Anhang aktiv sein. Die Antwort setzt `Content-Type`, sichere `Content-Disposition`, `X-Content-Type-Options: nosniff` und `Cache-Control: private, no-store`. Interne Speicherpfade und technische Dateinamen werden nicht ausgegeben.

Der Info-Button neben `Ordo Campus` erläutert Zweck und Umgang direkt in einem tastaturbedienbaren Popover. Mandantenspezifische Aufgaben verwenden weiterhin ihre bestehenden Beschreibungen; für sie wird keine zweite Campus-Architektur dupliziert.

Der deterministische Seed enthält vollständige, ausschließlich künstliche Campus-Inhalte für `MON-BANK-001`, `MON-KASSE-001`, `MON-BIL-001`, `MON-DARL-001` und `MON-EUER-001` sowie das Jahresabschlussbeispiel `JA-TEST-001`. Binäre Seed-Dateien werden bewusst nicht dauerhaft erzeugt; Uploadtests erstellen kleine künstliche Dateien kontrolliert im Testordner.

### Backup und Wiederherstellung

Ein vollständiges Backup von Ordo Caroli umfasst mindestens:

- die SQLite-Datenbank aus `prisma/`,
- den vollständigen Ordner `storage/ordo-campus`,
- den vollständigen Ordner `storage/fibu-lohn`,
- den vollständigen Ordner `storage/profile-images`,
- die lokal verwendete, nicht versionierte Umgebungskonfiguration.

**Das Sichern ausschließlich der SQLite-Datenbank reicht nach Einführung lokaler Anhänge nicht mehr aus.** Datenbank, Campus-Anhangsordner, Rechnungswesen–Lohn-Belegordner und Profilbildordner müssen im selben konsistenten Sicherungslauf kopiert werden. Bei einer Wiederherstellung oder einem Rechnerumzug werden Datenbank und Speicherordner an ihre dokumentierten Pfade zurückgespielt; danach sind Migrationen, Diagnose und kontrollierte Dateiaufrufe zu prüfen. Die Speicherordner sind absichtlich von Git ausgeschlossen.

Ordo Campus ist für allgemeine Kanzleistandards und fachliche Anleitungen bestimmt. Echte Mandantendaten, personenbezogene Testdaten und mandantenbezogene Originalunterlagen gehören nicht in zentrale Standardaufgaben-Anhänge. DATEV-Dokumente werden grundsätzlich verlinkt und nicht kopiert. Eine Virenscanner-Integration, Dokumentversionierung, Office-Vorschau, OCR, DMS-Integration und Dateivolltextsuche sind noch nicht Bestandteil von Version 1.0.

## Jahresabschlusschecklisten

Das separate Modul `Jahresabschlüsse` enthält ausschließlich stichtagsbezogene Abschlussarbeiten. Laufende Kontenabstimmungen, Kontonotizen, Anlagenbuchführung und andere unterjährig mögliche Tätigkeiten bleiben in den Monatschecklisten. Standardaufgaben besitzen dafür den sichtbaren Einsatzbereich `Laufendes Rechnungswesen`, `Jahresabschluss` oder – nur nach ausdrücklicher fachlicher Entscheidung – `Beide`.

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

Bearbeitungsstatus und Prüfstatus werden strikt getrennt. Das Öffnen verändert keinen Status. Die Bearbeitung beginnt mit der ersten erfolgreich gespeicherten Aufgabenänderung, die Prüfung mit der ersten erfolgreich gespeicherten Prüfentscheidung. Mehrere Prüfentscheidungen werden über die Sticky-Prüfleiste gesammelt gespeichert; gültige Entscheidungen bleiben auch bei einem fehlerhaften Eintrag erhalten. Der Prüfstatus einer erledigten Aufgabe lautet zunächst `Nicht geprüft`; Rückfrage und Beanstandung geben die Checkliste in die Nachbearbeitung zurück. Nach der Antwort lautet der Prüfstatus `Erledigt nach Nachbearbeitung` und erfordert eine erneute ausdrückliche Prüfung.

Der serverseitige Abschluss prüft zentral alle Aufgaben. Offene Bearbeitungen, fehlende Nicht-zutreffend-Begründungen, offene Rückfragen oder Beanstandungen sowie nicht abschließend geprüfte Aufgaben verhindern den Abschluss und werden in einer verständlichen Sammelmeldung genannt. Direkte Serveraufrufe verwenden dieselbe Regel.

Aufgabenbearbeitungen werden ohne sichtbaren Seitenwechsel gespeichert. Scrollposition und geöffnete Aufgabe bleiben erhalten; direkt an der Aufgabe erscheinen `Ungespeicherte Änderungen`, `Wird gespeichert …`, `Gespeichert` oder eine Fehlermeldung. Beim Verlassen mit ungespeicherten Änderungen warnt der Browser.

Eine Bearbeitungsnotiz wird nur bei aktivierter Option `In Folgeperiode übernehmen` in die nächste tatsächliche Ausführung derselben Standard- oder mandantenspezifischen Aufgabe übernommen. Bei quartalsweisen, halbjährlichen oder jährlichen Aufgaben ist dies der nächste passende Ausführungsmonat. Status, Prüfstatus und Nicht-zutreffend-Begründung werden nicht übernommen. Bereits bestehende Folgechecklisten werden nicht automatisch verändert; die Übernahme erfolgt beim Anlegen oder über `Fehlende Standardaufgaben übernehmen`.

Die Mandantenübersicht ist natürlich nach Nummer auf- oder absteigend sowie nach Name A–Z oder Z–A sortierbar. In der Übersicht der Rechnungswesenaufgaben reduziert `Nur neueste Checkliste je Mandant` die zuvor durch Suche und weitere Filter gebildete Treffermenge anschließend auf den chronologisch neuesten Treffer je Mandant.

Übertragene Aufgaben zeigen Ursprungsmonat und Link zur Ursprungsaufgabe. Ordo Campus kennzeichnet mit Text, Symbol und Tooltip eindeutig `Verfügbar` oder `Nicht hinterlegt`.

Die additive Migration `20260727230000_workflow_ux_corrections` ergänzt ausschließlich Workflow-Metadaten; historische Aufgaben, Snapshots, Campus-Inhalte und Verläufe bleiben erhalten. Eine ältere, mit `db push` erzeugte Entwicklungsdatenbank kann eine abweichende Migrationshistorie besitzen. In diesem Fall darf sie nicht ungeprüft zurückgesetzt werden.

## Rechnungswesen–Lohn-Abstimmungen

Teil 1 des Moduls bildet den monatlichen QM- und Informationsübergabeprozess vom Rechnungswesen an die Lohnabteilung fachlich und technisch ab. Für einen Mandanten wird die Standardaufgabe `Monatliche FiBu-Lohn-Abstimmung` nur erzeugt, wenn `Lohnabrechnung durch Kanzlei` aktiviert, das optionale Beginndatum erreicht und ein aktiver Benutzer mit der Rolle `Lohnsachbearbeiter` zugeordnet ist. Ein leeres Beginndatum gilt für künftig neu angelegte Perioden. Das Jahresprofilmerkmal `hasPayroll` beeinflusst diese Regel nicht.

Pro Mandant und Lohnabrechnungsmonat ist genau eine Abstimmung zulässig. Rechnungswesenmonat und vorgesehener Lohnabrechnungsmonat werden getrennt gespeichert; als verständlicher Standard wird der Folgemonat vorgeschlagen. Jede Abstimmung speichert Benutzer-IDs und Namenssnapshots von Bearbeiter, Prüfer und Lohnsachbearbeiter. Spätere Stammdatenänderungen verändern historische Zuständigkeiten nicht.

Der konfigurierbare Startkatalog enthält sechs aktive Themen:

1. Arbeitnehmerbezogene Geschenke, Aufmerksamkeiten, Sachbezüge und Betriebsveranstaltungen
2. Steuerfreie Reisekostenerstattungen
3. Firmenfahrzeuge, Pkw, E-Bike und Fahrrad
4. Scheinselbstständigkeit und mögliche abhängige Beschäftigung
5. Geschenke an Nichtarbeitnehmer
6. Künstlersozialkasse

Beim Anlegen werden diese Themen als eigenständige Themenkarten mit Bezeichnung, Prüffrage, Reihenfolge, Pflichtfeldern und Belegarten kopiert. Änderungen oder Archivierungen im zentralen Katalog verändern eine bestehende Abstimmung nicht.

Rechnungswesenstatus und Lohnstatus sind bewusst getrennt. Das Rechnungswesen arbeitet von `Offen` über `In Bearbeitung` und `Übergabebereit` bis `Vollständig übergeben`. Lohn arbeitet anschließend unabhängig mit `Neu`, `In Bearbeitung`, `Rückfrage offen` und `Erledigt`. Die Erstansicht wird technisch über Zeit und Benutzer protokolliert, ändert aber den fachlichen Status nicht. Die erste erfolgreiche Lohnhandlung startet automatisch `In Bearbeitung`. Die verknüpfte Rechnungswesenaufgabe wird bei der verbindlichen Gesamtübergabe erledigt. Spätere Lohnbearbeitung, Rückfragen oder Lohnerledigung blockieren und öffnen die Monatscheckliste nicht und ändern keinen Prüfstatus.

Belege werden getrennt von Ordo Campus standardmäßig unter `storage/fibu-lohn` gespeichert. Zulässig sind PDF, DOCX, XLSX, PNG und JPG/JPEG bis 15 MB. Endung, MIME-Typ und grundlegende Dateisignatur werden serverseitig geprüft; physische UUID-Dateinamen und Pfadgrenzen verhindern die Offenlegung oder freie Wahl interner Speicherpfade. Das Datenmodell hält eine Dokumentenreferenz, sodass später ein DMS- oder Dokumentendienst angebunden werden kann, ohne die fachliche Themenbeziehung neu zu entwerfen.

Der Fahrzeugbestand ist ein dauerhaftes Mandantenobjekt und nicht an einen einzelnen Monat gebunden. Stammdaten, Eigentum oder Leasing, Versteuerungsmethode, Nutzer, Gültigkeit und Rechnungswesenbehandlung werden gespeichert. Wesentliche Änderungen erhalten eigene Verlaufsdatensätze und können mit der betroffenen Monats-Themenkarte verknüpft werden.

Die additive Migration `20260728100000_fibu_payroll_reconciliation_foundation` ergänzt Mandantenkonfiguration, Themenkatalog, Monatsabstimmungen, Themen-Snapshots, Rückfragen, Belegreferenzen, Fahrzeuge und fachliche Verläufe. Bestehende Mandanten erhalten `Lohnabrechnung durch Kanzlei = Nein`; vorhandene Monats- und Jahresabschlussdaten werden nicht verändert.

Diese Migration war bereits vor Herstellung der Migrationsbaseline strukturell in der aktiven Entwicklungsdatenbank vorhanden und wurde deshalb am 31.07.2026 ausschließlich mit `migrate resolve --applied` registriert; ihr SQL wurde nicht erneut ausgeführt. Die fachlichen und technischen Einzelheiten stehen in:

- `docs/FIBU_LOHN_ABSTIMMUNG_FACHKONZEPT.md`
- `docs/FIBU_LOHN_DATENMODELL.md`
- `docs/FIBU_LOHN_ROLLEN_UND_BERECHTIGUNGEN.md`
- `docs/FIBU_LOHN_THEMENKATALOG.md`
- `docs/FIBU_LOHN_FAHRZEUGBESTAND.md`

## Bekannte Einschränkungen

- keine externe Identitätsverwaltung, Mehrfaktor-Anmeldung oder zentrale Kennwortrichtlinie
- lokale Konten setzen den gesicherten Zugriff auf den Windows-PC und die SQLite-Datei voraus
- Sitzungen sind auf eine einzelne lokale Installation ausgelegt
- keine automatische Jahresabschlusserstellung oder Übertragung offener Jahresabschlussaufgaben in das Folgejahr
- keine Stellvertreterregelung für die Kanzleileitungsfreigabe
- Datei-Uploads sind auf den lokalen `.xlsx`-Import, Campus-Anhänge und geschützte FiBu-Lohn-Belege begrenzt; Virenscanner, DMS und allgemeine Mandanten-Cloud fehlen
- keine Exporte, Benachrichtigungen oder E-Mails
- der fachliche Verlauf ist nachvollziehbar, aber kein revisionssicherer Audit-Trail
- veraltete technische Felder bleiben zur Altdaten-Kompatibilität im Schema
- keine Live-Aktualisierung mehrerer gleichzeitig geöffneter Browserfenster

## Bekannte Sicherheitshinweise

`npm audit --omit=dev` meldete am 28.07.2026 drei hoch eingestufte betroffene Abhängigkeitsknoten:

| Paket | Schweregrad und Art | Betrieb | Kompatible Korrektur |
| --- | --- | --- | --- |
| Next.js 16.2.12 | hoch, direkte Abhängigkeit; von npm wegen der beiden nachfolgenden Abhängigkeiten mitgeführt | Entwicklung, Build und lokaler Produktionsbetrieb | aktuell keine kompatible Korrektur ausgewiesen; stabiles Next.js-Update abwarten |
| PostCSS bis 8.5.17 | hoch, indirekt über Next.js; drei gebündelte Advisories | CSS-Verarbeitung in Entwicklung, Build und Laufzeit | aktuell keine kompatible Korrektur ausgewiesen; stabiles Next.js-Update abwarten |
| Sharp unter 0.35.0 | hoch, indirekt über Next.js; geerbte libvips-Schwachstellen | serverseitige Bildverarbeitung | aktuell keine kompatible Korrektur ausgewiesen; stabiles Next.js-Update abwarten |

Die von npm angebotene `--force`-Korrektur würde Next.js auf 9.3.3 zurückstufen und ist inkompatibel. `npm audit fix --force` darf nicht verwendet werden.

## Abnahme und Betrieb

Die systemweite Abnahmevorbereitung und die Betriebsunterlagen befinden sich unter:

- `docs/ABNAHME_ORIDO_CAROLI_V1.md`
- `docs/ABNAHMEBERICHT_V1.md`
- `docs/BACKUP_UND_WIEDERHERSTELLUNG.md`
- `docs/ROADMAP_NACH_PILOT.md`
- `docs/SERVERFEHLER_ANALYSE.md`
- `docs/UMGEBUNGEN_UND_DATENBESTAENDE.md`
- `docs/SYSTEMINTEGRATION_NACH_FIBU_LOHN.md`
- `docs/SYSTEMINTEGRATION_PRUEFBOGEN.md`
- `docs/SYSTEMINTEGRATION_ABNAHMEBERICHT.md`
- `docs/TECHNISCHE_UEBERGABE.md`
- `docs/AKTUELLER_SYSTEMSTAND.md`
- `docs/MIGRATIONSBASELINE_WARNUNG.md`
- `docs/MIGRATIONSBASELINE_PLAN.md`
- `docs/MIGRATIONSBASELINE_TESTBERICHT.md`
- `docs/MIGRATIONSBASELINE_ABLAUFPROTOKOLL.md`
- `docs/MIGRATIONSBASELINE_ABSCHLUSSBERICHT.md`
- `docs/SCHEMA_DRIFT_ANALYSE.md`
- `docs/SCHEMA_DRIFT_BEREINIGUNGSPLAN.md`
- `docs/SCHEMA_DRIFT_TESTBERICHT.md`
- `docs/SCHEMA_DRIFT_ABSCHLUSSBERICHT.md`

Die technische Abnahmevorbereitung ersetzt nicht die fachliche Endabnahme durch die Kanzlei.

Die erneute technische Prüfung nach der PC-Übertragung am 31.07.2026 umfasst 15 Migrationen, 305 erfolgreiche automatisierte Tests und einen bewusst übersprungenen großen Performance-Grundtest. Prisma-Schema, Prisma Client, ESLint, TypeScript, Integrations-Build sowie Entwicklungs- und Produktionsstart der Integrationsumgebung wurden erfolgreich geprüft.

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

Bei **Nicht zutreffend** wird die Begründung nur nach Auswahl dieses Status eingeblendet und serverseitig verlangt. Eine gespeicherte Begründung bleibt bei späteren Statuswechseln erhalten und erscheint bei erneuter Auswahl wieder. **Übertragung vorschlagen** ist als geschlossene Zusatzaktion ausgeführt; erst nach dem Öffnen erscheinen Zielperiode, Begründung, erwartete Handlung und optionaler Hinweis.

Bekannte Einschränkung: Die Ausführungsmonate beziehen sich in dieser Version auf das Kalenderjahr. Eine relative Verschiebung anhand eines abweichenden Wirtschaftsjahres ist noch nicht implementiert.
## Rechnungswesen–Lohn-Abstimmungen – Benutzeroberfläche

Die FiBu-Lohn-Abstimmung ist als eigener, lokaler Arbeitsbereich integriert. Für Kanzleilohn-Mandanten wird bei der Erstellung einer Monatscheckliste genau eine Abstimmung für den vorgesehenen Lohnabrechnungsmonat angelegt. Die zugehörige Checklistenaufgabe zeigt Themenfortschritt, Sachverhalte, offene Rückfragen, Lohnzuständigkeit und den direkten Einstieg.

Rechnungswesenbearbeiter bearbeiten die sechs Themen und ihre Positionen lokal und speichern normale Formulardaten zentral über die Sticky-Leiste. Teilfehler lassen gültige Themen und Positionen bestehen; Konflikte überschreiben keine Eingaben. Upload, Archivierung, Fahrzeugstammdaten, Rückfragen, Gesamtübergabe und Lohnabschluss bleiben getrennt. Der anschließende Lohnstatus (`Neu`, `In Bearbeitung`, `Rückfrage offen`, `Erledigt`) verändert die abgeschlossene Rechnungswesenbearbeitung nicht.

Lohnsachbearbeiter werden nach der Anmeldung direkt zu „Meine FiBu-Lohn-Abstimmungen“ geführt. Die Ansicht enthält Abrechnungsmonat, Mandantensuche, Statusfilter, Kennzahlen und direkte Links. Rückfragen führen zur betreffenden Themenkarte. Antworten und Nachreichungen öffnen die Monatscheckliste nicht wieder. Nach der Gesamtübergabe bleiben nachvollziehbare Ergänzungen und das kontrollierte Abschließen angekündigter Nachreichungen möglich; beide Aktionen werden gesondert protokolliert und verändern die ursprüngliche Übergabe nicht.

Belege liegen ausschließlich unter `storage/fibu-lohn` und werden nur über authentifizierte Routen bereitgestellt. Campus-Anhänge und FiBu-Lohn-Belege bleiben technisch getrennt. Der dauerhafte Fahrzeugbestand ist unter „Fahrzeuge“ sowie am Mandanten erreichbar; Fahrzeugänderungen können mit einer Abstimmung verknüpft werden.

Die Teil-2-Oberfläche nutzt die vorhandene additive Migration `20260728100000_fibu_payroll_reconciliation_foundation`; eine weitere Migration ist nicht erforderlich. Ausführliche Unterlagen:

* `docs/FIBU_LOHN_BENUTZEROBERFLAECHE.md`
* `docs/FIBU_LOHN_RUECKFRAGENPROZESS.md`
* `docs/FIBU_LOHN_LOHNDASHBOARD.md`
* `docs/FIBU_LOHN_BEDIENANLEITUNG.md`

### Getrennter FiBu-Lohn-Abnahmebestand

Die Modulabnahme arbeitet ausschließlich mit künstlichen Daten in `prisma/fibu-lohn-acceptance.db` und mit Dateien unter `tmp/fibu-lohn-acceptance-storage`. Die aktive Entwicklungsdatenbank und die regulären Speicherordner werden nicht verwendet.

```powershell
# Abnahmedatenbank neu aus allen Migrationen aufbauen, deterministisch befüllen
# und anschließend die Konsistenz prüfen. Der Befehl löscht ausschließlich
# den klar benannten künstlichen FiBu-Lohn-Abnahmebestand.
npm.cmd run testdata:fibu-lohn

# Diagnose ohne Datenänderung
npm.cmd run testdata:fibu-lohn:diagnose

# Sicherung und vollständige Wiederherstellung von Datenbank und Dateispeicher prüfen
npm.cmd run testdata:fibu-lohn:backup-test

# Getrennten synthetischen Lastbestand erzeugen und Abfragen messen
npm.cmd run testdata:fibu-lohn:performance
```

Der deterministische Abnahmebestand enthält die künstlichen Mandanten 92001 bis 92008. Er deckt Übergaben ohne und mit Sachverhalten, Rückfragen, Nachreichungen, Fahrzeugänderungen, Zuständigkeitswechsel, einen abgeschlossenen Fall und einen Mandanten ohne Kanzleilohn ab. Der Seed bricht ab, sobald Rollenreferenzen, Themenanzahl, Zuständigkeiten oder Statusfolgen inkonsistent sind.

Die fachliche Prüfung erfolgt mit:

* `docs/FIBU_LOHN_ABNAHMEPRUEFBOGEN.md`
* `docs/FIBU_LOHN_FACHLICHE_ENDABNAHME.md`
* `docs/FIBU_LOHN_SCHULUNG.md`
* `docs/FIBU_LOHN_ABNAHMEBERICHT.md`

Für einen späteren Pilotbetrieb gilt weiterhin: Datenbank, `storage/ordo-campus` und `storage/fibu-lohn` müssen gemeinsam gesichert und wiederhergestellt werden. Nur die Datenbank zu kopieren ist unvollständig.

## Getrennte Systemintegrationsumgebung

Die systemweite Prüfung aller bisherigen Module verwendet ausschließlich künstliche Daten und folgende getrennte Pfade:

- `prisma/system-integration.db`
- `tmp/system-integration-storage/ordo-campus`
- `tmp/system-integration-storage/fibu-lohn`

```powershell
# Löscht und erstellt ausschließlich die oben genannte Integrationsumgebung.
# Alle 19 Migrationen, Seeds und die lesende Diagnose werden ausgeführt.
npm.cmd run testdata:system-integration

# Diagnose ohne Datenänderung
npm.cmd run testdata:system-integration:diagnose

# Entwicklungsbetrieb auf der Integrationsumgebung
npm.cmd run dev:integration

# Produktionsprüfung auf der Integrationsumgebung
npm.cmd run build:integration
npm.cmd run start:integration
```

Der Reset besitzt feste absolute Pfadprüfungen und lehnt Entwicklungs-, Workflow-, Abnahme-, Pilot- und Produktivpfade ab. Der Integrationsbestand umfasst Anmeldung, Mandanten, Rechnungswesen, Jahresabschluss, Standardaufgaben, Ordo Campus samt Anhang, FiBu-Lohn samt Beleg, Rückfragen und Fahrzeuge.

Die `prisma/dev.db` wurde am 31.07.2026 baselined und am 04.08.2026 mit Migration 16 driftfrei hergestellt. Migration 17 ergänzte geschützte Profilbilder. Migration 18 `20260805160000_ordo_campus_2_knowledge_platform` überführt Ordo Campus additiv in die unabhängige Wissens- und Lernplattform. Die Altbestände bleiben vollständig bestehen; ihre Inhalte, Verknüpfungen, Anhänge und Verläufe werden über eindeutige Herkunftsschlüssel übernommen. Vor der echten Anwendung wurde der Vorgang auf einer bytegenauen Kopie einschließlich Idempotenz und Wiederherstellung geprüft. `dev:integration` bleibt die sichere isolierte Umgebung für Reset-, Seed- und Systemintegrationsprüfungen.

## Workflow-, Navigations- und UX-Optimierung

Die Hauptnavigation ist in **Rechnungswesen** und **Rechnungswesen ↔ Lohn** gebündelt. Rechnungswesen enthält das laufende Rechnungswesen, den Jahresabschluss und die neue lückenbasierte Statusübersicht. Die Lohnansicht startet für Lohnsachbearbeiter mit allen offenen Vorgängen über mehrere Monate; Rechnungswesen- und Lohnabrechnungsmonat werden getrennt angezeigt. Die technischen Routen unter `/fibu-lohn` bleiben kompatibel.

FiBu-Lohn-Themen unterstützen mehrere Einzel- und – bei fachlich geeigneten Themen – Sammelpositionen. Die additive Migration `20260728140000_workflow_navigation_payroll_positions` ergänzt ausschließlich neue Positions- und Referenzstrukturen. Bestehende Abstimmungen, Belege, Checklisten und Verläufe bleiben erhalten.

Weiterführende Dokumentation:

- `docs/NAVIGATION_UND_MODULSTRUKTUR.md`
- `docs/RECHNUNGSWESEN_STATUSUEBERSICHT.md`
- `docs/FIBU_LOHN_MEHRFACHSACHVERHALTE.md`
- `docs/CHECKLISTEN_UX.md`

Bekannte Einschränkung: Die Statusübersicht arbeitet mit Kalenderjahren. Sammelpositionen verwenden in dieser ersten Fassung eine gemeinsame strukturierte Beschreibung und eine geschützte Listenunterlage; eine Tabellenbearbeitung einzelner Unterzeilen innerhalb einer Sammlung ist noch nicht implementiert.

## Dashboard und periodenübergreifende Arbeitslisten

Der zentrale Einstieg heißt einheitlich **Dashboard**. Er ordnet offene Rechnungswesen-, Jahresabschluss- und FiBu-Lohn-Vorgänge unabhängig vom ausgewählten Monat der aktuell aktiven Bearbeitung, Prüfung, Freigabe oder Rückfrage zu. Ein Vorgang kann dabei nur in einer aktiven Verantwortungsgruppe erscheinen.

Vorgänge mit einem Arbeitsmonat von mehr als sechs Monaten vor dem aktuellen Kalendermonat stehen standardmäßig im eigenen, aufgeklappten Bereich **Ältere offene Vorgänge**. Die Grenze gilt auch über Jahreswechsel. Operative Listen starten mit **Offen**; **Abgeschlossen** und **Alle** dienen der Historie. Monats- und Jahresfilter werden deshalb nur dort angeboten. Große Listen sind ohne stille Abschneidung vollständig in Seiten zu je 100 Einträgen abrufbar; Gesamtzahl und dargestellter Bereich bleiben sichtbar. Selten benötigte Filter liegen unter **Weitere Filter**.

Die Hauptnavigation verwendet einheitliche SVG-Symbole. Produktname, CONCILIUM-Marke und Ein-/Ausklappsteuerung liegen auf einer gemeinsamen horizontalen Achse. Für diese rein technische und darstellerische Änderung war keine Datenbankmigration erforderlich.

Details: `docs/DASHBOARD_UND_OPERATIVE_LISTEN.md`.

## Verwaltungsstruktur

Die linke Hauptnavigation führt zentrale Kanzleifunktionen gebündelt unter **Verwaltung**. Der Hauptpunkt wird nur angezeigt, wenn der angemeldete Benutzer mindestens eine der enthaltenen Funktionen serverseitig verwenden darf. Benutzer mit mehreren Rollen sehen den Eintrag nur einmal.

Die Verwaltungsseite besitzt vier berechtigungsabhängige Reiter:

- **Fachliche Grundlagen**: Standardaufgaben, bestehende Aufgabenbereiche und Kategorien, FiBu-Lohn-Themen, eine mandantenübergreifende Such- und Qualitätsübersicht mandantenspezifischer Aufgaben sowie fachliche Ordo-Campus-Verknüpfungen.
- **Benutzer und Rechte**: lokale Benutzer, Status, fachliche Rollen, technische Administratorrolle und Zusatzberechtigungen.
- **Daten und Import**: der vorhandene mehrstufige Standardaufgaben-Import mit Vorschau, Validierung, Bestätigung und Historie.
- **System**: ausschließlich sichere, bereits bekannte technische Eckdaten und im Entwicklungsmodus die Diagnose künstlicher Daten. Geheimnisse, Sitzungsschlüssel und vollständige lokale Pfade werden nicht angezeigt.

Der erste für den Benutzer zulässige Reiter wird automatisch geöffnet. Ein vollständig leerer Verwaltungsbereich ist nicht erreichbar. Die sichtbare Navigation ersetzt keine Rechteprüfung: Bestehende Fachseiten und schreibende Aktionen prüfen die Berechtigung weiterhin serverseitig und leiten unberechtigte Direktaufrufe neutral ab.

**Ordo Campus** bleibt ein eigenes Hauptmodul, weil Wissen im Arbeitsalltag gesucht und unmittelbar an Aufgaben gelesen wird. Die Wissenspflege bleibt an der führenden Standardaufgabe; Verwaltung ist kein verpflichtender Umweg. Ebenso bleiben mandantenspezifische Aufgaben fachlich beim Mandanten. Die zentrale Verwaltungsübersicht dient nur Suche, Filtern und Qualitätskontrolle und bietet keine losgelöste Neuanlage.

Persönliche Funktionen wie **Passwort ändern** gehören nicht zur Verwaltung. Eine reine Administratorrolle verleiht weiterhin keine fachlichen Rechte an Standardaufgaben, Ordo Campus, Rechnungswesen oder FiBu-Lohn. Bestehende direkte Routen bleiben kompatibel und werden in der sichtbaren Oberfläche durch Verwaltungs-Breadcrumbs eingeordnet. Für diese reine Navigations- und Seitenstruktur war keine Prisma-Migration erforderlich.

Weitere Einzelheiten:

- `docs/VERWALTUNGSSTRUKTUR.md`
- `docs/NAVIGATION_UND_MODULSTRUKTUR.md`

## Zentrale Checklisten-Sammelspeicherung

Normale Bearbeitungsfelder mehrerer Rechnungswesen- oder Jahresabschlussaufgaben werden über die mitlaufende Leiste gemeinsam gespeichert. Die Leiste zählt Aufgaben mit tatsächlichen Abweichungen und zeigt **Alle Änderungen speichern (n)**, **Alle verwerfen** oder **Alles gespeichert**.

Gültige Aufgaben werden auch dann gespeichert, wenn eine andere Aufgabe einen Validierungs-, Berechtigungs- oder Konfliktfehler besitzt. Erfolgreiche Serverantworten werden sofort zum neuen lokalen Ausgangszustand; fehlerhafte Eingaben bleiben sichtbar. `updatedAt` verhindert das stille Überschreiben zwischenzeitlicher Änderungen. Deshalb war keine Prisma-Migration erforderlich.

Übertragungsvorschläge, Rückfragen, Statusübergaben, Abschlüsse, Uploads und Fahrzeugänderungen bleiben ausdrücklich getrennte Workflowaktionen. Normale Prüfentscheidungen und normale Rechnungswesen–Lohn-Themen-/Positionsdaten besitzen eigene zentrale Sammelspeicherungen mit Teilresultaten und Konfliktschutz. Offene normale Änderungen blockieren getrennte Workflowaktionen. Interne Navigation und Browser-Verlassen warnen vor Datenverlust. `Strg + S` beziehungsweise `Cmd + S` löst die jeweilige Sammelspeicherung aus.

Details: `docs/CHECKLISTEN_SAMMELSPEICHERUNG.md`.

## Mandantenarbeitsbereich und kompakte Checklisten-Navigation

Der normale Zeilenklick in der Mandantenliste öffnet den Mandanten jetzt als zentralen Arbeitskontext. Konkrete Dashboard-, Rückfrage-, Prüfungs- und Drei-Punkte-Aktionen führen weiterhin direkt zum jeweiligen Fachvorgang. Der Mandantenarbeitsbereich bündelt Zuständigkeiten, Jahresprofil, Rechnungswesenstand, Jahresabschluss, FiBu ↔ Lohn, Fahrzeuge, mandantenspezifische Aufgaben, Qualitätshinweise und Historieneinstiege. Sichtbare Reiter und Aktionen folgen den vorhandenen Fachrollen; eine reine Administratorrolle erhält dadurch keine Fachrechte.

Monats- und Jahresabschlusschecklisten besitzen einen ausführlichen Seitenkopf im normalen Lesefluss. Darunter bleibt beim Scrollen nur eine kompakte Leiste mit Fortschritt, offenen, fehlerhaften und ungespeicherten Aufgaben sowie Speichern, nächster offener Aufgabe und aufklappbaren Details sichtbar. Die seitliche **Aufgabenübersicht** sucht und filtert lange Checklisten und springt ohne Datenänderung direkt zur Aufgabe. Mehrere Speicherfehler werden in sichtbarer Reihenfolge zyklisch angesteuert.

Die grüne Hauptnavigation lässt sich auf Desktopbreiten über den Pfeil auf eine schmale Iconleiste reduzieren. Der Zustand wird ausschließlich lokal im Browser gespeichert; Tooltips, zugängliche Namen, aktive Route und Tastaturfokus bleiben erhalten. Auf mobilen Breiten bleibt die vorhandene horizontale Navigation bestehen. Für dieses UX-Paket war keine Datenbankmigration erforderlich.

Weitere Einzelheiten:

- `docs/MANDANTENARBEITSBEREICH.md`
- `docs/CHECKLISTEN_AUFGABENNAVIGATOR.md`
- `docs/CHECKLISTEN_UX.md`
- `docs/NAVIGATION_UND_MODULSTRUKTUR.md`
