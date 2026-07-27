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
- Datei-Uploads sind ausschließlich für den lokalen Import strukturierter `.xlsx`-Dateien und für freigegebene Ordo-Campus-Anhänge an Standardaufgaben zulässig.
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
