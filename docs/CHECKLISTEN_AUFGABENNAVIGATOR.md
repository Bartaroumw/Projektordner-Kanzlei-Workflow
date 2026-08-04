# Checklisten-Aufgabennavigator

## Kompakte Leiste

Monats- und Jahresabschlusschecklisten besitzen nach dem ausführlichen Kopf eine kompakte, oben haftende Leiste. Sie zeigt Zeitraum, lokal berechneten Fortschritt, offene, fehlerhafte und ungespeicherte Aufgaben. Speichern, nächste offene Aufgabe und zusätzliche Details bleiben unmittelbar erreichbar. Die vorhandene Sammelspeicherung, Teil-Erfolge, Konflikterkennung und Workflowblockaden bleiben unverändert.

## Fehlernavigation

Fehler werden in der Reihenfolge der vollständigen Checkliste ermittelt. **Zur nächsten fehlerhaften Aufgabe** zeigt „Fehler x von y“ und läuft zyklisch durch die verbleibenden Fehler. Der Sprung scrollt zentriert, öffnet Detailbereiche, setzt nach Möglichkeit den Feldfokus und hebt die Karte kurz über Rahmen und Schatten hervor. Erfolgreich gespeicherte oder durch Bearbeitung entfernte Fehler verschwinden unmittelbar aus der Navigation.

## Aufgabenübersicht

Die rechte Schaltfläche öffnet ein überlagerndes Panel; es wird keine dauerhafte rechte Spalte reserviert. Das Panel enthält Suche und die Filter Alle, Offen, In Bearbeitung, Erledigt, Nicht zutreffend, Übertragen, Ungespeichert, Fehlerhaft, Rückfrage und Beanstandet/Nachbearbeitung. Aufgaben sind nach Bereich gruppiert. Bereichsüberschriften zeigen erledigt/gesamt und Fehlerzahl ohne ausschließlich farbliche Codierung.

Ein Klick springt zur Aufgabe und verändert keine Daten. Eine `IntersectionObserver`-Beobachtung mit kleinem Sichtbereich markiert die aktuell bearbeitete beziehungsweise sichtbare Aufgabe, ohne eine aufwendige Scrollverwaltung einzuführen.

## Responsive und Barrierefreiheit

Das Panel verwendet auf kleinen Bildschirmen die volle verfügbare Breite und überlagert die Checkliste nur während der Nutzung. Schaltflächen besitzen zugängliche Namen, Statusmeldungen verwenden `aria-live`, der aktuelle Navigator-Eintrag `aria-current`, und die bestehende Fokusgestaltung bleibt erhalten.
