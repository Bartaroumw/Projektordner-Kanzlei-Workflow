import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  completeRework,
  createMonthlyPeriod,
  reopenPeriod,
  reviewChecklistTask,
  transitionPeriod,
  updateChecklistTask,
  updateCustomClientTask,
} from "@/lib/monthly-checklist-service";

let clientId: number;
let categoryId: number;

beforeEach(async () => {
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany({ where: { sourceTaskId: { not: null } } });
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  categoryId = (await prisma.taskCategory.create({ data: { name: "Künstliche Workflowkategorie", sortOrder: 10 } })).id;
  clientId = (await prisma.client.create({ data: { clientNumber: "WF-100", name: "Künstlicher Workflowmandant", processor: "BA", reviewer: "PR", cadence: "monatlich", active: true } })).id;
  await prisma.annualProfile.create({ data: { clientId, calendarYear: 2026, legalFormGroup: "Einzelunternehmen", profitDeterminationMethod: "Einnahmenüberschussrechnung" } });
});

afterAll(async () => prisma.$disconnect());

describe("Übergabe und Prüfung", () => {
  it("verhindert Übergabe bei offener Pflichtaufgabe", async () => {
    const { period } = await setupPeriod(true);
    await transitionPeriod(period.id, "BEGIN_PROCESSING", "BA");
    await expect(transitionPeriod(period.id, "SUBMIT_REVIEW", "BA")).rejects.toMatchObject({ code: "MANDATORY_TASKS_OPEN" });
  });

  it("erlaubt Übergabe nach begründetem Nicht zutreffend", async () => {
    const { period, task } = await setupPeriod(true);
    await updateChecklistTask(task.id, { status: "Nicht zutreffend", processingNote: "", processorInitials: "BA", notApplicableReason: "Künstliche Begründung" });
    await transitionPeriod(period.id, "SUBMIT_REVIEW", "BA");
    expect((await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: period.id } })).processingStatus).toBe("Zur Prüfung");
  });

  it("verhindert Übergabe ohne Bearbeiterkürzel", async () => {
    const { period, task } = await setupPeriod(true);
    await updateChecklistTask(task.id, { status: "Erledigt", processingNote: "", processorInitials: "BA", notApplicableReason: "" });
    await prisma.accountingPeriod.update({ where: { id: period.id }, data: { processorSnapshot: null } });
    await expect(transitionPeriod(period.id, "SUBMIT_REVIEW", "")).rejects.toMatchObject({ code: "INITIALS_REQUIRED" });
  });

  it("verhindert Prüfungsbeginn ohne Prüferkürzel", async () => {
    const { period } = await readyForReview();
    await prisma.accountingPeriod.update({ where: { id: period.id }, data: { reviewerSnapshot: null } });
    await expect(transitionPeriod(period.id, "BEGIN_REVIEW", "")).rejects.toMatchObject({ code: "INITIALS_REQUIRED" });
  });

  it("verlangt bei Rückfrage eine Prüfnotiz", async () => {
    const { task } = await inReview();
    await expect(reviewChecklistTask(task.id, { reviewStatus: "Rückfrage", reviewerInitials: "PR", reviewNote: "" })).rejects.toMatchObject({ code: "REVIEW_NOTE_REQUIRED" });
  });

  it("verlangt bei Beanstandung eine Prüfnotiz", async () => {
    const { task } = await inReview();
    await expect(reviewChecklistTask(task.id, { reviewStatus: "Beanstandung", reviewerInitials: "PR", reviewNote: "" })).rejects.toMatchObject({ code: "REVIEW_NOTE_REQUIRED" });
  });

  it("erzeugt durch Rückfrage einen offenen Prüfpunkt", async () => {
    const { task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "Rückfrage", reviewerInitials: "PR", reviewNote: "Künstliche Rückfrage" });
    expect((await prisma.checklistTask.findUniqueOrThrow({ where: { id: task.id } })).reviewStatus).toBe("Rückfrage");
  });

  it("verhindert Abschluss mit offenem Prüfpunkt", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "Rückfrage", reviewerInitials: "PR", reviewNote: "Künstliche Rückfrage" });
    await expect(transitionPeriod(period.id, "COMPLETE_REVIEW", "PR")).rejects.toMatchObject({ code: "OPEN_REVIEW_POINTS" });
  });

  it("verlangt für Rückgabe einen offenen Prüfpunkt", async () => {
    const { period } = await inReview();
    await expect(transitionPeriod(period.id, "RETURN_REWORK", "PR")).rejects.toMatchObject({ code: "OPEN_REVIEW_POINT_REQUIRED" });
  });
});

