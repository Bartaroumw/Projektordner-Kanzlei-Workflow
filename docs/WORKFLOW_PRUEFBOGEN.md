# Manueller Workflow-Prüfbogen

## Regression Mandant 10000

1. Mandant 10000, Checkliste Februar 2026 als Peter Prüfer öffnen.
2. Prüfung beginnen und kontrollieren, dass jede Aufgabe zunächst `Nicht geprüft` ist.
3. Eine Aufgabe ausdrücklich `In Ordnung` setzen und eine andere beanstanden.
4. Kontrollieren, dass die Checkliste sofort in `Nachbearbeitung` wechselt und nicht abgeschlossen werden kann.
5. Als Anna Bearbeiter die Beanstandung über das Dashboard öffnen, beantworten und erneut übergeben.
6. Als Peter Prüfer die Aufgabe erneut ausdrücklich prüfen und erst danach abschließen.

Bei einer langen Checkliste zusätzlich weit nach unten scrollen, Bearbeitungsdaten ändern und aufgabenbezogen speichern. Scrollposition, Fokus und die sichtbare Speicherrückmeldung müssen erhalten bleiben.

Testdatum: __________  Prüfer: __________  Build/Commit: __________

| Nr. | Benutzerrolle | Mandant | Zeitraum | Ausgangsstatus | Aktion | Erwartetes Ergebnis | Tatsächliches Ergebnis | Bestanden | Abweichung / Fehlerklasse / Bemerkung |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Anna / Bearbeiter | 90001 | Vormonat | Offen | Bearbeiten und übergeben | Nur Bearbeitung, danach bei Peter nur Prüfung | | ☐ | |
| 2 | Peter / Prüfer | 90004 | Vormonat | In Prüfung | Beanstandung und Rückgabe | Bei Peter nicht mehr aktiv, bei Anna Nachbearbeitung | | ☐ | |
| 3 | Anna/Peter | 90004 | Vormonat | Nachbearbeitung | Antworten und erneut übergeben | Erneut nur in Peters Prüfung | | ☐ | |
| 4 | Maria / Mehrfachrolle | 90006 | Vormonat | In Bearbeitung | Übergeben, dann prüfen | Zu jedem Zeitpunkt nur ein aktiver Funktionsbereich | | ☐ | |
| 5 | Maria / alle Funktionen | 90007 | Vormonat | Zur Prüfung | Getrennte Schritte ausführen | Keine Statusüberspringung, getrennte Verläufe | | ☐ | |
| 6 | Anna/Peter | 90005 | Vorvormonat | Rückfrage | Verantwortlichkeit prüfen | Als Altmonat bei der handelnden Person sichtbar | | ☐ | |
| 7 | Anna/Peter/Klaus | 90010/11/08 | Vorjahr | Jahresabschluss | Bearbeiten, prüfen, freigeben | Getrennte Jahresabschlussbereiche | | ☐ | |
| 8 | alle | – | Vormonat | Dashboardstart | Dashboard öffnen/Monat wechseln | Vormonat Standard; Januar → Dezember Vorjahr | | ☐ | |
| 9 | Anna | 90005 | Vorvormonat | Offen/Nachbearbeitung | Altmonate öffnen | Vorgang bleibt trotz Monatsfilter sichtbar | | ☐ | |
| 10 | Campus-Verantwortlich | 90008 | Quartalsmonat | Campus aktiv | Wissen/Anhang prüfen | Campus getrennt gespeichert und erreichbar | | ☐ | |

## Technische Gegenprüfung

- [ ] `npm.cmd run testdata:workflow`
- [ ] Prisma-Schema validiert
- [ ] ESLint erfolgreich
- [ ] TypeScript-Prüfung erfolgreich
- [ ] alle automatisierten Tests erfolgreich
- [ ] Produktions-Build erfolgreich
- [ ] Browserbreiten 1.280 px, 1.024 px und 600 px geprüft
- [ ] Browserkonsole ohne Fehler
- [ ] Serverprotokoll ohne unerklärte Fehler
