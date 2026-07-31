# Verwaltungsstruktur

## Zweck

Der Hauptpunkt **Verwaltung** bündelt zentrale fachliche und technische Kanzleifunktionen. Er ersetzt die frühere Aufreihung einzelner Verwaltungsseiten in der Hauptnavigation, ohne Fachlogik, Daten, Historien oder direkte Einstiege zu verändern.

**Verwaltung** ist von persönlichen Funktionen abzugrenzen. Passwortänderung, persönliches Profil und künftige persönliche Präferenzen gehören zu **Mein Konto** beziehungsweise persönlichen Einstellungen und nicht in diesen Bereich.

## Reiter

### Fachliche Grundlagen

- Standardaufgaben mit allen vorhandenen Filtern, Ausführungsrhythmen, Campus-Merkmalen und Aktionen
- vorhandene Aufgabenbereiche und Kategorien
- FiBu-Lohn-Themen mit Status-, Campus-, Fahrzeug- und Sammelerfassungsfiltern
- mandantenübergreifende Such- und Qualitätsübersicht mandantenspezifischer Aufgaben
- direkter Einstieg in Ordo-Campus-Verknüpfungen

Mandantenspezifische Aufgaben werden nicht ohne Mandantenkontext angelegt. Die zentrale Übersicht verlinkt stets zurück zum Mandanten.

### Benutzer und Rechte

Die Benutzerübersicht trennt sichtbar:

- fachliche Rollen: Mitarbeiter, Prüfer, Kanzleileitung, Lohnsachbearbeiter
- technische Rolle: Administrator
- Zusatzberechtigungen: unter anderem Standardaufgaben, Ordo Campus, FiBu-Lohn-Themen und mandantenspezifische Aufgaben verwalten

Die technische Administratorrolle erzeugt keine fachlichen Rechte.

### Daten und Import

Der bestehende Standardaufgaben-Import bleibt unverändert mehrstufig:

1. Datei auswählen,
2. Vorschau und Validierung,
3. ausdrückliche Bestätigung,
4. Ergebnis und Importhistorie.

Ein Administrator ohne fachliche Standardaufgabenberechtigung sieht keine aktive Importaktion.

### System

Der Reiter zeigt nur sichere Eckdaten wie Anwendung, Betriebsmodus, lokalen Datenbanktyp, Uploadgrenze und den Umfang einer vollständigen Datensicherung. Im Entwicklungsmodus ist die Diagnose künstlicher Daten verlinkt.

Nicht dargestellt werden Passwörter, Hashes, Session-Tokens, Geheimnisse, Umgebungsvariablen oder vollständige lokale Dateipfade.

## Berechtigungsdarstellung

Der Hauptpunkt wird nur angezeigt, wenn mindestens ein Reiter zulässig ist. Reiter und Karten werden ebenfalls einzeln gefiltert. Beim Aufruf öffnet sich der erste erlaubte Reiter. Ein Benutzer ohne Verwaltungsrecht wird auf die neutrale Zugriffsseite geleitet.

| Berechtigung | Fachliche Grundlagen | Benutzer und Rechte | Daten und Import | System |
| --- | --- | --- | --- | --- |
| Standardaufgaben verwalten | ja | nein | ja | nein |
| Ordo Campus verwalten | ja | nein | nein | nein |
| FiBu-Lohn-Themen verwalten | ja | nein | nein | nein |
| Kanzleileitung | ja | nein | ja, soweit Standardaufgabenrecht greift | nein |
| Administrator ohne Fachrolle | nein | ja | nein | ja |
| Mitarbeiter/Prüfer ohne Zusatzrecht | nein | nein | nein | nein |
| reiner Lohnsachbearbeiter | nein | nein | nein | nein |

Die UI-Sichtbarkeit ist nur eine Bedienhilfe. Jede bestehende Fachseite, API-Route und Serveraktion prüft die Rechte erneut.

## Routen und Kompatibilität

Die vorhandenen direkten Routen bleiben erhalten:

- `/standardaufgaben`
- `/standardaufgaben/kategorien`
- `/standardaufgaben/import`
- `/fibu-lohn/themen`
- `/administration/benutzer`
- `/administration/diagnose`

Die zentrale Hülle liegt unter `/verwaltung`. Bestehende Links aus Checklisten, Campus-Ansichten, Mandanten und FiBu-Lohn-Abstimmungen bleiben direkte Einstiege. Breadcrumbs ordnen die Zielseite sichtbar in die neue Verwaltungsstruktur ein.

## Ordo Campus

Ordo Campus bleibt ein eigenes Hauptmodul. Dort wird Wissen gesucht und im Arbeitsfluss gelesen. Verwaltung bietet lediglich passende fachliche Einstiege; Wissenspflege und aufgabenbezogene Campus-Nutzung bleiben an der Standardaufgabe.

## Technische Einordnung

Die Umstellung verändert Navigation, Seitenstruktur und Darstellung. Es wurden keine Datenmodelle geändert und keine Migration angelegt. Historien, Snapshots und fachliche Berechtigungen bleiben unverändert.
