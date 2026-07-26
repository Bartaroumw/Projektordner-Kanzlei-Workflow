# Kanzlei Workflow

## Projektziel

Kanzlei Workflow ist eine kleine, eigenständige Webapp als kurzfristiger Ersatz für eine Excel-Checkliste in einer deutschen Steuerberatungsgesellschaft. Die aktuelle Ausbaustufe verwaltet Mandantenstammdaten und kalenderjahrbezogene Mandantenprofile.

## Technischer Aufbau

- Next.js 16 mit App Router und React 19
- TypeScript und Tailwind CSS
- SQLite als ausschließlich lokale Datenbank
- Prisma 6.19.3 als Datenbankzugriff
- Vitest für automatisierte Tests
- npm als Paketverwaltung
- keine Cloud-Dienste oder externen Datendienste

## Installation

```powershell
npm.cmd install
npm.cmd run db:generate
```

## Start

```powershell
npm.cmd run dev
```

Danach ist die Anwendung unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Datenbank und Prisma

Die lokale SQLite-Datenbank liegt unter `prisma/dev.db`. Sie wird nicht in Git aufgenommen. Die Verbindungsangabe steht lokal in `.env`; `.env.example` enthält nur eine geheimnisfreie Vorlage.

Wichtige Befehle:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

Das Datenmodell steht in `prisma/schema.prisma`. Nachvollziehbare SQL-Migrationen liegen in `prisma/migrations`. Die erste Migration erzeugt Mandanten und Jahresprofile einschließlich der Eindeutigkeitsregeln.

## Künstliche Testdaten

Die mitgelieferten Daten sind ausdrücklich vollständig künstlich:

- 10001 – Musterpraxis Beispiel, Jahresprofil 2026
- 10002 – Beispiel Verwaltungs GmbH, Jahresprofil 2026
- 10003 – Mustermann Besitz GbR, Jahresprofil 2026

Echte Mandanten-, Mitarbeiter- oder andere personenbezogene Daten dürfen weder in der Entwicklung noch im lokalen Testbetrieb verwendet werden.

## Künstliche Testdaten vollständig zurücksetzen

Zuerst den laufenden Entwicklungsserver mit `Strg+C` beenden. Danach:

```powershell
npm.cmd run db:reset
```

Der Befehl entfernt ausschließlich `prisma/dev.db`, legt die lokale Struktur aus der Migration neu an und erzeugt die drei künstlichen Beispieldatensätze erneut. Eigene lokale Testeingaben gehen dabei verloren.

## Prüfungen

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Produktionsmodus nach erfolgreichem Build:

```powershell
npm.cmd run start
```

## Aktueller Funktionsumfang

- deutschsprachige, responsive Grundoberfläche
- Mandantenübersicht mit Suche nach Nummer oder Name
- Filter nach Status, Bearbeiter, Prüfer und Team
- Mandanten anlegen, bearbeiten und inaktiv setzen
- Schutz vor doppelten Mandantennummern
- Mandantendetailseite mit historisch sortierten Jahresprofilen
- Jahresprofile anlegen, aus dem letzten Profil vorschlagen und bearbeiten
- nur ein Jahresprofil je Mandant und Kalenderjahr
- automatische Bilanzierung bei Kapitalgesellschaften
- verständliche Validierungs- und Erfolgsmeldungen
- lokale, dauerhafte Speicherung in SQLite

## Bekannte Einschränkungen

- Es gibt noch keine Benutzeranmeldung oder Rechteverwaltung.
- Bearbeiter, Prüfer und Teams sind einfache Textfelder.
- Mandanten können aus Gründen des Historienerhalts nicht über die Oberfläche gelöscht, sondern nur inaktiv gesetzt werden.
- Checklisten, Standardaufgaben, Excel-Importe, Datei-Uploads und echte Dashboard-Auswertungen sind noch nicht implementiert.
- Das Kalenderjahr entspricht immer dem Wirtschaftsjahr; abweichende Wirtschaftsjahre werden nicht unterstützt.
- Die lokale Datenbank ist nur für einen einzelnen lokalen Testbetrieb vorgesehen.

## Bekannte Sicherheitshinweise

`npm audit --omit=dev` meldet weiterhin drei hoch eingestufte Hinweise in indirekten Abhängigkeiten von Next.js 16.2.12:

| Betroffenes Paket | Schweregrad | Abhängigkeit | Betroffener Betrieb | Kompatible Korrektur |
| --- | --- | --- | --- | --- |
| PostCSS – Dateizugriff über manipulierte `sourceMappingURL` | hoch | indirekt über Next.js | vor allem Entwicklungs- und Buildbetrieb bei Verarbeitung fremder CSS-Dateien | Next.js weist derzeit keine kompatible stabile Aktualisierung aus; keine fremden CSS-Dateien verarbeiten und auf ein korrigiertes stabiles Next.js-Update warten |
| PostCSS – Pfadüberschreitung über vorherige Source Maps | hoch | indirekt über Next.js | vor allem Entwicklungs- und Buildbetrieb bei Verarbeitung fremder CSS-Dateien | wie vorstehend; `npm audit fix --force` würde eine inkompatible alte Next.js-Version installieren und ist verboten |
| Sharp/libvips – mehrere Bildverarbeitungsfehler | hoch | indirekt/optional über Next.js | möglicher Produktionsbetrieb bei Verarbeitung nicht vertrauenswürdiger Bilder | Next.js 16.2.12 erlaubt noch keine korrigierte Sharp-Hauptversion; keine Bild-Uploads oder fremde Bilder verarbeiten und stabiles Next.js-Update abwarten |

Die Anwendung verarbeitet in dieser Ausbaustufe weder Datei-Uploads noch fremde CSS- oder Bilddateien. Daher entsteht im ausschließlich lokalen Testbetrieb kein unmittelbares erhebliches Risiko. Prisma wurde kompatibel von 6.19.1 auf 6.19.3 aktualisiert; dadurch wurde der zwischenzeitlich gemeldete Prisma-Entwicklungshinweis behoben.
