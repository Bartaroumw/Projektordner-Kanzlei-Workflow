"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus } from "@/lib/permissions";
import { KNOWLEDGE_TARGET_AUDIENCES } from "@/lib/knowledge-platform-catalog";
import { archiveKnowledgeContent, knowledgeContentLinkSchema, KnowledgePlatformError, saveKnowledgeArea, saveKnowledgeContent } from "@/lib/knowledge-platform-service";
import { prisma } from "@/lib/prisma";
import { updateKnowledgeContentAttachment, uploadKnowledgeContentAttachment } from "@/lib/ordo-campus-attachment-service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => Number(text(form, key)) || null;
const values = (form: FormData, key: string) => form.getAll(key).map((value) => String(value)).filter(Boolean);

export async function saveKnowledgeContentAction(form: FormData) {
  const user = await requireUser(); const id = number(form, "id");
  const taskIds = values(form, "taskId").map(Number);
  const topicIds = values(form, "topicId").map(Number);
  const primaryTaskId = number(form, "taskPrimaryId"); const primaryTopicId = number(form, "topicPrimaryId");
  const content = await saveKnowledgeContent(id, {
    key: text(form, "key").toUpperCase(), title: text(form, "title"), shortDescription: text(form, "shortDescription"), objective: text(form, "objective"), mainContent: text(form, "mainContent"), workingGuidance: text(form, "workingGuidance"), firmStandard: text(form, "firmStandard"), typicalErrors: text(form, "typicalErrors"), reviewerGuidance: text(form, "reviewerGuidance"), internalHints: text(form, "internalHints"), status: text(form, "status") as "Entwurf" | "Aktiv" | "Archiviert", contentTypes: values(form, "contentTypes"), targetAudiences: values(form, "targetAudiences"), responsibleUserId: number(form, "responsibleUserId"), areaIds: values(form, "areaIds").map(Number), primaryAreaId: Number(text(form, "primaryAreaId")), nextReviewDate: text(form, "nextReviewDate") ? new Date(`${text(form, "nextReviewDate")}T12:00:00`) : null, majorUpdate: form.get("majorUpdate") === "1", tags: text(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean),
    taskLinks: taskIds.map((standardTaskId) => ({ standardTaskId, linkType: text(form, `taskType_${standardTaskId}`), sortOrder: Number(text(form, `taskOrder_${standardTaskId}`)) || 0, mainContent: standardTaskId === primaryTaskId, contextHint: text(form, `taskHint_${standardTaskId}`) || null })),
    payrollTopicLinks: topicIds.map((payrollReconciliationTopicId) => ({ payrollReconciliationTopicId, linkType: text(form, `topicType_${payrollReconciliationTopicId}`), sortOrder: Number(text(form, `topicOrder_${payrollReconciliationTopicId}`)) || 0, mainContent: payrollReconciliationTopicId === primaryTopicId, contextHint: text(form, `topicHint_${payrollReconciliationTopicId}`) || null })),
  }, user);
  redirect(`/verwaltung/wissensmanagement/wissen/${content.id}?erfolg=1`);
}

export async function archiveKnowledgeContentAction(form: FormData) { const user = await requireUser(); const id = Number(form.get("id")); await archiveKnowledgeContent(id, user); redirect("/verwaltung/wissensmanagement?status=Archiviert&erfolg=1"); }

export async function copyKnowledgeContentAction(form: FormData) {
  const user = await requireUser(); if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement");
  const source = await prisma.knowledgeContent.findUniqueOrThrow({ where: { id: Number(form.get("id")) }, include: { areas: true, taskLinks: true, payrollTopicLinks: true, tags: { include: { knowledgeTag: true } } } });
  const copy = await saveKnowledgeContent(null, { key: `${source.key}-KOPIE-${Date.now().toString().slice(-6)}`, title: `${source.title} – Kopie`, shortDescription: source.shortDescription, objective: source.objective, mainContent: source.mainContent, workingGuidance: source.workingGuidance, firmStandard: source.firmStandard, typicalErrors: source.typicalErrors, reviewerGuidance: source.reviewerGuidance, internalHints: source.internalHints, status: "Entwurf", contentTypes: source.contentTypes.split("|"), targetAudiences: source.targetAudiences.split("|"), responsibleUserId: source.responsibleUserId, areaIds: source.areas.map((area) => area.knowledgeAreaId), primaryAreaId: source.areas.find((area) => area.primaryArea)?.knowledgeAreaId ?? source.areas[0].knowledgeAreaId, taskLinks: [], payrollTopicLinks: [], tags: source.tags.map((tag) => tag.knowledgeTag.title), nextReviewDate: source.nextReviewDate, majorUpdate: false }, user);
  redirect(`/verwaltung/wissensmanagement/wissen/${copy.id}?erfolg=1`);
}

export async function saveKnowledgeAreaAction(form: FormData) {
  const user = await requireUser(); await saveKnowledgeArea(number(form, "id"), { key: text(form, "key").toUpperCase(), title: text(form, "title"), shortDescription: text(form, "shortDescription"), description: text(form, "description"), icon: text(form, "icon"), sortOrder: Number(text(form, "sortOrder")) || 0, parentId: number(form, "parentId"), status: text(form, "status") as "Aktiv" | "Archiviert" }, user); revalidatePath("/verwaltung/wissensmanagement/gebiete"); redirect("/verwaltung/wissensmanagement/gebiete?erfolg=1");
}

