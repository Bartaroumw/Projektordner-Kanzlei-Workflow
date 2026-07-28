# FiBu-Lohn-Abstimmung – Fachkonzept Teil 1

## Zweck und Abgrenzung

Die FiBu-Lohn-Abstimmung ist ein monatlicher QM-, Informations- und Übergabeprozess vom Rechnungswesen an die Lohnabteilung. Sie dokumentiert, welche lohnrelevanten Sachverhalte und Unterlagen vollständig bereitgestellt wurden.

Sie ist keine Lohnabrechnungssoftware, keine Lohnprüfung, keine Freigabeorganisation und keine allgemeine Dokumenten-Cloud. Die Lohnabrechnung verbleibt in den bestehenden Lohnprogrammen.

## Entstehung

Die Standardaufgabe `Monatliche FiBu-Lohn-Abstimmung` gehört zu den Rechnungswesenaufgaben. Sie wird nur aufgenommen, wenn am Mandanten `Lohnabrechnung durch Kanzlei` aktiviert und ein aktiver Lohnsachbearbeiter zugeordnet ist.

Beim Anlegen der Monatscheckliste entstehen in derselben Datenbanktransaktion:

1. die Monatscheckliste,
2. die verknüpfte Checklistenaufgabe,
3. genau eine FiBu-Lohn-Abstimmung,
4. je aktivem Katalogthema eine unveränderliche Themenkarte.

Rechnungswesenmonat und Lohnabrechnungsmonat werden getrennt gespeichert. Standardmäßig wird der Folgemonat vorgeschlagen. Vor der verbindlichen Übergabe kann ein berechtigter Rechnungswesenbearbeiter den Zielmonat korrigieren.

## Fachliche Entscheidungen

Jede Themenkarte besitzt einen der Status:

- `Noch nicht geprüft`
- `Kein Sachverhalt`
- `Übergabe in Vorbereitung`
- `Vollständig an Lohn übergeben`

Die Gesamtübergabe ist nur zulässig, wenn jedes Thema `Kein Sachverhalt` oder `Vollständig an Lohn übergeben` ist. Für einen vorhandenen Sachverhalt prüft der Server die konfigurierten Pflichtangaben und Belegarten. Eine dokumentierte Nachreichung ist nur möglich, wenn das Thema sie ausdrücklich erlaubt.

## Getrennte Gesamtstatus

Rechnungswesen:

`Offen → In Bearbeitung → Übergabebereit → Vollständig übergeben`

Lohn:

`Neu → Gesehen → Rückfrage offen → Erledigt`

`Storniert` ist als optionaler technischer Status vorbereitet.

Mit `Vollständig übergeben` gilt die Informationspflicht des Rechnungswesens als erfüllt und die verknüpfte Checklistenaufgabe wird erledigt. Die weitere Verarbeitung durch Lohn verändert weder Checklistenstatus noch Prüfstatus und öffnet eine abgeschlossene Checkliste nicht wieder.

## Rückfragen

Der zugeordnete Lohnsachbearbeiter kann eine Rückfrage an einer Themenkarte erfassen. Empfänger ist der ursprüngliche Rechnungswesenbearbeiter aus dem Abstimmungs-Snapshot. Die Antwort bleibt an Frage, Thema und Abstimmung gebunden. Nach Antwort liegt die aktive Verantwortung wieder bei Lohn.

Eine Rückfrage verändert keine fachliche Prüferentscheidung. Eine tatsächliche Korrektur der Monatscheckliste erfordert weiterhin die vorhandene bewusste Wiederöffnungsfunktion.

## Historie

Erstellung, Themenentscheidungen, Übergabe, Belege, Lohnstatus, Rückfragen und Fahrzeugänderungen erzeugen verständliche Verlaufseinträge mit Benutzer, Namenssnapshot, Fachbereich, Zeitpunkt und Bezug. Der Verlauf unterstützt fachliche Nachvollziehbarkeit, behauptet aber keine Revisionssicherheit.

## Grenzen von Teil 1

Noch nicht enthalten sind ein finales Lohn-Dashboard, vollständige Detailoberflächen, Exporte, Benachrichtigungen, Lohnfristen, automatische Kontenerkennung, OCR, DATEV-Schnittstellen oder ein allgemeiner Dokumentendienst.