describe("Nachbearbeitung und Abschluss", () => {
  it("verlangt Antwort oder nachvollziehbare Änderung", async () => {
    const { period, task } = await returnedForRework();
    await expect(completeRework(task.id, { response: "", actorInitials: "BA", processingNote: task.processingNote ?? "" })).rejects.toMatchObject({ code: "RESPONSE_REQUIRED" });
    expect((await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: period.id } })).processingStatus).toBe("Nachbearbeitung");
  });

  it("kann eine nachbearbeitete Aufgabe erneut auf In Ordnung setzen", async () => {
    const { period, task } = await returnedForRework();
    await completeRework(task.id, { response: "Künstliche Antwort", actorInitials: "BA", processingNote: "Ergänzt" });
    await transitionPeriod(period.id, "SUBMIT_REVIEW", "BA");
    await transitionPeriod(period.id, "BEGIN_REVIEW", "PR");
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "Nachbearbeitung geprüft" });
    expect((await prisma.checklistTask.findUniqueOrThrow({ where: { id: task.id } })).reviewStatus).toBe("In Ordnung");
  });

  it("erlaubt Abschluss, wenn alle Prüfpunkte geschlossen sind", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "" });
    await transitionPeriod(period.id, "COMPLETE_REVIEW", "PR");
    expect((await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: period.id } })).processingStatus).toBe("Abgeschlossen");
  });

  it("sperrt Aufgabenbearbeitung nach Abschluss", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "" });
    await transitionPeriod(period.id, "COMPLETE_REVIEW", "PR");
    await expect(updateChecklistTask(task.id, { status: "Offen", processingNote: "", processorInitials: "BA", notApplicableReason: "" })).rejects.toMatchObject({ code: "PERIOD_CLOSED" });
  });

  it("verlangt für Wiederöffnung eine Begründung", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "" });
    await transitionPeriod(period.id, "COMPLETE_REVIEW", "PR");
    await expect(reopenPeriod(period.id, "PR", "", true)).rejects.toMatchObject({ code: "REOPEN_REASON_REQUIRED" });
  });

  it("speichert Wiederöffnung unveränderlich im Verlauf", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "" });
    await transitionPeriod(period.id, "COMPLETE_REVIEW", "PR");
    await reopenPeriod(period.id, "PR", "Künstliche Wiederöffnungsbegründung", true);
    const entry = await prisma.workflowHistory.findFirstOrThrow({ where: { periodId: period.id, eventType: "Abschluss wieder geöffnet" } });
    expect(entry.description).toContain("Künstliche Wiederöffnungsbegründung");
  });

  it("ändert vorhandene Verlaufseinträge bei späteren Aktionen nicht", async () => {
    const { period } = await setupPeriod(false);
    const created = await prisma.workflowHistory.findFirstOrThrow({ where: { periodId: period.id, eventType: "Monatscheckliste angelegt" } });
    await transitionPeriod(period.id, "BEGIN_PROCESSING", "BA");
    expect(await prisma.workflowHistory.findUnique({ where: { id: created.id } })).toEqual(created);
  });

  it("protokolliert Bearbeitung und Prüfung als getrennte Statusschritte", async () => {
    const { period, task } = await inReview();
    await reviewChecklistTask(task.id, { reviewStatus: "In Ordnung", reviewerInitials: "PR", reviewNote: "" });
    await transitionPeriod(period.id, "COMPLETE_REVIEW", "PR");
    const entries=await prisma.workflowHistory.findMany({where:{periodId:period.id},orderBy:{id:"asc"}});
    expect(entries.some(entry=>entry.description.includes("Funktion Bearbeiter"))).toBe(true);
    expect(entries.some(entry=>entry.description.includes("Funktion Prüfer"))).toBe(true);
  });
});

