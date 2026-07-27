# PostgreSQL- und Migrationsstrategie

## Entscheidung

SQLite bleibt für lokalen Einzelplatz-Test und fachliche Abnahme geeignet. Vor einem breiten internen Mehrbenutzerbetrieb mit 20–40 Personen wird PostgreSQL empfohlen.

## Kritischer Ausgangsbefund

Am 27.07.2026:

- Prisma-Schema ist gültig.
- 13 SQL-Migrationen liegen vor.
- Tests können alle Migrationen auf einer frischen SQLite-Datenbank anwenden.
- `prisma migrate status` meldet in der aktiven `prisma/dev.db` jedoch alle Migrationen als nicht angewendet.

Die aktive Datenbank besitzt damit keine belastbare `_prisma_migrations`-Baseline. Kein Reset und kein blindes `migrate deploy`.

## Phase 1 – SQLite-Baseline

1. vollständiges Backup von Datenbank und Campus-Dateien,
2. Schema und fachliche Zählwerte der bestehenden Datenbank dokumentieren,
3. frische Referenzdatenbank aus allen Migrationen erzeugen,
4. Schema strukturell vergleichen,
5. Abweichungen als neue additive Korrekturmigration behandeln,
6. vorhandene Migrationen mit `prisma migrate resolve --applied` nur nach dokumentiertem Nachweis baselinen,
7. Upgradeprobe auf einer Kopie durchführen,
8. Diagnose und vollständige Tests ausführen.

## Phase 2 – PostgreSQL-Prototyp

- separater Branch und separate Testdatenbank,
- Prisma-Datasource auf PostgreSQL umstellen,
- jede Migration auf SQL-Kompatibilität prüfen,
- freie String-Domänen und Semikolonlisten bewerten,
- Datums-/Zeitzonenverhalten prüfen,
- Seed und Regressionstests ausführen,
- Datenübernahme mit Zählwerten, Prüfsummen und Referenztests verifizieren.

## Phase 3 – Datenmigration

1. Wartungsfenster und Schreibsperre,
2. vollständiges Backup,
3. Schema per Migration erzeugen,
4. Daten tabellenweise in referenzieller Reihenfolge übertragen,
5. IDs erhalten,
6. Sequenzen korrigieren,
7. Dateien separat referenziell prüfen,
8. Fachzählwerte und Stichproben,
9. Abnahme,
10. dokumentierter Rückfallplan.

## SQLite-zu-PostgreSQL-Prüfpunkte

- Groß-/Kleinschreibung und `contains`-Suche,
- `DateTime` und Europe/Berlin,
- Boolean- und Standardwerte,
- Fremdschlüssel und `onDelete`,
- eindeutige Constraints,
- Autoincrement-Sequenzen,
- JSON für strukturierte Metadaten,
- Transaktionsisolation und Sperrkonflikte,
- Indizes für Status, Mandant, Jahr/Monat und Verlauf.

## Zeitpunkt

- **Jetzt:** Baseline reparieren und PostgreSQL-Anforderungen dokumentieren.
- **Mit Plattformkern:** PostgreSQL-Prototyp und duale Testpipeline.
- **Vor breitem Mehrbenutzerbetrieb:** produktive Umstellung.
- **Nicht erforderlich:** für die rein lokale fachliche Abnahme.