export async function saveLearningPathAction(form: FormData) {
  const user = await requireUser();
  if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement");
  const id = number(form, "id");
  const key = text(form, "key").toUpperCase();
  const title = text(form, "title");
  const shortDescription = text(form, "shortDescription");
  const objective = text(form, "objective");
  const targetAudiences = values(form, "targetAudiences");
  const status = text(form, "status");
  if (!/^[A-Z0-9_ÄÖÜ-]{2,100}$/.test(key) || title.length < 2 || title.length > 240 || shortDescription.length < 2 || shortDescription.length > 1000 || objective.length < 2 || objective.length > 10000 || !targetAudiences.length || targetAudiences.some((audience) => !(KNOWLEDGE_TARGET_AUDIENCES as readonly string[]).includes(audience)) || !["Entwurf", "Aktiv", "Archiviert"].includes(status)) throw new KnowledgePlatformError("Bitte prüfen Sie die Angaben zum Lernpfad.", "VALIDATION");
  const data = { key, title, shortDescription, objective, targetAudiences: [...new Set(targetAudiences)].join("|"), status, sortOrder: Number(text(form, "sortOrder")) || 0, updatedByUserId: user.id };
  const selectedItems = [...new Set(values(form, "contentIds").map(Number).filter((contentId) => Number.isInteger(contentId) && contentId > 0))]
    .map((knowledgeContentId) => ({ knowledgeContentId, requestedOrder: Number(text(form, `contentOrder_${knowledgeContentId}`)) || Number.MAX_SAFE_INTEGER }))
    .sort((left, right) => left.requestedOrder - right.requestedOrder || left.knowledgeContentId - right.knowledgeContentId);
  const path = await prisma.$transaction(async (tx) => {
    const saved = id ? await tx.knowledgeLearningPath.update({ where: { id }, data }) : await tx.knowledgeLearningPath.create({ data: { ...data, createdByUserId: user.id } });
    await tx.knowledgeLearningPathItem.deleteMany({ where: { learningPathId: saved.id } });
    if (selectedItems.length) await tx.knowledgeLearningPathItem.createMany({ data: selectedItems.map((item, index) => ({ learningPathId: saved.id, knowledgeContentId: item.knowledgeContentId, sortOrder: (index + 1) * 10 })) });
    return saved;
  });
  redirect(`/verwaltung/wissensmanagement/lernpfade/${path.id}?erfolg=1`);
}

export async function createKnowledgeLinkAction(form: FormData) {
  const user = await requireUser();
  if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement");
  const knowledgeContentId = Number(form.get("id"));
  const parsed = knowledgeContentLinkSchema.safeParse({ title: text(form, "linkTitle"), url: text(form, "linkUrl"), linkType: text(form, "linkType"), description: text(form, "linkDescription"), sortOrder: Number(text(form, "linkSortOrder")) || 0, active: true });
  if (!parsed.success) throw new KnowledgePlatformError(parsed.error.issues[0].message, "VALIDATION");
  const link = await prisma.knowledgeContentLink.create({ data: { knowledgeContentId, ...parsed.data } });
  await prisma.knowledgeContentHistory.create({ data: { knowledgeContentId, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: "Links", description: `Link „${link.title}“ ergänzt.` } });
  redirect(`/verwaltung/wissensmanagement/wissen/${knowledgeContentId}?erfolg=1`);
}

export async function updateKnowledgeLinkAction(form: FormData) {
  const user = await requireUser();
  if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement");
  const id = Number(form.get("linkId"));
  const existing = await prisma.knowledgeContentLink.findUniqueOrThrow({ where: { id } });
  const parsed = knowledgeContentLinkSchema.safeParse({ title: text(form, "title"), url: text(form, "url"), linkType: text(form, "linkType"), description: text(form, "description"), sortOrder: Number(text(form, "sortOrder")) || 0, active: form.get("active") === "1" });
  if (!parsed.success) throw new KnowledgePlatformError(parsed.error.issues[0].message, "VALIDATION");
  await prisma.knowledgeContentLink.update({ where: { id }, data: parsed.data });
  await prisma.knowledgeContentHistory.create({ data: { knowledgeContentId: existing.knowledgeContentId, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: "Links", description: `Link „${parsed.data.title}“ aktualisiert.` } });
  redirect(`/verwaltung/wissensmanagement/wissen/${existing.knowledgeContentId}?erfolg=1`);
}
export async function uploadKnowledgeAttachmentAction(form:FormData){const user=await requireUser();const knowledgeContentId=Number(form.get("id"));const file=form.get("file");if(!(file instanceof File))throw new Error("Bitte wählen Sie eine Datei aus.");await uploadKnowledgeContentAttachment(knowledgeContentId,{displayName:text(form,"displayName"),description:text(form,"description"),sortOrder:Number(text(form,"sortOrder"))||0,originalFileName:file.name,mimeType:file.type,bytes:new Uint8Array(await file.arrayBuffer())},user);redirect(`/verwaltung/wissensmanagement/wissen/${knowledgeContentId}?erfolg=1`)}
export async function updateKnowledgeAttachmentAction(form:FormData){const user=await requireUser();const attachment=await updateKnowledgeContentAttachment(Number(form.get("attachmentId")),{displayName:text(form,"displayName"),description:text(form,"description"),sortOrder:Number(text(form,"sortOrder"))||0,active:form.get("active")==="1"},user);redirect(`/verwaltung/wissensmanagement/wissen/${attachment.knowledgeContentId}?erfolg=1`)}
