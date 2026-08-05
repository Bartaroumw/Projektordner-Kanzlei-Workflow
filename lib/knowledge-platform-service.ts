import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManageOrdoCampus, type AuthUser } from "@/lib/permissions";
import { KNOWLEDGE_CONTENT_STATUSES, KNOWLEDGE_CONTENT_TYPES, KNOWLEDGE_LINK_TYPES, KNOWLEDGE_TARGET_AUDIENCES, normalizeKnowledgeTag } from "@/lib/knowledge-platform-catalog";

export class KnowledgePlatformError extends Error {
  constructor(message: string, readonly code: "NOT_ALLOWED" | "NOT_FOUND" | "VALIDATION") {
    super(message);
  }
}

function requireManager(user: AuthUser) {
  if (!user.active || !canManageOrdoCampus(user)) throw new KnowledgePlatformError("Sie sind nicht berechtigt, Ordo-Campus-Inhalte zu verwalten.", "NOT_ALLOWED");
}

const areaSchema = z.object({
  key: z.string().trim().min(2).max(80).regex(/^[A-Z0-9_ÄÖÜ-]+$/),
  title: z.string().trim().min(2).max(160),
  shortDescription: z.string().trim().min(2).max(500),
  description: z.string().trim().max(5000).optional().nullable(),
  icon: z.string().trim().max(20).optional().nullable(),
  sortOrder: z.number().int().min(0).max(100000),
  parentId: z.number().int().positive().optional().nullable(),
  status: z.enum(["Aktiv", "Archiviert"]),
});

export type KnowledgeAreaInput = z.infer<typeof areaSchema>;

export async function saveKnowledgeArea(id: number | null, input: KnowledgeAreaInput, user: AuthUser) {
  requireManager(user);
  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) throw new KnowledgePlatformError("Bitte prüfen Sie die Angaben zum Wissensgebiet.", "VALIDATION");
  if (id && parsed.data.parentId === id) throw new KnowledgePlatformError("Ein Wissensgebiet kann sich nicht selbst untergeordnet werden.", "VALIDATION");
  if (parsed.data.parentId) {
    const parent = await prisma.knowledgeArea.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.parentId) throw new KnowledgePlatformError("Untergebiete dürfen nur einem Hauptgebiet zugeordnet werden.", "VALIDATION");
    if (id) {
      const children = await prisma.knowledgeArea.count({ where: { parentId: id } });
      if (children) throw new KnowledgePlatformError("Ein Hauptgebiet mit Untergebieten kann nicht selbst Untergebiet werden.", "VALIDATION");
    }
  }
  const data = { ...parsed.data, description: parsed.data.description || null, icon: parsed.data.icon || null, parentId: parsed.data.parentId || null, updatedByUserId: user.id };
  if (id) return prisma.knowledgeArea.update({ where: { id }, data });
  return prisma.knowledgeArea.create({ data: { ...data, createdByUserId: user.id } });
}

const contentSchema = z.object({
  key: z.string().trim().min(2).max(100).regex(/^[A-Z0-9_ÄÖÜ-]+$/),
  title: z.string().trim().min(2).max(240),
  shortDescription: z.string().trim().max(1000).optional().nullable(),
  objective: z.string().trim().max(10000).optional().nullable(),
  mainContent: z.string().trim().max(50000).optional().nullable(),
  workingGuidance: z.string().trim().max(50000).optional().nullable(),
  firmStandard: z.string().trim().max(50000).optional().nullable(),
  typicalErrors: z.string().trim().max(30000).optional().nullable(),
  reviewerGuidance: z.string().trim().max(30000).optional().nullable(),
  internalHints: z.string().trim().max(30000).optional().nullable(),
  status: z.enum(KNOWLEDGE_CONTENT_STATUSES),
  contentTypes: z.array(z.enum(KNOWLEDGE_CONTENT_TYPES)).min(1),
  targetAudiences: z.array(z.enum(KNOWLEDGE_TARGET_AUDIENCES)).min(1),
  responsibleUserId: z.number().int().positive().optional().nullable(),
  areaIds: z.array(z.number().int().positive()).min(1),
  primaryAreaId: z.number().int().positive(),
  taskLinks: z.array(z.object({ standardTaskId: z.number().int().positive(), linkType: z.enum(KNOWLEDGE_LINK_TYPES), sortOrder: z.number().int(), mainContent: z.boolean(), contextHint: z.string().trim().max(1000).optional().nullable() })),
  payrollTopicLinks: z.array(z.object({ payrollReconciliationTopicId: z.number().int().positive(), linkType: z.enum(KNOWLEDGE_LINK_TYPES), sortOrder: z.number().int(), mainContent: z.boolean(), contextHint: z.string().trim().max(1000).optional().nullable() })),
  tags: z.array(z.string().trim().min(1).max(80)),
  nextReviewDate: z.date().optional().nullable(),
  majorUpdate: z.boolean().default(false),
});

