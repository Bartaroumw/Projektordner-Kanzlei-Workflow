# Aufgabenübertrag mit Prüferfreigabe

Stand: 18.08.2026

## Vorschlag durch den Bearbeiter

Der zugeordnete Bearbeiter kann in einer offenen, laufenden oder nachzubearbeitenden Monatscheckliste **Übertragung vorschlagen**. Pflicht sind der direkte Folgemonat, eine Begründung und die erwartete weitere Handlung beziehungsweise Unterlage; ein zusätzlicher Hinweis ist optional.

Der Dienst speichert den Status **Übertragung vorgeschlagen**, Vorschlagenden, Zeitpunkt und alle Angaben im Aufgaben- und Workflowverlauf. Er erzeugt ausdrücklich keine Zielaufgabe. Die Aufgabe wartet auf die Entscheidung und kann bis dahin nicht als normal erledigt gespeichert werden.

## Entscheidung durch den Prüfer

Nur der zugeordnete Prüfer entscheidet:

- **Übertragung genehmigen** markiert die Ursprungsaufgabe als geprüft übertragen. Existiert die direkte Folgeperiode bereits, entsteht dort genau eine verknüpfte Zielaufgabe. Andernfalls wird sie erst beim kontrollierten Anlegen dieser Folgeperiode erzeugt. Die Herkunft lautet `Übertrag aus <Periode>`.
- **Übertragung ablehnen und zur Nachbearbeitung** verlangt eine Begründung, erzeugt keine Zielaufgabe, setzt die Aufgabe auf **In Bearbeitung** und die Checkliste auf **Nachbearbeitung**. Die Begründung wird als offener Prüfpunkt an den Bearbeiter gerichtet.

Genehmigung und Ablehnung starten bei Bedarf mit derselben fachlichen Aktion automatisch die Prüfung. Optimistische Sperren und die Quellreferenz verhindern parallele Entscheidungen und doppelte Zielaufgaben.

## Historie und Grenzen

Ursprung und Ziel bleiben über `sourceTaskId` verknüpft. Vorschlag und Entscheidung dokumentieren Bearbeiter, Prüfer, Zeitpunkte, Zielperiode und Gründe. Bereits erzeugte Checklisten-Snapshots anderer Aufgaben werden nicht verändert. Ein direkter endgültiger Transfer durch den Bearbeiter ist serverseitig nicht mehr möglich.
