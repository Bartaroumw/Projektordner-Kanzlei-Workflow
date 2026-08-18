import type {
  AnnualProfile,
  Client,
  CustomClientTask,
  Prisma,
  StandardTask,
  TaskCategory,
} from "@prisma/client";
import { prisma } from "./prisma.ts";
import { defaultExecutionMonths, executionPlanningMatches, serializeExecutionMonths, validateExecutionPlanning } from "./task-execution-planning.ts";
import { checklistCompletionMessage, getBlockingWorkflowItems } from "./checklist-workflow-rules.ts";
import { createPayrollReconciliationInTransaction, nextPayrollMonth, PAYROLL_RECONCILIATION_KNOWLEDGE_KEY, PayrollReconciliationError } from "./payroll-reconciliation-service.ts";
import type { AuthUser } from "./permissions.ts";

export const PERIOD_STATUSES = ["Offen", "In Bearbeitung", "Zur Prüfung", "In Prüfung", "Nachbearbeitung", "Abgeschlossen"] as const;
export const CHECKLIST_TASK_STATUSES = ["Offen", "In Bearbeitung", "Erledigt", "Nicht zutreffend", "Übertragung vorgeschlagen", "In Folgemonat übertragen"] as const;
export const EDITABLE_CHECKLIST_TASK_STATUSES = ["Offen", "In Bearbeitung", "Erledigt", "Nicht zutreffend"] as const;
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
      | "REOPEN_REASON_REQUIRED"
      | "CONFLICT"
      | "ACTIVE_CHECKLIST_EXISTS"
      | "CHECKLIST_SEQUENCE_INVALID"
      | "TRANSFER_REASON_REQUIRED"
      | "TRANSFER_DECISION_REQUIRED"
      | "TRANSFER_DUPLICATE",
    message: string,
    public existingPeriodId?: number,
  ) {
    super(message);
  }
}

export function periodLabel(_legacyCadence: string, year: number, month: number) {
  return `${new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "Europe/Berlin" }).format(new Date(Date.UTC(2026, month - 1, 1)))} ${year}`;
}

export function validatePeriodMonth(_legacyCadence: string, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Bitte wählen Sie einen gültigen Monat aus.");
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
  _vatFilingPeriod: string,
  month: number,
) {
  if (!task.active || !["Monat", "Beide"].includes(task.checklistType)) return false;
  const executionMonths = task.executionMonths
    ?? (task.executionMonth ? String(task.executionMonth) : serializeExecutionMonths(defaultExecutionMonths(task.rhythm)));
  if (!executionPlanningMatches(executionMonths, month)) return false;
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
  _vatFilingPeriod: string,
  year: number,
  month: number,
) {
  if (!task.active || task.taskType === "Wiederkehrend jährlich") return false;
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  if (task.validFrom > periodEnd || (task.validUntil && task.validUntil < periodStart)) return false;
  if (task.taskType === "Wiederkehrend quartalsweise") {
    return [3, 6, 9, 12].includes(month);
  }
  if (task.taskType === "Einmalig") {
    return task.executionYear === year && task.executionMonth === month;
  }
  if (task.executionMonths) return executionPlanningMatches(task.executionMonths, month);
  return task.taskType === "Wiederkehrend monatlich";
}

export function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function payrollServiceApplies(client:Pick<Client,"payrollPreparedByFirm"|"payrollServiceStart">,year:number,month:number){
  if(!client.payrollPreparedByFirm)return false;
  if(!client.payrollServiceStart)return true;
  const startYear=client.payrollServiceStart.getUTCFullYear(),startMonth=client.payrollServiceStart.getUTCMonth()+1;
  return year*12+month>=startYear*12+startMonth;
}

export function previousMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export async function suggestNextChecklistMonth(clientId: number) {
  const latest = await prisma.accountingPeriod.findFirst({
    where: { clientId, checklistType: "Monat" },
    orderBy: [{ calendarYear: "desc" }, { month: "desc" }],
  });
  return latest ? { ...nextMonth(latest.calendarYear, latest.month), previous: latest } : null;
}

type ChecklistException = { administrativeException?: boolean; actorName?: string; reason?: string };

export async function previewMonthlyPeriod(clientId: number, year: number, month: number, exception: ChecklistException = {}) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      annualProfiles: { where: { calendarYear: year } },
      periods: { where: { checklistType: "Monat" }, orderBy: [{ calendarYear: "asc" }, { month: "asc" }] },
      customTasks: { include: { category: true } },
      payrollUser: { include: { roles: true } },
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
  const existing = client.periods.find((entry) => entry.calendarYear === year && entry.month === month);
  if (existing) {
    throw new MonthlyChecklistError(
      "PERIOD_EXISTS",
      "Für diesen Mandanten und diesen Monat besteht bereits eine Monatscheckliste.",
      existing.id,
    );
  }
  const active = client.periods.find((entry) => entry.processingStatus !== "Abgeschlossen");
  const latest = client.periods.at(-1);
  const expected = latest ? nextMonth(latest.calendarYear, latest.month) : null;
  const validException = exception.administrativeException && exception.actorName?.trim() && exception.reason?.trim();
  if (active && !validException) {
    throw new MonthlyChecklistError(
      "ACTIVE_CHECKLIST_EXISTS",
      `Die aktive Monatscheckliste ${active.periodLabel} muss zuerst abgeschlossen werden.`,
      active.id,
    );
  }
  if (expected && (year !== expected.year || month !== expected.month) && !validException) {
    throw new MonthlyChecklistError(
      "CHECKLIST_SEQUENCE_INVALID",
      `Als nächste Monatscheckliste ist ${periodLabel("", expected.year, expected.month)} vorgesehen.`,
    );
  }
  const standardTasks = await prisma.standardTask.findMany({ include: { category: true } });
  const matchingStandardTasks = standardTasks.filter((task) => {
    const payrollTask=task.knowledgeKey===PAYROLL_RECONCILIATION_KNOWLEDGE_KEY;
    return standardTaskMatches(task,payrollTask?{...profile,hasPayroll:true}:profile,client.vatFilingPeriod,month)&&
      (!payrollTask||payrollServiceApplies(client,year,month));
  });
  const matchingCustomTasks = client.customTasks.filter((task) =>
    customTaskMatches(task, client.vatFilingPeriod, year, month),
  );
  const transferredTasks = await prisma.checklistTask.findMany({
    where: { period: { clientId }, transferTargetYear: year, transferTargetMonth: month, status: "In Folgemonat übertragen", OR:[{transferStatus:"Genehmigt"},{transferStatus:null}] },
    include:{period:{select:{periodLabel:true}}},
    orderBy: [{ categorySortOrder: "asc" }, { sortOrderSnapshot: "asc" }, { taskIdSnapshot: "asc" }],
  });
  const carryCandidates = await prisma.checklistTask.findMany({
    where: {
      carryProcessingNote: true,
      processingNote: { not: null },
      period: {
        clientId,
        OR: [{ calendarYear: { lt: year } }, { calendarYear: year, month: { lt: month } }],
      },
      OR: [
        { standardTaskId: { in: matchingStandardTasks.map((task) => task.id) } },
        { customClientTaskId: { in: matchingCustomTasks.map((task) => task.id) } },
      ],
    },
    include: { period: { select: { periodLabel: true } } },
    orderBy: [{ period: { calendarYear: "desc" } }, { period: { month: "desc" } }, { id: "desc" }],
  });
  const carryNotes = new Map<string, (typeof carryCandidates)[number]>();
  for (const candidate of carryCandidates) {
    const key = candidate.standardTaskId ? `standard:${candidate.standardTaskId}` : `custom:${candidate.customClientTaskId}`;
    if (!carryNotes.has(key)) carryNotes.set(key, candidate);
  }
  const duplicateTaskIds = transferredTasks
    .filter((transferred) => transferred.standardTaskId && matchingStandardTasks.some((standard) => standard.id === transferred.standardTaskId))
    .map((task) => task.taskIdSnapshot);
  const categories = [...new Set([
    ...matchingStandardTasks.map((task) => task.category.name),
    ...matchingCustomTasks.map((task) => task.category.name),
    ...transferredTasks.map((task) => task.categorySnapshot),
  ])].sort();
  return {
    client,
    profile,
    label: periodLabel("", year, month),
    standardTasks: matchingStandardTasks,
    customTasks: matchingCustomTasks,
    transferredTasks,
    carryNotes,
    duplicateTaskIds,
    categories,
    exception: validException ? { actorName: exception.actorName!.trim(), reason: exception.reason!.trim() } : null,
  };
}

