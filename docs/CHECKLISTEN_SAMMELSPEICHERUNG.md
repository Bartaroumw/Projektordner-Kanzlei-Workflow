# Zentrale Sammelspeicherung

## Umfang

Rechnungswesen- und Jahresabschlussaufgaben speichern normale Bearbeitungsfelder gemeinsam:

- Bearbeitungsstatus
- Bearbeitungsnotiz
- Begründung für „Nicht zutreffend“
- bei Rechnungswesenaufgaben das Übernahmeflag für die nächste tatsächliche Ausführung

Normale Prüfentscheidungen werden in einer eigenen Sticky-Prüfleiste ebenfalls gesammelt. Fachliche Workflowaktionen bleiben getrennte Vorgänge. Dazu gehören insbesondere Übertragungsvorschlag und -entscheidung, Rückfrage, Nachbearbeitung, endgültiger Prüfabschluss, Übergabe, Abschluss, Wiederöffnung, Uploads und Fahrzeugstammdatenaktionen.

## Lokaler Zustand

Jede sichtbare Aufgabe hält den zuletzt erfolgreich gespeicherten Ausgangszustand und den aktuellen Bearbeitungsstand. Nur eine tatsächliche Abweichung markiert die Aufgabe als ungespeichert. Nach einem erfolgreichen Teil- oder Gesamtspeichern wird die Serverantwort zum neuen Ausgangszustand.

Die Sticky-Leiste zählt Aufgaben, nicht Felder. Sie bietet **Alle Änderungen speichern**, **Alle verwerfen** und nach Fehlern **Zur fehlerhaften Aufgabe**. Pro Aufgabe bleibt **Änderungen dieser Aufgabe verwerfen** verfügbar.

## Teilweise erfolgreiche Speicherung

Die Serveraktion verarbeitet Aufgaben für SQLite kontrolliert sequenziell. Jede Aufgabe liefert ein eigenes Ergebnis. Gültige Aufgaben werden gespeichert, auch wenn eine andere Aufgabe fehlschlägt. Fehlgeschlagene Eingaben und ihre Fehlermeldung bleiben lokal erhalten.

Jede Aufgabe und ihre vorhandenen fachlichen Verlaufseinträge werden weiterhin über die etablierten Fachdienste gespeichert. Es entsteht kein undifferenzierter Sammeleintrag als Ersatz für die Aufgabenhistorie.

## Validierung und Berechtigung

Client und Server verlangen eine Begründung für **Nicht zutreffend**. Das Übernahmeflag erfordert eine nicht leere Bearbeitungsnotiz. Der Server prüft Anmeldung, Checklistenrolle, Checklistenstatus, Aufgabenstatus und die Zugehörigkeit jeder Aufgaben-ID zur übergebenen Checkliste erneut.

## Konflikterkennung

Der beim Laden bekannte `updatedAt`-Zeitpunkt wird mitgesendet. Hat sich die Aufgabe inzwischen geändert, wird sie nicht überschrieben. Andere Aufgaben derselben Sammelanfrage können dennoch erfolgreich gespeichert werden. Die lokale Eingabe bleibt sichtbar.

Eine komfortable Zusammenführung zweier konkurrierender Textfassungen ist noch nicht implementiert; der aktuelle Stand muss bewusst neu geladen und mit der erhaltenen Eingabe verglichen werden.

## Arbeitskontext

Die Speicherung verwendet eine Serveraktion ohne Seitennavigation. Scrollposition, geöffnete Bereiche und Filter bleiben erhalten; nur erfolgreiche Serverdaten werden anschließend aktualisiert. Interne Navigation zeigt bei offenen Änderungen einen eigenen Dialog. Browser-Neuladen, Zurück-Navigation und Tab-Schließen werden zusätzlich über die native Browserwarnung geschützt.

Workflowformulare mit offenen normalen Änderungen werden blockiert, bis die Eingaben gespeichert oder verworfen wurden.

## Tastatur und responsive Darstellung

`Strg + S` beziehungsweise `Cmd + S` löst die Sammelspeicherung aus, wenn Änderungen vorhanden sind. Statusmeldungen verwenden `aria-live`. Die Sticky-Leiste ist umbruchfähig und bleibt bei schmalen Ansichten bedienbar.

## Rechnungswesen–Lohn

Themenentscheidung, strukturierte Angaben, Notizen, Nachreichungsdaten sowie neue und bestehende Einzel- oder fachlich zulässige Sammelpositionen werden über eine eigene Sticky-Leiste gesammelt. Thema und Position sind getrennte Teilresultate. Upload, Archivierung, Rückfragen, Fahrzeuge, Gesamtübergabe und Lohnabschluss bleiben separate Aktionen.

## Migration

Das vorhandene `updatedAt` reicht für die optimistische Konflikterkennung aus. Migration `20260818120000_workflow_simplification` ergänzt ausschließlich den kontrollierten Übertragungsvorschlag und technische Felder zur Lohn-Erstansicht; die Sammelspeicherung selbst benötigt keine weiteren Tabellen.
