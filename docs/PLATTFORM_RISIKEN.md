# Plattformrisiken

| Klasse | Risiko | Auswirkung | Wahrscheinlichkeit | Dringlichkeit | Maßnahme | Zeitpunkt |
|---|---|---:|---:|---:|---|---|
| A | Entwicklungsdatenbank ohne Prisma-Migrationsbaseline | sehr hoch | hoch | sofort | Schema vergleichen, verlustfrei baselinen, Upgradeprobe | vor neuem Modul |
| A | Modulgrenzen nicht technisch abgesichert | hoch | hoch | sofort | Eigentümer, öffentliche Services und Importregeln definieren | vor neuem Modul |
| A | Benutzerkonto und Mitarbeiteridentität gekoppelt | hoch | mittel | hoch | additives Employee-Modell und Übergangsplan | vor/mit nächstem Modul |
| A | kein Organisationsobjekt | hoch | mittel | hoch | Einzelorganisation als Plattformwurzel ergänzen | vor/mit nächstem Modul |
| A | Berechtigungen ohne Scope, Rollen/Berechtigungen vermischt | hoch | mittel | hoch | Policy-Vertrag und getrennte Permission-Begriffe | vor neuem Modul |
| A | Monatsservice als sehr großer Mischservice | mittel | hoch | hoch | an Anwendungsfallgrenzen schrittweise zerlegen | vor/mit nächstem Modul |
| B | getrennte Verlaufsmodelle ohne Auditvertrag | hoch | mittel | mittel | gemeinsamen AuditEvent-Vertrag ergänzen | nächstes Modul |
| B | direkte Prisma-Abfragen in UI und modulübergreifend | mittel | hoch | mittel | Read Models und Application Services | nächstes Modul |
| B | Semikolonlisten/freie Statusstrings | mittel | mittel | mittel | vor PostgreSQL gezielt normalisieren | vor PostgreSQL |
| B | veraltete Prisma-Konfiguration in `package.json` | niedrig | hoch | mittel | `prisma.config.ts` separat einführen | vor Prisma 7 |
| C | SQLite bei 20–40 Benutzern | sehr hoch | hoch | hoch | PostgreSQL-Migration | vor Mehrbenutzerbetrieb |
| C | keine optimistische Sperre | hoch | hoch | hoch | Versionsspalten, bedingte Updates | vor Mehrbenutzerbetrieb |
| C | unpaginierte Listen/In-Memory-Filter | hoch | hoch bei Wachstum | mittel | DB-Filter, Pagination, Projektionen | vor Datenwachstum |
| C | manuelle lokale Backups | hoch | mittel | hoch | automatisierte verschlüsselte Backups und Restore-Tests | vor Mehrbenutzerbetrieb |
| C | lokaler Dateispeicher | hoch | mittel | mittel | zentraler Dateireferenzvertrag und Speicherstrategie | vor zentralem Betrieb |
| D | keine externen Identitäten/Mandantenscopes | sehr hoch | sicher | hoch | separates Portal-Identitätsmodell | vor Portal |
| D | kein MFA/Rate Limit/vollständiger CSRF-Schutz | sehr hoch | hoch | hoch | Internet-Sicherheitspaket | vor Internet |
| D | keine Malwareprüfung | sehr hoch | mittel | hoch | Quarantäne und Scan | vor externem Upload |
| D | kein Sicherheitsmonitoring/Incident-Prozess | hoch | hoch | hoch | Monitoring, Alarmierung, Runbooks | vor Internet |
| E | keine komplexe Eventarchitektur | niedrig | niedrig | niedrig | nur bei konkretem Integrationsbedarf | langfristig |
| E | kein KI-/Analysefundament | niedrig | niedrig | niedrig | später auf Read Models aufbauen | langfristig |

## Konsequenz

Klasse-A-Risiken rechtfertigen ein begrenztes Plattform-Refactoring, aber keinen Neustart. Die Klasse-C- und D-Themen dürfen bewusst später umgesetzt werden, solange die Anwendung lokal und mit künstlichen Daten betrieben wird.

