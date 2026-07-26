import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { AccountingPeriod, ChecklistTask, Client } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  dashboardMetrics,
  expectedPeriodMissing,
  getDashboardData,
  isOldOpenPeriod,
  periodMatchesFilters,
  sortByPriority,
  type DashboardPeriod,
} from "@/lib/dashboard-service";
import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";

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
});

afterAll(async () => prisma.$disconnect());

describe("Dashboard-Kennzahlen", () => {
  it("zählt vorhandene Periodenstatus einschließlich Abgeschlossen", () => {
    const periods = [
      period({ processingStatus: "Offen" }),
      period({ id: 2, processingStatus: "In Bearbeitung" }),
      period({ id: 3, processingStatus: "Zur Prüfung" }),
      period({ id: 4, processingStatus: "In Prüfung" }),
      period({ id: 5, processingStatus: "Nachbearbeitung" }),
      period({ id: 6, processingStatus: "Abgeschlossen" }),
    ];
    expect(dashboardMetrics(periods, 2026, 7)).toMatchObject({
      total: 6, open: 1, processing: 1, readyForReview: 1, inReview: 1, rework: 1, completed: 1,
    });
  });

  it("zählt offene Pflichtaufgaben und offene Prüfpunkte", () => {
    const periods = [period({}, [
      task({ mandatorySnapshot: true, status: "Offen" }),
      task({ mandatorySnapshot: true, status: "Erledigt" }),
      task({ reviewStatus: "Rückfrage" }),
      task({ reviewStatus: "Beanstandung" }),
    ])];
    expect(dashboardMetrics(periods, 2026, 7)).toMatchObject({ openMandatory: 1, openReviewPoints: 2 });
  });

  it("erkennt alte offene Perioden und schließt abgeschlossene alte Perioden aus", () => {
    expect(isOldOpenPeriod(period({ month: 6 }), 2026, 7)).toBe(true);
    expect(isOldOpenPeriod(period({ month: 6, processingStatus: "Abgeschlossen" }), 2026, 7)).toBe(false);
  });

  it("verwendet die einheitliche Fortschrittsberechnung", () => {
    const tasks = [task({ status: "Erledigt" }), task({ status: "Nicht zutreffend" }), task({ status: "Offen" })];
    expect(period({}, tasks).progress).toEqual(calculateProgress(tasks));
  });
});

describe("Fehlende Perioden", () => {
  it("erkennt monatliche Mandanten ohne Periode", () => {
    expect(expectedPeriodMissing(client(), [], 2026, 7)).toBe(true);
  });

  it("meldet monatliche Mandanten mit Periode nicht als fehlend", () => {
    const testClient = client();
    expect(expectedPeriodMissing(testClient, [period({ clientId: testClient.id })], 2026, 7)).toBe(false);
  });

  it("erwartet auch bei vierteljährlicher USt-Voranmeldung eine Februarcheckliste", () => {
    expect(expectedPeriodMissing(client({ vatFilingPeriod: "Vierteljährlich" }), [], 2026, 2)).toBe(true);
  });

  it("erwartet im März eine Quartalsperiode", () => {
    expect(expectedPeriodMissing(client({ cadence: "vierteljährlich" }), [], 2026, 3)).toBe(true);
  });
});

describe("Kombinierbare Filter und Priorisierung", () => {
  const filtered = period({
    processorSnapshot: "MA",
    reviewerSnapshot: "PR",
    processingStatus: "In Bearbeitung",
  }, [], client({ managementName: "Karla Leitung" }));

  it.each([
    ["Bearbeiter", { processor: "MA" }],
    ["Prüfer", { reviewer: "PR" }],
    ["Kanzleileitung", { management: "Karla Leitung" }],
    ["Status", { status: "In Bearbeitung" }],
  ])("filtert nach %s", (_label, partial) => {
    expect(periodMatchesFilters(filtered, { year: 2026, month: 7, ...partial })).toBe(true);
  });

  it("kombiniert mehrere Filter", () => {
    expect(periodMatchesFilters(filtered, {
      year: 2026, month: 7, processor: "MA", reviewer: "PR", management: "Karla Leitung", status: "In Bearbeitung",
    })).toBe(true);
    expect(periodMatchesFilters(filtered, {
      year: 2026, month: 7, processor: "MA", reviewer: "XX", management: "Karla Leitung",
    })).toBe(false);
  });

  it("priorisiert Nachbearbeitung mit Prüfpunkt vor Prüfung und Bearbeitung", () => {
    const sorted = sortByPriority([
      period({ id: 1, processingStatus: "Offen" }),
      period({ id: 2, processingStatus: "Zur Prüfung" }),
      period({ id: 3, processingStatus: "Nachbearbeitung" }, [task({ reviewStatus: "Rückfrage" })]),
    ], 2026, 7);
    expect(sorted.map((entry) => entry.id)).toEqual([3, 2, 1]);
  });
});

