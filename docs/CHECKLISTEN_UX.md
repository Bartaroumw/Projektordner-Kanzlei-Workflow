# Bedienung der Checklisten

Die Aufgabenkarte trennt Bearbeitung, Zusatzaktionen und Prüfung klar:

- Die Begründung für **Nicht zutreffend** erscheint nur bei diesem Status. Eine frühere Begründung bleibt gespeichert.
- **Bearbeitungsnotiz in Folgeperiode übernehmen** übernimmt ausschließlich die Notiz. Ein zugänglicher Infohinweis erklärt die Wirkung.
- **Aufgabe übertragen** ist standardmäßig geschlossen. Felder werden erst nach dem Öffnen angezeigt.
- **Rückfrage an Prüfer** verwendet die gespeicherte Prüferzuordnung der Checkliste. Fehlt sie, bleibt die Aktion gesperrt.
- Primäre grüne Schaltflächen führen eine fachliche Speicherung oder Bestätigung aus; neutrale Schaltflächen brechen ab, verwerfen oder navigieren.
- Nach jeder erfolgreichen Speicherung wird die neue gespeicherte Formfassung zur Basis von **Änderungen verwerfen**.

Die kompakte Checklisten-Zusammenfassung bleibt beim Scrollen sichtbar. Auf schmalen Ansichten bleibt sie im normalen Lesefluss nutzbar.
# Zentrale Sammelspeicherung

Die Aufgabenkarte besitzt keinen großen Einzel-Speicherbutton mehr. Tatsächliche Änderungen werden lokal mit **Ungespeicherte Änderungen** gekennzeichnet und können aufgabenbezogen verworfen werden. Die Sticky-Leiste speichert oder verwirft alle geänderten Aufgaben.

Nach erfolgreichem Speichern ist der bestätigte Serverstand der neue Ausgangszustand. Teilfehler führen direkt zur betroffenen Aufgabe, während bereits gespeicherte Aufgaben nicht erneut als geändert erscheinen. Workflowaktionen bleiben separate bestätigte Vorgänge und werden bei offenen Eingaben blockiert.

Die Leiste ist umbruchfähig, per Tastatur erreichbar und unterstützt `Strg + S` beziehungsweise `Cmd + S`. Statusmeldungen werden über `aria-live` ausgegeben.
