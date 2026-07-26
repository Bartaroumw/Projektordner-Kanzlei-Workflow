# Kanzlei Workflow

## Projektziel

Kanzlei Workflow ist eine kleine, eigenständige Webapp als kurzfristiger Ersatz für eine Excel-Checkliste in einer deutschen Steuerberatungsgesellschaft. Die aktuelle Ausbaustufe verwaltet Mandantenstammdaten, kalenderjahrbezogene Mandantenprofile, Standardaufgaben und produktiv bearbeitbare Monatschecklisten.

## Technischer Aufbau

- Next.js 16 mit App Router und React 19
- TypeScript und Tailwind CSS
- SQLite als ausschließlich lokale Datenbank
- Prisma 6.19.3 als Datenbankzugriff
- Vitest für automatisierte Tests
- `read-excel-file` für die ausschließlich lokale Prüfung von `.xlsx`-Dateien
- npm als Paketverwaltung
- keine Cloud-Dienste oder externen Datendienste

## Installation

```powershell
npm.cmd install
npm.cmd run db:generate
```

## Start

```powershell
npm.cmd run dev
```

Danach ist die Anwendung unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Datenbank und Prisma

Die lokale SQLite-Datenbank liegt unter `prisma/dev.db`. Sie wird nicht in Git aufgenommen. Die Verbindungsangabe steht lokal in `.env`; `.env.example` enthält nur eine geheimnisfreie Vorlage.

Wichtige Befehle:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

Das Datenmodell steht in `prisma/schema.prisma`. Nachvollziehbare SQL-Migrationen liegen in `prisma/migrations`. Die Migration `20260726153000_standard_tasks_import` ergänzt Kategorien, Standardaufgaben, kurzlebige Importvorschauen und die Importhistorie. Die Migration `20260726170000_monthly_checklists` ergänzt Buchhaltungsperioden, Checklistenaufgaben-Snapshots und mandantenspezifische Aufgaben.

## Künstliche Testdaten

Die mitgelieferten Daten sind ausdrücklich vollständig künstlich:

- 10001 – Musterpraxis Beispiel, Jahresprofil 2026
- 10002 – Beispiel Verwaltungs GmbH, Jahresprofil 2026
- 10003 – Mustermann Besitz GbR, Jahresprofil 2026
- zwölf künstliche Kategorien für Standardaufgaben
- eine separate Excel-Beispieldatei mit 16 eindeutig künstlichen Standardaufgaben; sie wird nicht automatisch importiert
- vier künstliche Perioden: Januar und Februar 2026 für 10001, Januar 2026 für 10002 sowie 1. Quartal 2026 für 10003
- zwei künstliche Zusatzaufgaben für 10001: eine monatlich wiederkehrende und eine einmalige Aufgabe für Januar 2026

Echte Mandanten-, Mitarbeiter- oder andere personenbezogene Daten dürfen weder in der Entwicklung noch im lokalen Testbetrieb verwendet werden.

## Künstliche Testdaten vollständig zurücksetzen

Zuerst den laufenden Entwicklungsserver mit `Strg+C` beenden. Danach:

```powershell
npm.cmd run db:reset
```

Der Befehl entfernt ausschließlich `prisma/dev.db`, legt die lokale Struktur aus allen Migrationen neu an und erzeugt die künstlichen Mandanten, Kategorien, 16 Standardaufgaben, zwei Zusatzaufgaben und vier Perioden erneut. Die Importhistorie wird zurückgesetzt. Eigene lokale Testeingaben gehen dabei verloren.

## Standardaufgaben und Aufgaben-ID

Standardaufgaben bilden einen zentralen fachlichen Bestand und sind noch keinem Mandanten zugeordnet. Neben Anweisungen und Kategorie enthalten sie Checklistenart, Rhythmus, fachliche Zielgruppen, sieben Merkmalsbedingungen, Pflichtstatus, Sortierung und fachliche Version.

Die Aufgaben-ID, zum Beispiel `MON-BANK-001`, ist ein eindeutiger und dauerhaft unveränderlicher fachlicher Schlüssel. Die technische Datenbank-ID bleibt davon getrennt. Vorhandene Aufgaben werden beim Import nur über die Aufgaben-ID erkannt und behalten ihre technische ID.

Für erzeugte konkrete Checklisten gilt das Snapshot-Prinzip: Die gültigen Aufgabeninhalte werden in die konkrete Checkliste kopiert. Spätere Änderungen oder Deaktivierungen einer Standardaufgabe verändern bestehende Checklisten nicht.

## Monatsperioden und Turnuslogik