export async function createMonthlyPeriod(clientId: number, year: number, month: number, exception: ChecklistException = {}) {
  const preview = await previewMonthlyPeriod(clientId, year, month, exception);
  try {
    return await prisma.$transaction(async (transaction) => {
      if (!preview.exception) {
        const activeCount = await transaction.accountingPeriod.count({
          where: { clientId, checklistType: "Monat", processingStatus: { not: "Abgeschlossen" } },
        });
        if (activeCount > 0) {
          throw new MonthlyChecklistError("ACTIVE_CHECKLIST_EXISTS", "Für diesen Mandanten besteht bereits eine aktive Monatscheckliste.");
        }
      }
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
          managementNameSnapshot: preview.client.managementName,
          processorUserId: preview.client.processorUserId,
          reviewerUserId: preview.client.reviewerUserId,
          managementUserId: preview.client.managementUserId,
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
          data: preview.standardTasks.map((task) => {
            const carried = preview.carryNotes.get(`standard:${task.id}`);
            return {
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
            processingNote: carried?.processingNote ?? null,
            carryProcessingNote: Boolean(carried),
            carriedNoteSourceTaskId: carried?.id ?? null,
            carriedNoteSourcePeriodLabel: carried?.period.periodLabel ?? null,
          };
          }),
        });
      }
      if (preview.customTasks.length) {
        await transaction.checklistTask.createMany({
          data: preview.customTasks.map((task) => {
            const carried = preview.carryNotes.get(`custom:${task.id}`);
            return {
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
            processingNote: carried?.processingNote ?? null,
            carryProcessingNote: Boolean(carried),
            carriedNoteSourceTaskId: carried?.id ?? null,
            carriedNoteSourcePeriodLabel: carried?.period.periodLabel ?? null,
          };
          }),
        });
      }
      if (preview.transferredTasks.length) {
        await transaction.checklistTask.createMany({
          data: preview.transferredTasks.map((task) => ({
            periodId: period.id,
            sourceTaskId: task.id,
            standardTaskId: task.standardTaskId,
            customClientTaskId: task.customClientTaskId,
            taskIdSnapshot: task.taskIdSnapshot,
            categorySnapshot: task.categorySnapshot,
            categorySortOrder: task.categorySortOrder,
            subcategorySnapshot: task.subcategorySnapshot,
            titleSnapshot: task.titleSnapshot,
            workInstructionSnapshot: task.workInstructionSnapshot,
            reviewInstructionSnapshot: task.reviewInstructionSnapshot,
            mandatorySnapshot: task.mandatorySnapshot,
            sortOrderSnapshot: task.sortOrderSnapshot,
            professionalVersionSnapshot: task.professionalVersionSnapshot,
            origin: `Übertrag aus ${task.period.periodLabel}`,
            processingNote: [task.processingNote, task.transferReason, task.transferExpectedAction].filter(Boolean).join("\n\n"),
            reviewStatus: ["Rückfrage", "Beanstandung"].includes(task.reviewStatus) ? task.reviewStatus : "Nicht geprüft",
            reviewNote: task.reviewNote,
          })),
        });
      }
      const payrollTemplate=preview.standardTasks.find(task=>task.knowledgeKey===PAYROLL_RECONCILIATION_KNOWLEDGE_KEY);
      if(payrollTemplate){
        const payrollUser=preview.client.payrollUser;
        if(!payrollUser||!payrollUser.active||!payrollUser.roles.some(role=>role.role==="LOHNSACHBEARBEITER")){
          throw new PayrollReconciliationError("ASSIGNEE_MISSING","Für die FiBu-Lohn-Abstimmung ist ein aktiver Lohnsachbearbeiter erforderlich.");
        }
        const checklistTask=await transaction.checklistTask.findFirstOrThrow({where:{periodId:period.id,standardTaskId:payrollTemplate.id}});
        const target=nextPayrollMonth(year,month);
        await createPayrollReconciliationInTransaction(transaction,{
          clientId,accountingYear:year,accountingMonth:month,payrollYear:target.year,payrollMonth:target.month,
          accountingPeriodId:period.id,checklistTaskId:checklistTask.id,
          processorUserId:period.processorUserId,processorNameSnapshot:period.processorSnapshot,
          reviewerUserId:period.reviewerUserId,reviewerNameSnapshot:period.reviewerSnapshot,
          payrollUserId:payrollUser.id,payrollUserNameSnapshot:payrollUser.fullName,
        });
      }
      await transaction.workflowHistory.create({
        data: {
          periodId: period.id,
          eventType: "Monatscheckliste angelegt",
          description: "Monatscheckliste wurde aus den gültigen Aufgaben-Snapshots erzeugt.",
          newValue: "Offen",
        },
      });
      if (preview.exception) {
        await transaction.workflowHistory.create({
          data: {
            periodId: period.id,
            eventType: "Administrative Ausnahme",
            actorInitials: preview.exception.actorName,
            ...await actorAudit(preview.exception.actorName),
            description: `Die Monatscheckliste wurde außerhalb der normalen Reihenfolge angelegt. Begründung: ${preview.exception.reason}`,
          },
        });
      }
      return period;
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const existing = await prisma.accountingPeriod.findUnique({
        where: { clientId_calendarYear_month_checklistType: { clientId, calendarYear: year, month, checklistType: "Monat" } },
      });
      throw new MonthlyChecklistError("PERIOD_EXISTS", "Diese Monatscheckliste besteht bereits.", existing?.id);
    }
    throw error;
  }
}

export function calculateProgress(tasks: Array<{ status: string; mandatorySnapshot: boolean }>) {
  const completedStatuses = ["Erledigt", "Nicht zutreffend", "Übertragung vorgeschlagen", "In Folgemonat übertragen"];
  const completed = tasks.filter((task) => completedStatuses.includes(task.status)).length;
  const mandatory = tasks.filter((task) => task.mandatorySnapshot);
  const mandatoryCompleted = mandatory.filter((task) => completedStatuses.includes(task.status)).length;
  return {
    completed,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
    mandatory: mandatory.length,
    mandatoryCompleted,
    mandatoryOpen: mandatory.length - mandatoryCompleted,
  };
}

async function actorAudit(name:string|null|undefined){
  const actorNameSnapshot=name?.trim()||null;if(!actorNameSnapshot)return {};
  const matches=await prisma.user.findMany({where:{fullName:actorNameSnapshot,active:true},include:{roles:true},take:2});
  const user=matches.length===1?matches[0]:null;
  return {actorUserId:user?.id??null,actorNameSnapshot,actorRoleSnapshot:user?.roles.map(r=>r.role).join(", ")??null};
}

