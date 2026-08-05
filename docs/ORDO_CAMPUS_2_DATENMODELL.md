# Ordo Campus 2 – Datenmodell

Stand: 05.08.2026

## Führende Modelle

| Modell | Zweck |
| --- | --- |
| `KnowledgeContent` | Zentraler, unabhängig gepflegter Wissensinhalt mit Status, Typen, Zielgruppen, Verantwortlichkeit und Prüfterminen |
| `KnowledgeArea` | Stabil geschlüsseltes Wissensgebiet mit optional genau einer Unterebene |
| `KnowledgeContentArea` | Mehrfachzuordnung eines Inhalts zu Gebieten und Kennzeichnung des Hauptgebiets |
| `KnowledgeContentTaskLink` | Mehrfachverknüpfung zu Standardaufgaben mit Verknüpfungsart und Hauptanleitung |
| `KnowledgeContentPayrollTopicLink` | Mehrfachverknüpfung zu Rechnungswesen–Lohn-Themen |
| `KnowledgeContentLink` | Externe oder interne Linkmetadaten; kein kopierter Fremdinhalt |
| `KnowledgeContentAttachment` | Geschützte Dateireferenz unter `storage/ordo-campus` |
| `KnowledgeContentHistory` | Unveränderlicher Pflege- und Migrationsverlauf |
| `KnowledgeLearningPath` / `KnowledgeLearningPathItem` | Wiederverwendbare Reihenfolge vorhandener Inhalte |
| `KnowledgeUserProgress` | Persönliche Aufrufe und freiwillige Gelesen-Markierung |
| `KnowledgeTag` / `KnowledgeContentTag` | Normalisierte, wiederverwendbare Schlagwörter |

## Zentrale Regeln

- `KnowledgeContent.key`, `KnowledgeArea.key` und `KnowledgeLearningPath.key` sind eindeutig und stabil.
- `legacyKnowledgeId`, `legacyLinkId`, `legacyAttachmentId` und `legacyHistoryId` sichern die eindeutige Herkunft des übernommenen Altbestands.
- Ein Inhalt darf je Aufgabe, Rechnungswesen–Lohn-Thema, Gebiet, Lernpfad und Tag nur einmal verknüpft sein.
- Aufgabe und Thema können mehrere Inhalte erhalten; die Sortierung und `mainContent` bestimmen die Darstellung.
- Der Dienst validiert höchstens eine Gebietsebene und höchstens ein Hauptgebiet pro Inhalt.
- Anhänge werden nicht physisch dupliziert. Die neue Referenz verwendet denselben geschützten Speicherpfad wie der Altbestand.
- Löschungen werden für Wissensinhalte und Anhänge nicht als regulärer Arbeitsweg angeboten; Archivierung erhält Historie und Referenzen.
- Zielgruppen, Inhaltstypen und Verknüpfungsarten werden als deterministische Mehrfachwerte gespeichert und serverseitig validiert.

## Kompatibilität

Die bisherigen Tabellen `StandardTaskKnowledge`, `StandardTaskKnowledgeLink`, `StandardTaskKnowledgeAttachment` und `StandardTaskKnowledgeHistory` bleiben in Migration 18 vollständig bestehen. Sie dienen als unveränderte Herkunfts- und Rollbackbasis, sind aber nach erfolgreicher Umstellung nicht mehr führend. Bestehende Standardaufgaben-, Checklisten- und Rechnungswesen–Lohn-Modelle werden nicht rekonstruiert.

Die technische Datenquelle ist `prisma/schema.prisma`; die additive Umsetzung liegt in `prisma/migrations/20260805160000_ordo_campus_2_knowledge_platform/migration.sql`.
