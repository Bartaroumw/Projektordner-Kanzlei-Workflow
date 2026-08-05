import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/dashboard-service";

const performanceDescribe =
  process.env.RUN_PERFORMANCE_SMOKE === "1" ? describe : describe.skip;

performanceDescribe("Lokaler Performance-Grundtest", () => {
  afterAll(async () => prisma.$disconnect());

  it(
    "wertet 300 Mandanten, 1.200 Checklisten und 30.000 Aufgaben flüssig aus",
    async () => {
      await prisma.workflowHistory.deleteMany();
      await prisma.checklistTask.deleteMany();
      await prisma.accountingPeriod.deleteMany();
      await prisma.customClientTask.deleteMany();
      await prisma.annualProfile.deleteMany();
      await prisma.client.deleteMany();

      await prisma.client.createMany({
        data: Array.from({ length: 300 }, (_, index) => ({
          clientNumber: `P${String(index + 1).padStart(5, "0")}`,
          name: `Künstlicher Performance-Mandant ${index + 1}`,
          processor: "Maria Muster",
          reviewer: "Paul Prüfung",
          managementName: "Klara Leitung",
          cadence: "monatlich",
          vatFilingPeriod: "Monatlich",
          active: true,
        })),
      });
      const clients = await prisma.client.findMany({
        select: { id: true, clientNumber: true },
        orderBy: { id: "asc" },
      });

      await prisma.accountingPeriod.createMany({
        data: clients.flatMap((client) =>
          [1, 2, 3, 4].map((month) => ({
            clientId: client.id,
            calendarYear: 2026,
            month,
            periodLabel: `${month}. Monat 2026`,
            checklistType: "Monat",
            processingStatus: "In Bearbeitung",
            processorSnapshot: "Maria Muster",
            reviewerSnapshot: "Paul Prüfung",
            managementNameSnapshot: "Klara Leitung",
            profileLegalFormGroup: "Einzelunternehmen",
            profileProfitDeterminationMethod: "Einnahmenüberschussrechnung",
            profileHasCashRegister: false,
            profileHasPayroll: false,
            profileHasFixedAssets: false,
            profileHasReceivablesPayables: false,
            profileHasLoans: false,
            profileSubjectToVat: true,
            profileHasPermanentExtension: false,
          })),
        ),
      });
      const periods = await prisma.accountingPeriod.findMany({
        select: { id: true },
        orderBy: { id: "asc" },
      });

      const taskData = periods.flatMap((period, periodIndex) =>
        Array.from({ length: 25 }, (_, taskIndex) => ({
          periodId: period.id,
          taskIdSnapshot: `PERF-${periodIndex}-${taskIndex}`,
          categorySnapshot: "Künstlicher Performance-Test",
          titleSnapshot: `Künstliche Aufgabe ${taskIndex + 1}`,
          mandatorySnapshot: taskIndex < 5,
          origin: "Standardaufgabe",
          status: taskIndex % 3 === 0 ? "Erledigt" : "Offen",
          reviewStatus: "Nicht geprüft",
        })),
      );
      for (let index = 0; index < taskData.length; index += 1_000) {
        await prisma.checklistTask.createMany({
          data: taskData.slice(index, index + 1_000),
        });
      }

      const startedAt = performance.now();
      const result = await getDashboardData({
        year: 2026,
        month: 8,
        officeWide: true,
      });
      const durationMs = performance.now() - startedAt;

      expect(result.clients).toHaveLength(300);
      expect(result.periods).toHaveLength(1_200);
      expect(result.metrics.total).toBe(1_200);
      expect(result.metrics.oldOpen).toBe(300);
      expect(await prisma.checklistTask.count()).toBe(30_000);
      expect(durationMs).toBeLessThan(10_000);
      console.log(
        `Performance-Grundtest: Dashboard-Auswertung in ${Math.round(durationMs)} ms.`,
      );
    },
    120_000,
  );
});
