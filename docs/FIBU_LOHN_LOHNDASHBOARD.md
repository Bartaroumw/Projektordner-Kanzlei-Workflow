# FiBu-Lohn-Dashboard

Die operative FiBu-Lohn-Liste startet periodenübergreifend mit **Offen**. Historische Einträge liegen getrennt unter **Abgeschlossen** beziehungsweise **Alle**; Jahr und Lohnabrechnungsmonat erscheinen erst dort als Filter. Offene Rückfragen bestimmen die höchste Sortierpriorität, danach folgen ältester Lohnmonat, ältester Eingang und Mandantennummer. Rechnungswesen- und Lohnabrechnungsmonat bleiben getrennt sichtbar. Vorgänge, deren Lohnmonat mehr als sechs Monate zurückliegt, stehen ohne Doppelanzeige unter **Ältere offene Vorgänge**.

## Persönliche Arbeitsansicht

Eine reine Lohnrolle wird nach der Anmeldung direkt nach `/fibu-lohn` geführt. Angezeigt werden ausschließlich Abstimmungen, deren Lohnsachbearbeiter-Snapshot auf den angemeldeten Benutzer verweist.

Die Ansicht enthält:

* vorherigen und nächsten Lohnabrechnungsmonat,
* Mandantensuche,
* Filter nach Lohnstatus,
* Kennzahlen für Neu, In Bearbeitung, Rückfrage offen und Erledigt,
* Abstimmungsliste mit Sachverhalten, Belegen, Nachreichungen, Rückfragen und Eingang,
* offene Rückfragen mit direktem Link zur Themenkarte.

Standardmäßig werden offene Vorgänge vor erledigten Vorgängen und anschließend nach Mandant sortiert. Eine reine Administratorrolle erhält dadurch keine fachlichen Lohnrechte.

## Verarbeitung

Die Erstansicht wird automatisch technisch protokolliert und lässt den Status **Neu** unverändert. Lohn kann Rückfragen stellen und Themen mit Sachverhalt einzeln als verarbeitet markieren; die erste erfolgreiche Fachaktion startet automatisch **In Bearbeitung**. Der Gesamtabschluss ist erst möglich, wenn alle Rückfragen durch Lohn erledigt und alle übergebenen Sachverhalte verarbeitet wurden.
