import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clients = [
  {
    clientNumber: "10001",
    name: "Musterpraxis Beispiel",
    processor: "MA",
    reviewer: "PR",
    team: "Rechnungswesen 1",
    cadence: "monatlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Einzelunternehmen",
      profitDeterminationMethod: "Einnahmenüberschussrechnung",
    },
  },
  {
    clientNumber: "10002",
    name: "Beispiel Verwaltungs GmbH",
    processor: "MB",
    reviewer: "PS",
    team: "Rechnungswesen 2",
    cadence: "monatlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Kapitalgesellschaft",
      profitDeterminationMethod: "Bilanzierung",
    },
  },
  {
    clientNumber: "10003",
    name: "Mustermann Besitz GbR",
    processor: "MA",
    reviewer: "PS",
    team: "Rechnungswesen 1",
    cadence: "vierteljährlich",
    profile: {
      calendarYear: 2026,
      legalFormGroup: "Personengesellschaft",
      profitDeterminationMethod: "Bilanzierung",
    },
  },
];

const categories = [
  "Allgemein",
  "Bank",
  "Kasse",
  "Debitoren und Kreditoren",
  "Anlagevermögen",
  "Darlehen",
  "Lohn",
  "Umsatzsteuer",
  "Kontenabstimmung",
  "Kontonotizen und Dokumentation",
  "Jahresabschluss",
  "Abschlusskontrolle",
];

for (const entry of clients) {
  const { profile, ...clientData } = entry;
  await prisma.client.upsert({
    where: { clientNumber: clientData.clientNumber },
    update: {
      ...clientData,
      active: true,
    },
    create: {
      ...clientData,
      active: true,
      annualProfiles: { create: profile },
    },
  });
}

for (const [index, name] of categories.entries()) {
  await prisma.taskCategory.upsert({
    where: { name },
    update: { active: true, sortOrder: (index + 1) * 10 },
    create: {
      name,
      description: `Künstliche Beispielkategorie für ${name}.`,
      sortOrder: (index + 1) * 10,
      active: true,
    },
  });
}

const artificialTasks = [
  ["MON-ALLG-001", "Allgemein", "Künstliche Unterlagenvollständigkeit prüfen", "Monatlich", "Alle", "Alle", "Alle", "Alle", true],
  ["MON-ALLG-002", "Allgemein", "Künstliche Belegablage abstimmen", "Monatlich", "Alle", "Alle", "Alle", "Alle", false],
  ["MON-ALLG-003", "Allgemein", "Künstliche offene Punkte nachhalten", "Monatlich", "Alle", "Alle", "Alle", "Alle", true],
  ["MON-ALLG-004", "Allgemein", "Künstliche Periodenabgrenzung prüfen", "Quartalsweise", "Alle", "Alle", "Alle", "Alle", false],
  ["MON-ALLG-005", "Kontonotizen und Dokumentation", "Künstliche Kontonotizen ergänzen", "Monatlich", "Alle", "Alle", "Alle", "Alle", true],
  ["MON-EÜR-001", "Allgemein", "Künstliche Zuflussprüfung durchführen", "Monatlich", "Einzelunternehmen;Personengesellschaft", "Einnahmenüberschussrechnung", "Alle", "Alle", true],
  ["MON-EÜR-002", "Umsatzsteuer", "Künstliche Betriebsausgaben prüfen", "Quartalsweise", "Alle", "Einnahmenüberschussrechnung", "Alle", "Alle", false],
  ["MON-BIL-001", "Kontenabstimmung", "Künstliche Forderungskonten abstimmen", "Monatlich", "Alle", "Bilanzierung", "Alle", "Alle", true],
  ["MON-BIL-002", "Kontenabstimmung", "Künstliche Verbindlichkeitskonten abstimmen", "Monatlich", "Alle", "Bilanzierung", "Alle", "Alle", true],
  ["MON-PERS-001", "Allgemein", "Künstliche Gesellschafterkonten prüfen", "Quartalsweise", "Personengesellschaft", "Bilanzierung", "Alle", "Alle", false],
  ["MON-KAP-001", "Allgemein", "Künstliche Organbezüge prüfen", "Quartalsweise", "Kapitalgesellschaft", "Bilanzierung", "Alle", "Alle", false],
  ["MON-KASSE-001", "Kasse", "Künstlichen Kassenbestand abstimmen", "Monatlich", "Alle", "Alle", "Ja", "Alle", true],
  ["MON-DARL-001", "Darlehen", "Künstliche Darlehensbewegungen abstimmen", "Quartalsweise", "Alle", "Bilanzierung", "Alle", "Ja", false],
  ["JA-ALLG-001", "Jahresabschluss", "Künstliche Abschlussunterlagen finalisieren", "Jährlich", "Alle", "Alle", "Alle", "Alle", true],
  ["JA-BIL-001", "Jahresabschluss", "Künstliche Abschlussbuchungen dokumentieren", "Jährlich", "Alle", "Bilanzierung", "Alle", "Alle", true],
  ["JA-KONT-001", "Abschlusskontrolle", "Künstliche Abschlusskontrolle durchführen", "Jährlich", "Alle", "Alle", "Alle", "Alle", true],
];

