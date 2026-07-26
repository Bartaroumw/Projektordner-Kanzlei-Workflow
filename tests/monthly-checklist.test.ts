import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  calculateProgress,
  createMonthlyPeriod,
  customTaskMatches,
  standardTaskMatches,
  updateChecklistTask,
} from "@/lib/monthly-checklist-service";

let categoryId: number;
let clientId: number;

beforeEach(async () => {
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  categoryId = (await prisma.taskCategory.create({ data: { name: "Künstliche Testkategorie", sortOrder: 10 } })).id;
  clientId = (await prisma.client.create({
    data: { clientNumber: "P-100", name: "Künstlicher Periodenmandant", cadence: "monatlich", active: true },
  })).id;
  await prisma.annualProfile.create({
    data: {
      clientId,
      calendarYear: 2026,
      legalFormGroup: "Einzelunternehmen",
      profitDeterminationMethod: "Einnahmenüberschussrechnung",
      hasCashRegister: true,
      hasPayroll: false,
      hasFixedAssets: true,
      hasReceivablesPayables: false,
      hasLoans: false,
      subjectToVat: true,
      hasPermanentExtension: false,
    },
  });
});

afterAll(async () => prisma.$disconnect());

describe("Auswahl der Standardaufgaben", () => {
  it("nimmt eine monatliche Aufgabe in einem normalen Monat auf", async () => expect(await matches({ rhythm: "Monatlich" }, 2)).toBe(true));
  it("nimmt eine quartalsweise Aufgabe im März auf", async () => expect(await matches({ rhythm: "Quartalsweise" }, 3)).toBe(true));
  it("nimmt eine quartalsweise Aufgabe im Februar nicht auf", async () => expect(await matches({ rhythm: "Quartalsweise" }, 2)).toBe(false));
  it("nimmt Bestimmter Monat nur im passenden Monat auf", async () => {
    expect(await matches({ rhythm: "Bestimmter Monat", executionMonth: 5 }, 5)).toBe(true);
    expect(await matches({ rhythm: "Bestimmter Monat", executionMonth: 5 }, 4)).toBe(false);
  });
  it("nimmt jährliche Aufgaben nicht in die Monatscheckliste auf", async () => expect(await matches({ rhythm: "Jährlich" }, 12)).toBe(false));
  it("akzeptiert Rechtsform Alle immer", async () => expect(await matches({ legalFormGroups: "Alle" }, 1)).toBe(true));
  it("nimmt eine passende Rechtsform auf", async () => expect(await matches({ legalFormGroups: "Einzelunternehmen" }, 1)).toBe(true));
  it("schließt eine unpassende Rechtsform aus", async () => expect(await matches({ legalFormGroups: "Kapitalgesellschaft" }, 1)).toBe(false));
  it("prüft die Gewinnermittlungsart korrekt", async () => {
    expect(await matches({ profitDeterminationMethods: "Einnahmenüberschussrechnung" }, 1)).toBe(true);
    expect(await matches({ profitDeterminationMethods: "Bilanzierung" }, 1)).toBe(false);
  });
  it("nimmt Kasse Ja nur bei vorhandener Kasse auf", async () => expect(await matches({ cashCondition: "Ja" }, 1)).toBe(true));
  it("nimmt Kasse Nein nur ohne Kasse auf", async () => expect(await matches({ cashCondition: "Nein" }, 1)).toBe(false));
  it("verlangt, dass mehrere Bedingungen gleichzeitig erfüllt sind", async () => expect(await matches({ cashCondition: "Ja", payrollCondition: "Ja" }, 1)).toBe(false));
  it("nimmt eine inaktive Standardaufgabe nicht auf", async () => expect(await matches({ active: false }, 1)).toBe(false));
});

