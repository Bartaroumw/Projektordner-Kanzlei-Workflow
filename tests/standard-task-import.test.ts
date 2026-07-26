import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  analyzeTaskWorkbook,
  confirmTaskImport,
  storeImportPreview,
} from "@/lib/task-import";
import {
  parseMultiValue,
  standardTaskSchema,
  TASK_LEGAL_FORMS,
  TASK_PROFIT_METHODS,
} from "@/lib/standard-task-validation";

const examplePath = resolve("public", "downloads", "Standardaufgaben-Kuenstliche-Beispiele.xlsx");
const templatePath = resolve("public", "downloads", "Standardaufgaben-Mustervorlage.xlsx");

beforeEach(async () => {
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.taskImportPreview.deleteMany();
  await prisma.taskImportHistory.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.taskCategory.create({ data: { name: "Allgemein", sortOrder: 10 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Excel-Prüfung", () => {
  it("liest eine gültige Excel-Datei korrekt ein", async () => {
    const preview = await analyzeTaskWorkbook(
      new Uint8Array(await readFile(examplePath)),
      "Künstliche-Beispiele.xlsx",
    );
    expect(preview.errors).toHaveLength(0);
    expect(preview.counts.new).toBeGreaterThanOrEqual(15);
  });

  it("erkennt eine fehlende Pflichtspalte", async () => {
    const original = new Uint8Array(await readFile(templatePath));
    const changed = replaceWorkbookText(original, "Aufgaben-ID", "Falsche-Spalte");
    const preview = await analyzeTaskWorkbook(changed, "Fehlende-Spalte.xlsx");
    expect(preview.errors.some((error) => error.column === "Aufgaben-ID")).toBe(true);
  });

  it("erkennt einen ungültigen Auswahlwert", async () => {
    const original = new Uint8Array(await readFile(templatePath));
    const changed = replaceWorkbookText(original, "Monatlich", "Wöchentlich");
    const preview = await analyzeTaskWorkbook(changed, "Ungueltiger-Wert.xlsx");
    expect(preview.errors.some((error) => error.column === "Rhythmus")).toBe(true);
  });

  it("erkennt eine doppelte Aufgaben-ID innerhalb derselben Datei", async () => {
    const original = new Uint8Array(await readFile(examplePath));
    const changed = replaceWorkbookText(original, "MON-ALLG-002", "MON-ALLG-001");
    const preview = await analyzeTaskWorkbook(changed, "Doppelte-ID.xlsx");
    expect(preview.errors.some((error) => error.message.includes("bereits in Excel-Zeile"))).toBe(true);
  });

  it("erkennt eine vorhandene Aufgaben-ID als Aktualisierung", async () => {
    await importExample();
    await prisma.standardTask.update({
      where: { taskId: "MON-ALLG-001" },
      data: { title: "Abweichende künstliche Bezeichnung" },
    });
    const original = new Uint8Array(await readFile(examplePath));
    const preview = await analyzeTaskWorkbook(original, "Aktualisierung.xlsx");
    expect(preview.counts.update).toBeGreaterThanOrEqual(1);
  });
});

describe("Importregeln", () => {
  it("löscht eine fehlende Aufgabe in einer neuen Datei nicht automatisch", async () => {
    await importExample();
    const before = await prisma.standardTask.count();
    const template = new Uint8Array(await readFile(templatePath));
    const preview = await analyzeTaskWorkbook(template, "Kleiner-Bestand.xlsx");
    const previewId = await storeImportPreview(template, preview);
    await confirmTaskImport(previewId, { confirmed: true, confirmNewCategories: false });
    expect(await prisma.standardTask.count()).toBeGreaterThanOrEqual(before);
  });

  it("deaktiviert eine Aufgabe bei ausdrücklichem Aktiv = Nein", async () => {
    const original = new Uint8Array(await readFile(templatePath));
    const firstPreview = await analyzeTaskWorkbook(original, "Erstimport.xlsx");
    const firstPreviewId = await storeImportPreview(original, firstPreview);
    await confirmTaskImport(firstPreviewId, { confirmed: true, confirmNewCategories: false });
    const changed = replaceFirstWorksheetText(original, "Ja", "Nein");
    const preview = await analyzeTaskWorkbook(changed, "Deaktivierung.xlsx");
    expect(preview.counts.deactivate).toBeGreaterThanOrEqual(1);
  });

  it("verändert bei einer fehlerhaften Datei keine Datenbankdaten", async () => {
    const original = new Uint8Array(await readFile(templatePath));
    const changed = replaceWorkbookText(original, "Monatlich", "Unzulässig");
    const preview = await analyzeTaskWorkbook(changed, "Fehlerhaft.xlsx");
    expect(preview.errors.length).toBeGreaterThan(0);
    expect(await prisma.standardTask.count()).toBe(0);
  });

  it("erlaubt keinen Import ohne vorherige Vorschau und Bestätigung", async () => {
    await expect(
      confirmTaskImport("nicht-vorhanden", { confirmed: true, confirmNewCategories: true }),
    ).rejects.toThrow("nicht vorhanden oder abgelaufen");
    const bytes = new Uint8Array(await readFile(templatePath));
    const preview = await analyzeTaskWorkbook(bytes, "Ohne-Bestaetigung.xlsx");
    const previewId = await storeImportPreview(bytes, preview);
    await expect(
      confirmTaskImport(previewId, { confirmed: false, confirmNewCategories: true }),
    ).rejects.toThrow("ausdrücklich bestätigt");
  });
});

describe("Fachliche Auswahlregeln", () => {
  it("verbietet Alle zusammen mit weiteren Rechtsformgruppen", () => {
    expect(() =>
      parseMultiValue("Alle;Kapitalgesellschaft", TASK_LEGAL_FORMS, "Rechtsformgruppe"),
    ).toThrow("nicht mit weiteren Werten");
  });

  it("verbietet Alle zusammen mit weiteren Gewinnermittlungsarten", () => {
    expect(() =>
      parseMultiValue("Alle;Bilanzierung", TASK_PROFIT_METHODS, "Gewinnermittlungsart"),
    ).toThrow("nicht mit weiteren Werten");
  });

  it("verlangt bei Bestimmter Monat einen Monat von 1 bis 12", () => {
    const result = standardTaskSchema.safeParse(validTask({ rhythm: "Bestimmter Monat", executionMonth: null }));
    expect(result.success).toBe(false);
  });

  it("lehnt Jahresabschlussaufgaben mit unpassendem Rhythmus ab", () => {
    const result = standardTaskSchema.safeParse(validTask({ checklistType: "Jahresabschluss", rhythm: "Monatlich" }));
    expect(result.success).toBe(false);
  });
});

async function importExample() {
  const bytes = new Uint8Array(await readFile(examplePath));
  const preview = await analyzeTaskWorkbook(bytes, "Künstliche-Beispiele.xlsx");
  const previewId = await storeImportPreview(bytes, preview);
  return confirmTaskImport(previewId, { confirmed: true, confirmNewCategories: true });
}

function replaceWorkbookText(bytes: Uint8Array, from: string, to: string) {
  const files = unzipSync(bytes);
  for (const name of Object.keys(files)) {
    if (!name.endsWith(".xml")) continue;
    const content = strFromU8(files[name]);
    if (content.includes(from)) files[name] = strToU8(content.replace(from, to));
  }
  return zipSync(files);
}

function replaceFirstWorksheetText(bytes: Uint8Array, from: string, to: string) {
  const files = unzipSync(bytes);
  const worksheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  files["xl/worksheets/sheet1.xml"] = strToU8(
    worksheet.replace(`<x:v>${from}</x:v>`, `<x:v>${to}</x:v>`),
  );
  return zipSync(files);
}

function validTask(overrides: Record<string, unknown> = {}) {
  return {
    taskId: "TEST-001",
    active: true,
    checklistType: "Monat",
    categoryName: "Allgemein",
    subcategory: null,
    title: "Künstliche Testaufgabe",
    workInstruction: null,
    reviewInstruction: null,
    mandatory: true,
    rhythm: "Monatlich",
    executionMonth: null,
    legalFormGroups: "Alle",
    profitDeterminationMethods: "Alle",
    cashCondition: "Alle",
    payrollCondition: "Alle",
    fixedAssetsCondition: "Alle",
    receivablesPayablesCondition: "Alle",
    loansCondition: "Alle",
    vatCondition: "Alle",
    permanentExtensionCondition: "Alle",
    knowledgeKey: null,
    sortOrder: 10,
    professionalVersion: "TEST-1",
    internalNote: null,
    ...overrides,
  };
}