for (const [index, task] of artificialTasks.entries()) {
  const [taskId, categoryName, title, rhythm, legalForms, profitMethods, cashCondition, loansCondition, mandatory] = task;
  const category = await prisma.taskCategory.findUniqueOrThrow({ where: { name: categoryName } });
  const checklistType = taskId.startsWith("JA-") ? "Jahresabschluss" : "Monat";
  const data = {
    active: true,
    checklistType,
    categoryId: category.id,
    title,
    workInstruction: `Künstliche Arbeitsanweisung zu „${title}“.`,
    reviewInstruction: "Künstliches Ergebnis nachvollziehen.",
    mandatory,
    rhythm,
    executionMonth: null,
    legalFormGroups: legalForms,
    profitDeterminationMethods: profitMethods,
    cashCondition,
    payrollCondition: "Alle",
    fixedAssetsCondition: "Alle",
    receivablesPayablesCondition: "Alle",
    loansCondition,
    vatCondition: "Alle",
    permanentExtensionCondition: "Alle",
    sortOrder: (index + 1) * 10,
    professionalVersion: "BEISPIEL-1.0",
    internalNote: "Ausschließlich künstliches fachliches Beispiel.",
  };
  await prisma.standardTask.upsert({
    where: { taskId },
    update: data,
    create: { taskId, ...data },
  });
}

const client10001 = await prisma.client.findUniqueOrThrow({ where: { clientNumber: "10001" } });
const client10002 = await prisma.client.findUniqueOrThrow({ where: { clientNumber: "10002" } });
const client10003 = await prisma.client.findUniqueOrThrow({ where: { clientNumber: "10003" } });
const generalCategory = await prisma.taskCategory.findUniqueOrThrow({ where: { name: "Allgemein" } });

await prisma.customClientTask.upsert({
  where: { id: 1 },
  update: {},
  create: {
    clientId: client10001.id,
    title: "Künstliche monatliche Praxisstatistik abstimmen",
    description: "Ausschließlich künstliche mandantenspezifische Monatsaufgabe.",
    categoryId: generalCategory.id,
    active: true,
    taskType: "Wiederkehrend monatlich",
    validFrom: new Date("2026-01-01T00:00:00Z"),
    processor: "MA",
  },
});
await prisma.customClientTask.upsert({
  where: { id: 2 },
  update: {},
  create: {
    clientId: client10001.id,
    title: "Künstliche einmalige Januar-Rückfrage",
    description: "Ausschließlich künstliche einmalige Aufgabe für Januar 2026.",
    categoryId: generalCategory.id,
    active: true,
    taskType: "Einmalig",
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validUntil: new Date("2026-01-31T23:59:59Z"),
    executionYear: 2026,
    executionMonth: 1,
    processor: "MA",
  },
});

const monthPeriods = [
  [client10001, 1, "Januar 2026"],
  [client10001, 2, "Februar 2026"],
  [client10001, 3, "März 2026"],
  [client10002, 1, "Januar 2026"],
  [client10003, 3, "1. Quartal 2026"],
];

function multipleMatches(stored, actual) {
  const values = stored.split(";");
  return values.includes("Alle") || values.includes(actual);
}
function conditionMatches(condition, actual) {
  return condition === "Alle" || (condition === "Ja" ? actual : !actual);
}

for (const [client, month, label] of monthPeriods) {
  const profile = await prisma.annualProfile.findUniqueOrThrow({
    where: { clientId_calendarYear: { clientId: client.id, calendarYear: 2026 } },
  });
  const period = await prisma.accountingPeriod.upsert({
    where: { clientId_calendarYear_month_checklistType: { clientId: client.id, calendarYear: 2026, month, checklistType: "Monat" } },
    update: {},
    create: {
      clientId: client.id,
      calendarYear: 2026,
      month,
      periodLabel: label,
      processorSnapshot: client.processor,
      reviewerSnapshot: client.reviewer,
      profileLegalFormGroup: profile.legalFormGroup,
      profileProfitDeterminationMethod: profile.profitDeterminationMethod,
      profileHasCashRegister: profile.hasCashRegister,
      profileHasPayroll: profile.hasPayroll,
      profileHasFixedAssets: profile.hasFixedAssets,
      profileHasReceivablesPayables: profile.hasReceivablesPayables,
      profileHasLoans: profile.hasLoans,
      profileSubjectToVat: profile.subjectToVat,
      profileHasPermanentExtension: profile.hasPermanentExtension,
    },
  });
  if (await prisma.checklistTask.count({ where: { periodId: period.id } })) continue;
  const tasks = await prisma.standardTask.findMany({ include: { category: true } });
  const matching = tasks.filter((task) => {
    if (!task.active || task.checklistType !== "Monat" || task.rhythm === "Jährlich") return false;
    if (task.rhythm === "Quartalsweise" && client.cadence !== "vierteljährlich" && ![3, 6, 9, 12].includes(month)) return false;
    return multipleMatches(task.legalFormGroups, profile.legalFormGroup) &&
      multipleMatches(task.profitDeterminationMethods, profile.profitDeterminationMethod) &&
      conditionMatches(task.cashCondition, profile.hasCashRegister) &&
      conditionMatches(task.loansCondition, profile.hasLoans);
  });
  await prisma.checklistTask.createMany({
    data: matching.map((task) => ({
      periodId: period.id,
      standardTaskId: task.id,
      taskIdSnapshot: task.taskId,
      categorySnapshot: task.category.name,
      categorySortOrder: task.category.sortOrder,
      titleSnapshot: task.title,
      workInstructionSnapshot: task.workInstruction,
      reviewInstructionSnapshot: task.reviewInstruction,
      mandatorySnapshot: task.mandatory,
      sortOrderSnapshot: task.sortOrder,
      professionalVersionSnapshot: task.professionalVersion,
      origin: "Standardaufgabe",
    })),
  });
  const customTasks = await prisma.customClientTask.findMany({ where: { clientId: client.id, active: true }, include: { category: true } });
  const matchingCustom = customTasks.filter((task) => task.taskType === "Wiederkehrend monatlich" || (task.taskType === "Einmalig" && task.executionYear === 2026 && task.executionMonth === month));
  if (matchingCustom.length) {
    await prisma.checklistTask.createMany({
      data: matchingCustom.map((task) => ({
        periodId: period.id,
        customClientTaskId: task.id,
        taskIdSnapshot: `MAND-${task.id}`,
        categorySnapshot: task.category.name,
        categorySortOrder: task.category.sortOrder,
        titleSnapshot: task.title,
        workInstructionSnapshot: task.description,
        origin: task.taskType === "Einmalig" ? "Einmalig" : "Mandantenspezifisch",
      })),
    });
  }
}

