"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomClientTask,
  createMonthlyPeriod,
  completeRework,
  MonthlyChecklistError,
  reopenPeriod,
  reviewChecklistTask,
  transitionPeriod,
  updateChecklistTask,
  updateCustomClientTask,
  updatePeriod,
  updateChecklistRoles,
  transferChecklistTask,
  addMissingStandardTasks,
  raiseChecklistQuestion,
  answerChecklistQuestion,
} from "@/lib/monthly-checklist-service";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageClients, canManageCustomTasks, canProcessPeriod, canReviewPeriod, canUseAdministrationException, canViewClient } from "@/lib/permissions";
import { serializeExecutionMonths } from "@/lib/task-execution-planning";
import type { ChecklistBatchSaveResult, ChecklistTaskChange, ChecklistTaskSaveResult } from "@/lib/checklist-batch";

async function processingUser(periodId:number){const user=await requireUser();const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(!canProcessPeriod(user,period))throw new Error("Sie dürfen diese Monatscheckliste nicht bearbeiten.");return {user,period};}
async function reviewingUser(periodId:number){const user=await requireUser();const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(!canReviewPeriod(user,period))throw new Error("Sie dürfen diese Monatscheckliste nicht prüfen.");return {user,period};}

export async function confirmPeriodAction(formData: FormData) {
  const user=await requireUser();
  if(!canManageClients(user))throw new Error("Sie sind nicht berechtigt, eine Monatscheckliste anzulegen.");
  const clientId = Number(formData.get("clientId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  try {
    const administrativeException=formData.get("administrativeException")==="on";
    if(administrativeException&&!canUseAdministrationException(user))throw new Error("Administrative Ausnahmen dürfen nur durch die Kanzleileitung genehmigt werden.");
    const exception = administrativeException ? {
      administrativeException: true,
      actorName: user.fullName,
      reason: String(formData.get("exceptionReason") ?? ""),
    } : {};
    const period = await createMonthlyPeriod(clientId, year, month, exception);
    revalidatePath("/monatschecklisten");
    redirect(`/monatschecklisten/${period.id}?erfolg=erzeugt`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "Die Monatscheckliste konnte nicht angelegt werden.";
    const existing = error instanceof MonthlyChecklistError ? error.existingPeriodId : undefined;
    redirect(`/monatschecklisten/neu?clientId=${clientId}&year=${year}&month=${month}&fehler=${encodeURIComponent(message)}${existing ? `&vorhanden=${existing}` : ""}`);
  }
}

export async function updateChecklistRolesAction(periodId: number, formData: FormData) {
  const user=await requireRole("KANZLEILEITUNG");
  try {
    await updateChecklistRoles(periodId, {
      processor: String(formData.get("processor") ?? ""),
      reviewer: String(formData.get("reviewer") ?? ""),
      managementName: String(formData.get("managementName") ?? ""),
      processorUserId:formData.get("processorUserId")?Number(formData.get("processorUserId")):null,
      reviewerUserId:formData.get("reviewerUserId")?Number(formData.get("reviewerUserId")):null,
      managementUserId:formData.get("managementUserId")?Number(formData.get("managementUserId")):null,
      reason: String(formData.get("reason") ?? ""),
      actorName: user.fullName,
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=rollen`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Rollen konnten nicht geändert werden.")}`);
  }
}

export async function transferChecklistTaskAction(taskId: number, periodId: number, formData: FormData) {
  const {user}=await processingUser(periodId);
  try {
    await transferChecklistTask(taskId, {
      reason: String(formData.get("transferReason") ?? ""),
      actorName: user.fullName,
      targetYear: Number(formData.get("transferTargetYear")),
      targetMonth: Number(formData.get("transferTargetMonth")),
      expectedAction: String(formData.get("transferExpectedAction") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=uebertragen#aufgabe-${taskId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Aufgabe konnte nicht übertragen werden.")}#aufgabe-${taskId}`);
  }
}

export async function updateChecklistTaskAction(taskId: number, periodId: number, formData: FormData) {
  try {
    const {user}=await processingUser(periodId);
    await updateChecklistTask(taskId, {
      status: String(formData.get("status") ?? ""),
      processingNote: String(formData.get("processingNote") ?? ""),
      processorInitials: user.fullName,
      notApplicableReason: String(formData.get("notApplicableReason") ?? ""),
      carryProcessingNote: formData.get("carryProcessingNote") === "on",
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    return { ok: true, message: "Gespeichert" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Die Aufgabe konnte nicht gespeichert werden." };
  }
}

export async function saveChecklistTaskChangesAction(periodId: number, changes: ChecklistTaskChange[]): Promise<ChecklistBatchSaveResult> {
  let user;
  try {
    ({user}=await processingUser(periodId));
  } catch (error) {
    return { results: changes.map(({taskId}) => failedTaskResult(taskId, error, "FORBIDDEN")) };
  }
  const ordered = [...changes].sort((left,right)=>left.taskId-right.taskId);
  const results: ChecklistTaskSaveResult[] = [];
  for (const change of ordered) {
    try {
      const assignment=await prisma.checklistTask.findUnique({where:{id:change.taskId},select:{periodId:true}});
      if(!assignment)throw new MonthlyChecklistError("TASK_NOT_FOUND","Die Checklistenaufgabe wurde nicht gefunden.");
      if(assignment.periodId!==periodId)throw new Error("Diese Aufgabe gehört nicht zur ausgewählten Monatscheckliste.");
      const updated = await updateChecklistTask(change.taskId, {
        status: change.status,
        processingNote: change.processingNote,
        processorInitials: user.fullName,
        notApplicableReason: change.notApplicableReason,
        carryProcessingNote: change.carryProcessingNote,
        expectedUpdatedAt: change.expectedUpdatedAt,
      });
      results.push({
        taskId: change.taskId,
        ok: true,
        code: "SAVED",
        message: "Gespeichert",
        saved: {
          status: updated.status,
          processingNote: updated.processingNote ?? "",
          notApplicableReason: updated.notApplicableReason ?? "",
          carryProcessingNote: updated.carryProcessingNote,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      results.push(failedTaskResult(change.taskId,error,error instanceof MonthlyChecklistError?undefined:"FORBIDDEN"));
    }
  }
  if(results.some((result)=>result.ok)){
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/monatschecklisten");
  }
  return {results};
}

function failedTaskResult(taskId:number,error:unknown,fallback:ChecklistTaskSaveResult["code"]="TECHNICAL"):ChecklistTaskSaveResult{
  const message=error instanceof Error?error.message:"Die Aufgabe konnte nicht gespeichert werden.";
  const code="code" in (error as object??{})?String((error as {code?:unknown}).code):"";
  return {
    taskId,
    ok:false,
    code:code==="CONFLICT"?"CONFLICT":code==="TASK_NOT_FOUND"?"NOT_FOUND":code==="NOT_ALLOWED"?"FORBIDDEN":["INVALID_INPUT","REASON_REQUIRED","PERIOD_CLOSED"].includes(code)?"VALIDATION":fallback,
    message,
  };
}

export async function addMissingStandardTasksAction(periodId: number) {
  const { user } = await processingUser(periodId);
  try {
    const result = await addMissingStandardTasks(periodId, user.fullName);
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=${result.added ? `ergaenzt-${result.added}` : "keine-fehlenden"}#aufgaben`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Fehlende Standardaufgaben konnten nicht übernommen werden.")}#aufgaben`);
  }
}

export async function updatePeriodAction(periodId: number, formData: FormData) {
  await processingUser(periodId);
  try {
    await updatePeriod(periodId, {
      processingStatus: String(formData.get("processingStatus") ?? ""),
      generalNote: String(formData.get("generalNote") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/monatschecklisten");
    redirect(`/monatschecklisten/${periodId}?erfolg=periode`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Monatscheckliste konnte nicht gespeichert werden.")}`);
  }
}

export async function transitionPeriodAction(periodId: number, action: Parameters<typeof transitionPeriod>[1], formData: FormData) {
  try {
    const reviewAction=["BEGIN_REVIEW","RETURN_REWORK","COMPLETE_REVIEW"].includes(action);
    const {user}=reviewAction?await reviewingUser(periodId):await processingUser(periodId);
    const updated = await transitionPeriod(periodId, action, user.fullName);
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/monatschecklisten");
    if (action === "COMPLETE_REVIEW" && formData.get("createFollowing") === "1") {
      const next = updated.month === 12 ? { year: updated.calendarYear + 1, month: 1 } : { year: updated.calendarYear, month: updated.month + 1 };
      redirect(`/monatschecklisten/neu?clientId=${updated.clientId}&year=${next.year}&month=${next.month}&vorschau=1`);
    }
    redirect(`/monatschecklisten/${periodId}?erfolg=workflow`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Statusänderung ist fehlgeschlagen.")}`);
  }
}

export async function reviewTaskAction(taskId: number, periodId: number, formData: FormData) {
  const {user}=await reviewingUser(periodId);
  try {
    await reviewChecklistTask(taskId, {
      reviewStatus: String(formData.get("reviewStatus") ?? ""),
      reviewerInitials: user.fullName,
      reviewNote: String(formData.get("reviewNote") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=pruefung#aufgabe-${taskId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Prüfung konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function completeReworkAction(taskId: number, periodId: number, formData: FormData) {
  const {user}=await processingUser(periodId);
  try {
    await completeRework(taskId, {
      response: String(formData.get("processorResponse") ?? ""),
      actorInitials: user.fullName,
      processingNote: String(formData.get("processingNote") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=nachbearbeitung#aufgabe-${taskId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Nachbearbeitung konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function raiseChecklistQuestionAction(taskId:number,periodId:number,formData:FormData){
  const {user}=await processingUser(periodId);
  try{
    await raiseChecklistQuestion(taskId,{question:String(formData.get("question")??""),actorName:user.fullName});
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/");
    redirect(`/monatschecklisten/${periodId}?erfolg=rueckfrage#aufgabe-${taskId}`);
  }catch(error){
    if(isRedirect(error))throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Die Rückfrage konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function answerChecklistQuestionAction(taskId:number,periodId:number,formData:FormData){
  const {user}=await reviewingUser(periodId);
  try{
    await answerChecklistQuestion(taskId,{answer:String(formData.get("answer")??""),actorName:user.fullName,actorUserId:user.id});
    revalidatePath(`/monatschecklisten/${periodId}`);revalidatePath("/");
    redirect(`/monatschecklisten/${periodId}?erfolg=antwort#aufgabe-${taskId}`);
  }catch(error){
    if(isRedirect(error))throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Die Antwort konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function reopenPeriodAction(periodId: number, formData: FormData) {
  const user=await requireRole("KANZLEILEITUNG");
  try {
    await reopenPeriod(
      periodId,
      user.fullName,
      String(formData.get("reason") ?? ""),
      formData.get("confirmed") === "on",
    );
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/monatschecklisten");
    redirect(`/monatschecklisten/${periodId}?erfolg=wiedereroeffnet`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Wiederöffnung ist fehlgeschlagen.")}`);
  }
}

export async function createCustomTaskAction(clientId: number, formData: FormData) {
  const user=await requireUser();const client=await prisma.client.findUniqueOrThrow({where:{id:clientId}});
  if(!canManageCustomTasks(user)||!canViewClient(user,client))throw new Error("Sie dürfen mandantenspezifische Aufgabenvorlagen nicht verwalten.");
  try {
    await createCustomClientTask({
      clientId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      categoryId: Number(formData.get("categoryId")),
      active: formData.get("active") === "on",
      taskType: String(formData.get("taskType") ?? ""),
      validFrom: new Date(`${String(formData.get("validFrom"))}T00:00:00Z`),
      validUntil: formData.get("validUntil") ? new Date(`${String(formData.get("validUntil"))}T23:59:59Z`) : null,
      executionYear: formData.get("executionYear") ? Number(formData.get("executionYear")) : null,
      executionMonth: formData.get("executionMonth") ? Number(formData.get("executionMonth")) : null,
      executionRhythm: String(formData.get("executionRhythm") ?? "") || null,
      executionMonths: serializeExecutionMonths(formData.getAll("customExecutionMonths").map(Number)),
      taskArea: String(formData.get("taskArea") ?? "") || null,
      processor: String(formData.get("processor") ?? ""),
      reviewer: String(formData.get("reviewer") ?? ""),
    });
    revalidatePath(`/mandanten/${clientId}`);
    redirect(`/mandanten/${clientId}/zusatzaufgaben?erfolg=angelegt`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/mandanten/${clientId}/zusatzaufgaben?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Zusatzaufgabe konnte nicht gespeichert werden.")}`);
  }
}

export async function updateCustomTaskAction(clientId: number, taskId: number, formData: FormData) {
  const user=await requireUser();const client=await prisma.client.findUniqueOrThrow({where:{id:clientId}});
  if(!canManageCustomTasks(user)||!canViewClient(user,client))throw new Error("Sie dürfen mandantenspezifische Aufgabenvorlagen nicht verwalten.");
  try {
    await updateCustomClientTask(taskId, customInput(clientId, formData));
    revalidatePath(`/mandanten/${clientId}/zusatzaufgaben`);
    redirect(`/mandanten/${clientId}/zusatzaufgaben/${taskId}?erfolg=gespeichert`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/mandanten/${clientId}/zusatzaufgaben/${taskId}/bearbeiten?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Zusatzaufgabe konnte nicht gespeichert werden.")}`);
  }
}

function customInput(clientId: number, formData: FormData) {
  return {
    clientId,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    categoryId: Number(formData.get("categoryId")),
    active: formData.get("active") === "on",
    taskType: String(formData.get("taskType") ?? ""),
    validFrom: new Date(`${String(formData.get("validFrom"))}T00:00:00Z`),
    validUntil: formData.get("validUntil") ? new Date(`${String(formData.get("validUntil"))}T23:59:59Z`) : null,
    executionYear: formData.get("executionYear") ? Number(formData.get("executionYear")) : null,
    executionMonth: formData.get("executionMonth") ? Number(formData.get("executionMonth")) : null,
    executionRhythm: String(formData.get("executionRhythm") ?? "") || null,
    executionMonths: serializeExecutionMonths(formData.getAll("customExecutionMonths").map(Number)),
    taskArea: String(formData.get("taskArea") ?? "") || null,
    processor: String(formData.get("processor") ?? ""),
    reviewer: String(formData.get("reviewer") ?? ""),
  };
}

function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT");
}
