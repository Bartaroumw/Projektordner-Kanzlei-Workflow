import type {
  AnnualProfile,
  Client,
  CustomClientTask,
  StandardTask,
  TaskCategory,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PERIOD_STATUSES = ["Offen", "In Bearbeitung", "Zur Prüfung", "In Prüfung", "Nachbearbeitung", "Abgeschlossen"] as const;
export const CHECKLIST_TASK_STATUSES = ["Offen", "In Bearbeitung", "Erledigt", "Nicht zutreffend"] as const;
export const REVIEW_STATUSES = ["Nicht geprüft", "In Prüfung", "In Ordnung", "Rückfrage", "Beanstandung", "Erledigt nach Nachbearbeitung"] as const;
export const CUSTOM_TASK_TYPES = [
  "Wiederkehrend monatlich",
  "Wiederkehrend quartalsweise",
  "Wiederkehrend jährlich",
  "Einmalig",
] as const;

type StandardTaskWithCategory = StandardTask & { category: TaskCategory };
type CustomTaskWithCategory = CustomClientTask & { category: TaskCategory };

export class MonthlyChecklistError extends Error {
  constructor(
    public code:
      | "CLIENT_NOT_FOUND"
      | "PROFILE_MISSING"
      | "INVALID_QUARTER_MONTH"
      | "PERIOD_EXISTS"
      | "INVALID_INPUT"
      | "TASK_NOT_FOUND"
      | "REASON_REQUIRED"
      | "MANDATORY_TASKS_OPEN"
      | "INITIALS_REQUIRED"
      | "INVALID_TRANSITION"
      | "REVIEW_NOTE_REQUIRED"
      | "OPEN_REVIEW_POINT_REQUIRED"
      | "OPEN_REVIEW_POINTS"
      | "PERIOD_CLOSED"
      | "RESPONSE_REQUIRED"
      | "REOPEN_REASON_REQUIRED",
    message: string,
    public existingPeriodId?: number,
  ) {
    super(message);
  }
}

export function periodLabel(cadence: string, year: number, month: number) {
  if (cadence === "vierteljährlich") {
    return `${month / 3}. Quartal ${year}`;
  }
  return `${new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "Europe/Berlin" }).format(new Date(Date.UTC(2026, month - 1, 1)))} ${year}`;
}

export function validatePeriodMonth(cadence: string, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Bitte wählen Sie einen gültigen Monat aus.");
  }
  if (cadence === "vierteljährlich" && ![3, 6, 9, 12].includes(month)) {
    throw new MonthlyChecklistError(
      "INVALID_QUARTER_MONTH",
      "Bei vierteljährlicher Bearbeitung sind ausschließlich März, Juni, September und Dezember zulässig.",
    );
  }
}

function multiMatches(stored: string, actual: string) {
  const values = stored.split(";").map((value) => value.trim());
  return values.includes("Alle") || values.includes(actual);
}

function conditionMatches(condition: string, actual: boolean) {
  return condition === "Alle" || (condition === "Ja" ? actual : !actual);
}

export function standardTaskMatches(
  task: StandardTaskWithCategory,
  profile: AnnualProfile,
  cadence: string,
  month: number,
) {
  if (!task.active || task.checklistType !== "Monat") return false;
  if (task.rhythm === "Jährlich") return false;
  if (task.rhythm === "Quartalsweise") {
    if (cadence !== "vierteljährlich" && ![3, 6, 9, 12].includes(month)) return false;
  } else if (task.rhythm === "Bestimmter Monat" && task.executionMonth !== month) {
    return false;
  }
  return (
    multiMatches(task.legalFormGroups, profile.legalFormGroup) &&
    multiMatches(task.profitDeterminationMethods, profile.profitDeterminationMethod) &&
    conditionMatches(task.cashCondition, profile.hasCashRegister) &&
    conditionMatches(task.payrollCondition, profile.hasPayroll) &&
    conditionMatches(task.fixedAssetsCondition, profile.hasFixedAssets) &&
    conditionMatches(task.receivablesPayablesCondition, profile.hasReceivablesPayables) &&
    conditionMatches(task.loansCondition, profile.hasLoans) &&
    conditionMatches(task.vatCondition, profile.subjectToVat) &&
    conditionMatches(task.permanentExtensionCondition, profile.hasPermanentExtension)
  );
}

