# Ordo Campus 2 – Fachkonzept

Stand: 05.08.2026

## Zielbild

Ordo Campus ist die eigenständige Wissens- und Lernplattform von Ordo Caroli. Wissensinhalte werden zentral im Wissensmanagement gepflegt und anschließend an beliebig viele Standardaufgaben, Rechnungswesen–Lohn-Themen, Wissensgebiete und Lernpfade angebunden. Eine Aufgabe ist damit nur noch ein Anwendungsort und nicht mehr die führende Wissensquelle.

Reguläre aktive interne Benutzer dürfen grundsätzlich alle aktiven Wissensinhalte lesen. Zielgruppen steuern Empfehlungen und Hervorhebungen, nicht den kanzleiweiten Grundzugriff. Die eigenständige Campus-Navigation steht deshalb auch reinen Lohnsachbearbeitern und Benutzern ohne Rechnungswesenrolle offen. Pflege erfordert unverändert die Zusatzberechtigung `ORDO_CAMPUS_VERWALTEN`; eine reine Administratorrolle verleiht kein fachliches Pflegerecht.

## Wissensinhalte

Ein Wissensinhalt besitzt einen stabilen Schlüssel, Titel, Kurzbeschreibung, Ziel, Hauptinhalt, Bearbeitungshinweise, verbindlichen Kanzleistandard, typische Fehler, rollenbeschränkte Prüferhinweise und interne Hinweise. Mehrfach auswählbare Inhaltstypen sind:

- Kanzleistandard
- Arbeitsanleitung
- Fachwissen
- Prüfungshinweis
- Lerninhalt
- Arbeitshilfe
- Externe Quelle

Die Zielgruppen sind Bearbeiter, Prüfer, Kanzleileitung, Lohnsachbearbeiter oder alle internen Benutzer. Statuswerte sind `Entwurf`, `Aktiv` und `Archiviert`. Reguläre Leser sehen ausschließlich aktive Inhalte. Prüferhinweise werden unabhängig davon serverseitig auf Prüfer und Kanzleileitung begrenzt.

## Wissensgebiete und Lernpfade

Wissensgebiete besitzen stabile Schlüssel und höchstens eine Unterebene. Ein Inhalt kann mehreren Gebieten zugeordnet sein; genau ein Gebiet kann als Hauptgebiet markiert werden. Der initiale Katalog umfasst 42 Gebiete in den Hauptbereichen Rechnungswesen, Jahresabschluss, Rechnungswesen ↔ Lohn, Kanzleistandards, Branchenwissen sowie DATEV und Werkzeuge.

Lernpfade ordnen vorhandene Inhalte wiederverwendbar in eine fachliche Reihenfolge. Initial vorhanden sind Einarbeitung Rechnungswesen, Prüfung und Qualitätssicherung, Rechnungswesen ↔ Lohn-Abstimmung sowie Jahresabschluss. Lernpfade kopieren keinen Artikeltext.

## Anwendung im Arbeitsfluss

Standardaufgaben und Rechnungswesen–Lohn-Themen können mehrere Wissensinhalte erhalten. Je Anwendungsort kann eine Hauptanleitung markiert werden; weitere Inhalte erscheinen als ergänzendes Wissen, Kanzleistandard, Prüfungshinweis oder Arbeitshilfe. In Checklisten und Abstimmungen wird das Wissen beim Öffnen aktuell vom Server geladen und nicht in fachliche Snapshots kopiert.

Das Campus-Panel zeigt die Anzahl verfügbarer Inhalte, hebt die Hauptanleitung hervor und macht alle weiteren Treffer direkt erreichbar. Änderungen am zentralen Wissen verändern keine historischen Aufgaben-, Checklisten- oder Abstimmungssnapshots.

## Suche und persönlicher Fortschritt

Die Suche berücksichtigt Titel, Kurzbeschreibung, Ziel, Inhalte, Bearbeitungshinweise, Kanzleistandard, typische Fehler, zulässige Prüferhinweise, interne Hinweise, Linkmetadaten, Tags, Wissensgebiete sowie verknüpfte Aufgaben und Rechnungswesen–Lohn-Themen. Filter für Gebiet, Inhaltstyp, Zielgruppe und Aktualität bleiben kombinierbar.

Aufrufe werden je Benutzer als `Zuletzt angesehen` erfasst. Ein Benutzer kann einen Inhalt freiwillig als gelesen markieren und diese Markierung wieder entfernen. Dies ist eine persönliche Orientierungshilfe, kein Schulungs-, Prüfungs- oder Pflichtnachweis.

## Grenzen

- Keine KI-Funktion, keine E-Mail-Funktion und keine DATEV-Schnittstelle.
- Externe und DATEV-bezogene Quellen werden ausschließlich als Linkmetadaten gespeichert.
- Campus-Anhänge dürfen keine echten Mandanten- oder Personendaten enthalten.
- Keine Kopie von Wissensartikeln in Aufgaben- oder Abstimmungssnapshots.
- Keine automatische Aussage über Schulungserfolg, Kenntnisstand oder Freigabe.
