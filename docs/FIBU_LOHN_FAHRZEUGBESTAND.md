# FiBu-Lohn – Dauerhafter Fahrzeugbestand

## Zweck

Fahrzeugdaten werden dauerhaft am Mandanten gepflegt und nicht jeden Monat neu eingegeben. Die monatliche Themenkarte dokumentiert nur, ob und welche lohnrelevante Änderung eingetreten ist.

## Stammdaten

Ein Fahrzeug enthält:

- optionale Referenznummer, Bezeichnung und Kennzeichen,
- Nutzer und Funktion,
- Vertrag, Vertragsreferenz und Vertragsdatum,
- Eigentum oder Leasing,
- Bruttolistenpreis und Unterlagenreferenz,
- 1-%-Regelung, Fahrtenbuch und Fahrten Wohnung–erste Tätigkeitsstätte,
- Rechnungswesenkonto, Grundlage und Erläuterung,
- Gültig seit/bis, Status und Bemerkung,
- Ersteller, letzter Bearbeiter und Zeitpunkte.

Status sind `Aktiv`, `Beendet` und `Archiviert`.

## Änderungen

Jede fachliche Änderung erzeugt `ClientVehicleChange` mit Änderungsart, Gültig-ab-Datum, verständlicher Zusammenfassung und vorherigem beziehungsweise neuem Zustand. Dies deckt insbesondere Nutzerwechsel, Versteuerungsmethode, Beginn/Ende, Kennzeichen, Bruttolistenpreis, Eigentum/Leasing, Arbeitsweg und Verträge ab.

Es handelt sich um eine nachvollziehbare Änderungshistorie, nicht um eine vollständige bitemporale Fahrzeugversionierung.

## Verbindung zur Monatsabstimmung

Eine Fahrzeugänderung kann mit genau der Themenkarte verknüpft werden, in der sie gemeldet wurde. Die Übergabe erhält dadurch eine verständliche Referenz auf den dauerhaften Bestand; es entsteht keine zweite Fahrzeugstammdatenkopie.

Der Rechnungswesenbearbeiter und die Kanzleileitung dürfen Fahrzeugänderungen erfassen. Der zugeordnete Lohnsachbearbeiter darf den für seine Abstimmung erforderlichen Bestand und Verlauf lesen, aber nicht frei verändern.

## Dokumente

Fahrzeugbelege gehören als geschützte FiBu-Lohn-Belege zur Themenkarte. Ordo-Campus-Anhänge enthalten nur zentrale Arbeitsanweisungen und werden nicht als Mandantenbelege verwendet.