export function customTaskMatches(
  task: CustomTaskWithCategory,
  cadence: string,
  year: number,
  month: number,
) {
  if (!task.active || task.taskType === "Wiederkehrend jährlich") return false;
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  if (task.validFrom > periodEnd || (task.validUntil && task.validUntil < periodStart)) return false;
  if (task.taskType === "Wiederkehrend quartalsweise") {
    return cadence === "vierteljährlich" || [3, 6, 9, 12].includes(month);
  }
  if (task.taskType === "Einmalig") {
    return task.executionYear === year && task.executionMonth === month;
  }
  return task.taskType === "Wiederkehrend monatlich";
}

export async function previewMonthlyPeriod(clientId: number, year: number, month: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      annualProfiles: { where: { calendarYear: year } },
      periods: { where: { calendarYear: year, month, checklistType: "Monat" } },
      customTasks: { include: { category: true } },
    },
  });
  if (!client) throw new MonthlyChecklistError("CLIENT_NOT_FOUND", "Der Mandant wurde nicht gefunden.");
  validatePeriodMonth(client.cadence, month);
  const profile = client.annualProfiles[0];
  if (!profile) {
    throw new MonthlyChecklistError(
      "PROFILE_MISSING",
      `Für den Mandanten ist für das Kalenderjahr ${year} noch kein Jahresprofil vorhanden.`,
    );
  }
  const existing = client.periods[0];
  if (existing) {
    throw new MonthlyChecklistError(
      "PERIOD_EXISTS",
      "Für diesen Mandanten und diese Periode besteht bereits eine Monatscheckliste.",
      existing.id,
    );
  }
  const standardTasks = await prisma.standardTask.findMany({ include: { category: true } });
  const matchingStandardTasks = standardTasks.filter((task) =>
    standardTaskMatches(task, profile, client.cadence, month),
  );
  const matchingCustomTasks = client.customTasks.filter((task) =>
    customTaskMatches(task, client.cadence, year, month),
  );
  const categories = [...new Set([
    ...matchingStandardTasks.map((task) => task.category.name),
    ...matchingCustomTasks.map((task) => task.category.name),
  ])].sort();
  return {
    client,
    profile,
    label: periodLabel(client.cadence, year, month),
    standardTasks: matchingStandardTasks,
    customTasks: matchingCustomTasks,
    categories,
  };
}

