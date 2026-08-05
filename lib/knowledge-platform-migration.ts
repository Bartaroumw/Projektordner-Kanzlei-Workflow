import type { PrismaClient } from "@prisma/client";
import { KNOWLEDGE_AREAS, KNOWLEDGE_LEARNING_PATHS } from "./knowledge-platform-catalog.ts";

export async function provisionKnowledgePlatformFromLegacy(prisma: PrismaClient, actorUserId: number) {
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: actorUserId } });
  const areaIds = new Map<string, number>();

  for (const seed of KNOWLEDGE_AREAS.filter((item) => !item.parentKey)) {
    const area = await prisma.knowledgeArea.upsert({
      where: { key: seed.key },
      update: {},
      create: { ...seed, createdByUserId: actorUserId, updatedByUserId: actorUserId, status: "Aktiv" },
    });
    areaIds.set(seed.key, area.id);
  }
  for (const seed of KNOWLEDGE_AREAS.filter((item) => item.parentKey)) {
    const { parentKey, ...data } = seed;
    const area = await prisma.knowledgeArea.upsert({
      where: { key: seed.key },
      update: {},
      create: { ...data, parentId: areaIds.get(parentKey!)!, createdByUserId: actorUserId, updatedByUserId: actorUserId, status: "Aktiv" },
    });
    areaIds.set(seed.key, area.id);
  }

  const legacyItems = await prisma.standardTaskKnowledge.findMany({
    include: {
      standardTask: { include: { payrollTopics: true } },
      links: true,
      history: { orderBy: [{ occurredAt: "asc" }, { id: "asc" }] },
    },
    orderBy: { id: "asc" },
  });

  for (const legacy of legacyItems) {
    const firstActor = legacy.history.at(0)?.actorUserId ?? actorUserId;
    const lastActor = legacy.history.at(-1)?.actorUserId ?? actorUserId;
    const types = legacy.firmStandard?.trim()
      ? "Kanzleistandard|Arbeitsanleitung|Fachwissen"
      : "Arbeitsanleitung|Fachwissen";
    const content = await prisma.knowledgeContent.upsert({
      where: { legacyKnowledgeId: legacy.id },
      update: {},
      create: {
        key: `LEGACY-${legacy.standardTask.taskId}`,
        title: legacy.standardTask.title,
        shortDescription: legacy.shortDescription,
        objective: legacy.objective,
        workingGuidance: legacy.processingGuidance,
        firmStandard: legacy.firmStandard,
        typicalErrors: legacy.typicalErrors,
        reviewerGuidance: legacy.reviewerGuidance,
        internalHints: legacy.internalHints,
        status: legacy.status,
        contentTypes: types,
        targetAudiences: "ALLE",
        createdAt: legacy.createdAt,
        createdByUserId: firstActor,
        updatedAt: legacy.updatedAt,
        updatedByUserId: lastActor,
        publishedAt: legacy.status === "Aktiv" ? legacy.updatedAt : null,
        archivedAt: legacy.status === "Archiviert" ? legacy.updatedAt : null,
        majorUpdatedAt: legacy.updatedAt,
        legacyKnowledgeId: legacy.id,
        migrationSource: `StandardTaskKnowledge:${legacy.id}`,
      },
    });

    await prisma.knowledgeContentTaskLink.upsert({
      where: { knowledgeContentId_standardTaskId: { knowledgeContentId: content.id, standardTaskId: legacy.standardTaskId } },
      update: {},
      create: { knowledgeContentId: content.id, standardTaskId: legacy.standardTaskId, linkType: "Hauptanleitung", mainContent: true, contextHint: "Automatisch aus der bisherigen Ordo-Campus-Zuordnung übernommen." },
    });
    for (const topic of legacy.standardTask.payrollTopics) {
      await prisma.knowledgeContentPayrollTopicLink.upsert({
        where: { knowledgeContentId_payrollReconciliationTopicId: { knowledgeContentId: content.id, payrollReconciliationTopicId: topic.id } },
        update: {},
        create: { knowledgeContentId: content.id, payrollReconciliationTopicId: topic.id, linkType: "Ergänzendes Wissen", sortOrder: topic.sortOrder, mainContent: true, contextHint: "Bestehende eindeutige Themenzuordnung über die bisherige Standardaufgabe." },
      });
    }
    const areaKey = legacy.standardTask.checklistType === "Jahresabschluss"
      ? "JAHRESABSCHLUSS"
      : legacy.standardTask.taskId.includes("FIBU-LOHN") ? "REWE_LOHN" : "RECHNUNGSWESEN";
    await prisma.knowledgeContentArea.upsert({
      where: { knowledgeContentId_knowledgeAreaId: { knowledgeContentId: content.id, knowledgeAreaId: areaIds.get(areaKey)! } },
      update: {},
      create: { knowledgeContentId: content.id, knowledgeAreaId: areaIds.get(areaKey)!, sortOrder: legacy.standardTask.sortOrder, primaryArea: true },
    });
    if (legacy.firmStandard?.trim()) {
      await prisma.knowledgeContentArea.upsert({
        where: { knowledgeContentId_knowledgeAreaId: { knowledgeContentId: content.id, knowledgeAreaId: areaIds.get("KANZLEISTANDARDS")! } },
        update: {},
        create: { knowledgeContentId: content.id, knowledgeAreaId: areaIds.get("KANZLEISTANDARDS")!, primaryArea: false },
      });
    }
    for (const link of legacy.links) {
      await prisma.knowledgeContentLink.upsert({
        where: { legacyLinkId: link.id }, update: {},
        create: { knowledgeContentId: content.id, title: link.title, url: link.url, linkType: link.linkType, description: link.description, sortOrder: link.sortOrder, active: link.active, legacyLinkId: link.id, createdAt: link.createdAt, updatedAt: link.updatedAt },
      });
    }
    const attachments = await prisma.standardTaskKnowledgeAttachment.findMany({ where: { standardTaskId: legacy.standardTaskId } });
    for (const attachment of attachments) {
      await prisma.knowledgeContentAttachment.upsert({
        where: { legacyAttachmentId: attachment.id }, update: {},
        create: { knowledgeContentId: content.id, displayName: attachment.displayName, originalFileName: attachment.originalFileName, storedFileName: attachment.storedFileName, storageKey: attachment.storageKey, fileExtension: attachment.fileExtension, mimeType: attachment.mimeType, fileSizeBytes: attachment.fileSizeBytes, description: attachment.description, status: attachment.status, sortOrder: attachment.sortOrder, uploadedAt: attachment.uploadedAt, uploadedByUserId: attachment.uploadedByUserId, archivedAt: attachment.archivedAt, archivedByUserId: attachment.archivedByUserId, legacyAttachmentId: attachment.id },
      });
    }
    for (const history of legacy.history) {
      await prisma.knowledgeContentHistory.upsert({
        where: { legacyHistoryId: history.id }, update: {},
        create: { knowledgeContentId: content.id, actorUserId: history.actorUserId, actorNameSnapshot: history.actorNameSnapshot, changedArea: history.changedArea, description: history.description, occurredAt: history.occurredAt, legacyHistoryId: history.id },
      });
    }
    const migrationEntry = await prisma.knowledgeContentHistory.findFirst({ where: { knowledgeContentId: content.id, changedArea: "Migration" } });
    if (!migrationEntry) {
      await prisma.knowledgeContentHistory.create({ data: { knowledgeContentId: content.id, actorUserId: lastActor, actorNameSnapshot: actor.fullName, changedArea: "Migration", description: `Eins-zu-eins aus der bisherigen Standardaufgabe ${legacy.standardTask.taskId} übernommen.` } });
    }
  }

  for (const seed of KNOWLEDGE_LEARNING_PATHS) {
    await prisma.knowledgeLearningPath.upsert({
      where: { key: seed.key }, update: {},
      create: { ...seed, status: "Aktiv", createdByUserId: actorUserId, updatedByUserId: actorUserId },
    });
  }

  const contentLinks = await prisma.knowledgeContentTaskLink.findMany({
    where: { knowledgeContent: { legacyKnowledgeId: { not: null } } },
    include: { knowledgeContent: true, standardTask: true },
    orderBy: [{ standardTask: { sortOrder: "asc" } }, { standardTaskId: "asc" }],
  });
  const pathPositions = new Map<number, number>();
  for (const link of contentLinks) {
    const pathKey = link.standardTask.checklistType === "Jahresabschluss"
      ? "JAHRESABSCHLUSS"
      : link.standardTask.taskId.includes("FIBU-LOHN") ? "REWE_LOHN_ABSTIMMUNG" : "EINARBEITUNG_RECHNUNGSWESEN";
    const path = await prisma.knowledgeLearningPath.findUniqueOrThrow({ where: { key: pathKey } });
    const existing = await prisma.knowledgeLearningPathItem.findUnique({ where: { learningPathId_knowledgeContentId: { learningPathId: path.id, knowledgeContentId: link.knowledgeContentId } } });
    if (!existing) {
      const next = (pathPositions.get(path.id) ?? await prisma.knowledgeLearningPathItem.count({ where: { learningPathId: path.id } })) + 1;
      pathPositions.set(path.id, next);
      await prisma.knowledgeLearningPathItem.create({ data: { learningPathId: path.id, knowledgeContentId: link.knowledgeContentId, sortOrder: next * 10, learningObjective: "Den Kanzleistandard und die Arbeitshinweise sicher anwenden." } });
    }
  }

  return {
    areas: await prisma.knowledgeArea.count(),
    contents: await prisma.knowledgeContent.count(),
    taskLinks: await prisma.knowledgeContentTaskLink.count(),
    topicLinks: await prisma.knowledgeContentPayrollTopicLink.count(),
    learningPaths: await prisma.knowledgeLearningPath.count(),
  };
}

export async function seedKnowledgeProgressExamples(prisma: PrismaClient, username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  const contents = await prisma.knowledgeContent.findMany({ where: { status: "Aktiv" }, orderBy: { id: "asc" }, take: 3 });
  if (!user) return;
  for (const [index, content] of contents.entries()) {
    await prisma.knowledgeUserProgress.upsert({
      where: { userId_knowledgeContentId: { userId: user.id, knowledgeContentId: content.id } },
      update: {},
      create: { userId: user.id, knowledgeContentId: content.id, viewCount: index + 1, readAt: index < 2 ? new Date("2026-07-01T09:00:00Z") : null },
    });
  }
}