export async function updateChecklistTask(
  taskId: number,
  input: { status: string; processingNote: string; processorInitials: string; notApplicableReason: string; carryProcessingNote?: boolean; expectedUpdatedAt?: string },
) {
  if (!EDITABLE_CHECKLIST_TASK_STATUSES.includes(input.status as never)) {
    throw new MonthlyChecklistError("INVALID_INPUT", "Der Aufgabenstatus ist ungültig.");
  }
  const task = await prisma.checklistTask.findUnique({ where: { id: taskId } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  if (input.expectedUpdatedAt && task.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    throw new MonthlyChecklistError("CONFLICT", `Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
  }
  const period = await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: task.periodId } });
  if (period.processingStatus === "Abgeschlossen") {
    throw new MonthlyChecklistError("PERIOD_CLOSED", "Eine abgeschlossene Monatscheckliste kann nicht bearbeitet werden.");
  }
  if (task.transferStatus === "Vorgeschlagen") {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Diese Aufgabe wartet auf die Entscheidung des Prüfers und kann bis dahin nicht normal bearbeitet werden.");
  }
  const reason = input.notApplicableReason.trim();
  if (input.status === "Nicht zutreffend" && !reason) {
    throw new MonthlyChecklistError("REASON_REQUIRED", "Für „Nicht zutreffend“ ist eine Begründung erforderlich.");
  }
  const processed = input.status !== "Offen";
  const processingNote = input.processingNote.trim();
  const carryProcessingNote = Boolean(input.carryProcessingNote && processingNote);
  const nextReason = input.status === "Nicht zutreffend" ? reason : task.notApplicableReason;
  if(task.status===input.status&&(task.processingNote??"")===processingNote&&task.carryProcessingNote===carryProcessingNote&&(task.notApplicableReason??"")===(nextReason??""))return task;
  return prisma.$transaction(async (transaction) => {
    const write = await transaction.checklistTask.updateMany({
      where: { id: taskId, updatedAt: task.updatedAt },
      data: {
        status: input.status,
        processingNote: processingNote || null,
        carryProcessingNote,
        processorInitials: input.processorInitials.trim() || period.processorSnapshot,
        notApplicableReason: nextReason,
        processedAt: processed ? new Date() : null,
      },
    });
    if (write.count !== 1) {
      throw new MonthlyChecklistError("CONFLICT", `Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
    }
    const updated = await transaction.checklistTask.findUniqueOrThrow({ where: { id: taskId } });
    const started = await transaction.accountingPeriod.updateMany({
        where: { id: task.periodId, processingStatus: "Offen" },
        data: { processingStatus: "In Bearbeitung", lastStatusChangedAt:new Date() },
      });
    if(started.count===1){
      await transaction.workflowHistory.create({data:{
        periodId:task.periodId,eventType:"Bearbeitung automatisch begonnen",actorInitials:input.processorInitials.trim()||period.processorSnapshot,
        ...await actorAudit(input.processorInitials.trim()||period.processorSnapshot),
        description:"Die Bearbeitung wurde mit der ersten erfolgreich gespeicherten fachlichen Änderung automatisch begonnen.",previousValue:"Offen",newValue:"In Bearbeitung",
      }});
    }
    if (task.status !== input.status) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Aufgabenstatus geändert",
          actorInitials: input.processorInitials.trim() || period.processorSnapshot,
          ...await actorAudit(input.processorInitials.trim() || period.processorSnapshot),
          description: `Bearbeitungsstatus von ${task.taskIdSnapshot} wurde geändert.`,
          previousValue: task.status,
          newValue: input.status,
        },
      });
    }
    if ((task.processingNote ?? "") !== processingNote) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Bearbeitungsnotiz geändert",
          actorInitials: input.processorInitials.trim() || period.processorSnapshot,
          ...await actorAudit(input.processorInitials.trim() || period.processorSnapshot),
          description: `Bearbeitungsnotiz zu ${task.taskIdSnapshot} wurde geändert.`,
        },
      });
    }
    if ((task.notApplicableReason ?? "") !== (nextReason ?? "")) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Begründung geändert",
          actorInitials: input.processorInitials.trim() || period.processorSnapshot,
          ...await actorAudit(input.processorInitials.trim() || period.processorSnapshot),
          description: `Begründung für „Nicht zutreffend“ zu ${task.taskIdSnapshot} wurde geändert.`,
        },
      });
    }
    if (task.carryProcessingNote !== carryProcessingNote) {
      await transaction.workflowHistory.create({
        data: {
          periodId: task.periodId,
          checklistTaskId: task.id,
          eventType: "Folgeperiodenübernahme geändert",
          actorInitials: input.processorInitials.trim() || period.processorSnapshot,
          ...await actorAudit(input.processorInitials.trim() || period.processorSnapshot),
          description: carryProcessingNote
            ? `Die Bearbeitungsnotiz zu ${task.taskIdSnapshot} wird in die nächste tatsächliche Ausführung übernommen.`
            : `Die Übernahme der Bearbeitungsnotiz zu ${task.taskIdSnapshot} wurde aufgehoben.`,
          previousValue: task.carryProcessingNote ? "Ja" : "Nein",
          newValue: carryProcessingNote ? "Ja" : "Nein",
        },
      });
    }
    return updated;
  });
}