export async function createMonthlyPeriod(clientId: number, year: number, month: number) {
  const preview = await previewMonthlyPeriod(clientId, year, month);
  try {
    return await prisma.$transaction(async (transaction) => {
      const period = await transaction.accountingPeriod.create({
        data: {
          clientId,
          calendarYear: year,
          month,
          periodLabel: preview.label,
          checklistType: "Monat",
          processingStatus: "Offen",
          processorSnapshot: preview.client.processor,
          reviewerSnapshot: preview.client.reviewer,
          profileLegalFormGroup: preview.profile.legalFormGroup,
          profileProfitDeterminationMethod: preview.profile.profitDeterminationMethod,
          profileHasCashRegister: preview.profile.hasCashRegister,
          profileHasPayroll: preview.profile.hasPayroll,
          profileHasFixedAssets: preview.profile.hasFixedAssets,
          profileHasReceivablesPayables: preview.profile.hasReceivablesPayables,
          profileHasLoans: preview.profile.hasLoans,
          profileSubjectToVat: preview.profile.subjectToVat,
          profileHasPermanentExtension: preview.profile.hasPermanentExtension,
        },
      });
      if (preview.standardTasks.length) {
        await transaction.checklistTask.createMany({
          data: preview.standardTasks.map((task) => ({
            periodId: period.id,
            standardTaskId: task.id,
            taskIdSnapshot: task.taskId,
            categorySnapshot: task.category.name,
            categorySortOrder: task.category.sortOrder,
            subcategorySnapshot: task.subcategory,
            titleSnapshot: task.title,
            workInstructionSnapshot: task.workInstruction,
            reviewInstructionSnapshot: task.reviewInstruction,
            mandatorySnapshot: task.mandatory,
            sortOrderSnapshot: task.sortOrder,
            professionalVersionSnapshot: task.professionalVersion,
            origin: "Standardaufgabe",
          })),
        });
      }
      if (preview.customTasks.length) {
        await transaction.checklistTask.createMany({
          data: preview.customTasks.map((task) => ({
            periodId: period.id,
            customClientTaskId: task.id,
            taskIdSnapshot: `MAND-${task.id}`,
            categorySnapshot: task.category.name,
            categorySortOrder: task.category.sortOrder,
            titleSnapshot: task.title,
            workInstructionSnapshot: task.description,
            mandatorySnapshot: false,
            sortOrderSnapshot: null,
            professionalVersionSnapshot: null,
            origin: task.taskType === "Einmalig" ? "Einmalig" : "Mandantenspezifisch",
          })),
        });
      }
      await transaction.workflowHistory.create({
        data: {
          periodId: period.id,
          eventType: "Periode erzeugt",
          description: "Monatscheckliste wurde aus den gültigen Aufgaben-Snapshots erzeugt.",
          newValue: "Offen",
        },
      });
      return period;
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const existing = await prisma.accountingPeriod.findUnique({
        where: { clientId_calendarYear_month_checklistType: { clientId, calendarYear: year, month, checklistType: "Monat" } },
      });
      throw new MonthlyChecklistError("PERIOD_EXISTS", "Diese Periode besteht bereits.", existing?.id);
    }
    throw error;
  }
}

export function calculateProgress(tasks: Array<{ status: string; mandatorySnapshot: boolean }>) {
  const completed = tasks.filter((task) => ["Erledigt", "Nicht zutreffend"].includes(task.status)).length;
  const mandatory = tasks.filter((task) => task.mandatorySnapshot);
  const mandatoryCompleted = mandatory.filter((task) => ["Erledigt", "Nicht zutreffend"].includes(task.status)).length;
  return {
    completed,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
    mandatory: mandatory.length,
    mandatoryCompleted,
    mandatoryOpen: mandatory.length - mandatoryCompleted,
  };
}

export async function updateChecklistTask(
  taskId: number,
  input: { status: string; processingNote: string; processorInitials: string; notApplicableReason: string },
) {
  if (!CHECKLIST_TASK_STATUSES.includes(input.status as never)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Der Aufgabenstatus ist ungültig.");
  }
  const task = await prisma.checklistTask.findUnique({ where: { id: taskId } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  const period = await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: task.periodId } });
  if (period.processingStatus === "Abgeschlossen") {
    throw new MonthlyChecklistError("PERIOD_CLOSED", "Eine abgeschlossene Periode kann nicht bearbeitet werden.");
  }
  const reason = input.notApplicableReason.trim();
  if (input.status === "Nicht zutreffend" && !reason) {
    throw new MonthlyChecklistError("REASON_REQUIRED", "Für „Nicht zutreffend“ ist eine Begründung erforderlich.");
  }
  const processed = input.status !== "Offen";
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.checklistTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        processingNote: input.processingNote.trim() || null,
        processorInitials: input.processorInitials.trim() || null,
        notApplicableReason: input.status === "Nicht zutreffend" ? reason : null,
        processedAt: processed ? new Date() : null,
      },
    });
    if (processed) {
      await transaction.accountingPeriod.updateMany({
        where: { id: task.periodId, processingStatus: "Offen" },
        data: { processingStatus: "In Bearbeitung" },
      });
    }
    if (task.status !== input.status) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Aufgabenstatus geändert",
          actorInitials: input.processorInitials.trim() || null,
          description: `Bearbeitungsstatus von ${task.taskIdSnapshot} wurde geändert.`,
          previousValue: task.status,
          newValue: input.status,
        },
      });
    }
    if ((task.processingNote ?? "") !== input.processingNote.trim()) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Bearbeitungsnotiz geändert",
          actorInitials: input.processorInitials.trim() || null,
          description: `Bearbeitungsnotiz zu ${task.taskIdSnapshot} wurde geändert.`,
        },
      });
    }
    return updated;
  });
}

export async function updatePeriod(
  periodId: number,
  input: { processingStatus: string; generalNote: string },
) {
  if (!PERIOD_STATUSES.includes(input.processingStatus as never)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Der Bearbeitungsstatus ist ungültig.");
  }
  const period = await prisma.accountingPeriod.findUnique({
    where: { id: periodId },
    include: { tasks: true },
  });
  if (!period) throw new MonthlyChecklistError("INVALID_INPUT", "Die Periode wurde nicht gefunden.");
  if (period.processingStatus === "Abgeschlossen") {
    throw new MonthlyChecklistError("PERIOD_CLOSED", "Eine abgeschlossene Periode kann nicht bearbeitet werden.");
  }
  if (input.processingStatus !== period.processingStatus) {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Statusänderungen sind ausschließlich über die vorgesehenen Workflowaktionen zulässig.");
  }
  return prisma.accountingPeriod.update({
    where: { id: periodId },
    data: {
      processingStatus: input.processingStatus,
      generalNote: input.generalNote.trim() || null,
    },
  });
}

