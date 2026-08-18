# Lohnbetreuung am Mandanten

Stand: 18.08.2026

## Führende Steuerung

Die Rechnungswesen–Lohn-Abstimmung wird ausschließlich aus dem Mandantenstamm gesteuert:

1. Mandant ist aktiv.
2. **Lohnabrechnung durch Kanzlei** ist aktiviert.
3. Ein aktiver Benutzer mit der Rolle `LOHNSACHBEARBEITER` ist zugeordnet.
4. Das optionale Beginndatum ist leer oder für Jahr und Monat erreicht.
5. Eine passende Rechnungswesenperiode besteht.
6. Für diese Periode besteht noch keine Abstimmung.

Das Jahresprofilfeld `hasPayroll` gehört ausschließlich zum Jahresprofil und kann die Erzeugung weder auslösen noch verhindern.

## Beginn, Deaktivierung und Reaktivierung

Ein leeres Beginndatum gilt für alle künftig neu angelegten relevanten Perioden. Ein gesetztes Datum wirkt ab dessen Kalendermonat; frühere Perioden bleiben unverändert und lösen keinen Fehler aus.

Das frühere Endefeld bleibt technisch als Legacy-Feld bestehen, ist aber aus Anlage und normaler Pflege entfernt. Beim Wechsel auf **Nein** wird intern ein Zeitpunkt festgehalten und der Zuständigkeitsverlauf protokolliert. Historische und offene Abstimmungen werden weder gelöscht noch automatisch abgeschlossen. Bei Reaktivierung ist erneut ein aktiver Lohnsachbearbeiter erforderlich; das interne Ende wird aufgehoben. Vergangene Perioden werden nicht rückwirkend ergänzt.

## Qualitätsmeldungen

Bei aktivierter Kanzleilohnbetreuung ohne gültige Lohnzuordnung zeigt der Mandantenarbeitsbereich: **Für die Rechnungswesen–Lohn-Abstimmung muss ein aktiver Lohnsachbearbeiter hinterlegt werden.** Ein fehlendes Jahresprofil blockiert die Abstimmung nicht.
