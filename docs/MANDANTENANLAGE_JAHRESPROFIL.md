# Mandantenanlage mit Jahresprofil

Stand: 18.08.2026

## Bedienung

Bei einem neuen Mandanten ist **Jahresprofil direkt anlegen** standardmäßig aktiviert. Vorgeschlagen wird das aktuelle Kalenderjahr. Der abgegrenzte Abschnitt verwendet unmittelbar die vorhandenen Jahresprofilfelder und -regeln für Jahr, Rechtsformgruppe, Gewinnermittlungsart und die bestehenden Profilmerkmale.

Die personellen Zuständigkeiten für Bearbeitung, Prüfung und Kanzleileitung werden wie bisher am Mandanten gepflegt und später als Snapshots in Jahresabschlusschecklisten übernommen. Das Jahresprofilmodell selbst enthält keine parallelen Rollenfelder.

## Atomare Speicherung

Mandant, Mandantenverlauf, gegebenenfalls Lohnzuständigkeitsverlauf und Jahresprofil werden in einer Prisma-Transaktion gespeichert. Scheitert die Profilvalidierung oder besteht für Mandant und Jahr ein Eindeutigkeitskonflikt, wird kein halbfertiger Mandant angelegt.

Wird die Option bewusst deaktiviert, entsteht nur der Mandant. Auf dessen Arbeitsbereich erscheint für das aktuelle Jahr die Qualitätsmeldung **Für das aktuelle Jahr ist noch kein Jahresprofil vorhanden** mit der direkten Aktion **Jahresprofil anlegen**.

## Abgrenzung zur Lohnbetreuung

Das Jahresprofilmerkmal **Lohn im Jahresprofil** beschreibt nur dieses Kalenderjahr. Für Rechnungswesen–Lohn-Abstimmungen gilt ausschließlich die Mandantenoption **Lohnabrechnung durch Kanzlei** mit Lohnsachbearbeiter und optionalem Beginndatum.