export function workflowSummary(tasks: Array<{
  status: string;
  mandatorySnapshot: boolean;
  processingNote: string | null;
  reviewStatus: string;
}>) {
  const progress = calculateProgress(tasks);
  return {
    ...progress,
    done: tasks.filter((task) => task.status === "Erledigt").length,
    notApplicable: tasks.filter((task) => task.status === "Nicht zutreffend").length,
    openOptional: tasks.filter((task) => !task.mandatorySnapshot && ["Offen", "In Bearbeitung"].includes(task.status)).length,
    withNotes: tasks.filter((task) => Boolean(task.processingNote?.trim())).length,
    openReviewPoints: tasks.filter((task) => ["Rückfrage", "Beanstandung"].includes(task.reviewStatus)).length,
    objections: tasks.filter((task) => task.reviewStatus === "Beanstandung").length,
  };
}

export function hasRoleConflict(processor: string | null, reviewer: string | null) {
  return Boolean(processor?.trim() && reviewer?.trim() && processor.trim() === reviewer.trim());
}

export async function transitionPeriod(
  periodId: number,
  action: "BEGIN_PROCESSING" | "SUBMIT_REVIEW" | "BEGIN_REVIEW" | "RETURN_REWORK" | "COMPLETE_REVIEW",
  actorInitials: string,
) {
  const actor = actorInitials.trim();
  const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId }, include: { tasks: true } });
  if (!period) throw new MonthlyChecklistError("INVALID_INPUT", "Die Periode wurde nicht gefunden.");
  const summary = workflowSummary(period.tasks);
  let nextStatus: string;
  let eventType: string;
  let description: string;
  const now = new Date();
  const periodData: Record<string, unknown> = { currentActorInitials: actor || null, lastStatusChangedAt: now };

  if (action === "BEGIN_PROCESSING" && period.processingStatus === "Offen") {
    nextStatus = "In Bearbeitung"; eventType = "Bearbeitung begonnen"; description = "Die Bearbeitung wurde begonnen.";
  } else if (action === "SUBMIT_REVIEW" && ["In Bearbeitung", "Nachbearbeitung"].includes(period.processingStatus)) {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Für die Übergabe ist ein Bearbeiterkürzel erforderlich.");
    if (summary.mandatoryOpen > 0) throw new MonthlyChecklistError("MANDATORY_TASKS_OPEN", "Alle Pflichtaufgaben müssen erledigt oder begründet nicht zutreffend sein.");
    if (period.processingStatus === "Nachbearbeitung" && summary.openReviewPoints > 0) {
      throw new MonthlyChecklistError("OPEN_REVIEW_POINTS", "Alle offenen Prüfpunkte müssen beantwortet und als nachbearbeitet gekennzeichnet sein.");
    }
    nextStatus = "Zur Prüfung"; eventType = period.processingStatus === "Nachbearbeitung" ? "Erneut zur Prüfung übergeben" : "Zur Prüfung übergeben"; description = "Die Bearbeitung wurde ausdrücklich zur Prüfung übergeben."; periodData.submittedForReviewAt = now;
  } else if (action === "BEGIN_REVIEW" && period.processingStatus === "Zur Prüfung") {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Für den Prüfungsbeginn ist ein Prüferkürzel erforderlich.");
    nextStatus = "In Prüfung"; eventType = "Prüfung begonnen"; description = "Die fachliche Prüfung wurde begonnen."; periodData.reviewStartedAt = now; periodData.lastReviewAt = now;
  } else if (action === "RETURN_REWORK" && period.processingStatus === "In Prüfung") {
    if (summary.openReviewPoints === 0) throw new MonthlyChecklistError("OPEN_REVIEW_POINT_REQUIRED", "Eine Rückgabe zur Nachbearbeitung verlangt mindestens einen offenen Prüfpunkt.");
    nextStatus = "Nachbearbeitung"; eventType = "Zur Nachbearbeitung zurückgegeben"; description = "Die Periode wurde wegen offener Prüfpunkte zurückgegeben."; periodData.returnedAt = now;
  } else if (action === "COMPLETE_REVIEW" && period.processingStatus === "In Prüfung") {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Für den Abschluss ist ein Prüferkürzel erforderlich.");
    if (summary.openReviewPoints > 0) throw new MonthlyChecklistError("OPEN_REVIEW_POINTS", "Die Periode kann mit offenen Prüfpunkten nicht abgeschlossen werden.");
    if (summary.mandatoryOpen > 0) throw new MonthlyChecklistError("MANDATORY_TASKS_OPEN", "Alle Pflichtaufgaben müssen abgeschlossen sein.");
    nextStatus = "Abgeschlossen"; eventType = "Periode abgeschlossen"; description = "Die Prüfung wurde ohne offene Prüfpunkte abgeschlossen."; periodData.completedAt = now; periodData.lastReviewAt = now;
  } else {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Diese Statusänderung ist im aktuellen Periodenstatus nicht zulässig.");
  }

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.accountingPeriod.update({
      where: { id: periodId },
      data: { ...periodData, processingStatus: nextStatus },
    });
    await transaction.workflowHistory.create({
      data: { periodId, eventType, actorInitials: actor || null, description, previousValue: period.processingStatus, newValue: nextStatus },
    });
    return updated;
  });
}