describe("Perioden und Snapshots", () => {
  it("verhindert die Erzeugung ohne Jahresprofil", async () => {
    await prisma.annualProfile.deleteMany();
    await expect(createMonthlyPeriod(clientId, 2026, 1)).rejects.toMatchObject({ code: "PROFILE_MISSING" });
  });
  it("verhindert eine doppelte Periode", async () => {
    await createTask();
    await createMonthlyPeriod(clientId, 2026, 1);
    await expect(createMonthlyPeriod(clientId, 2026, 1)).rejects.toMatchObject({ code: "PERIOD_EXISTS" });
  });
  it("erlaubt beim vierteljährlichen Mandanten nur Abschlussmonate", async () => {
    await prisma.client.update({ where: { id: clientId }, data: { cadence: "vierteljährlich" } });
    await expect(createMonthlyPeriod(clientId, 2026, 2)).rejects.toMatchObject({ code: "INVALID_QUARTER_MONTH" });
  });
  it("bewahrt den Snapshot nach Änderung der Standardaufgabe", async () => {
    const template = await createTask();
    const period = await createMonthlyPeriod(clientId, 2026, 1);
    await prisma.standardTask.update({ where: { id: template.id }, data: { title: "Nachträglich geändert" } });
    const snapshot = await prisma.checklistTask.findFirstOrThrow({ where: { periodId: period.id } });
    expect(snapshot.titleSnapshot).toBe("Künstliche Auswahlaufgabe");
  });
  it("bewahrt die Checklistenaufgabe nach Deaktivierung der Standardaufgabe", async () => {
    const template = await createTask();
    const period = await createMonthlyPeriod(clientId, 2026, 1);
    await prisma.standardTask.update({ where: { id: template.id }, data: { active: false } });
    expect(await prisma.checklistTask.count({ where: { periodId: period.id } })).toBe(1);
  });
});

describe("Mandantenspezifische Aufgaben und Bearbeitung", () => {
  it("nimmt eine monatliche mandantenspezifische Aufgabe auf", async () => {
    const task = await customTask("Wiederkehrend monatlich");
    expect(customTaskMatches(task, "monatlich", 2026, 2)).toBe(true);
  });
  it("nimmt eine einmalige Aufgabe nur in der vorgesehenen Periode auf", async () => {
    const task = await customTask("Einmalig", { executionYear: 2026, executionMonth: 2 });
    expect(customTaskMatches(task, "monatlich", 2026, 2)).toBe(true);
    expect(customTaskMatches(task, "monatlich", 2026, 3)).toBe(false);
  });
  it("verlangt bei Nicht zutreffend eine Begründung", async () => {
    await createTask({ mandatory: true });
    const period = await createMonthlyPeriod(clientId, 2026, 1);
    const task = await prisma.checklistTask.findFirstOrThrow({ where: { periodId: period.id } });
    await expect(updateChecklistTask(task.id, { status: "Nicht zutreffend", processingNote: "", processorInitials: "TA", notApplicableReason: "" })).rejects.toMatchObject({ code: "REASON_REQUIRED" });
  });
  it("berechnet den Fortschritt korrekt", () => {
    const progress = calculateProgress([
      { status: "Erledigt", mandatorySnapshot: true },
      { status: "Nicht zutreffend", mandatorySnapshot: false },
      { status: "Offen", mandatorySnapshot: true },
      { status: "In Bearbeitung", mandatorySnapshot: false },
    ]);
    expect(progress).toMatchObject({ completed: 2, total: 4, percent: 50, mandatoryOpen: 1 });
  });
});

async function matches(overrides: Record<string, unknown>, month: number) {
  const task = await createTask(overrides);
  const profile = await prisma.annualProfile.findFirstOrThrow({ where: { clientId } });
  return standardTaskMatches(task, profile, "monatlich", month);
}

async function createTask(overrides: Record<string, unknown> = {}) {
  return prisma.standardTask.create({
    data: {
      taskId: `TEST-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      active: true,
      checklistType: "Monat",
      categoryId,
      title: "Künstliche Auswahlaufgabe",
      mandatory: false,
      rhythm: "Monatlich",
      legalFormGroups: "Alle",
      profitDeterminationMethods: "Alle",
      cashCondition: "Alle",
      payrollCondition: "Alle",
      fixedAssetsCondition: "Alle",
      receivablesPayablesCondition: "Alle",
      loansCondition: "Alle",
      vatCondition: "Alle",
      permanentExtensionCondition: "Alle",
      sortOrder: 10,
      professionalVersion: "TEST-1",
      ...overrides,
    },
    include: { category: true },
  });
}

async function customTask(taskType: string, overrides: Record<string, unknown> = {}) {
  return prisma.customClientTask.create({
    data: {
      clientId,
      title: "Künstliche Zusatzaufgabe",
      categoryId,
      active: true,
      taskType,
      validFrom: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    },
    include: { category: true },
  });
}
