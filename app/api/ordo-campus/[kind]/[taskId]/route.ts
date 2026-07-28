import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canManageOrdoCampus,
  canReadCampusReviewerGuidance,
  canViewAnnualChecklist,
  canViewClient,
  canViewPayrollReconciliation,
} from "@/lib/permissions";
import { campusContentIsVisible, getCampusKnowledgeForChecklistTask } from "@/lib/ordo-campus-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; taskId: string }> },
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Bitte melden Sie sich erneut an." }, { status: 401 });

  const { kind, taskId: rawTaskId } = await params;
  const taskId = Number(rawTaskId);
  const campusKind = kind === "monat" ? "Monat" : kind === "jahresabschluss" ? "Jahresabschluss" : kind === "fibu-lohn" ? "FiBu-Lohn" : null;
  if (!campusKind || !Number.isInteger(taskId)) {
    return NextResponse.json({ error: "Die Aufgabe wurde nicht gefunden." }, { status: 404 });
  }

  const taskAccess = campusKind === "Monat"
    ? await prisma.checklistTask.findUnique({
        where: { id: taskId },
        select: { standardTaskId: true, period: { select: { processorUserId: true, reviewerUserId: true, managementUserId: true } } },
      }).then((task) => task ? { standardTaskId: task.standardTaskId, allowed: canViewClient(user, task.period) } : null)
    : campusKind === "Jahresabschluss" ? await prisma.annualChecklistTask.findUnique({
        where: { id: taskId },
        select: { standardTaskId: true, annualChecklist: { select: { processorUserId: true, reviewerUserId: true, managementUserId: true } } },
      }).then((task) => task ? { standardTaskId: task.standardTaskId, allowed: canViewAnnualChecklist(user, task.annualChecklist) } : null)
    : await prisma.payrollReconciliationItem.findUnique({
        where: { id: taskId },
        select: {
          sourceTopic: { select: { campusStandardTaskId: true } },
          reconciliation: { select: { processorUserId: true, reviewerUserId: true, payrollUserId: true } },
        },
      }).then((item) => item ? {
        standardTaskId: item.sourceTopic.campusStandardTaskId,
        allowed: canViewPayrollReconciliation(user, item.reconciliation),
      } : null);

  if (!taskAccess?.allowed) {
    return NextResponse.json({ error: "Sie dürfen das Wissen zu dieser Aufgabe nicht öffnen." }, { status: 403 });
  }

  const knowledge = campusKind === "FiBu-Lohn"
    ? taskAccess.standardTaskId
      ? await prisma.standardTaskKnowledge.findUnique({
          where: { standardTaskId: taskAccess.standardTaskId },
          include: { links: { where: canManageOrdoCampus(user) ? {} : { active: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] } },
        }).then((entry) => entry && campusContentIsVisible(entry.status, user) ? entry : null)
      : null
    : await getCampusKnowledgeForChecklistTask(campusKind, taskId, user);
  if (!knowledge) {
    return NextResponse.json({
      knowledge: null,
      canEdit: Boolean(taskAccess.standardTaskId && canManageOrdoCampus(user)),
      editHref: taskAccess.standardTaskId ? `/standardaufgaben/${taskAccess.standardTaskId}/campus` : null,
    });
  }

  const showReviewerGuidance = canReadCampusReviewerGuidance(user);
  const attachments = await prisma.standardTaskKnowledgeAttachment.findMany({
    where: { standardTaskId: knowledge.standardTaskId, status: "Aktiv" },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    select: { id: true, displayName: true, fileExtension: true, fileSizeBytes: true, description: true },
  });
  return NextResponse.json({
    knowledge: {
      standardTaskId: knowledge.standardTaskId,
      status: knowledge.status,
      shortDescription: knowledge.shortDescription,
      objective: knowledge.objective,
      firmStandard: knowledge.firmStandard,
      processingGuidance: knowledge.processingGuidance,
      reviewerGuidance: showReviewerGuidance ? knowledge.reviewerGuidance : null,
      typicalErrors: knowledge.typicalErrors,
      internalHints: knowledge.internalHints,
      links: knowledge.links.filter((link) => link.active).map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        linkType: link.linkType,
        description: link.description,
      })),
      attachments,
    },
    canEdit: canManageOrdoCampus(user),
  });
}