export type KnowledgeContentInput = unknown;

export const knowledgeContentLinkSchema = z.object({
  title: z.string().trim().min(1, "Der Linktitel ist erforderlich.").max(300),
  url: z.string().trim().refine((value) => value.startsWith("/") || /^https?:\/\/\S+$/i.test(value), "Bitte geben Sie eine gültige HTTP-, HTTPS- oder interne URL an."),
  linkType: z.string().trim().min(1, "Der Linktyp ist erforderlich.").max(120),
  description: z.string().trim().max(2000).transform((value) => value || null),
  sortOrder: z.number().int().min(0).max(999999),
  active: z.boolean(),
});

export async function saveKnowledgeContent(id: number | null, input: KnowledgeContentInput, user: AuthUser) {
  requireManager(user);
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success || !parsed.data.areaIds.includes(parsed.data.primaryAreaId)) throw new KnowledgePlatformError("Bitte prüfen Sie die Pflichtfelder und das primäre Wissensgebiet.", "VALIDATION");
  const value = parsed.data;
  const now = new Date();
  const previous = id ? await prisma.knowledgeContent.findUnique({ where: { id }, select: { status: true, publishedAt: true } }) : null;
  const scalar = {
    key: value.key,
    title: value.title,
    shortDescription: value.shortDescription || null,
    objective: value.objective || null,
    mainContent: value.mainContent || null,
    workingGuidance: value.workingGuidance || null,
    firmStandard: value.firmStandard || null,
    typicalErrors: value.typicalErrors || null,
    reviewerGuidance: value.reviewerGuidance || null,
    internalHints: value.internalHints || null,
    status: value.status,
    contentTypes: [...new Set(value.contentTypes)].join("|"),
    targetAudiences: [...new Set(value.targetAudiences)].join("|"),
    responsibleUserId: value.responsibleUserId || null,
    nextReviewDate: value.nextReviewDate || null,
    updatedByUserId: user.id,
    ...(value.status === "Aktiv" ? { publishedAt: previous?.status === "Aktiv" ? previous.publishedAt ?? now : now, archivedAt: null } : {}),
    ...(value.status === "Archiviert" ? { archivedAt: now } : {}),
    ...(value.majorUpdate ? { majorUpdatedAt: now } : {}),
  };
  return prisma.$transaction(async (tx) => {
    const content = id
      ? await tx.knowledgeContent.update({ where: { id }, data: scalar })
      : await tx.knowledgeContent.create({ data: { ...scalar, createdByUserId: user.id, majorUpdatedAt: value.majorUpdate ? now : null } });
    await tx.knowledgeContentArea.deleteMany({ where: { knowledgeContentId: content.id } });
    await tx.knowledgeContentArea.createMany({ data: [...new Set(value.areaIds)].map((knowledgeAreaId, index) => ({ knowledgeContentId: content.id, knowledgeAreaId, sortOrder: index * 10, primaryArea: knowledgeAreaId === value.primaryAreaId })) });
    await tx.knowledgeContentTaskLink.deleteMany({ where: { knowledgeContentId: content.id } });
    if (value.taskLinks.length) await tx.knowledgeContentTaskLink.createMany({ data: value.taskLinks.map((link) => ({ ...link, contextHint: link.contextHint || null, knowledgeContentId: content.id })) });
    await tx.knowledgeContentPayrollTopicLink.deleteMany({ where: { knowledgeContentId: content.id } });
    if (value.payrollTopicLinks.length) await tx.knowledgeContentPayrollTopicLink.createMany({ data: value.payrollTopicLinks.map((link) => ({ ...link, contextHint: link.contextHint || null, knowledgeContentId: content.id })) });
    await tx.knowledgeContentTag.deleteMany({ where: { knowledgeContentId: content.id } });
    const normalizedTags = new Map(value.tags.map((tag) => [normalizeKnowledgeTag(tag), tag.trim()] as const).filter(([key]) => Boolean(key)));
    for (const [normalizedKey, title] of normalizedTags) {
      const tag = await tx.knowledgeTag.upsert({ where: { normalizedKey }, update: {}, create: { normalizedKey, title } });
      await tx.knowledgeContentTag.create({ data: { knowledgeContentId: content.id, knowledgeTagId: tag.id } });
    }
    await tx.knowledgeContentHistory.create({ data: { knowledgeContentId: content.id, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: id ? "Wissensinhalt" : "Anlage", description: id ? "Wissensinhalt und Zuordnungen aktualisiert." : "Eigenständigen Wissensinhalt angelegt." } });
    return content;
  });
}

