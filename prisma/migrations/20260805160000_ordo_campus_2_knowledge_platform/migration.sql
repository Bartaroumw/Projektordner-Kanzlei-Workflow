-- Ordo Campus 2.0: additive knowledge and learning platform.
CREATE TABLE "KnowledgeArea" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Aktiv',
  "parentId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "updatedByUserId" INTEGER NOT NULL,
  CONSTRAINT "KnowledgeArea_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeArea_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeArea_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT,
  "objective" TEXT,
  "mainContent" TEXT,
  "workingGuidance" TEXT,
  "firmStandard" TEXT,
  "typicalErrors" TEXT,
  "reviewerGuidance" TEXT,
  "internalHints" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Entwurf',
  "contentTypes" TEXT NOT NULL,
  "targetAudiences" TEXT NOT NULL,
  "responsibleUserId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "updatedByUserId" INTEGER NOT NULL,
  "publishedAt" DATETIME,
  "archivedAt" DATETIME,
  "majorUpdatedAt" DATETIME,
  "nextReviewDate" DATETIME,
  "legacyKnowledgeId" INTEGER,
  "migrationSource" TEXT,
  CONSTRAINT "KnowledgeContent_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContent_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentArea" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "knowledgeAreaId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "primaryArea" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "KnowledgeContentArea_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentArea_knowledgeAreaId_fkey" FOREIGN KEY ("knowledgeAreaId") REFERENCES "KnowledgeArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentTaskLink" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "standardTaskId" INTEGER NOT NULL,
  "linkType" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "mainContent" BOOLEAN NOT NULL DEFAULT false,
  "contextHint" TEXT,
  CONSTRAINT "KnowledgeContentTaskLink_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentTaskLink_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentPayrollTopicLink" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "payrollReconciliationTopicId" INTEGER NOT NULL,
  "linkType" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "mainContent" BOOLEAN NOT NULL DEFAULT false,
  "contextHint" TEXT,
  CONSTRAINT "KnowledgeContentPayrollTopicLink_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentPayrollTopicLink_payrollReconciliationTopicId_fkey" FOREIGN KEY ("payrollReconciliationTopicId") REFERENCES "PayrollReconciliationTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentLink" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "linkType" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "legacyLinkId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KnowledgeContentLink_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentAttachment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "displayName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "storedFileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileExtension" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Aktiv',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedByUserId" INTEGER NOT NULL,
  "archivedAt" DATETIME,
  "archivedByUserId" INTEGER,
  "legacyAttachmentId" INTEGER,
  CONSTRAINT "KnowledgeContentAttachment_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentAttachment_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeContentHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "actorNameSnapshot" TEXT NOT NULL,
  "changedArea" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "legacyHistoryId" INTEGER,
  CONSTRAINT "KnowledgeContentHistory_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeLearningPath" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "targetAudiences" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Entwurf',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "updatedByUserId" INTEGER NOT NULL,
  CONSTRAINT "KnowledgeLearningPath_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeLearningPath_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeLearningPathItem" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "learningPathId" INTEGER NOT NULL,
  "knowledgeContentId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "learningObjective" TEXT,
  CONSTRAINT "KnowledgeLearningPathItem_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "KnowledgeLearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeLearningPathItem_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeUserProgress" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" INTEGER NOT NULL,
  "knowledgeContentId" INTEGER NOT NULL,
  "firstViewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastViewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewCount" INTEGER NOT NULL DEFAULT 1,
  "readAt" DATETIME,
  CONSTRAINT "KnowledgeUserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeUserProgress_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "KnowledgeTag" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "normalizedKey" TEXT NOT NULL,
  "title" TEXT NOT NULL
);

CREATE TABLE "KnowledgeContentTag" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "knowledgeContentId" INTEGER NOT NULL,
  "knowledgeTagId" INTEGER NOT NULL,
  CONSTRAINT "KnowledgeContentTag_knowledgeContentId_fkey" FOREIGN KEY ("knowledgeContentId") REFERENCES "KnowledgeContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeContentTag_knowledgeTagId_fkey" FOREIGN KEY ("knowledgeTagId") REFERENCES "KnowledgeTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KnowledgeArea_key_key" ON "KnowledgeArea"("key");
