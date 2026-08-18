import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createAnnualProfile,
  createClient,
  searchClients,
  updateClient,
} from "@/lib/client-service";
import type { AnnualProfileInput, ClientInput } from "@/lib/validation";

const baseClient: ClientInput = {
  clientNumber: "T-100",
  name: "Künstlicher Testmandant",
  processor: "TA",
  reviewer: "TP",
  managementName: "Karla Leitung",
  vatFilingPeriod: "Monatlich",
  active: true,
  internalNote: null,
};

const baseProfile: AnnualProfileInput = {
  calendarYear: 2025,
  legalFormGroup: "Einzelunternehmen",
  profitDeterminationMethod: "Einnahmenüberschussrechnung",
  hasCashRegister: false,
  hasPayroll: false,
  hasFixedAssets: true,
  hasReceivablesPayables: false,
  hasLoans: false,
  subjectToVat: true,
  hasPermanentExtension: false,
};

beforeEach(async () => {
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany({ where: { sourceTaskId: { not: null } } });
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Mandantenregeln", () => {
  it("verhindert eine doppelte Mandantennummer", async () => {
    await createClient(baseClient);
    await expect(
      createClient({ ...baseClient, name: "Anderer künstlicher Testmandant" }),
    ).rejects.toMatchObject({
      code: "DUPLICATE_CLIENT_NUMBER",
    });
  });

  it("behält einen inaktiven Mandanten in der Datenbank", async () => {
    const client = await createClient(baseClient);
    await updateClient(client.id, { ...baseClient, active: false });
    const stored = await prisma.client.findUnique({ where: { id: client.id } });
    expect(stored).not.toBeNull();
    expect(stored?.active).toBe(false);
  });

  it("findet einen Mandanten über die Mandantennummer", async () => {
    await createClient(baseClient);
    const result = await searchClients("T-100");
    expect(result.map((client) => client.clientNumber)).toContain("T-100");
  });

  it("findet einen Mandanten über den Mandantennamen", async () => {
    await createClient(baseClient);
    const result = await searchClients("Künstlicher Testmandant");
    expect(result.map((client) => client.name)).toContain(
      "Künstlicher Testmandant",
    );
  });
});

describe("Jahresprofilregeln", () => {
  it("legt Mandant und Jahresprofil in einem gemeinsamen Vorgang an",async()=>{
    const client=await createClient(baseClient,undefined,baseProfile);
    expect(await prisma.annualProfile.findUnique({where:{clientId_calendarYear:{clientId:client.id,calendarYear:baseProfile.calendarYear}}})).toMatchObject({legalFormGroup:baseProfile.legalFormGroup,profitDeterminationMethod:baseProfile.profitDeterminationMethod});
  });

  it("hinterlässt bei einem ungültigen direkten Jahresprofil keinen halbfertigen Mandanten",async()=>{
    await expect(createClient(baseClient,undefined,{...baseProfile,legalFormGroup:"Kapitalgesellschaft",profitDeterminationMethod:"Einnahmenüberschussrechnung"})).rejects.toMatchObject({code:"INVALID_INPUT"});
    expect(await prisma.client.count({where:{clientNumber:baseClient.clientNumber}})).toBe(0);
  });

  it("erlaubt die bewusste Mandantenanlage ohne Jahresprofil",async()=>{
    const client=await createClient(baseClient);
    expect(await prisma.annualProfile.count({where:{clientId:client.id}})).toBe(0);
  });

  it("erlaubt pro Mandant und Kalenderjahr nur ein Jahresprofil", async () => {
    const client = await createClient(baseClient);
    await createAnnualProfile(client.id, baseProfile);
    await expect(
      createAnnualProfile(client.id, baseProfile),
    ).rejects.toMatchObject({
      code: "DUPLICATE_ANNUAL_PROFILE",
    });
  });

  it("verhindert Kapitalgesellschaft mit Einnahmenüberschussrechnung", async () => {
    const client = await createClient(baseClient);
    await expect(
      createAnnualProfile(client.id, {
        ...baseProfile,
        legalFormGroup: "Kapitalgesellschaft",
        profitDeterminationMethod: "Einnahmenüberschussrechnung",
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("verändert beim neuen Jahresprofil das Vorjahresprofil nicht", async () => {
    const client = await createClient(baseClient);
    const previous = await createAnnualProfile(client.id, baseProfile);
    await createAnnualProfile(client.id, {
      ...baseProfile,
      calendarYear: 2026,
      hasPayroll: true,
    });
    const storedPrevious = await prisma.annualProfile.findUnique({
      where: { id: previous.id },
    });
    expect(storedPrevious?.calendarYear).toBe(2025);
    expect(storedPrevious?.hasPayroll).toBe(false);
  });
});