export async function recordKnowledgeView(contentId: number, user: AuthUser) {
  if (!user.active) throw new KnowledgePlatformError("Der Wissensinhalt ist nicht verfügbar.", "NOT_ALLOWED");
  const content = await prisma.knowledgeContent.findUnique({ where: { id: contentId }, select: { status: true } });
  if (!content || (content.status !== "Aktiv" && !canManageOrdoCampus(user))) throw new KnowledgePlatformError("Der Wissensinhalt ist nicht verfügbar.", "NOT_FOUND");
  return prisma.knowledgeUserProgress.upsert({
    where: { userId_knowledgeContentId: { userId: user.id, knowledgeContentId: contentId } },
    create: { userId: user.id, knowledgeContentId: contentId },
    update: { lastViewedAt: new Date(), viewCount: { increment: 1 } },
  });
}

export async function setKnowledgeRead(contentId: number, read: boolean, user: AuthUser) {
  if (!user.active) throw new KnowledgePlatformError("Der Wissensinhalt ist nicht verfügbar.", "NOT_ALLOWED");
  const content = await prisma.knowledgeContent.findUnique({ where: { id: contentId }, select: { status: true } });
  if (!content || (content.status !== "Aktiv" && !canManageOrdoCampus(user))) throw new KnowledgePlatformError("Der Wissensinhalt ist nicht verfügbar.", "NOT_FOUND");
  const now = new Date();
  return prisma.knowledgeUserProgress.upsert({
    where: { userId_knowledgeContentId: { userId: user.id, knowledgeContentId: contentId } },
    create: { userId: user.id, knowledgeContentId: contentId, readAt: read ? now : null },
    update: { readAt: read ? now : null },
  });
}

export async function archiveKnowledgeContent(contentId: number, user: AuthUser) {
  requireManager(user);
  return prisma.$transaction(async (tx) => {
    const content = await tx.knowledgeContent.update({ where: { id: contentId }, data: { status: "Archiviert", archivedAt: new Date(), updatedByUserId: user.id } });
    await tx.knowledgeContentHistory.create({ data: { knowledgeContentId: contentId, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: "Status", description: "Wissensinhalt archiviert." } });
    return content;
  });
}

export function knowledgeVisibilityWhere(user: AuthUser) {
  return canManageOrdoCampus(user) ? {} : { status: "Aktiv" };
}