CREATE INDEX "KnowledgeArea_status_sortOrder_title_idx" ON "KnowledgeArea"("status", "sortOrder", "title");
CREATE INDEX "KnowledgeArea_parentId_status_sortOrder_idx" ON "KnowledgeArea"("parentId", "status", "sortOrder");
CREATE UNIQUE INDEX "KnowledgeContent_key_key" ON "KnowledgeContent"("key");
CREATE UNIQUE INDEX "KnowledgeContent_legacyKnowledgeId_key" ON "KnowledgeContent"("legacyKnowledgeId");
CREATE INDEX "KnowledgeContent_status_publishedAt_updatedAt_idx" ON "KnowledgeContent"("status", "publishedAt", "updatedAt");
CREATE INDEX "KnowledgeContent_responsibleUserId_nextReviewDate_idx" ON "KnowledgeContent"("responsibleUserId", "nextReviewDate");
CREATE INDEX "KnowledgeContent_majorUpdatedAt_idx" ON "KnowledgeContent"("majorUpdatedAt");
CREATE INDEX "KnowledgeContentArea_knowledgeAreaId_sortOrder_idx" ON "KnowledgeContentArea"("knowledgeAreaId", "sortOrder");
CREATE INDEX "KnowledgeContentArea_knowledgeContentId_primaryArea_idx" ON "KnowledgeContentArea"("knowledgeContentId", "primaryArea");
CREATE UNIQUE INDEX "KnowledgeContentArea_knowledgeContentId_knowledgeAreaId_key" ON "KnowledgeContentArea"("knowledgeContentId", "knowledgeAreaId");
CREATE INDEX "KnowledgeContentTaskLink_standardTaskId_mainContent_sortOrder_idx" ON "KnowledgeContentTaskLink"("standardTaskId", "mainContent", "sortOrder");
CREATE UNIQUE INDEX "KnowledgeContentTaskLink_knowledgeContentId_standardTaskId_key" ON "KnowledgeContentTaskLink"("knowledgeContentId", "standardTaskId");
CREATE INDEX "KnowledgeContentPayrollTopicLink_payrollReconciliationTopicId_mainContent_sortOrder_idx" ON "KnowledgeContentPayrollTopicLink"("payrollReconciliationTopicId", "mainContent", "sortOrder");
CREATE UNIQUE INDEX "KnowledgeContentPayrollTopicLink_knowledgeContentId_payrollReconciliationTopicId_key" ON "KnowledgeContentPayrollTopicLink"("knowledgeContentId", "payrollReconciliationTopicId");
CREATE UNIQUE INDEX "KnowledgeContentLink_legacyLinkId_key" ON "KnowledgeContentLink"("legacyLinkId");
CREATE INDEX "KnowledgeContentLink_knowledgeContentId_active_sortOrder_idx" ON "KnowledgeContentLink"("knowledgeContentId", "active", "sortOrder");
CREATE INDEX "KnowledgeContentLink_title_idx" ON "KnowledgeContentLink"("title");
CREATE UNIQUE INDEX "KnowledgeContentAttachment_storedFileName_key" ON "KnowledgeContentAttachment"("storedFileName");
CREATE UNIQUE INDEX "KnowledgeContentAttachment_storageKey_key" ON "KnowledgeContentAttachment"("storageKey");
CREATE UNIQUE INDEX "KnowledgeContentAttachment_legacyAttachmentId_key" ON "KnowledgeContentAttachment"("legacyAttachmentId");
CREATE INDEX "KnowledgeContentAttachment_knowledgeContentId_status_sortOrder_idx" ON "KnowledgeContentAttachment"("knowledgeContentId", "status", "sortOrder");
CREATE INDEX "KnowledgeContentAttachment_uploadedByUserId_uploadedAt_idx" ON "KnowledgeContentAttachment"("uploadedByUserId", "uploadedAt");
CREATE INDEX "KnowledgeContentAttachment_archivedByUserId_idx" ON "KnowledgeContentAttachment"("archivedByUserId");
CREATE UNIQUE INDEX "KnowledgeContentHistory_legacyHistoryId_key" ON "KnowledgeContentHistory"("legacyHistoryId");
CREATE INDEX "KnowledgeContentHistory_knowledgeContentId_occurredAt_idx" ON "KnowledgeContentHistory"("knowledgeContentId", "occurredAt");
CREATE INDEX "KnowledgeContentHistory_actorUserId_occurredAt_idx" ON "KnowledgeContentHistory"("actorUserId", "occurredAt");
CREATE UNIQUE INDEX "KnowledgeLearningPath_key_key" ON "KnowledgeLearningPath"("key");
CREATE INDEX "KnowledgeLearningPath_status_sortOrder_title_idx" ON "KnowledgeLearningPath"("status", "sortOrder", "title");
CREATE INDEX "KnowledgeLearningPathItem_knowledgeContentId_idx" ON "KnowledgeLearningPathItem"("knowledgeContentId");
CREATE UNIQUE INDEX "KnowledgeLearningPathItem_learningPathId_knowledgeContentId_key" ON "KnowledgeLearningPathItem"("learningPathId", "knowledgeContentId");
CREATE UNIQUE INDEX "KnowledgeLearningPathItem_learningPathId_sortOrder_key" ON "KnowledgeLearningPathItem"("learningPathId", "sortOrder");
CREATE INDEX "KnowledgeUserProgress_userId_lastViewedAt_idx" ON "KnowledgeUserProgress"("userId", "lastViewedAt");
CREATE INDEX "KnowledgeUserProgress_userId_readAt_idx" ON "KnowledgeUserProgress"("userId", "readAt");
CREATE UNIQUE INDEX "KnowledgeUserProgress_userId_knowledgeContentId_key" ON "KnowledgeUserProgress"("userId", "knowledgeContentId");
CREATE UNIQUE INDEX "KnowledgeTag_normalizedKey_key" ON "KnowledgeTag"("normalizedKey");
CREATE INDEX "KnowledgeTag_title_idx" ON "KnowledgeTag"("title");
CREATE INDEX "KnowledgeContentTag_knowledgeTagId_idx" ON "KnowledgeContentTag"("knowledgeTagId");
CREATE UNIQUE INDEX "KnowledgeContentTag_knowledgeContentId_knowledgeTagId_key" ON "KnowledgeContentTag"("knowledgeContentId", "knowledgeTagId");