export async function reviewChecklistTask(
  taskId: number,
  input: { reviewStatus: string; reviewerInitials: string; reviewNote: string },
) {
  if (!REVIEW_STATUSES.includes(input.reviewStatus as never) || input.reviewStatus === "Nicht geprüft") {
    throw new MonthlyChecklistError("INVALID_INPUT", "Der Prüfstatus ist ungültig.");
  }
  const task = await prisma.checklistTask.findUnique({ where: { id: taskId }, include: { period: true } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  if (task.period.processingStatus !== "In Prüfung") throw new MonthlyChecklistError("INVALID_TRANSITION", "Prüfungen sind nur im Status „In Prüfung“ möglich.");
  const reviewer = input.reviewerInitials.trim();
  const note = input.reviewNote.trim();
  if (!reviewer) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Ein Prüferkürzel ist erforderlich.");
  if (["Rückfrage", "Beanstandung"].includes(input.reviewStatus) && !note) {
    throw new MonthlyChecklistError("REVIEW_NOTE_REQUIRED", "Rückfrage und Beanstandung verlangen eine Prüfnotiz.");
  }
  const now = new Date();
  const isIssue = ["Rückfrage", "Beanstandung"].includes(input.reviewStatus);
  const repeated = task.reviewStatus === "Erledigt nach Nachbearbeitung";
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.checklistTask.update({
      where: { id: taskId },
      data: {
        reviewStatus: input.reviewStatus,
        reviewerInitials: reviewer,
        reviewNote: note || task.reviewNote,
        reviewedAt: now,
        reviewIssueCreatedAt: isIssue ? now : task.reviewIssueCreatedAt,
        finalReviewedAt: input.reviewStatus === "In Ordnung" ? now : null,
      },
    });
    const eventType = isIssue ? (input.reviewStatus === "Rückfrage" ? "Rückfrage erstellt" : "Beanstandung erstellt") : repeated ? "Erneut geprüft" : "Prüfstatus geändert";
    await transaction.workflowHistory.create({
      data: {
        periodId: task.periodId, checklistTaskId: task.id, eventType, actorInitials: reviewer,
        description: `Prüfstatus von ${task.taskIdSnapshot} wurde auf „${input.reviewStatus}“ gesetzt.`,
        previousValue: task.reviewStatus, newValue: input.reviewStatus,
      },
    });
    await transaction.accountingPeriod.update({ where: { id: task.periodId }, data: { lastReviewAt: now } });
    return updated;
  });
}

export async function completeRework(
  taskId: number,
  input: { response: string; actorInitials: string; processingNote: string },
) {
  const task = await prisma.checklistTask.findUnique({ where: { id: taskId }, include: { period: true } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  if (task.period.processingStatus !== "Nachbearbeitung" || !["Rückfrage", "Beanstandung"].includes(task.reviewStatus)) {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Diese Aufgabe besitzt keinen offenen Prüfpunkt in der Nachbearbeitung.");
  }
  const response = input.response.trim();
  const changedNote = input.processingNote.trim() !== (task.processingNote ?? "");
  if (!response && !changedNote) throw new MonthlyChecklistError("RESPONSE_REQUIRED", "Bitte erfassen Sie eine Antwort oder eine nachvollziehbare Änderung.");
  const actor = input.actorInitials.trim();
  if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Ein Bearbeiterkürzel ist erforderlich.");
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.checklistTask.update({
      where: { id: taskId },
      data: {
        processorResponse: response || "Bearbeitungsnotiz wurde nachvollziehbar geändert.",
        respondedBy: actor,
        respondedAt: now,
        processingNote: input.processingNote.trim() || null,
        reviewStatus: "Erledigt nach Nachbearbeitung",
      },
    });
    await transaction.workflowHistory.create({
      data: {
        periodId: task.periodId, checklistTaskId: task.id, eventType: "Nachbearbeitung erledigt", actorInitials: actor,
        description: `Prüfpunkt zu ${task.taskIdSnapshot} wurde beantwortet und zur erneuten Prüfung vorbereitet.`,
        previousValue: task.reviewStatus, newValue: "Erledigt nach Nachbearbeitung",
      },
    });
    return updated;
  });
}