const workflowScenarios = [
  [client10001.id, 1, "In Bearbeitung"],
  [client10001.id, 2, "Zur Prüfung"],
  [client10002.id, 1, "In Prüfung"],
  [client10003.id, 3, "Nachbearbeitung"],
  [client10001.id, 3, "Abgeschlossen"],
];
for (const [scenarioClientId, month, status] of workflowScenarios) {
  const period = await prisma.accountingPeriod.findUniqueOrThrow({
    where: { clientId_calendarYear_month_checklistType: { clientId: scenarioClientId, calendarYear: 2026, month, checklistType: "Monat" } },
    include: { tasks: true },
  });
  const now = new Date();
  if (status !== "In Bearbeitung") {
    await prisma.checklistTask.updateMany({
      where: { periodId: period.id, mandatorySnapshot: true },
      data: { status: "Erledigt", processorInitials: period.processorSnapshot ?? "BA", processedAt: now },
    });
  }
  if (status === "In Bearbeitung" && period.tasks[0]) {
    await prisma.checklistTask.update({ where: { id: period.tasks[0].id }, data: { status: "In Bearbeitung", processorInitials: period.processorSnapshot ?? "BA", processingNote: "Künstliche Bearbeitung wurde begonnen.", processedAt: now } });
  }
  if (status === "In Prüfung" || status === "Abgeschlossen") {
    await prisma.checklistTask.updateMany({
      where: { periodId: period.id },
      data: { reviewStatus: "In Ordnung", reviewerInitials: period.reviewerSnapshot ?? "PR", reviewedAt: now, finalReviewedAt: now },
    });
  }
  if (status === "Nachbearbeitung" && period.tasks[0]) {
    await prisma.checklistTask.update({
      where: { id: period.tasks[0].id },
      data: { reviewStatus: "Rückfrage", reviewerInitials: period.reviewerSnapshot ?? "PR", reviewNote: "Künstliche Rückfrage für das Testszenario.", reviewedAt: now, reviewIssueCreatedAt: now },
    });
  }
  await prisma.accountingPeriod.update({
    where: { id: period.id },
    data: {
      processingStatus: status,
      processorSnapshot: period.processorSnapshot,
      reviewerSnapshot: period.reviewerSnapshot,
      submittedForReviewAt: ["Zur Prüfung","In Prüfung","Nachbearbeitung","Abgeschlossen"].includes(status) ? now : null,
      reviewStartedAt: ["In Prüfung","Nachbearbeitung","Abgeschlossen"].includes(status) ? now : null,
      returnedAt: status === "Nachbearbeitung" ? now : null,
      lastReviewAt: ["In Prüfung","Nachbearbeitung","Abgeschlossen"].includes(status) ? now : null,
      completedAt: status === "Abgeschlossen" ? now : null,
      lastStatusChangedAt: now,
    },
  });
  const existingScenario = await prisma.workflowHistory.findFirst({ where: { periodId: period.id, eventType: `Künstliches Testszenario: ${status}` } });
  if (!existingScenario) {
    await prisma.workflowHistory.create({
      data: { periodId: period.id, eventType: `Künstliches Testszenario: ${status}`, actorInitials: status === "In Bearbeitung" ? "BA" : "PR", description: `Künstlicher Workflowzustand „${status}“ wurde für die lokale Demonstration vorbereitet.`, newValue: status },
    });
  }
}

await prisma.$disconnect();
console.log("Künstliche Testdaten wurden erfolgreich angelegt.");