-- Deterministische Wissensgebiete werden nur angelegt, wenn bereits ein
-- Benutzer vorhanden ist. In einer leeren Datenbank uebernimmt dies nach der
-- Benutzeranlage der deterministische Seed. Dadurch bleibt die Migration auch
-- auf einer wirklich leeren Integrationsdatenbank ausfuehrbar.
CREATE TEMP TABLE "_CampusAreaSeed" (
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "parentKey" TEXT,
  "sortOrder" INTEGER NOT NULL
);

INSERT INTO "_CampusAreaSeed" ("key", "title", "shortDescription", "parentKey", "sortOrder") VALUES
  ('RECHNUNGSWESEN', 'Rechnungswesen', 'Wissen für die laufende Finanzbuchhaltung.', NULL, 10),
  ('REWE_GRUNDLAGEN', 'Grundlagen', 'Grundlagen der laufenden Bearbeitung.', 'RECHNUNGSWESEN', 11),
  ('REWE_LAUFENDE_BEARBEITUNG', 'Laufende Bearbeitung', 'Wissen für die laufende Bearbeitung.', 'RECHNUNGSWESEN', 12),
  ('REWE_BANK', 'Bank und Zahlungsverkehr', 'Bankkonten und Zahlungsverkehr abstimmen.', 'RECHNUNGSWESEN', 13),
  ('REWE_KASSE', 'Kasse', 'Kassenführung und Kassenabstimmung.', 'RECHNUNGSWESEN', 14),
  ('REWE_FORDERUNGEN', 'Forderungen und Verbindlichkeiten', 'Offene Posten nachvollziehbar abstimmen.', 'RECHNUNGSWESEN', 15),
  ('REWE_ANLAGEN', 'Anlagenbuchführung', 'Anlagenbewegungen fachlich dokumentieren.', 'RECHNUNGSWESEN', 16),
  ('REWE_DARLEHEN', 'Darlehen und Finanzierung', 'Darlehen und Finanzierungen abstimmen.', 'RECHNUNGSWESEN', 17),
  ('REWE_UMSATZSTEUER', 'Umsatzsteuer', 'Umsatzsteuerliche Bearbeitung und Kontrollen.', 'RECHNUNGSWESEN', 18),
  ('REWE_KONTENABSTIMMUNG', 'Kontenabstimmung', 'Konten systematisch abstimmen.', 'RECHNUNGSWESEN', 19),
  ('REWE_JAHRESVORBEREITUNG', 'Jahresvorbereitung', 'Vorbereitung auf den Jahresabschluss.', 'RECHNUNGSWESEN', 20),
  ('JAHRESABSCHLUSS', 'Jahresabschluss', 'Wissen für Vorbereitung, Erstellung und Prüfung.', NULL, 30),
  ('JA_VORBEREITUNG', 'Vorbereitende Tätigkeiten', 'Den Jahresabschluss strukturiert vorbereiten.', 'JAHRESABSCHLUSS', 31),
  ('JA_ABSCHLUSSBUCHUNGEN', 'Abschlussbuchungen', 'Abschlussbuchungen fachlich einordnen.', 'JAHRESABSCHLUSS', 32),
  ('JA_BILANZPOSITIONEN', 'Bilanzpositionen', 'Bilanzpositionen abstimmen und dokumentieren.', 'JAHRESABSCHLUSS', 33),
  ('JA_KONTONOTIZEN', 'Kontonotizen', 'Kontonotizen nachvollziehbar erstellen.', 'JAHRESABSCHLUSS', 34),
  ('JA_PRUEFUNG', 'Fachliche Prüfung', 'Qualitätssicherung im Jahresabschluss.', 'JAHRESABSCHLUSS', 35),
  ('JA_FREIGABE', 'Freigabe und Offenlegung', 'Freigabe und Offenlegung vorbereiten.', 'JAHRESABSCHLUSS', 36),
  ('REWE_LOHN', 'Rechnungswesen ↔ Lohn', 'Wissen für die monatliche Abstimmung mit der Lohnabrechnung.', NULL, 40),
  ('LOHN_VORTEILE', 'Arbeitnehmerbezogene Vorteile', 'Arbeitnehmerbezogene Vorteile erkennen.', 'REWE_LOHN', 41),
  ('LOHN_REISEKOSTEN', 'Reisekosten', 'Steuerfreie Reisekostenerstattungen abstimmen.', 'REWE_LOHN', 42),
  ('LOHN_FAHRZEUGE', 'Fahrzeuge', 'Firmenfahrzeuge, Pkw, E-Bike und Fahrrad.', 'REWE_LOHN', 43),
  ('LOHN_SCHEINSELBSTSTAENDIGKEIT', 'Scheinselbstständigkeit', 'Mögliche abhängige Beschäftigung erkennen.', 'REWE_LOHN', 44),
  ('LOHN_GESCHENKE', 'Geschenke an Nichtarbeitnehmer', 'Geschenke fachlich richtig einordnen.', 'REWE_LOHN', 45),
  ('LOHN_KSK', 'Künstlersozialkasse', 'Künstlersozialabgabe prüfen.', 'REWE_LOHN', 46),
  ('KANZLEISTANDARDS', 'Kanzleistandards', 'Verbindliche interne Vorgaben der Kanzlei.', NULL, 50),
  ('STANDARD_SKR03', 'SKR03', 'Verbindliche Vorgaben zum Kontenrahmen.', 'KANZLEISTANDARDS', 51),
  ('STANDARD_KONTONOTIZEN', 'Kontonotizen', 'Verbindliche Anforderungen an Kontonotizen.', 'KANZLEISTANDARDS', 52),
  ('STANDARD_DOKUMENTATION', 'Dokumentation', 'Verbindliche Dokumentationsgrundsätze.', 'KANZLEISTANDARDS', 53),
  ('STANDARD_BUCHUNGSTEXTE', 'Buchungstexte', 'Verbindliche Regeln für Buchungstexte.', 'KANZLEISTANDARDS', 54),
  ('STANDARD_PRUEFUNGSNACHWEISE', 'Prüfungsnachweise', 'Verbindliche Prüfungsnachweise.', 'KANZLEISTANDARDS', 55),
  ('STANDARD_ABLAGE', 'Ablage und Verlinkung', 'Verbindliche Ablage- und Verlinkungsregeln.', 'KANZLEISTANDARDS', 56),
  ('BRANCHENWISSEN', 'Branchenwissen', 'Kanzleispezifisches Branchenwissen.', NULL, 60),
  ('BRANCHE_AERZTE', 'Ärzte', 'Branchenwissen für Arztpraxen.', 'BRANCHENWISSEN', 61),
  ('BRANCHE_ZAHNAERZTE', 'Zahnärzte', 'Branchenwissen für Zahnarztpraxen.', 'BRANCHENWISSEN', 62),
  ('BRANCHE_MVZ', 'MVZ', 'Branchenwissen für medizinische Versorgungszentren.', 'BRANCHENWISSEN', 63),
  ('DATEV_WERKZEUGE', 'DATEV und Werkzeuge', 'Hilfen zu Fachsoftware und internen Werkzeugen.', NULL, 70),
  ('DATEV_HILFE', 'DATEV Hilfe', 'Verweise auf die DATEV-Hilfe.', 'DATEV_WERKZEUGE', 71),
  ('DATEV_LERNPLATTFORM', 'DATEV Lernplattform', 'Verweise auf externe Lernangebote.', 'DATEV_WERKZEUGE', 72),
  ('DATEV_UNTERNEHMEN_ONLINE', 'Unternehmen online', 'Arbeitshinweise zu Unternehmen online.', 'DATEV_WERKZEUGE', 73),
  ('DATEV_REWE_PROGRAMME', 'Rechnungswesenprogramme', 'Arbeitshinweise zu Rechnungswesenprogrammen.', 'DATEV_WERKZEUGE', 74),
  ('DATEV_INTERNE_ARBEITSHILFEN', 'Interne Arbeitshilfen', 'Kanzleieigene Arbeitshilfen.', 'DATEV_WERKZEUGE', 75);