Eine Buchhaltungsperiode gehört eindeutig zu einem Mandanten, Kalenderjahr, Monat und der Checklistenart „Monat“. Monatliche Mandanten können Perioden für jeden Monat erhalten. Bei vierteljährlichen Mandanten sind ausschließlich März, Juni, September und Dezember zulässig; die Anzeige lautet entsprechend „1. Quartal“ bis „4. Quartal“.

Vor der Erzeugung muss ein Jahresprofil für das Kalenderjahr vorhanden sein. Der Ablauf besteht aus Mandanten-, Jahres- und Monatsauswahl, fachlicher Vorschau und ausdrücklicher Bestätigung. Bereits vorhandene Perioden werden nicht doppelt erzeugt.

## Automatische Aufgabenwahl

Berücksichtigt werden ausschließlich aktive Standardaufgaben der Checklistenart „Monat“. Alle Bedingungen müssen gemeinsam passen:

- Rhythmus: monatlich immer; quartalsweise in den Abschlussmonaten beziehungsweise in jeder zulässigen Quartalsperiode; „Bestimmter Monat“ nur im hinterlegten Monat; jährlich nie
- Rechtsformgruppe und Gewinnermittlungsart: `Alle` oder ein passender Mehrfachwert
- Kasse, Lohn, Anlagevermögen, Debitoren/Kreditoren, Darlehen, Umsatzsteuerpflicht und Dauerfristverlängerung: `Alle`, passendes `Ja` oder passendes `Nein`

Mandantenspezifische Aufgaben werden nach Aufgabenart und zeitlicher Gültigkeit zusätzlich berücksichtigt. Monatliche Aufgaben gelten in jeder passenden Periode, quartalsweise Aufgaben in den Abschlussmonaten und einmalige Aufgaben nur im festgelegten Jahr und Monat. Jährliche Aufgaben bleiben späteren Jahresabschlusschecklisten vorbehalten.

## Snapshot-Prinzip

Beim Erzeugen werden die relevanten Jahresprofilwerte in der Periode gespeichert. Jede ausgewählte Standard- oder Zusatzaufgabe wird als eigenständige Checklistenaufgabe kopiert. Gespeichert werden insbesondere Aufgaben-ID, Kategorie, Anweisungen, Pflichtstatus, Sortierung, fachliche Version und Herkunft.

Spätere Vorlagenänderungen, Imports, Zusatzaufgaben und geänderte Jahresprofile verändern bestehende Checklisten nicht. Eine automatische rückwirkende Ergänzung gibt es bewusst nicht.

## Status und Fortschritt

Die grundlegenden Bearbeitungsstatus werden durch den nachstehenden vollständigen Bearbeitungs- und Prüfworkflow erweitert. Nach der ersten Aufgabenbearbeitung wechselt eine offene Periode auf „In Bearbeitung“.

Aufgabenstatus: `Offen`, `In Bearbeitung`, `Erledigt`, `Nicht zutreffend`. „Nicht zutreffend“ verlangt eine Begründung. Bearbeitungsnotiz, Bearbeiterkürzel und Bearbeitungszeitpunkt werden lokal gespeichert.

Der Fortschritt ist die Anzahl der Aufgaben mit Status „Erledigt“ oder „Nicht zutreffend“ geteilt durch die Gesamtzahl. Bei null Aufgaben beträgt er 0 Prozent. Pflichtaufgaben werden zusätzlich getrennt ausgewiesen.

## Bearbeitungs- und Prüfworkflow

Die fachlichen Periodenstatus lauten `Offen`, `In Bearbeitung`, `Zur Prüfung`, `In Prüfung`, `Nachbearbeitung` und `Abgeschlossen`. Erlaubte Hauptübergänge:

1. Offen → In Bearbeitung
2. In Bearbeitung → Zur Prüfung
3. Zur Prüfung → In Prüfung
4. In Prüfung → Nachbearbeitung, wenn offene Prüfpunkte bestehen
5. Nachbearbeitung → Zur Prüfung, wenn alle Prüfpunkte beantwortet wurden
6. In Prüfung → Abgeschlossen, wenn keine Prüfpunkte und keine offenen Pflichtaufgaben bestehen

Die Übergabe verlangt ein Bearbeiterkürzel und vollständig abgeschlossene Pflichtaufgaben. Prüfungsbeginn und Abschluss verlangen ein Prüferkürzel. Die Oberfläche zeigt vor Übergaben eine Zusammenfassung der erledigten, nicht zutreffenden, freiwillig offenen und mit Notizen versehenen Aufgaben.

Bearbeitungsstatus und Prüfstatus einer Aufgabe sind getrennt. Zulässige Prüfstatus sind `Nicht geprüft`, `In Prüfung`, `In Ordnung`, `Rückfrage`, `Beanstandung` und `Erledigt nach Nachbearbeitung`.

