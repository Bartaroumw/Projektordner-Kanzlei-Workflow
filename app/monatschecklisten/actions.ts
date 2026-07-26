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
} from "@/lib/monthly-checklist-service";

export async function confirmPeriodAction(formData: FormData) {
  const clientId = Number(formData.get("clientId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  try {
    const period = await createMonthlyPeriod(clientId, year, month);
    revalidatePath("/monatschecklisten");
    redirect(`/monatschecklisten/${period.id}?erfolg=erzeugt`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : "Die Periode konnte nicht erzeugt werden.";
    const existing = error instanceof MonthlyChecklistError ? error.existingPeriodId : undefined;
    redirect(`/monatschecklisten/neu?clientId=${clientId}&year=${year}&month=${month}&fehler=${encodeURIComponent(message)}${existing ? `&vorhanden=${existing}` : ""}`);
  }
}

export async function updateChecklistTaskAction(taskId: number, periodId: number, formData: FormData) {
  try {
    await updateChecklistTask(taskId, {
      status: String(formData.get("status") ?? ""),
      processingNote: String(formData.get("processingNote") ?? ""),
      processorInitials: String(formData.get("processorInitials") ?? ""),
      notApplicableReason: String(formData.get("notApplicableReason") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=aufgabe`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Aufgabe konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function updatePeriodAction(periodId: number, formData: FormData) {
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
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Periode konnte nicht gespeichert werden.")}`);
  }
}

export async function transitionPeriodAction(periodId: number, action: Parameters<typeof transitionPeriod>[1], formData: FormData) {
  try {
    await transitionPeriod(periodId, action, String(formData.get("actorInitials") ?? ""));
    revalidatePath(`/monatschecklisten/${periodId}`);
    revalidatePath("/monatschecklisten");
    redirect(`/monatschecklisten/${periodId}?erfolg=workflow`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Statusänderung ist fehlgeschlagen.")}`);
  }
}

export async function reviewTaskAction(taskId: number, periodId: number, formData: FormData) {
  try {
    await reviewChecklistTask(taskId, {
      reviewStatus: String(formData.get("reviewStatus") ?? ""),
      reviewerInitials: String(formData.get("reviewerInitials") ?? ""),
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
  try {
    await completeRework(taskId, {
      response: String(formData.get("processorResponse") ?? ""),
      actorInitials: String(formData.get("respondedBy") ?? ""),
      processingNote: String(formData.get("processingNote") ?? ""),
    });
    revalidatePath(`/monatschecklisten/${periodId}`);
    redirect(`/monatschecklisten/${periodId}?erfolg=nachbearbeitung#aufgabe-${taskId}`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    redirect(`/monatschecklisten/${periodId}?fehler=${encodeURIComponent(error instanceof Error ? error.message : "Die Nachbearbeitung konnte nicht gespeichert werden.")}#aufgabe-${taskId}`);
  }
}

export async function reopenPeriodAction(periodId: number, formData: FormData) {
  try {
    await reopenPeriod(
      periodId,
      String(formData.get("actorInitials") ?? ""),
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
    processor: String(formData.get("processor") ?? ""),
    reviewer: String(formData.get("reviewer") ?? ""),
  };
}

function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT");
}