INSERT INTO "KnowledgeArea" (
  "key", "title", "shortDescription", "sortOrder", "status",
  "createdByUserId", "updatedAt", "updatedByUserId"
)
SELECT s."key", s."title", s."shortDescription", s."sortOrder", 'Aktiv',
       u."id", CURRENT_TIMESTAMP, u."id"
FROM "_CampusAreaSeed" s
CROSS JOIN (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1) u
WHERE s."parentKey" IS NULL;

INSERT INTO "KnowledgeArea" (
  "key", "title", "shortDescription", "sortOrder", "status", "parentId",
  "createdByUserId", "updatedAt", "updatedByUserId"
)
SELECT s."key", s."title", s."shortDescription", s."sortOrder", 'Aktiv', p."id",
       u."id", CURRENT_TIMESTAMP, u."id"
FROM "_CampusAreaSeed" s
JOIN "KnowledgeArea" p ON p."key" = s."parentKey"
CROSS JOIN (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1) u
WHERE s."parentKey" IS NOT NULL;

DROP TABLE "_CampusAreaSeed";

-- Eins-zu-eins-Ueberfuehrung der bisherigen aufgabenbezogenen Inhalte. Die
-- Legacy-Tabellen bleiben absichtlich unveraendert als pruefbare Quelle bestehen.
INSERT INTO "KnowledgeContent" (
  "key", "title", "shortDescription", "objective", "workingGuidance",
  "firmStandard", "typicalErrors", "reviewerGuidance", "internalHints",
  "status", "contentTypes", "targetAudiences", "createdAt", "createdByUserId",
  "updatedAt", "updatedByUserId", "publishedAt", "archivedAt", "majorUpdatedAt",
  "legacyKnowledgeId", "migrationSource"
)
SELECT
  'LEGACY-' || st."taskId",
  st."title",
  k."shortDescription",
  k."objective",
  k."processingGuidance",
  k."firmStandard",
  k."typicalErrors",
  k."reviewerGuidance",
  k."internalHints",
  k."status",
  CASE WHEN k."firmStandard" IS NOT NULL AND trim(k."firmStandard") <> ''
       THEN 'Kanzleistandard|Arbeitsanleitung|Fachwissen'
       ELSE 'Arbeitsanleitung|Fachwissen' END,
  'ALLE',
  k."createdAt",
  COALESCE((SELECT h."actorUserId" FROM "StandardTaskKnowledgeHistory" h WHERE h."knowledgeId" = k."id" ORDER BY h."occurredAt", h."id" LIMIT 1),
           (SELECT u."id" FROM "User" u ORDER BY u."id" LIMIT 1)),
  k."updatedAt",
  COALESCE((SELECT h."actorUserId" FROM "StandardTaskKnowledgeHistory" h WHERE h."knowledgeId" = k."id" ORDER BY h."occurredAt" DESC, h."id" DESC LIMIT 1),
           (SELECT u."id" FROM "User" u ORDER BY u."id" LIMIT 1)),
  CASE WHEN k."status" = 'Aktiv' THEN k."updatedAt" ELSE NULL END,
  CASE WHEN k."status" = 'Archiviert' THEN k."updatedAt" ELSE NULL END,
  k."updatedAt",
  k."id",
  'StandardTaskKnowledge:' || k."id"