Rückfrage und Beanstandung verlangen Prüferkürzel und Prüfnotiz. Der Bearbeiter beantwortet den Prüfpunkt in der Nachbearbeitung; die ursprüngliche Prüfnotiz bleibt erhalten. Nach „Nachbearbeitung erledigt“ muss der Prüfer die Aufgabe erneut auf `In Ordnung`, `Rückfrage` oder `Beanstandung` setzen.

Abgeschlossene Perioden sind gegen Aufgabenänderungen gesperrt. „Abschluss wieder öffnen“ verlangt handelndes Kürzel, Begründung und ausdrückliche Bestätigung. Die Periode wechselt dabei auf `Nachbearbeitung`.

## Fachlicher Verlauf

Periodenerzeugung, Bearbeitungs- und Prüfstatusänderungen, Notizänderungen, Übergaben, Rückfragen, Beanstandungen, Antworten, Nachbearbeitung, Abschluss und Wiederöffnung werden als neue Verlaufseinträge gespeichert. Ein Eintrag enthält Zeitpunkt, Ereignis, Kürzel, Beschreibung, vorherigen und neuen Wert sowie optional die Aufgabe. Der Verlauf ist über die Oberfläche ausschließlich lesbar.

Bearbeiter und Prüfer werden als Text-Snapshots aus dem Mandanten übernommen. Sind beide Kürzel identisch, erscheint eine deutliche Warnung. Eine technisch erzwungene personelle Trennung folgt erst mit der späteren Benutzerverwaltung.

Mandantenspezifische Aufgabenvorlagen besitzen Detail- und Bearbeitungsseiten. Aufgabenart, Zeitraum, Zuordnungen und Aktivstatus können geändert werden. Deaktivierung ersetzt eine Löschung und wirkt nur auf künftig erzeugte Checklisten; vorhandene Snapshots bleiben erhalten.

## Excel-Dateien und Importablauf

Unter „Standardaufgaben → Excel-Import“ stehen zwei Dateien bereit:

- `Standardaufgaben-Mustervorlage.xlsx` mit exakt 24 Importspalten, Ausfüllhinweisen und Dropdowns
- `Standardaufgaben-Kuenstliche-Beispiele.xlsx` mit 16 künstlichen fachlichen Beispielen

Der Import läuft ausschließlich lokal und in zwei getrennten Aktionen:

1. `.xlsx`-Datei auswählen und mit „Datei prüfen“ technisch sowie fachlich validieren.
2. Vorschau für neue, aktualisierte, unveränderte und zu deaktivierende Aufgaben, Warnungen, neue Kategorien und Fehler kontrollieren.
3. Neue Kategorien gegebenenfalls ausdrücklich bestätigen.
4. Fehlerfreien Import mit „Import ausdrücklich bestätigen“ ausführen.

Fehlerhafte Dateien verändern keine Daten. Eine nicht mehr enthaltene Aufgabe wird weder gelöscht noch deaktiviert. Nur ein ausdrückliches `Nein` in der Spalte „Aktiv“ deaktiviert eine Aufgabe. Standardaufgaben werden nicht physisch gelöscht. Bestätigte Importe werden mit Dateiname, Zeitpunkt, Version, Ergebniszahlen und Status in der Importhistorie festgehalten; die hochgeladene Datei wird nicht gespeichert. Eine geprüfte Vorschau ist 30 Minuten gültig.

## Prüfungen

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Produktionsmodus nach erfolgreichem Build:

```powershell
npm.cmd run start
```

## Aktueller Funktionsumfang

- deutschsprachige, responsive Grundoberfläche
- Mandantenübersicht mit Suche nach Nummer oder Name
- Filter nach Status, Bearbeiter, Prüfer und Team
- Mandanten anlegen, bearbeiten und inaktiv setzen
- Schutz vor doppelten Mandantennummern
- Mandantendetailseite mit historisch sortierten Jahresprofilen
- Jahresprofile anlegen, aus dem letzten Profil vorschlagen und bearbeiten
- nur ein Jahresprofil je Mandant und Kalenderjahr
- automatische Bilanzierung bei Kapitalgesellschaften
- verständliche Validierungs- und Erfolgsmeldungen
- lokale, dauerhafte Speicherung in SQLite
- zentrale Kategorienverwaltung
- Standardaufgaben suchen, filtern, sortieren, anlegen, öffnen, bearbeiten, aktivieren und deaktivieren
- Excel-Mustervorlage und künstliche Beispieldatei zum lokalen Download
- mehrstufiger Excel-Import mit Prüfung, Vorschau, Bestätigung und Importhistorie
- Monatschecklistenübersicht mit Suche und Filtern
- Vorschau und ausdrückliche Erzeugung einer Buchhaltungsperiode
- automatische Auswahl passender Standard- und mandantenspezifischer Aufgaben
- unveränderliche Jahresprofil- und Aufgaben-Snapshots
- Bearbeitung nach Kategorien mit Status, Kürzel, Notizen und Begründungen
- Fortschritts- und Pflichtaufgabenauswertung
- getrennte Bearbeitungs- und Prüfstatus je Aufgabe
- regelgesteuerte Übergabe, Prüfung, Rückfrage, Nachbearbeitung und Abschluss
- unveränderlicher fachlicher Verlauf
- begründete Wiederöffnung abgeschlossener Perioden
- Detailansicht, Bearbeitung, Aktivierung und Deaktivierung mandantenspezifischer Aufgabenvorlagen