describe("Mandantenspezifische Vorlagen", () => {
  it("bewahrt einen Snapshot nach Deaktivierung der Vorlage", async () => {
    const custom = await createCustom();
    const period = await createMonthlyPeriod(clientId, 2026, 1);
    const snapshot = await prisma.checklistTask.findFirstOrThrow({ where: { periodId: period.id, customClientTaskId: custom.id } });
    await updateCustomClientTask(custom.id, customInput(custom.id, false));
    expect((await prisma.checklistTask.findUniqueOrThrow({ where: { id: snapshot.id } })).titleSnapshot).toBe("Künstliche Workflow-Zusatzaufgabe");
  });

  it("nimmt deaktivierte Vorlagen nicht in neue Perioden auf", async () => {
    const custom = await createCustom();
    await updateCustomClientTask(custom.id, customInput(custom.id, false));
    const period = await createMonthlyPeriod(clientId, 2026, 2);
    expect(await prisma.checklistTask.count({ where: { periodId: period.id, customClientTaskId: custom.id } })).toBe(0);
  });
});

async function setupPeriod(mandatory: boolean) {
  await prisma.standardTask.create({ data: { taskId: "WF-TASK-001", active: true, checklistType: "Monat", categoryId, title: "Künstliche Workflowaufgabe", mandatory, rhythm: "Monatlich", legalFormGroups: "Alle", profitDeterminationMethods: "Alle", cashCondition: "Alle", payrollCondition: "Alle", fixedAssetsCondition: "Alle", receivablesPayablesCondition: "Alle", loansCondition: "Alle", vatCondition: "Alle", permanentExtensionCondition: "Alle", sortOrder: 10, professionalVersion: "TEST-1" } });
  const period = await createMonthlyPeriod(clientId, 2026, 1);
  const task = await prisma.checklistTask.findFirstOrThrow({ where: { periodId: period.id } });
  return { period, task };
}

async function readyForReview() {
  const result = await setupPeriod(true);
  await updateChecklistTask(result.task.id, { status: "Erledigt", processingNote: "", processorInitials: "BA", notApplicableReason: "" });
  await transitionPeriod(result.period.id, "SUBMIT_REVIEW", "BA");
  return result;
}

async function inReview() {
  const result = await readyForReview();
  await transitionPeriod(result.period.id, "BEGIN_REVIEW", "PR");
  return result;
}

async function returnedForRework() {
  const result = await inReview();
  await reviewChecklistTask(result.task.id, { reviewStatus: "Rückfrage", reviewerInitials: "PR", reviewNote: "Künstliche Rückfrage" });
  await transitionPeriod(result.period.id, "RETURN_REWORK", "PR");
  return result;
}

async function createCustom() {
  return prisma.customClientTask.create({ data: { clientId, title: "Künstliche Workflow-Zusatzaufgabe", categoryId, active: true, taskType: "Wiederkehrend monatlich", validFrom: new Date("2026-01-01T00:00:00Z") } });
}

function customInput(_id: number, active: boolean) {
  return { clientId, title: "Künstliche Workflow-Zusatzaufgabe", description: "", categoryId, active, taskType: "Wiederkehrend monatlich", validFrom: new Date("2026-01-01T00:00:00Z"), validUntil: null, executionYear: null, executionMonth: null, processor: "", reviewer: "" };
}