FROM "StandardTaskKnowledge" k
JOIN "StandardTask" st ON st."id" = k."standardTaskId";

INSERT INTO "KnowledgeContentTaskLink" (
  "knowledgeContentId", "standardTaskId", "linkType", "sortOrder", "mainContent", "contextHint"
)
SELECT c."id", k."standardTaskId", 'Hauptanleitung', 0, 1,
       'Automatisch aus der bisherigen Ordo-Campus-Zuordnung uebernommen.'
FROM "StandardTaskKnowledge" k
JOIN "KnowledgeContent" c ON c."legacyKnowledgeId" = k."id";

INSERT INTO "KnowledgeContentPayrollTopicLink" (
  "knowledgeContentId", "payrollReconciliationTopicId", "linkType", "sortOrder", "mainContent", "contextHint"
)
SELECT c."id", t."id", 'Ergänzendes Wissen', t."sortOrder", 1,
       'Bestehende eindeutige Themenzuordnung ueber die bisherige Standardaufgabe.'
FROM "PayrollReconciliationTopic" t
JOIN "StandardTaskKnowledge" k ON k."standardTaskId" = t."campusStandardTaskId"
JOIN "KnowledgeContent" c ON c."legacyKnowledgeId" = k."id";

INSERT INTO "KnowledgeContentLink" (
  "knowledgeContentId", "title", "url", "linkType", "description", "sortOrder",
  "active", "legacyLinkId", "createdAt", "updatedAt"
)
SELECT c."id", l."title", l."url", l."linkType", l."description", l."sortOrder",
       l."active", l."id", l."createdAt", l."updatedAt"