## Bekannte Einschränkungen

- Es gibt noch keine Benutzeranmeldung oder Rechteverwaltung.
- Bearbeiter, Prüfer und Teams sind einfache Textfelder.
- Mandanten können aus Gründen des Historienerhalts nicht über die Oberfläche gelöscht, sondern nur inaktiv gesetzt werden.
- Jahresabschlusschecklisten, ein vollständiger Prüfworkflow und echte Dashboard-Auswertungen sind noch nicht implementiert.
- Es gibt keinen gesonderten Prüferstatus und kein Vier-Augen-Prinzip.
- Rollen werden weiterhin nur als Textkürzel geführt; identische Kürzel werden gewarnt, aber noch nicht technisch verhindert.
- Der fachliche Verlauf ist nachvollziehbar, aber noch kein revisionssicherer Audit-Trail.
- Bestehende Monatschecklisten können nicht um später hinzugekommene Vorlagen ergänzt werden.
- Mandantenspezifische Aufgaben können angelegt, aber noch nicht bearbeitet oder deaktiviert werden.
- Es gibt noch keine Versionshistorie einzelner Standardaufgaben; die Importhistorie protokolliert nur das zusammengefasste Importergebnis.
- Der Import unterstützt ausschließlich das bereitgestellte `.xlsx`-Format bis 5 MB; Makros und andere Dateiformate sind ausgeschlossen.
- Das Kalenderjahr entspricht immer dem Wirtschaftsjahr; abweichende Wirtschaftsjahre werden nicht unterstützt.
- Die lokale Datenbank ist nur für einen einzelnen lokalen Testbetrieb vorgesehen.

## Bekannte Sicherheitshinweise

`npm audit --omit=dev` meldet weiterhin drei hoch eingestufte betroffene Pakete im Abhängigkeitsbaum von Next.js 16.2.12:

| Betroffenes Paket | Schweregrad | Abhängigkeit | Betroffener Betrieb | Kompatible Korrektur |
| --- | --- | --- | --- | --- |
| Next.js – Zusammenfassung der nachstehenden PostCSS- und Sharp-Hinweise | hoch | direkt | Entwicklungs-, Build- und möglicher Produktionsbetrieb je nach verwendeter Funktion | npm bietet nur ein inkompatibles Downgrade auf Next.js 9.3.3 an; nicht anwenden und auf ein korrigiertes stabiles Next.js-Update warten |
| PostCSS – XSS bei nicht maskiertem `</style>`, Dateizugriff über `sourceMappingURL` und Pfadüberschreitung über Source Maps | hoch zusammengefasst (ein Einzelhinweis mittel) | indirekt über Next.js | vor allem Entwicklungs- und Buildbetrieb bei Verarbeitung fremder CSS-Dateien | Next.js weist derzeit keine kompatible stabile Aktualisierung aus; keine fremden CSS-Dateien verarbeiten |
| Sharp/libvips – mehrere Bildverarbeitungsfehler | hoch | indirekt/optional über Next.js | möglicher Produktionsbetrieb bei Verarbeitung nicht vertrauenswürdiger Bilder | Next.js 16.2.12 erlaubt noch keine korrigierte Sharp-Hauptversion; keine Bild-Uploads oder fremde Bilder verarbeiten und stabiles Next.js-Update abwarten |

Die Anwendung verarbeitet ausschließlich lokal ausgewählte strukturierte `.xlsx`-Dateien und keine fremden CSS- oder Bilddateien. Die Excel-Daten werden fachlich validiert und die Datei wird nicht dauerhaft gespeichert. Daher entsteht im ausschließlich lokalen Testbetrieb kein unmittelbares erhebliches Risiko. Prisma wurde kompatibel von 6.19.1 auf 6.19.3 aktualisiert; dadurch wurde der zwischenzeitlich gemeldete Prisma-Entwicklungshinweis behoben.
