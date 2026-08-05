# Dashboard und operative Listen

Stand: 05.08.2026

## Zielbild

Der zentrale Einstieg heißt in Hauptnavigation, Seitenüberschrift und Browser-Titel **Dashboard**. Er zeigt keine isolierte Monatsauswahl, sondern alle offenen Vorgänge, für die der angemeldete Benutzer aktuell eine fachliche Aktion ausführen muss: Bearbeitung, Prüfung, Freigabe, Rückfrage oder eine zugeordnete FiBu-Lohn-Abstimmung.

Die vorhandenen Rollen- und serverseitigen Berechtigungsprüfungen bleiben unverändert. Personengleiche Mehrfachrollen führen nicht zu Doppelanzeigen: Maßgeblich ist ausschließlich der aktuelle Workflowstatus.

## Altersgrenze

Ein offener Vorgang gilt als **älter**, wenn sein Arbeitsmonat mehr als sechs Monatswechsel vor dem aktuellen Kalendermonat in der Zeitzone `Europe/Berlin` liegt. Im August 2026 ist Januar 2026 älter; Februar 2026 gehört noch zum aktuellen Sechsmonatsfenster. Die Berechnung verwendet eine fortlaufende Monatszahl und funktioniert deshalb auch über Jahreswechsel.

Ältere Vorgänge werden im standardmäßig sichtbaren Bereich **Ältere offene Vorgänge** gesammelt. Dieselben Vorgänge werden nicht zusätzlich in den oberen Bearbeitungs-, Prüfungs- oder Rückfragegruppen angezeigt.

## Listen und Filter

Rechnungswesen-, Jahresabschluss- und FiBu-Lohn-Listen öffnen standardmäßig die Ansicht **Offen**. Daneben bestehen **Abgeschlossen** und **Alle**. Offene Arbeitslisten sind periodenübergreifend; Jahr und Monat werden nur in historischen Ansichten angeboten.

Direkt sichtbar bleiben Suche, Status und die primäre Aktion. Zuständigkeits-, Stammdaten- und Sortierfilter liegen unter **Weitere Filter**. Aktive Filter erscheinen darunter als kompakte Chips und können einzeln entfernt werden; zusätzlich besitzt jede Liste eine eindeutige Zurücksetzen-Aktion.

Rechnungswesenaufgaben werden seitenweise mit höchstens 100 Einträgen geladen. Jahresabschluss- und FiBu-Lohn-Listen sind auf 200 Einträge begrenzt und weisen die Begrenzung sichtbar aus. Dashboardbereiche zeigen höchstens zehn Detailzeilen und verlinken auf die vollständige Arbeitsliste.

## FiBu-Lohn-Sortierung

Offene FiBu-Lohn-Abstimmungen werden nach offenen Rückfragen, ältestem Lohnabrechnungsmonat, ältestem Eingang beziehungsweise Erstellzeitpunkt und schließlich Mandantennummer sortiert. Rechnungswesen- und Lohnabrechnungsmonat bleiben getrennte Tabellenspalten.

Eine Abstimmung gilt weiterhin als offen, wenn ihr Lohnstatus nicht erledigt ist oder offene Rückfragen, Nachreichungen beziehungsweise noch unverarbeitete übergebene Sachverhalte bestehen.

## Navigation und Darstellung

Die Hauptnavigation verwendet ausschließlich lokale SVG-Symbole in einem gemeinsamen Raster mit einheitlicher Strichstärke. Logo, Produktname, CONCILIUM-Marke und Einklapppfeil bleiben auf einer gemeinsamen horizontalen Achse. Die Rollen- und Berechtigungslogik wird davon nicht beeinflusst.

## Datenbank und Migrationen

Die Umsetzung verändert weder `schema.prisma` noch Migrationen oder Fachdaten. Es war keine Migration erforderlich. Alle Abfragen sind lesend; `prisma/dev.db` wird nicht zurückgesetzt, gepusht oder geseedet.

## Prüfung

Prisma Validate, Prisma Client, Migrationsstatus, ESLint, TypeScript, 325 automatisierte Tests und der Produktions-Build waren erfolgreich. Ein optionaler Performance-Smoke-Test blieb planmäßig übersprungen. Entwicklungs- und produktionsnaher Integrationsstart antworteten erfolgreich. Die Browserprüfung umfasste Maria Muster, Paul Prüfung, Klara Leitung und Laura Lohn sowie 1440, 1280, 1024 und 600 Pixel Breite ohne Seitenüberlauf oder Konsolenfehler.