export async function addMissingStandardTasks(periodId: number, actorName: string, onlyStandardTaskIds?: number[]) {
  const period = await prisma.accountingPeriod.findUnique({
    where: { id: periodId },
    include: { tasks: true, client: { include: { payrollUser: { include: { roles: true } } } } },
  });
  if (!period) throw new MonthlyChecklistError("INVALID_INPUT", "Die Monatscheckliste wurde nicht gefunden.");
  if (period.processingStatus === "Abgeschlossen") throw new MonthlyChecklistError("PERIOD_CLOSED", "Eine abgeschlossene Monatscheckliste kann nicht ergänzt werden.");
  const profile = {
    id: 0,
    clientId: period.clientId,
    calendarYear: period.calendarYear,
    legalFormGroup: period.profileLegalFormGroup,
    profitDeterminationMethod: period.profileProfitDeterminationMethod,
    hasCashRegister: period.profileHasCashRegister,
    hasPayroll: period.profileHasPayroll,
    hasFixedAssets: period.profileHasFixedAssets,
    hasReceivablesPayables: period.profileHasReceivablesPayables,
    hasLoans: period.profileHasLoans,
    subjectToVat: period.profileSubjectToVat,
    hasPermanentExtension: period.profileHasPermanentExtension,
    createdAt: period.createdAt,
    updatedAt: period.updatedAt,
  };
  const existingIds = new Set(period.tasks.flatMap((task) => task.standardTaskId ? [task.standardTaskId] : []));
  const allowedIds = onlyStandardTaskIds ? new Set(onlyStandardTaskIds) : null;
  const matching = (await prisma.standardTask.findMany({ include: { category: true } }))
    .filter((task) => {
      const payrollTask=task.knowledgeKey===PAYROLL_RECONCILIATION_KNOWLEDGE_KEY;
      return (!allowedIds || allowedIds.has(task.id)) &&
        !existingIds.has(task.id) &&
        standardTaskMatches(task,payrollTask?{...profile,hasPayroll:true}:profile,period.client.vatFilingPeriod,period.month) &&
        (!payrollTask||payrollServiceApplies(period.client,period.calendarYear,period.month));
    });
  if (!matching.length) return { added: 0 };
  const carryCandidates = await prisma.checklistTask.findMany({
    where: {
      carryProcessingNote: true,
      processingNote: { not: null },
      standardTaskId: { in: matching.map((task) => task.id) },
      period: {
        clientId: period.clientId,
        OR: [
          { calendarYear: { lt: period.calendarYear } },
          { calendarYear: period.calendarYear, month: { lt: period.month } },
        ],
      },
    },
    include: { period: { select: { periodLabel: true } } },
    orderBy: [{ period: { calendarYear: "desc" } }, { period: { month: "desc" } }, { id: "desc" }],
  });
  const carryNotes = new Map<number, (typeof carryCandidates)[number]>();
  for (const candidate of carryCandidates) {
    if (candidate.standardTaskId && !carryNotes.has(candidate.standardTaskId)) carryNotes.set(candidate.standardTaskId, candidate);
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.checklistTask.createMany({ data: matching.map((task) => {
      const carried = carryNotes.get(task.id);
      return {
      periodId,
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
      origin: "Standardaufgabe nachträglich übernommen",
      processingNote: carried?.processingNote ?? null,
      carryProcessingNote: Boolean(carried),
      carriedNoteSourceTaskId: carried?.id ?? null,
      carriedNoteSourcePeriodLabel: carried?.period.periodLabel ?? null,
    };
    }) });
    const payrollTemplate = matching.find((task) => task.knowledgeKey === PAYROLL_RECONCILIATION_KNOWLEDGE_KEY);
    if (payrollTemplate) {
      const payrollUser = period.client.payrollUser;
      if (!payrollUser?.active || !payrollUser.roles.some(({ role }) => role === "LOHNSACHBEARBEITER")) {
        throw new PayrollReconciliationError(
          "ASSIGNEE_MISSING",
          "Für die FiBu-Lohn-Abstimmung ist ein aktiver Lohnsachbearbeiter erforderlich.",
        );
      }
      const checklistTask = await transaction.checklistTask.findFirstOrThrow({
        where: { periodId, standardTaskId: payrollTemplate.id },
      });
      const target = nextPayrollMonth(period.calendarYear, period.month);
      await createPayrollReconciliationInTransaction(transaction, {
        clientId: period.clientId,
        accountingYear: period.calendarYear,
        accountingMonth: period.month,
        payrollYear: target.year,
        payrollMonth: target.month,
        accountingPeriodId: period.id,
        checklistTaskId: checklistTask.id,
        processorUserId: period.processorUserId,
        processorNameSnapshot: period.processorSnapshot,
        reviewerUserId: period.reviewerUserId,
        reviewerNameSnapshot: period.reviewerSnapshot,
        payrollUserId: payrollUser.id,
        payrollUserNameSnapshot: payrollUser.fullName,
      });
    }
    await transaction.workflowHistory.create({ data: {
      periodId,
      eventType: "Fehlende Standardaufgaben übernommen",
      actorInitials: actorName,
      ...await actorAudit(actorName),
      description: `${matching.length} für ${period.periodLabel} gültige Standardaufgabe${matching.length === 1 ? "" : "n"} wurden kontrolliert ergänzt.`,
      newValue: String(matching.length),
    } });
  });
  return { added: matching.length };
}