FROM "StandardTaskKnowledgeLink" l
JOIN "KnowledgeContent" c ON c."legacyKnowledgeId" = l."knowledgeId";

INSERT INTO "KnowledgeContentAttachment" (
  "knowledgeContentId", "displayName", "originalFileName", "storedFileName", "storageKey",
  "fileExtension", "mimeType", "fileSizeBytes", "description", "status", "sortOrder",
  "uploadedAt", "uploadedByUserId", "archivedAt", "archivedByUserId", "legacyAttachmentId"
)
SELECT c."id", a."displayName", a."originalFileName", a."storedFileName", a."storageKey",
       a."fileExtension", a."mimeType", a."fileSizeBytes", a."description", a."status", a."sortOrder",
       a."uploadedAt", a."uploadedByUserId", a."archivedAt", a."archivedByUserId", a."id"
FROM "StandardTaskKnowledgeAttachment" a
JOIN "StandardTaskKnowledge" k ON k."standardTaskId" = a."standardTaskId"
JOIN "KnowledgeContent" c ON c."legacyKnowledgeId" = k."id";

INSERT INTO "KnowledgeContentHistory" (
  "knowledgeContentId", "actorUserId", "actorNameSnapshot", "changedArea",
  "description", "occurredAt", "legacyHistoryId"
)
SELECT c."id", h."actorUserId", h."actorNameSnapshot", h."changedArea",
       h."description", h."occurredAt", h."id"
FROM "StandardTaskKnowledgeHistory" h
JOIN "KnowledgeContent" c ON c."legacyKnowledgeId" = h."knowledgeId";

INSERT INTO "KnowledgeContentHistory" (
  "knowledgeContentId", "actorUserId", "actorNameSnapshot", "changedArea", "description", "occurredAt"
)
SELECT c."id", c."updatedByUserId", u."fullName", 'Migration',
       'Eins-zu-eins aus der bisherigen Standardaufgabe ' || st."taskId" || ' uebernommen.',
       CURRENT_TIMESTAMP
FROM "KnowledgeContent" c
JOIN "StandardTaskKnowledge" k ON k."id" = c."legacyKnowledgeId"
JOIN "StandardTask" st ON st."id" = k."standardTaskId"
JOIN "User" u ON u."id" = c."updatedByUserId";

-- Primaeres Gebiet der uebernommenen Inhalte. Weitere Zuordnungen koennen im
-- Wissensmanagement ergaenzt werden; es findet keine unsichere Textfusion statt.
INSERT INTO "KnowledgeContentArea" (
  "knowledgeContentId", "knowledgeAreaId", "sortOrder", "primaryArea"
)
SELECT c."id", a."id", st."sortOrder", 1
FROM "KnowledgeContent" c
JOIN "StandardTaskKnowledge" k ON k."id" = c."legacyKnowledgeId"
JOIN "StandardTask" st ON st."id" = k."standardTaskId"
JOIN "KnowledgeArea" a ON a."key" = CASE
  WHEN st."checklistType" = 'Jahresabschluss' THEN 'JAHRESABSCHLUSS'
  WHEN st."taskId" LIKE '%FIBU%LOHN%' THEN 'REWE_LOHN'
  ELSE 'RECHNUNGSWESEN'