describe("Datenbankauswertung ohne Workflowänderung", () => {
  it("trennt Mein-Kürzel-Bearbeitungen und -Prüfungen", async () => {
    const clientEntry = await createClient({ processor: "MK", reviewer: "MK" }, true);
    await createPeriod(clientEntry, "In Bearbeitung", 7);
    await createPeriod(clientEntry, "Zur Prüfung", 6);
    const result = await getDashboardData({ year: 2026, month: 7, workViewName: "MK" });
    expect(result.myProcessing).toHaveLength(1);
    expect(result.myReviews).toHaveLength(1);
  });

  it("zeigt fehlendes Jahresprofil und identische Kürzel als Datenprobleme", async () => {
    await createClient({ clientNumber: "DQ-1", processor: "XX", reviewer: "XX" }, false);
    const result = await getDashboardData({ year: 2026, month: 7 });
    expect(result.quality.some((item) => item.text.includes("Jahresprofil"))).toBe(true);
    expect(result.quality.some((item) => item.text.includes("identisch"))).toBe(true);
  });

  it("zeigt fehlende Kanzleileitung als Datenproblem", async () => {
    await createClient({ clientNumber: "DQ-2", managementName: null }, true);
    const result = await getDashboardData({ year: 2026, month: 7 });
    expect(result.quality.some((item) => item.text.includes("Kanzleileitung"))).toBe(true);
  });

  it("verändert beim Laden keine Workflowdaten", async () => {
    const clientEntry = await createClient({}, true);
    const created = await createPeriod(clientEntry, "In Prüfung", 7);
    const before = await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: created.id } });
    const historyBefore = await prisma.workflowHistory.count();
    await getDashboardData({ year: 2026, month: 7 });
    const after = await prisma.accountingPeriod.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.processingStatus).toBe(before.processingStatus);
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(await prisma.workflowHistory.count()).toBe(historyBefore);
  });
});

describe("Performance-Grundprüfung", () => {
  it("wertet 1.200 Perioden mit 30.000 Aufgaben im Speicher flüssig aus", () => {
    const started = performance.now();
    const periods = Array.from({ length: 1_200 }, (_, index) =>
      period({ id: index + 1, month: index % 12 + 1 }, Array.from({ length: 25 }, (__, taskIndex) =>
        task({ status: taskIndex % 3 ? "Erledigt" : "Offen", mandatorySnapshot: taskIndex % 2 === 0 })
      ))
    );
    dashboardMetrics(periods, 2026, 7);
    sortByPriority(periods, 2026, 7);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

function task(overrides: Partial<ChecklistTask> = {}) {
  return {
    status: "Offen",
    mandatorySnapshot: false,
    reviewStatus: "Nicht geprüft",
    processingNote: null,
    ...overrides,
  } as ChecklistTask;
}

function client(overrides: Partial<Client> = {}) {
  return {
    id: 1,
    clientNumber: "10001",
    name: "Künstlicher Dashboardmandant",
    processor: "MA",
    reviewer: "PR",
    team: "Team 1",
    cadence: "monatlich",
    active: true,
    internalNote: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as Client;
}

function period(overrides: Partial<AccountingPeriod> = {}, tasks: ChecklistTask[] = [], testClient = client()): DashboardPeriod {
  const base = {
    id: 1,
    clientId: testClient.id,
    calendarYear: 2026,
    month: 7,
    checklistType: "Monat",
    periodLabel: "Juli 2026",
    processingStatus: "Offen",
    processorSnapshot: testClient.processor,
    reviewerSnapshot: testClient.reviewer,
    managementNameSnapshot: testClient.managementName,
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-01"),
    ...overrides,
  } as AccountingPeriod;
  return { ...base, client: testClient, tasks, progress: calculateProgress(tasks), summary: workflowSummary(tasks) };
}

async function createClient(overrides: Partial<Client>, withProfile: boolean) {
  const entry = await prisma.client.create({
    data: {
      clientNumber: overrides.clientNumber ?? "DB-100",
      name: "Künstlicher Datenbankmandant",
      processor: overrides.processor ?? "MA",
      reviewer: overrides.reviewer ?? "PR",
      team: "Team 1",
      cadence: "monatlich",
      active: true,
    },
  });
  if (withProfile) {
    await prisma.annualProfile.create({
      data: { clientId: entry.id, calendarYear: 2026, legalFormGroup: "Einzelunternehmen", profitDeterminationMethod: "Einnahmenüberschussrechnung" },
    });
  }
  return entry;
}

async function createPeriod(clientEntry: Client, processingStatus: string, month: number) {
  return prisma.accountingPeriod.create({
    data: {
      clientId: clientEntry.id,
      calendarYear: 2026,
      month,
      periodLabel: `${month}/2026`,
      checklistType: "Monat",
      processingStatus,
      processorSnapshot: clientEntry.processor,
      reviewerSnapshot: clientEntry.reviewer,
      profileLegalFormGroup: "Einzelunternehmen",
      profileProfitDeterminationMethod: "Einnahmenüberschussrechnung",
      profileHasCashRegister: false,
      profileHasPayroll: false,
      profileHasFixedAssets: false,
      profileHasReceivablesPayables: false,
      profileHasLoans: false,
      profileSubjectToVat: false,
      profileHasPermanentExtension: false,
    },
  });
}