export async function proposeChecklistTaskTransfer(
  taskId: number,
  input: { reason: string; targetYear: number; targetMonth: number; expectedAction?: string; note?:string },
  user:AuthUser,
) {
  const reason=input.reason.trim(),expectedAction=input.expectedAction?.trim()??"";
  if(!reason||!expectedAction)throw new MonthlyChecklistError("TRANSFER_REASON_REQUIRED","Der Übertragungsvorschlag benötigt eine Begründung und die erwartete weitere Handlung beziehungsweise Unterlage.");
  validatePeriodMonth("",input.targetMonth);
  const task=await prisma.checklistTask.findUnique({where:{id:taskId},include:{period:true,transferredTasks:true}});
  if(!task)throw new MonthlyChecklistError("TASK_NOT_FOUND","Die Checklistenaufgabe wurde nicht gefunden.");
  if(task.period.processorUserId!==user.id)throw new MonthlyChecklistError("INVALID_TRANSITION","Nur der zugeordnete Bearbeiter darf eine Übertragung vorschlagen.");
  if(!["Offen","In Bearbeitung","Nachbearbeitung"].includes(task.period.processingStatus))throw new MonthlyChecklistError("PERIOD_CLOSED","In diesem Checklistenstatus kann keine Übertragung vorgeschlagen werden.");
  const expected=nextMonth(task.period.calendarYear,task.period.month);
  if(input.targetYear!==expected.year||input.targetMonth!==expected.month)throw new MonthlyChecklistError("CHECKLIST_SEQUENCE_INVALID",`Ziel muss der direkte Folgemonat ${periodLabel("",expected.year,expected.month)} sein.`);
  if(task.transferStatus==="Vorgeschlagen"||task.transferStatus==="Genehmigt"||task.transferredTasks.length)throw new MonthlyChecklistError("TRANSFER_DUPLICATE","Für diese Aufgabe besteht bereits ein Übertragungsvorschlag oder ein genehmigter Übertrag.");
  const now=new Date();
  return prisma.$transaction(async transaction=>{
    const claimed=await transaction.checklistTask.updateMany({where:{id:taskId,updatedAt:task.updatedAt},data:{
      status:"Übertragung vorgeschlagen",transferStatus:"Vorgeschlagen",transferTargetYear:input.targetYear,transferTargetMonth:input.targetMonth,
      transferReason:reason,transferActorName:user.fullName,transferExpectedAction:expectedAction,transferNote:input.note?.trim()||null,
      transferProposedAt:now,transferProposedByUserId:user.id,transferDecidedAt:null,transferDecidedByUserId:null,transferDecisionReason:null,
      transferredAt:null,processedAt:now,processorInitials:user.fullName,
    }});
    if(claimed.count!==1)throw new MonthlyChecklistError("TRANSFER_DUPLICATE","Die Aufgabe wurde zwischenzeitlich geändert oder bereits zur Übertragung vorgeschlagen.");
    const started=await transaction.accountingPeriod.updateMany({where:{id:task.periodId,processingStatus:"Offen"},data:{processingStatus:"In Bearbeitung",lastStatusChangedAt:now}});
    if(started.count)await transaction.workflowHistory.create({data:{periodId:task.periodId,eventType:"Bearbeitung automatisch begonnen",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Bearbeiter",description:"Die Bearbeitung wurde mit dem ersten erfolgreich gespeicherten Übertragungsvorschlag automatisch begonnen.",previousValue:"Offen",newValue:"In Bearbeitung"}});
    await transaction.workflowHistory.create({data:{periodId:task.periodId,checklistTaskId:task.id,eventType:"Übertragung vorgeschlagen",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Bearbeiter",description:`${task.taskIdSnapshot}: Übertragung nach ${periodLabel("",input.targetYear,input.targetMonth)} vorgeschlagen. Erwartet: ${expectedAction}`,previousValue:task.status,newValue:"Übertragung vorgeschlagen",reason}});
    return transaction.checklistTask.findUniqueOrThrow({where:{id:taskId}});
  });
}

export async function ensureReviewStarted(periodId:number,user:AuthUser){
  const period=await prisma.accountingPeriod.findUnique({where:{id:periodId}});
  if(!period)throw new MonthlyChecklistError("INVALID_INPUT","Die Monatscheckliste wurde nicht gefunden.");
  if(period.reviewerUserId!==user.id)throw new MonthlyChecklistError("INVALID_TRANSITION","Nur der zugeordnete Prüfer darf die Prüfung bearbeiten.");
  if(period.processingStatus==="In Prüfung")return period;
  if(period.processingStatus!=="Zur Prüfung")throw new MonthlyChecklistError("INVALID_TRANSITION","Prüfentscheidungen sind nur nach Übergabe zur Prüfung zulässig.");
  const now=new Date();
  return prisma.$transaction(async transaction=>{
    const changed=await transaction.accountingPeriod.updateMany({where:{id:periodId,processingStatus:"Zur Prüfung"},data:{processingStatus:"In Prüfung",reviewStartedAt:now,lastReviewAt:now,lastStatusChangedAt:now,currentActorInitials:user.fullName}});
    if(changed.count!==1)return transaction.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
    await transaction.workflowHistory.create({data:{periodId,eventType:"Prüfung automatisch begonnen",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Prüfer",description:"Die Prüfung wurde mit der ersten erfolgreich gespeicherten Prüfentscheidung automatisch begonnen.",previousValue:"Zur Prüfung",newValue:"In Prüfung"}});
    return transaction.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  });
}

export async function finishDeferredMonthlyReviewBatch(periodId:number,user:AuthUser,hasIssue:boolean){
  const now=new Date();
  if(!hasIssue){
    await prisma.accountingPeriod.update({where:{id:periodId},data:{lastReviewAt:now}});
    return;
  }
  const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  await prisma.$transaction(async transaction=>{
    await transaction.accountingPeriod.update({where:{id:periodId},data:{processingStatus:"Nachbearbeitung",returnedAt:now,lastReviewAt:now,lastStatusChangedAt:now}});
    await transaction.workflowHistory.create({data:{periodId,eventType:"Zur Nachbearbeitung zurückgegeben",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Prüfer",description:"Die Monatscheckliste wurde nach der Sammelprüfung wegen offener Prüfpunkte zur Nachbearbeitung zurückgegeben.",previousValue:period.processingStatus,newValue:"Nachbearbeitung"}});
  });
}

export async function decideChecklistTaskTransfer(taskId:number,decision:"APPROVE"|"REJECT",reason:string,user:AuthUser){
  let task=await prisma.checklistTask.findUnique({where:{id:taskId},include:{period:true,transferredTasks:true}});
  if(!task||task.transferStatus!=="Vorgeschlagen")throw new MonthlyChecklistError("INVALID_TRANSITION","Es liegt kein offener Übertragungsvorschlag vor.");
  if(task.period.reviewerUserId!==user.id)throw new MonthlyChecklistError("INVALID_TRANSITION","Nur der zugeordnete Prüfer darf über den Vorschlag entscheiden.");
  if(decision==="REJECT"&&!reason.trim())throw new MonthlyChecklistError("TRANSFER_DECISION_REQUIRED","Die Ablehnung benötigt eine Begründung.");
  if(task.transferredTasks.length)throw new MonthlyChecklistError("TRANSFER_DUPLICATE","Für diesen Übertrag besteht bereits eine Zielaufgabe.");
  await ensureReviewStarted(task.periodId,user);
  task=await prisma.checklistTask.findUniqueOrThrow({where:{id:taskId},include:{period:true,transferredTasks:true}});
  const now=new Date();
  return prisma.$transaction(async transaction=>{
    if(decision==="APPROVE"){
      const claimed=await transaction.checklistTask.updateMany({where:{id:task.id,transferStatus:"Vorgeschlagen"},data:{status:"In Folgemonat übertragen",transferStatus:"Genehmigt",transferDecidedAt:now,transferDecidedByUserId:user.id,transferDecisionReason:reason.trim()||null,transferredAt:now,reviewStatus:"In Ordnung",reviewerInitials:user.fullName,reviewedAt:now,finalReviewedAt:now}});
      if(claimed.count!==1)throw new MonthlyChecklistError("TRANSFER_DUPLICATE","Über diesen Übertragungsvorschlag wurde bereits entschieden.");
      const targetPeriod=await transaction.accountingPeriod.findUnique({where:{clientId_calendarYear_month_checklistType:{clientId:task.period.clientId,calendarYear:task.transferTargetYear!,month:task.transferTargetMonth!,checklistType:"Monat"}}});
      let targetTask=null;
      if(targetPeriod){
        targetTask=await transaction.checklistTask.create({data:transferTargetTaskData(task,targetPeriod.id)});
      }
      await transaction.workflowHistory.create({data:{periodId:task.periodId,checklistTaskId:task.id,eventType:"Übertragung genehmigt",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Prüfer",description:`Übertragung nach ${periodLabel("",task.transferTargetYear!,task.transferTargetMonth!)} genehmigt${targetTask?`; Zielaufgabe ${targetTask.id} wurde erzeugt`:"; die Zielaufgabe wird beim Anlegen der Zielperiode erzeugt"}.`,previousValue:"Übertragung vorgeschlagen",newValue:"In Folgemonat übertragen",reason:reason.trim()||null}});
      return transaction.checklistTask.findUniqueOrThrow({where:{id:task.id}});
    }
    const claimed=await transaction.checklistTask.updateMany({where:{id:task.id,transferStatus:"Vorgeschlagen"},data:{status:"In Bearbeitung",transferStatus:"Abgelehnt",transferDecidedAt:now,transferDecidedByUserId:user.id,transferDecisionReason:reason.trim(),reviewStatus:"Beanstandung",reviewNote:reason.trim(),reviewerInitials:user.fullName,reviewedAt:now,reviewIssueCreatedAt:now,reviewIssueStatus:"Offen",reviewIssueRaisedByUserId:user.id,reviewIssueRaisedByName:user.fullName,reviewIssueRaisedByRole:"Prüfer",reviewIssueDirectedToUserId:task.period.processorUserId,reviewIssueDirectedToName:task.period.processorSnapshot,reviewIssueDirectedToRole:"Bearbeiter"}});
    if(claimed.count!==1)throw new MonthlyChecklistError("TRANSFER_DUPLICATE","Über diesen Übertragungsvorschlag wurde bereits entschieden.");
    await transaction.accountingPeriod.update({where:{id:task.periodId},data:{processingStatus:"Nachbearbeitung",returnedAt:now,lastReviewAt:now,lastStatusChangedAt:now}});
    await transaction.workflowHistory.create({data:{periodId:task.periodId,checklistTaskId:task.id,eventType:"Übertragung abgelehnt und zur Nachbearbeitung",actorInitials:user.fullName,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Prüfer",description:"Der Übertragungsvorschlag wurde abgelehnt. Die Aufgabe ist in der aktuellen Periode nachzubearbeiten.",previousValue:"Übertragung vorgeschlagen",newValue:"Nachbearbeitung",reason:reason.trim()}});
    return transaction.checklistTask.findUniqueOrThrow({where:{id:task.id}});
  });
}

function transferTargetTaskData(task:Prisma.ChecklistTaskGetPayload<{include:{period:true}}>,periodId:number):Prisma.ChecklistTaskUncheckedCreateInput{
  return {periodId,sourceTaskId:task.id,standardTaskId:task.standardTaskId,customClientTaskId:task.customClientTaskId,taskIdSnapshot:task.taskIdSnapshot,categorySnapshot:task.categorySnapshot,categorySortOrder:task.categorySortOrder,subcategorySnapshot:task.subcategorySnapshot,titleSnapshot:task.titleSnapshot,workInstructionSnapshot:task.workInstructionSnapshot,reviewInstructionSnapshot:task.reviewInstructionSnapshot,mandatorySnapshot:task.mandatorySnapshot,sortOrderSnapshot:task.sortOrderSnapshot,professionalVersionSnapshot:task.professionalVersionSnapshot,origin:`Übertrag aus ${task.period.periodLabel}`,processingNote:[task.processingNote,task.transferReason,task.transferExpectedAction,task.transferNote].filter(Boolean).join("\n\n")||null};
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
  if (!period) throw new MonthlyChecklistError("INVALID_INPUT", "Die Monatscheckliste wurde nicht gefunden.");
  if (period.processingStatus === "Abgeschlossen") {
    throw new MonthlyChecklistError("PERIOD_CLOSED", "Eine abgeschlossene Monatscheckliste kann nicht bearbeitet werden.");
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

export async function updateChecklistRoles(periodId: number, input: {
  processor: string;
  reviewer: string;
  managementName: string;
  processorUserId?: number | null;
  reviewerUserId?: number | null;
  managementUserId?: number | null;
  reason: string;
  actorName: string;
}) {
  const reason = input.reason.trim(), actor = input.actorName.trim();
  if (!reason || !actor) throw new MonthlyChecklistError("REASON_REQUIRED", "Rollenänderung verlangt Begründung und handelnde Person.");
  const checklist = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
  if (!checklist || checklist.processingStatus === "Abgeschlossen") throw new MonthlyChecklistError("PERIOD_CLOSED", "Nur eine laufende Monatscheckliste kann Rollen ändern.");
  const ids=[input.processorUserId,input.reviewerUserId,input.managementUserId].filter((id):id is number=>Boolean(id));
  const users=await prisma.user.findMany({where:{id:{in:ids},active:true},include:{roles:true}});
  if(users.length!==new Set(ids).size)throw new MonthlyChecklistError("INVALID_INPUT","Nur aktive Benutzer dürfen zugeordnet werden.");
  const roles=(id:number|null|undefined)=>new Set(users.find(user=>user.id===id)?.roles.map(entry=>entry.role)??[]);
  const hasAny=(id:number|null|undefined,allowed:string[])=>id===null||id===undefined||allowed.some(role=>roles(id).has(role));
  if(!hasAny(input.processorUserId,["MITARBEITER","PRUEFER","KANZLEILEITUNG"]))throw new MonthlyChecklistError("INVALID_INPUT","Der ausgewählte Bearbeiter besitzt keine fachliche Bearbeitungsrolle.");
  if(!hasAny(input.reviewerUserId,["PRUEFER","KANZLEILEITUNG"]))throw new MonthlyChecklistError("INVALID_INPUT","Der ausgewählte Prüfer besitzt keine Prüferrolle.");
  if(!hasAny(input.managementUserId,["KANZLEILEITUNG"]))throw new MonthlyChecklistError("INVALID_INPUT","Die ausgewählte Person besitzt keine Kanzleileitungsrolle.");
  const names=new Map(users.map(user=>[user.id,user.fullName]));
  const next = {
    processorUserId:input.processorUserId??null,reviewerUserId:input.reviewerUserId??null,managementUserId:input.managementUserId??null,
    processorSnapshot: input.processorUserId?names.get(input.processorUserId)??null:input.processor.trim() || null,
    reviewerSnapshot: input.reviewerUserId?names.get(input.reviewerUserId)??null:input.reviewer.trim() || null,
    managementNameSnapshot: input.managementUserId?names.get(input.managementUserId)??null:input.managementName.trim() || null
  };
  return prisma.$transaction(async transaction => {
    const updated = await transaction.accountingPeriod.update({ where: { id: periodId }, data: next });
    await transaction.workflowHistory.create({ data: {
      periodId, eventType: "Rollenzuordnung geändert", actorInitials: actor,
      ...await actorAudit(actor),
      description: `Rollen wurden geändert. Begründung: ${reason}`,
      previousValue: `${checklist.processorSnapshot ?? "–"} | ${checklist.reviewerSnapshot ?? "–"} | ${checklist.managementNameSnapshot ?? "–"}`,
      newValue: `${next.processorSnapshot ?? "–"} | ${next.reviewerSnapshot ?? "–"} | ${next.managementNameSnapshot ?? "–"}`,
    }});
    return updated;
  });
}

export function workflowSummary(tasks: Array<{
  status: string;
  mandatorySnapshot: boolean;
  processingNote: string | null;
  reviewStatus: string;
  notApplicableReason?: string | null;
  reviewIssueStatus?: string | null;
}>) {
  const progress = calculateProgress(tasks);
  const blockers = getBlockingWorkflowItems(tasks);
  return {
    ...progress,
    done: tasks.filter((task) => task.status === "Erledigt").length,
    notApplicable: tasks.filter((task) => task.status === "Nicht zutreffend").length,
    transferred: tasks.filter((task) => task.status === "In Folgemonat übertragen").length,
    openOptional: tasks.filter((task) => !task.mandatorySnapshot && ["Offen", "In Bearbeitung"].includes(task.status)).length,
    withNotes: tasks.filter((task) => Boolean(task.processingNote?.trim())).length,
    openReviewPoints: tasks.filter((task) => task.status !== "In Folgemonat übertragen" && ["Rückfrage", "Beanstandung"].includes(task.reviewStatus)).length,
    objections: tasks.filter((task) => task.status !== "In Folgemonat übertragen" && task.reviewStatus === "Beanstandung").length,
    unreviewed: blockers.unreviewed.length,
    openProcessing: blockers.openProcessing.length,
    canComplete: blockers.canComplete,
  };
}

export async function transitionPeriod(
  periodId: number,
  action: "BEGIN_PROCESSING" | "SUBMIT_REVIEW" | "BEGIN_REVIEW" | "RETURN_REWORK" | "COMPLETE_REVIEW",
  actorInitials: string,
) {
  let actor = actorInitials.trim();
  const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId }, include: { tasks: true } });
  if (!period) throw new MonthlyChecklistError("INVALID_INPUT", "Die Monatscheckliste wurde nicht gefunden.");
  actor ||= ["BEGIN_REVIEW", "RETURN_REWORK", "COMPLETE_REVIEW"].includes(action)
    ? period.reviewerSnapshot ?? ""
    : period.processorSnapshot ?? "";
  const summary = workflowSummary(period.tasks);
  let nextStatus: string;
  let eventType: string;
  let description: string;
  const now = new Date();
  const periodData: Record<string, unknown> = { currentActorInitials: actor || null, lastStatusChangedAt: now };

  if (action === "BEGIN_PROCESSING" && period.processingStatus === "Offen") {
    nextStatus = "In Bearbeitung"; eventType = "Bearbeitung begonnen"; description = "Die Bearbeitung wurde begonnen.";
  } else if (action === "SUBMIT_REVIEW" && ["In Bearbeitung", "Nachbearbeitung"].includes(period.processingStatus)) {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der Bearbeiter fehlt.");
    if (summary.mandatoryOpen > 0) throw new MonthlyChecklistError("MANDATORY_TASKS_OPEN", `${summary.mandatoryOpen} Pflichtaufgaben sind noch offen.`);
    if (period.processingStatus === "Nachbearbeitung" && summary.openReviewPoints > 0) {
      throw new MonthlyChecklistError("OPEN_REVIEW_POINTS", "Alle offenen Prüfpunkte müssen beantwortet und als nachbearbeitet gekennzeichnet sein.");
    }
    nextStatus = "Zur Prüfung"; eventType = period.processingStatus === "Nachbearbeitung" ? "Erneut zur Prüfung übergeben" : "Zur Prüfung übergeben"; description = "Die Bearbeitung wurde ausdrücklich zur Prüfung übergeben."; periodData.submittedForReviewAt = now;
  } else if (action === "BEGIN_REVIEW" && period.processingStatus === "Zur Prüfung") {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der Prüfer fehlt.");
    nextStatus = "In Prüfung"; eventType = "Prüfung begonnen"; description = "Die fachliche Prüfung wurde begonnen."; periodData.reviewStartedAt = now; periodData.lastReviewAt = now;
  } else if (action === "RETURN_REWORK" && ["In Prüfung","Nachbearbeitung"].includes(period.processingStatus)) {
    if (summary.openReviewPoints === 0) throw new MonthlyChecklistError("OPEN_REVIEW_POINT_REQUIRED", "Eine Rückgabe zur Nachbearbeitung verlangt mindestens einen offenen Prüfpunkt.");
    nextStatus = "Nachbearbeitung"; eventType = "Zur Nachbearbeitung zurückgegeben"; description = "Die Monatscheckliste wurde wegen offener Prüfpunkte zurückgegeben."; periodData.returnedAt = now;
  } else if (action === "COMPLETE_REVIEW" && ["In Prüfung","Nachbearbeitung"].includes(period.processingStatus)) {
    if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der Prüfer fehlt.");
    const completionError = checklistCompletionMessage(period.tasks);
    if (completionError) throw new MonthlyChecklistError("OPEN_REVIEW_POINTS", completionError);
    nextStatus = "Abgeschlossen"; eventType = "Monatscheckliste abgeschlossen"; description = "Die Prüfung wurde ohne offene Prüfpunkte abgeschlossen."; periodData.completedAt = now; periodData.lastReviewAt = now;
  } else {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Diese Statusänderung ist im aktuellen Checklistenstatus nicht zulässig.");
  }

  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.accountingPeriod.update({
      where: { id: periodId },
      data: { ...periodData, processingStatus: nextStatus },
    });
    const functionName=["BEGIN_REVIEW","RETURN_REWORK","COMPLETE_REVIEW"].includes(action)?"Prüfer":"Bearbeiter";
    await transaction.workflowHistory.create({
      data: { periodId, eventType, actorInitials: actor || null, ...await actorAudit(actor), description:`${description} Ausgeführt durch ${actor} in der Funktion ${functionName}.`, previousValue: period.processingStatus, newValue: nextStatus },
    });
    return updated;
  });
}

export async function reviewChecklistTask(
  taskId: number,
  input: { reviewStatus: string; reviewerInitials: string; reviewNote: string; expectedUpdatedAt?:string },
  options:{deferPeriodTransition?:boolean;reviewUser?:AuthUser}={},
) {
  if (!REVIEW_STATUSES.includes(input.reviewStatus as never) || input.reviewStatus === "Nicht geprüft") {
    throw new MonthlyChecklistError("INVALID_INPUT", "Der Prüfstatus ist ungültig.");
  }
  let task = await prisma.checklistTask.findUnique({ where: { id: taskId }, include: { period: true } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  if(input.expectedUpdatedAt&&task.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new MonthlyChecklistError("CONFLICT",`Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Prüfentscheidung wurde nicht überschrieben.`);
  if(task.transferStatus==="Vorgeschlagen")throw new MonthlyChecklistError("INVALID_TRANSITION","Über einen Übertragungsvorschlag muss mit den vorgesehenen Genehmigen- oder Ablehnen-Aktionen entschieden werden.");
  const reviewer = input.reviewerInitials.trim() || task.period.reviewerSnapshot?.trim() || "";
  const note = input.reviewNote.trim();
  if (!reviewer) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der Prüfer fehlt.");
  if (["Rückfrage", "Beanstandung"].includes(input.reviewStatus) && !note) {
    throw new MonthlyChecklistError("REVIEW_NOTE_REQUIRED", "Rückfrage und Beanstandung verlangen eine Prüfnotiz.");
  }
  if(task.period.processingStatus==="Zur Prüfung"&&options.reviewUser){
    await ensureReviewStarted(task.periodId,options.reviewUser);
    task=await prisma.checklistTask.findUniqueOrThrow({where:{id:taskId},include:{period:true}});
  }
  if (task.period.processingStatus !== "In Prüfung") throw new MonthlyChecklistError("INVALID_TRANSITION", "Prüfungen sind nur im Status „In Prüfung“ möglich.");
  const now = new Date();
  const isIssue = ["Rückfrage", "Beanstandung"].includes(input.reviewStatus);
  const repeated = task.reviewStatus === "Erledigt nach Nachbearbeitung";
  const reviewerUser = await prisma.user.findFirst({ where: { fullName: reviewer, active: true } });
  return prisma.$transaction(async (transaction) => {
    const write=await transaction.checklistTask.updateMany({
      where: { id: taskId,updatedAt:task.updatedAt },
      data: {
        reviewStatus: input.reviewStatus,
        reviewerInitials: reviewer,
        reviewNote: note || task.reviewNote,
        reviewedAt: now,
        reviewIssueCreatedAt: isIssue ? now : task.reviewIssueCreatedAt,
        reviewIssueStatus: isIssue ? "Offen" : "Erledigt",
        reviewIssueRaisedByUserId: isIssue ? reviewerUser?.id ?? task.period.reviewerUserId : task.reviewIssueRaisedByUserId,
        reviewIssueRaisedByName: isIssue ? reviewer : task.reviewIssueRaisedByName,
        reviewIssueRaisedByRole: isIssue ? "Prüfer" : task.reviewIssueRaisedByRole,
        reviewIssueDirectedToUserId: isIssue ? task.period.processorUserId : task.reviewIssueDirectedToUserId,
        reviewIssueDirectedToName: isIssue ? task.period.processorSnapshot : task.reviewIssueDirectedToName,
        reviewIssueDirectedToRole: isIssue ? "Bearbeiter" : task.reviewIssueDirectedToRole,
        finalReviewedAt: input.reviewStatus === "In Ordnung" ? now : null,
      },
    });
    if(write.count!==1)throw new MonthlyChecklistError("CONFLICT",`Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Prüfentscheidung wurde nicht überschrieben.`);
    const updated=await transaction.checklistTask.findUniqueOrThrow({where:{id:taskId}});
    const eventType = isIssue ? (input.reviewStatus === "Rückfrage" ? "Rückfrage erstellt" : "Beanstandung erstellt") : repeated ? "Erneut geprüft" : "Prüfstatus geändert";
    await transaction.workflowHistory.create({
      data: {
        periodId: task.periodId, checklistTaskId: task.id, eventType, actorInitials: reviewer,
        ...await actorAudit(reviewer),
        description: `Prüfstatus von ${task.taskIdSnapshot} wurde auf „${input.reviewStatus}“ gesetzt durch ${reviewer} in der Funktion Prüfer.`,
        previousValue: task.reviewStatus, newValue: input.reviewStatus,
      },
    });
    if(!options.deferPeriodTransition)await transaction.accountingPeriod.update({
      where: { id: task.periodId },
      data: isIssue
        ? { lastReviewAt: now, processingStatus: "Nachbearbeitung", returnedAt: now, lastStatusChangedAt: now }
        : { lastReviewAt: now },
    });
    if(isIssue&&!options.deferPeriodTransition){
      await transaction.workflowHistory.create({data:{
        periodId:task.periodId,checklistTaskId:task.id,eventType:"Zur Nachbearbeitung zurückgegeben",
        actorInitials:reviewer,...await actorAudit(reviewer),
        description:`Die Monatscheckliste wurde wegen ${input.reviewStatus.toLocaleLowerCase("de-DE")} zu ${task.taskIdSnapshot} an den Bearbeiter zurückgegeben.`,
        previousValue:task.period.processingStatus,newValue:"Nachbearbeitung",
      }});
    }
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
  const actor = input.actorInitials.trim() || task.period.processorSnapshot?.trim() || "";
  if (!actor) throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der Bearbeiter fehlt.");
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
        reviewIssueStatus: "Erledigt",
      },
    });
    await transaction.workflowHistory.create({
      data: {
        periodId: task.periodId, checklistTaskId: task.id, eventType: "Nachbearbeitung erledigt", actorInitials: actor,
        ...await actorAudit(actor),
        description: `Prüfpunkt zu ${task.taskIdSnapshot} wurde beantwortet und zur erneuten Prüfung vorbereitet.`,
        previousValue: task.reviewStatus, newValue: "Erledigt nach Nachbearbeitung",
      },
    });
    return updated;
  });
}

export async function raiseChecklistQuestion(
  taskId: number,
  input: { question: string; actorName: string },
) {
  const question = input.question.trim();
  if (!question) throw new MonthlyChecklistError("REVIEW_NOTE_REQUIRED", "Die Rückfrage benötigt einen verständlichen Text.");
  const task = await prisma.checklistTask.findUnique({ where: { id: taskId }, include: { period: true } });
  if (!task) throw new MonthlyChecklistError("TASK_NOT_FOUND", "Die Checklistenaufgabe wurde nicht gefunden.");
  if (!["Offen", "In Bearbeitung", "Nachbearbeitung"].includes(task.period.processingStatus)) {
    throw new MonthlyChecklistError("INVALID_TRANSITION", "Eine Rückfrage an den Prüfer ist nur während der Bearbeitung möglich.");
  }
  if (!task.period.reviewerUserId || !task.period.reviewerSnapshot?.trim()) {
    throw new MonthlyChecklistError("INITIALS_REQUIRED", "Für diese Checkliste ist kein Prüfer hinterlegt. Die Rückfrage wurde nicht gesendet.");
  }
  const assignedReviewer = await prisma.user.findFirst({ where: { id: task.period.reviewerUserId, active: true } });
  if (!assignedReviewer) {
    throw new MonthlyChecklistError("INITIALS_REQUIRED", "Der zugeordnete Prüfer ist nicht aktiv. Die Rückfrage wurde nicht gesendet.");
  }
  const actor = await prisma.user.findFirst({ where: { fullName: input.actorName, active: true } });
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.checklistTask.update({
      where: { id: taskId },
      data: {
        reviewStatus: "Rückfrage",
        reviewNote: question,
        reviewIssueCreatedAt: now,
        reviewIssueStatus: "Offen",
        reviewIssueRaisedByUserId: actor?.id ?? task.period.processorUserId,
        reviewIssueRaisedByName: input.actorName,
        reviewIssueRaisedByRole: "Bearbeiter",
        reviewIssueDirectedToUserId: task.period.reviewerUserId,
        reviewIssueDirectedToName: assignedReviewer.fullName,
        reviewIssueDirectedToRole: "Prüfer",
      },
    });
    await transaction.workflowHistory.create({
      data: {
        periodId: task.periodId,
        checklistTaskId: task.id,
        eventType: "Rückfrage an Prüfer erstellt",
        actorInitials: input.actorName,
        ...await actorAudit(input.actorName),
        description: `${task.taskIdSnapshot}: Rückfrage von ${input.actorName} an ${assignedReviewer.fullName}.`,
        previousValue: task.reviewStatus,
        newValue: "Rückfrage",
      },
    });
    return updated;
  });
}

export async function answerChecklistQuestion(taskId:number,input:{answer:string;actorName:string;actorUserId:number}){
  const answer=input.answer.trim();
  if(!answer)throw new MonthlyChecklistError("RESPONSE_REQUIRED","Bitte erfassen Sie eine Antwort.");
  const task=await prisma.checklistTask.findUnique({where:{id:taskId},include:{period:true}});
  if(!task||task.reviewIssueStatus!=="Offen"||task.reviewIssueRaisedByRole!=="Bearbeiter"||task.reviewIssueDirectedToUserId!==input.actorUserId){
    throw new MonthlyChecklistError("INVALID_TRANSITION","Diese Rückfrage ist nicht Ihrer Prüferfunktion zur Beantwortung zugeordnet.");
  }
  return prisma.$transaction(async transaction=>{
    const updated=await transaction.checklistTask.update({where:{id:taskId},data:{
      reviewStatus:"Nicht geprüft",
      reviewIssueStatus:"Erledigt",
      reviewNote:`${task.reviewNote??""}\n\nAntwort des Prüfers: ${answer}`.trim(),
      reviewerInitials:input.actorName,
      reviewedAt:new Date(),
    }});
    await transaction.workflowHistory.create({data:{
      periodId:task.periodId,checklistTaskId:task.id,eventType:"Rückfrage beantwortet",actorInitials:input.actorName,
      ...await actorAudit(input.actorName),
      description:`${task.taskIdSnapshot}: Rückfrage wurde durch ${input.actorName} in der Funktion Prüfer beantwortet.`,
      previousValue:"Offen",newValue:"Erledigt",
    }});
    return updated;
  });
}

export async function reopenPeriod(periodId: number, actorInitials: string, reason: string, confirmed: boolean) {
  const actor = actorInitials.trim();
  const explanation = reason.trim();
  if (!confirmed || !actor || !explanation) {
    throw new MonthlyChecklistError("REOPEN_REASON_REQUIRED", "Wiederöffnung verlangt den vollständigen Namen, eine Begründung und ausdrückliche Bestätigung.");
  }
  const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
  if (!period || period.processingStatus !== "Abgeschlossen") throw new MonthlyChecklistError("INVALID_TRANSITION", "Nur eine abgeschlossene Monatscheckliste kann wieder geöffnet werden.");
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.accountingPeriod.update({
      where: { id: periodId },
      data: { processingStatus: "Nachbearbeitung", completedAt: null, returnedAt: now, currentActorInitials: actor, lastStatusChangedAt: now },
    });
    await transaction.workflowHistory.create({
      data: {
        periodId, eventType: "Abschluss wieder geöffnet", actorInitials: actor,
        ...await actorAudit(actor),
        description: `Die abgeschlossene Monatscheckliste wurde wieder geöffnet. Begründung: ${explanation}`,
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
  executionRhythm?: string | null;
  executionMonths?: string | null;
  taskArea?: string | null;
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
  if (input.taskType !== "Einmalig" && input.executionRhythm) {
    try {
      const planning = validateExecutionPlanning(input.executionRhythm, input.executionMonths);
      input.executionRhythm = planning.rhythm;
      input.executionMonths = planning.serializedMonths;
    } catch (error) {
      throw new MonthlyChecklistError("INVALID_INPUT", error instanceof Error ? error.message : "Die Ausführungsplanung ist ungültig.");
    }
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
      executionRhythm: input.taskType === "Einmalig" ? null : input.executionRhythm ?? null,
      executionMonths: input.taskType === "Einmalig" ? null : input.executionMonths ?? null,
      taskArea: input.taskArea?.trim() || null,
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
  if (input.taskType !== "Einmalig" && input.executionRhythm) {
    try {
      const planning = validateExecutionPlanning(input.executionRhythm, input.executionMonths);
      input.executionRhythm = planning.rhythm;
      input.executionMonths = planning.serializedMonths;
    } catch (error) {
      throw new MonthlyChecklistError("INVALID_INPUT", error instanceof Error ? error.message : "Die Ausführungsplanung ist ungültig.");
    }
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
      executionRhythm: input.taskType === "Einmalig" ? null : input.executionRhythm ?? null,
      executionMonths: input.taskType === "Einmalig" ? null : input.executionMonths ?? null,
      taskArea: input.taskArea?.trim() || null,
      processor: input.processor.trim() || null,
      reviewer: input.reviewer.trim() || null,
    },
  });
}

export type PeriodClient = Client;
