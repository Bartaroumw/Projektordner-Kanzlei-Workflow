# Bedienung der Checklisten

Die Aufgabenkarte trennt Bearbeitung, Zusatzaktionen und Prüfung klar:

- Die Begründung für **Nicht zutreffend** erscheint nur bei diesem Status. Eine frühere Begründung bleibt gespeichert.
- **Bearbeitungsnotiz in Folgeperiode übernehmen** übernimmt ausschließlich die Notiz. Ein zugänglicher Infohinweis erklärt die Wirkung.
- **Übertragung vorschlagen** ist standardmäßig geschlossen. Zielperiode, Begründung und erwartete Handlung werden erst nach dem Öffnen angezeigt; eine Zielaufgabe entsteht erst nach Prüfergenehmigung.
- **Rückfrage an Prüfer** verwendet die gespeicherte Prüferzuordnung der Checkliste. Fehlt sie, bleibt die Aktion gesperrt.
- Primäre grüne Schaltflächen führen eine fachliche Speicherung oder Bestätigung aus; neutrale Schaltflächen brechen ab, verwerfen oder navigieren.
- Nach jeder erfolgreichen Speicherung wird die neue gespeicherte Formfassung zur Basis von **Änderungen verwerfen**.

Der ausführliche Seitenkopf mit Mandant, Zeitraum, Zuständigkeiten, Status, Fortschritt und Hauptaktionen scrollt regulär aus dem sichtbaren Bereich. Danach bleibt nur die kompakte Checklistenleiste mit Zeitraum, lokalem Fortschritt, offenen, fehlerhaften und ungespeicherten Aufgaben sichtbar. **Mehr** öffnet zusätzliche Statuswerte, ohne die Leiste dauerhaft zu vergrößern. Auf schmalen Ansichten darf die Leiste zweizeilig umbrechen.
# Zentrale Sammelspeicherung

Die Aufgabenkarte besitzt keinen großen Einzel-Speicherbutton mehr. Tatsächliche Änderungen werden lokal mit **Ungespeicherte Änderungen** gekennzeichnet und können aufgabenbezogen verworfen werden. Die Sticky-Leiste speichert oder verwirft alle geänderten Aufgaben.

Nach erfolgreichem Speichern ist der bestätigte Serverstand der neue Ausgangszustand. Teilfehler bleiben an der Aufgabe erhalten. **Zur nächsten fehlerhaften Aufgabe** zeigt die Position „Fehler x von y“ und führt zyklisch in sichtbarer Checklistenreihenfolge durch alle Fehler. Der Sprung öffnet vorhandene Detailbereiche, fokussiert soweit möglich das fehlerhafte Feld und hebt die Aufgabe kurz sichtbar hervor. Behobene oder erfolgreich gespeicherte Fehler werden aus der Liste entfernt. Workflowaktionen bleiben separate bestätigte Vorgänge und werden bei offenen Eingaben blockiert.

Die Leiste ist umbruchfähig, per Tastatur erreichbar und unterstützt `Strg + S` beziehungsweise `Cmd + S`. Statusmeldungen werden über `aria-live` ausgegeben.

## Automatische Arbeits- und Prüfungsstarts

Die regulären Startbuttons sind entfallen. Reines Öffnen oder Lesen lässt eine offene Checkliste unverändert. Erst eine erfolgreich gespeicherte Bearbeitung setzt sie auf **In Bearbeitung**; erst eine erfolgreich gespeicherte Prüfentscheidung setzt **Zur Prüfung** auf **In Prüfung**. Beide Übergänge erhalten einen eigenen Verlaufseintrag und werden auch bei weiteren Speicherungen nicht doppelt erzeugt.

Prüfer treffen mehrere Entscheidungen lokal und speichern sie über die Sticky-Prüfleiste gemeinsam. Beanstandung und Rückfrage benötigen eine Prüfnotiz. Gültige Entscheidungen werden gespeichert, auch wenn eine andere Entscheidung fehlerhaft ist. Die Fehlernavigation führt zyklisch durch die verbliebenen Einträge.

# Aufgabenübersicht

Die standardmäßig geschlossene **Aufgabenübersicht** liegt als schmales Bedienelement am rechten Rand. Das überlagernde Panel enthält Suche, Statusfilter, Aufgabenbereiche, Bearbeitungs- und Prüfstatus sowie Kennzeichnungen für ungespeicherte Eingaben, Fehler, Rückfragen, Überträge und Campus-Verfügbarkeit. Pro Bereich werden erledigte Aufgaben, Gesamtzahl und Fehlerzahl textlich ausgegeben. Ein Aufgabenklick verändert keine Daten und schließt das Panel nach dem Sprung.

Unterstützte Filter: Alle, Offen, In Bearbeitung, Erledigt, Nicht zutreffend, Übertragung vorgeschlagen, Übertragen, Ungespeichert, Fehlerhaft, Rückfrage und Beanstandet/Nachbearbeitung.