END;

-- Ein verbindlicher Kanzleistandard wird zusaetzlich dem gleichnamigen Gebiet
-- zugeordnet. Die erste Zuordnung bleibt das einzige primaere Gebiet.
INSERT INTO "KnowledgeContentArea" (
  "knowledgeContentId", "knowledgeAreaId", "sortOrder", "primaryArea"
)
SELECT c."id", a."id", 0, 0
FROM "KnowledgeContent" c
JOIN "KnowledgeArea" a ON a."key" = 'KANZLEISTANDARDS'
WHERE c."firmStandard" IS NOT NULL AND trim(c."firmStandard") <> '';

-- Deterministische Lernpfade. Auf einem leeren Migrationsbestand werden sie
-- nach der Benutzeranlage vom Seed angelegt.
INSERT INTO "KnowledgeLearningPath" (
  "key", "title", "shortDescription", "objective", "targetAudiences", "status",
  "sortOrder", "createdByUserId", "updatedAt", "updatedByUserId"
)
SELECT p."key", p."title", p."shortDescription", p."objective", p."targetAudiences", 'Aktiv',
       p."sortOrder", u."id", CURRENT_TIMESTAMP, u."id"
FROM (
  SELECT 'EINARBEITUNG_RECHNUNGSWESEN' AS "key", 'Einarbeitung Rechnungswesen' AS "title", 'Grundlagen für den sicheren Einstieg.' AS "shortDescription", 'Die wichtigsten Kanzleistandards und Arbeitsschritte in sinnvoller Reihenfolge kennenlernen.' AS "objective", 'BEARBEITER' AS "targetAudiences", 10 AS "sortOrder"
  UNION ALL SELECT 'PRUEFUNG_QUALITAET', 'Prüfung und Qualitätssicherung', 'Prüfungsworkflow und Qualitätsgrundsätze.', 'Prüfungen nachvollziehbar und nach Kanzleistandard durchführen.', 'PRUEFER|KANZLEILEITUNG', 20
  UNION ALL SELECT 'REWE_LOHN_ABSTIMMUNG', 'Rechnungswesen ↔ Lohn-Abstimmung', 'Wissen zur monatlichen Schnittstelle.', 'Lohnsachverhalte vollständig und nachvollziehbar abstimmen.', 'BEARBEITER|LOHNSACHBEARBEITER|PRUEFER', 30
  UNION ALL SELECT 'JAHRESABSCHLUSS', 'Jahresabschluss', 'Vom vorbereiteten Bestand bis zur Freigabe.', 'Jahresabschlussarbeiten strukturiert vorbereiten und prüfen.', 'BEARBEITER|PRUEFER|KANZLEILEITUNG', 40
) p
CROSS JOIN (SELECT "id" FROM "User" ORDER BY "id" LIMIT 1) u;

-- Vorhandene Inhalte werden ohne kuenstliche Dubletten in geeignete Lernpfade
-- aufgenommen. Die Reihenfolge folgt der vorhandenen Aufgabenreihenfolge.
INSERT INTO "KnowledgeLearningPathItem" (
  "learningPathId", "knowledgeContentId", "sortOrder", "learningObjective"
)
SELECT lp."id", c."id",
       ROW_NUMBER() OVER (PARTITION BY lp."id" ORDER BY st."sortOrder", st."id") * 10,
       'Den Kanzleistandard und die Arbeitshinweise sicher anwenden.'
FROM "KnowledgeContent" c
JOIN "StandardTaskKnowledge" k ON k."id" = c."legacyKnowledgeId"
JOIN "StandardTask" st ON st."id" = k."standardTaskId"
JOIN "KnowledgeLearningPath" lp ON lp."key" = CASE
  WHEN st."checklistType" = 'Jahresabschluss' THEN 'JAHRESABSCHLUSS'
  WHEN st."taskId" LIKE '%FIBU%LOHN%' THEN 'REWE_LOHN_ABSTIMMUNG'
  ELSE 'EINARBEITUNG_RECHNUNGSWESEN'
END;