export async function reopenPeriod(periodId: number, actorInitials: string, reason: string, confirmed: boolean) {
  const actor = actorInitials.trim();
  const explanation = reason.trim();
  if (!confirmed || !actor || !explanation) {
    throw new MonthlyChecklistError("REOPEN_REASON_REQUIRED", "Wiederöffnung verlangt Kürzel, Begründung und ausdrückliche Bestätigung.");
  }
  const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
  if (!period || period.processingStatus !== "Abgeschlossen") throw new MonthlyChecklistError("INVALID_TRANSITION", "Nur eine abgeschlossene Periode kann wieder geöffnet werden.");
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.accountingPeriod.update({
      where: { id: periodId },
      data: { processingStatus: "Nachbearbeitung", completedAt: null, returnedAt: now, currentActorInitials: actor, lastStatusChangedAt: now },
    });
    await transaction.workflowHistory.create({
      data: {
        periodId, eventType: "Abschluss wieder geöffnet", actorInitials: actor,
        description: `Die abgeschlossene Periode wurde wieder geöffnet. Begründung: ${explanation}`,
        previousValue: "Abgeschlossen", newValue: "Nachbearbeitung",
      },
    });
    return updated;
  });
}

export async function createCustomClientTask(input: {
  clientId: number;
  title: string;
  description: string;
  categoryId: number;
  active: boolean;
  taskType: string;
  validFrom: Date;
  validUntil: Date | null;
  executionYear: number | null;
  executionMonth: number | null;
  processor: string;
  reviewer: string;
}) {
  if (!input.title.trim() || !CUSTOM_TASK_TYPES.includes(input.taskType as never)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Titel und gültige Aufgabenart sind erforderlich.");
  }
  if (input.validUntil && input.validUntil < input.validFrom) {
    throw new MonthlyChecklistError("INVALID_INPUT", "„Gültig bis“ darf nicht vor „Gültig ab“ liegen.");
  }
  if (
    input.taskType === "Einmalig" &&
    (!input.executionYear || !input.executionMonth || input.executionMonth < 1 || input.executionMonth > 12)
  ) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Eine einmalige Aufgabe benötigt Kalenderjahr und Monat.");
  }
  return prisma.customClientTask.create({
    data: {
      ...input,
      title: input.title.trim(),
      description: input.description.trim() || null,
      processor: input.processor.trim() || null,
      reviewer: input.reviewer.trim() || null,
      executionYear: input.taskType === "Einmalig" ? input.executionYear : null,
      executionMonth: input.taskType === "Einmalig" ? input.executionMonth : null,
    },
  });
}

export async function updateCustomClientTask(
  id: number,
  input: Parameters<typeof createCustomClientTask>[0],
) {
  const existing = await prisma.customClientTask.findUnique({ where: { id } });
  if (!existing || existing.clientId !== input.clientId) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Die mandantenspezifische Aufgabenvorlage wurde nicht gefunden.");
  }
  if (!input.title.trim() || !CUSTOM_TASK_TYPES.includes(input.taskType as never)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Titel und gültige Aufgabenart sind erforderlich.");
  }
  if (input.validUntil && input.validUntil < input.validFrom) {
    throw new MonthlyChecklistError("INVALID_INPUT", "„Gültig bis“ darf nicht vor „Gültig ab“ liegen.");
  }
  if (input.taskType === "Einmalig" && (!input.executionYear || !input.executionMonth || input.executionMonth < 1 || input.executionMonth > 12)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Eine einmalige Aufgabe benötigt Kalenderjahr und Monat.");
  }
  return prisma.customClientTask.update({
    where: { id },
    data: {
      title: input.title.trim(),
      description: input.description.trim() || null,
      categoryId: input.categoryId,
      active: input.active,
      taskType: input.taskType,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      executionYear: input.taskType === "Einmalig" ? input.executionYear : null,
      executionMonth: input.taskType === "Einmalig" ? input.executionMonth : null,
      processor: input.processor.trim() || null,
      reviewer: input.reviewer.trim() || null,
    },
  });
}

export type PeriodClient = Client;
