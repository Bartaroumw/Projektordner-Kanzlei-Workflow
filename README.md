# Ordo Caroli

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

Quartalsweise Standard- oder Zusatzaufgaben werden weiterhin nur in März, Juni, September und Dezember eingesteuert.

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
- `Prüfer`: Mandanten sowie mandantenspezifische Aufgabenvorlagen verwalten und ausschließlich zugeordnete, nicht selbst bearbeitete Checklisten prüfen.
- `Kanzleileitung`: kanzleiweite Fachsicht, Standardaufgaben, begründete Ausnahmen, Rollenänderungen und Wiederöffnungen.
- `Administrator`: lokale Benutzerkonten und Passwörter verwalten, jedoch keine fachliche Prüfung allein aufgrund der Administratorrolle.
- `Standardaufgaben verwalten`: zusätzliche ausdrückliche Fachberechtigung für Standardaufgaben und Excel-Import.
- `Mandanten verwalten`: ausdrückliche Zusatzberechtigung für Benutzer ohne fachliche Standardrolle.
- `Mandantenspezifische Aufgaben verwalten`: ausdrückliche Zusatzberechtigung neben Prüfer und Kanzleileitung.

Ein rein technischer Administrator besitzt keine fachlichen Mandanten-, Checklisten-, Prüf- oder Aufgabenrechte. Mandantenspezifische Aufgaben und kanzleiweite Standardaufgaben werden strikt getrennt berechtigt.

Das Vier-Augen-Prinzip wird anhand unveränderlicher Benutzer-IDs serverseitig geprüft. Bearbeiter und Prüfer dürfen nicht identisch sein. Die Benutzeroberfläche zeigt nur passende Aktionen; entscheidend bleibt stets die serverseitige Prüfung.

Mandanten und Monatschecklisten speichern optionale Benutzerreferenzen sowie weiterhin vollständige Namen. Beim Erzeugen einer Checkliste werden Benutzer-IDs und Namen als Rollen-Snapshot gespeichert. Neue Verlaufseinträge erhalten Benutzer-ID, Namenssnapshot und Rollen zum Aktionszeitpunkt. Historische Namen und bestehende Verlaufstexte bleiben unverändert.

Benutzer werden nie physisch gelöscht. Eine Deaktivierung beendet Sitzungen und verhindert neue Anmeldung und Zuordnung; historische Bezüge bleiben erhalten. Bestehende aktive Zuordnungen werden nicht automatisch umverteilt.

### Ausschließlich künstliche lokale Zugänge

| Benutzername | Rolle(n) | Erstpasswort |
| --- | --- | --- |
| `maria.muster` | Mitarbeiter | `Test-Maria-2026!` |
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

## Bekannte Einschränkungen

- keine externe Identitätsverwaltung, Mehrfaktor-Anmeldung oder zentrale Kennwortrichtlinie
- lokale Konten setzen den gesicherten Zugriff auf den Windows-PC und die SQLite-Datei voraus
- Sitzungen sind auf eine einzelne lokale Installation ausgelegt
- keine Jahresabschlusschecklisten oder Jahresfreigabe
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
