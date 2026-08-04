# Projektregeln

<!-- BEGIN:nextjs-agent-rules -->
## Next.js

Diese Next.js-Version kann neue oder geänderte Konventionen enthalten. Vor Änderungen sind die jeweils relevanten Hinweise unter `node_modules/next/dist/docs/` zu lesen. Hinweise auf veraltete Funktionen sind zu beachten.
<!-- END:nextjs-agent-rules -->

- Die Benutzeroberfläche ist vollständig deutsch.
- Datumsangaben verwenden das Format TT.MM.JJJJ.
- Die Zeitzone ist Europe/Berlin.
- Es werden ausschließlich künstliche Testdaten verwendet.
- Echte Mandanten-, Mitarbeiter- oder Personendaten sind verboten.
- Desktop-Nutzung hat Vorrang; die Grunddarstellung bleibt responsiv.
- Die Bedienung ist einfach, tabellarisch und erfordert möglichst wenige Klicks.
- Unnötige Animationen sind zu vermeiden.
- Kostenpflichtige Dienste sind ausgeschlossen.
- Eine Cloud-Veröffentlichung erfolgt nur nach ausdrücklicher Zustimmung.
- Es gibt keine DATEV-Anbindung und keine E-Mail-Funktion.
- Datei-Uploads sind ausschließlich für den lokalen Import strukturierter `.xlsx`-Dateien, für freigegebene Ordo-Campus-Anhänge an Standardaufgaben und für geschützte FiBu-Lohn-Belege an Abstimmungsthemen zulässig.
- Die Webapp enthält keine KI-Funktionen.
- Bestehende Funktionen werden nicht unnötig neu geschrieben.
- Fehler werden zuerst analysiert und anschließend minimal korrigiert.
- Nach Änderungen sind Linting, Typprüfung und vorhandene Tests auszuführen.
- Bearbeiter, Prüfer und Kanzleileitung dürfen personengleich zugeordnet sein, sofern der aktive Benutzer die jeweilige fachliche Rolle besitzt.
- Workflowaktionen bleiben auch bei personengleicher Besetzung getrennt und werden einzeln mit der ausgeübten Funktion protokolliert.
- Ein technisches Vier-Augen-Prinzip wird nicht erzwungen; eine reine Administratorrolle verleiht keine fachlichen Rechte.
- Ordo-Campus-Wissen wird ausschließlich an der Standardaufgabe gepflegt und nicht in Checklisten-Snapshots kopiert.
- Reguläre Benutzer sehen nur aktive Campus-Inhalte; Pflege erfordert die gesonderte Berechtigung `ORDO_CAMPUS_VERWALTEN`.
- Externe und DATEV-bezogene Wissensquellen werden nur als Linkmetadaten gespeichert; ihre Inhalte werden nicht lokal übernommen.
- Campus-Inhalte werden in Checklisten erst beim Öffnen geladen; Prüferhinweise bleiben serverseitig auf Prüfer und Kanzleileitung beschränkt.
- Die Campus-Leseansicht verwendet überall dieselbe Reihenfolge und hebt den verbindlichen Kanzleistandard in den zentralen Designfarben hervor.
- Campus-Anhänge liegen ausschließlich unter `storage/ordo-campus`, niemals unter `public`; erlaubt sind nur PDF, DOCX, XLSX, PNG und JPG/JPEG bis 15 MB.
- Ein vollständiges Backup umfasst SQLite-Datenbank und Campus-Anhangsspeicher gemeinsam. Nur die Datenbank zu sichern ist nicht ausreichend.
- Zentrale Campus-Anhänge enthalten keine echten Mandanten- oder Personendaten; DATEV-Inhalte werden grundsätzlich verlinkt und nicht kopiert.
- Rechnungswesen-Standardaufgaben verwenden konkrete Ausführungsmonate; monatliche, vierteljährliche, halbjährliche, jährliche und benutzerdefinierte Rhythmen werden serverseitig validiert.
- Rhythmusänderungen verändern keine bereits erzeugten Aufgaben-Snapshots. Fehlende passende Aufgaben werden nur über die ausdrückliche Übernahmefunktion ergänzt.
- Eine Begründung für „Nicht zutreffend“ bleibt historisch gespeichert und darf bei späteren Statuswechseln nicht automatisch gelöscht werden.
- In Hauptnavigation und Modulüberschriften heißen die Bereiche „Rechnungswesenaufgaben“ und „Jahresabschlussaufgaben“.
- Bearbeitungsstatus und Prüfstatus bleiben getrennt. Eine erledigte Bearbeitung startet fachlich immer als „Nicht geprüft“ und wird niemals automatisch auf „In Ordnung“ gesetzt.
- Offene Rückfragen, Beanstandungen und Nachbearbeitungen verhindern den Abschluss; die Abschlussfähigkeit wird zentral serverseitig geprüft.
- Nur ausdrücklich markierte Bearbeitungsnotizen werden in die nächste tatsächliche Ausführung übernommen. Bearbeitungs-, Prüf- und Nicht-zutreffend-Status werden nicht übernommen.
- Aufgabenformulare speichern asynchron aufgabenbezogen; ungespeicherte Änderungen, Speicherfortschritt und Fehler bleiben an der Aufgabe sichtbar.
- FiBu-Lohn-Abstimmungen werden nur für Mandanten mit bewusst aktiviertem Kanzleilohn und zugeordnetem aktiven Lohnsachbearbeiter erzeugt.
- Rechnungswesen- und Lohnstatus bleiben getrennt. Nach vollständiger Übergabe blockiert die weitere Lohnbearbeitung die Monatscheckliste nicht und öffnet sie nicht automatisch wieder.
- Lohnsachbearbeiter und Rechnungswesenrollen eines Mandanten werden personell getrennt zugeordnet. Eine Lohnrolle verleiht keine Rechte an Rechnungswesen- oder Jahresabschlusschecklisten.
- FiBu-Lohn-Themen werden konfigurierbar gepflegt und beim Erstellen einer Monatsabstimmung als unveränderliche Themen-Snapshots übernommen.
- FiBu-Lohn-Belege liegen ausschließlich unter `storage/fibu-lohn`, niemals unter `public`; erlaubt sind PDF, DOCX, XLSX, PNG und JPG/JPEG bis 15 MB.
- Ein vollständiges Backup umfasst SQLite-Datenbank, Campus-Anhangsspeicher und FiBu-Lohn-Belegspeicher gemeinsam.
- Die FiBu-Lohn-Oberfläche zeigt Rechnungswesenstatus und Lohnstatus stets getrennt und bietet keine Sammelaktion zum ungeprüften Abschluss aller Themen.
- Reine Lohnsachbearbeiter sehen keine Rechnungswesen- oder Jahresabschlussmodule; alle schreibenden FiBu-Lohn-Aktionen prüfen die Zuordnung serverseitig erneut.
- Lohnrückfragen sind Informationsvorgänge. Sie öffnen eine abgeschlossene Monatscheckliste nicht wieder und führen direkt zur betroffenen Themenkarte.
- Fahrzeugstammdaten werden dauerhaft am Mandanten gepflegt; Änderungen aus einer Abstimmung verknüpfen den Fahrzeugverlauf, ohne Daten doppelt zu erfassen.
- Die FiBu-Lohn-Abnahme verwendet ausschließlich `prisma/fibu-lohn-acceptance.db` und `tmp/fibu-lohn-acceptance-storage`; Reset- und Prüfbefehle müssen bei abweichenden Pfaden abbrechen.
- FiBu-Lohn-Tests und Abnahmen dürfen weder `prisma/dev.db` noch die regulären Ordner `storage/ordo-campus` und `storage/fibu-lohn` verändern.
- Ein Lohnabschluss ist bei offenen Rückfragen, unverarbeiteten Sachverhalten oder angekündigten, noch nicht abgeschlossenen Nachreichungen serverseitig gesperrt.
- Die Systemintegration verwendet ausschließlich `prisma/system-integration.db` und `tmp/system-integration-storage` mit getrennten Unterordnern für Campus und FiBu-Lohn.
- Der Systemintegrationsreset muss bei jedem abweichenden Datenbank- oder Speicherpfad abbrechen und darf niemals `prisma/dev.db` oder reguläre Speicherordner verändern.
- Die Migrationsbaseline von `prisma/dev.db` ist seit dem 31.07.2026 hergestellt; die Schema-Historien-Driftbereinigung ist seit dem 04.08.2026 mit Migration 16 abgeschlossen. `prisma migrate deploy` und `prisma migrate dev` dürfen gegen `prisma/dev.db` nur kontrolliert nach vollständiger gemeinsamer Sicherung, sauberem Git-Stand sowie erfolgreicher Status- und Driftprüfung verwendet werden; bei Reset-Aufforderung, unerwartetem Drift oder unerwarteter Migration ist sofort abzubrechen. `prisma migrate reset`, `prisma db push`, Seeds und Testresets gegen `prisma/dev.db` bleiben verboten.
- Unberechtigte Seitenaufrufe müssen serverseitig auf eine neutrale Zugriffsseite führen; technische Fehlerseiten und bloßes Ausblenden von Navigation sind unzulässig.
- Die Hauptnavigation bündelt laufendes Rechnungswesen, Jahresabschluss und Statusübersicht unter „Rechnungswesen“ sowie Abstimmungen, Lohnrückfragen und Fahrzeuge unter „FiBu ↔ Lohn“.
- Die Rechnungswesen-Statusübersicht muss Monatslücken chronologisch erkennen; spätere abgeschlossene Checklisten dürfen frühere Lücken nicht verdecken.
- Rückfragen aus Checklisten werden immer an die gespeicherte Prüfer-Benutzer-ID gerichtet, niemals an einen frei übermittelten Namen oder den aktuell angemeldeten Bearbeiter.
- FiBu-Lohn-Themen unterscheiden Benutzerentscheidungen von automatisch berechneten technischen Status. Sammelpositionen sind nur für fachlich freigegebene Themen zulässig.
- FiBu-Lohn-Positionsentwürfe dürfen vor der Übergabe gelöscht werden; übergebene Positionen und ihre Historie werden nur archiviert oder korrigiert.
- Zentrale fachliche und technische Kanzleifunktionen werden in der Hauptnavigation ausschließlich unter „Verwaltung“ gebündelt; die Reiter und Karten sind rollenabhängig und zusätzlich serverseitig geschützt.
- Ordo Campus bleibt ein eigenständiges Arbeits- und Wissensmodul. Persönliche Kontofunktionen gehören nicht in die Kanzleiverwaltung.
- Mandantenspezifische Aufgaben werden primär beim Mandanten angelegt und gepflegt; die zentrale Verwaltungsansicht dient ausschließlich Suche, Filterung, Qualitätskontrolle und Navigation in den Mandantenkontext.
- Eine reine Administratorrolle öffnet Benutzer-, Daten- und sichere Systemverwaltung, verleiht aber weiterhin keine fachlichen Standardaufgaben-, Campus-, Rechnungswesen- oder Lohnrechte.
- Normale Bearbeitungsfelder von Rechnungswesen- und Jahresabschlussaufgaben werden zentral gesammelt gespeichert; Überträge, Rückfragen, Prüfungen, Statusübergänge, Uploads und FiBu-Lohn-Aktionen bleiben getrennte Workflowaktionen.
- Sammelspeicherung liefert pro Aufgabe ein Ergebnis, erhält erfolgreiche Teiländerungen und lässt fehlerhafte lokale Eingaben sichtbar. `updatedAt` schützt vor stiller Überschreibung konkurrierender Änderungen.
- Ungespeicherte Checklistenänderungen müssen beim Verlassen warnen und fachliche Workflowaktionen bis zum Speichern oder Verwerfen blockieren.
- Der normale Zeilenklick in der Mandantenliste öffnet den Mandantenarbeitsbereich; ausdrücklich bezeichnete Fachaktionen dürfen weiterhin direkt zum konkreten Vorgang führen.
- Monats- und Jahresabschlusschecklisten verwenden einen regulär mitscrollenden ausführlichen Kopf, eine kompakte Sticky-Leiste und eine standardmäßig geschlossene Aufgabenübersicht. Navigation allein verändert keine Fachdaten.
- Mehrere Validierungsfehler der Sammelspeicherung werden in sichtbarer Aufgabenreihenfolge zyklisch angesteuert; behobene Fehler verschwinden aus der Fehlernavigation.
- Die linke Desktop-Hauptnavigation darf clientseitig auf eine zugängliche Iconleiste reduziert werden. Sichtbarkeit von Modulen und Aktionen folgt weiterhin ausschließlich den vorhandenen Rollen und serverseitigen Berechtigungen.
