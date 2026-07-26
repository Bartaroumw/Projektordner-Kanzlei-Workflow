import { createHash, randomUUID } from "node:crypto";
import readXlsxFile from "read-excel-file/node";
import type { StandardTask, TaskCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CHECKLIST_TYPES,
  FEATURE_CONDITIONS,
  TASK_RHYTHMS,
  validateStandardTaskInput,
  type StandardTaskInput,
} from "@/lib/standard-task-validation";

export const TASK_IMPORT_HEADERS = [
  "Aufgaben-ID",
  "Aktiv",
  "Checklistenart",
  "Kategorie",
  "Unterkategorie",
  "Aufgabenbezeichnung",
  "Arbeitsanweisung",
  "Prüfanweisung",
  "Pflichtaufgabe",
  "Rhythmus",
  "Ausführungsmonat",
  "Rechtsformgruppe",
  "Gewinnermittlungsart",
  "Kasse",
  "Lohn",
  "Anlagevermögen",
  "Debitoren-Kreditoren",
  "Darlehen",
  "Umsatzsteuerpflicht",
  "Dauerfristverlängerung",
  "Wissensschlüssel",
  "Sortierreihenfolge",
  "Version",
  "Bemerkung",
] as const;

export type ImportError = {
  row: number;
  taskId: string;
  column: string;
  message: string;
};

export type ImportItem = {
  row: number;
  task: StandardTaskInput;
  kind: "new" | "update" | "unchanged" | "deactivate";
};

export type ImportPreview = {
  originalFileName: string;
  items: ImportItem[];
  newCategories: string[];
  warnings: string[];
  errors: ImportError[];
  counts: {
    new: number;
    update: number;
    unchanged: number;
    deactivate: number;
  };
};

type ExistingTask = StandardTask & { category: TaskCategory };

function text(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function yesNo(value: unknown, column: string) {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLocaleLowerCase("de-DE");
  if (normalized === "ja") return true;
  if (normalized === "nein") return false;
  throw new Error(`${column} muss „Ja“ oder „Nein“ enthalten.`);
}

function integer(value: unknown, column: string, optional = false) {
  if ((value === null || value === "") && optional) return null;
  const parsed = typeof value === "number" ? value : Number(text(value));
  if (!Number.isInteger(parsed)) {
    throw new Error(`${column} muss eine ganze Zahl enthalten.`);
  }
  return parsed;
}

function taskComparable(task: StandardTaskInput | ExistingTask) {
  return {
    active: task.active,
    checklistType: task.checklistType,
    categoryName: "categoryName" in task ? task.categoryName : task.category.name,
    subcategory: task.subcategory,
    title: task.title,
    workInstruction: task.workInstruction,
    reviewInstruction: task.reviewInstruction,
    mandatory: task.mandatory,
    rhythm: task.rhythm,
    executionMonth: task.executionMonth,
    legalFormGroups: task.legalFormGroups,
    profitDeterminationMethods: task.profitDeterminationMethods,
    cashCondition: task.cashCondition,
    payrollCondition: task.payrollCondition,
    fixedAssetsCondition: task.fixedAssetsCondition,
    receivablesPayablesCondition: task.receivablesPayablesCondition,
    loansCondition: task.loansCondition,
    vatCondition: task.vatCondition,
    permanentExtensionCondition: task.permanentExtensionCondition,
    knowledgeKey: task.knowledgeKey,
    sortOrder: task.sortOrder,
    professionalVersion: task.professionalVersion,
    internalNote: task.internalNote,
  };
}

function sameTask(a: StandardTaskInput, b: ExistingTask) {
  return JSON.stringify(taskComparable(a)) === JSON.stringify(taskComparable(b));
}

function parseRow(row: unknown[], rowNumber: number) {
  const raw = {
    taskId: text(row[0]),
    active: yesNo(row[1], "Aktiv"),
    checklistType: text(row[2]),
    categoryName: text(row[3]),
    subcategory: text(row[4]),
    title: text(row[5]),
    workInstruction: text(row[6]),
    reviewInstruction: text(row[7]),
    mandatory: yesNo(row[8], "Pflichtaufgabe"),
    rhythm: text(row[9]),
    executionMonth: integer(row[10], "Ausführungsmonat", true),
    legalFormGroups: text(row[11]),
    profitDeterminationMethods: text(row[12]),
    cashCondition: text(row[13]),
    payrollCondition: text(row[14]),
    fixedAssetsCondition: text(row[15]),
    receivablesPayablesCondition: text(row[16]),
    loansCondition: text(row[17]),
    vatCondition: text(row[18]),
    permanentExtensionCondition: text(row[19]),
    knowledgeKey: text(row[20]),
    sortOrder: integer(row[21], "Sortierreihenfolge"),
    professionalVersion: text(row[22]),
    internalNote: text(row[23]),
  };
  const result = validateStandardTaskInput(raw as never);
  if (!result.success) {
    return {
      errors: result.error.issues.map((issue) => ({
        row: rowNumber,
        taskId: raw.taskId,
        column: fieldToColumn(String(issue.path[0] ?? "")),
        message: issue.message,
      })),
    };
  }
  return { task: result.data };
}

function fieldToColumn(field: string) {
  const map: Record<string, string> = {
    taskId: "Aufgaben-ID",
    active: "Aktiv",
    checklistType: "Checklistenart",
    categoryName: "Kategorie",
    subcategory: "Unterkategorie",
    title: "Aufgabenbezeichnung",
    workInstruction: "Arbeitsanweisung",
    reviewInstruction: "Prüfanweisung",
    mandatory: "Pflichtaufgabe",
    rhythm: "Rhythmus",
    executionMonth: "Ausführungsmonat",
    legalFormGroups: "Rechtsformgruppe",
    profitDeterminationMethods: "Gewinnermittlungsart",
    cashCondition: "Kasse",
    payrollCondition: "Lohn",
    fixedAssetsCondition: "Anlagevermögen",
    receivablesPayablesCondition: "Debitoren-Kreditoren",
    loansCondition: "Darlehen",
    vatCondition: "Umsatzsteuerpflicht",
    permanentExtensionCondition: "Dauerfristverlängerung",
    knowledgeKey: "Wissensschlüssel",
    sortOrder: "Sortierreihenfolge",
    professionalVersion: "Version",
    internalNote: "Bemerkung",
  };
  return map[field] ?? field;
}

export async function analyzeTaskWorkbook(
  bytes: Uint8Array,
  originalFileName: string,
  databaseState?: { existingTasks: ExistingTask[]; categories: TaskCategory[] },
): Promise<ImportPreview> {
  const errors: ImportError[] = [];
  const warnings: string[] = [];
  let sheets;
  try {
    sheets = await readXlsxFile(Buffer.from(bytes));
  } catch {
    return emptyPreview(originalFileName, [
      { row: 0, taskId: "", column: "Datei", message: "Die Excel-Datei konnte technisch nicht gelesen werden." },
    ]);
  }
  const taskSheet = sheets.find((sheet) => sheet.sheet === "Standardaufgaben");
  if (!taskSheet) {
    return emptyPreview(originalFileName, [
      { row: 0, taskId: "", column: "Tabellenblatt", message: "Das Tabellenblatt „Standardaufgaben“ fehlt." },
    ]);
  }
  const rows = taskSheet.data;
  const headers = (rows[0] ?? []).map(text);
  for (const [index, expected] of TASK_IMPORT_HEADERS.entries()) {
    if (headers[index] !== expected) {
      errors.push({
        row: 1,
        taskId: "",
        column: expected,
        message: `Die Pflichtspalte „${expected}“ fehlt oder steht nicht an Position ${index + 1}.`,
      });
    }
  }
  if (errors.length) return emptyPreview(originalFileName, errors);

  const state: NonNullable<typeof databaseState> = databaseState ?? await Promise.all([
      prisma.standardTask.findMany({ include: { category: true } }),
      prisma.taskCategory.findMany(),
    ]).then(([existingTasks, categories]) => ({ existingTasks, categories }));
  const existingById = new Map(state.existingTasks.map((task) => [task.taskId, task]));
  const knownCategories = new Set(state.categories.map((category) => category.name));
  const parsed: { row: number; task: StandardTaskInput }[] = [];
  const seen = new Map<string, number>();

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const rowNumber = index + 1;
    if (row.every((value) => value === null || text(value) === "")) {
      warnings.push(`Excel-Zeile ${rowNumber} ist leer und wird übersprungen.`);
      continue;
    }
    try {
      const result = parseRow(row, rowNumber);
      if (result.errors) {
        errors.push(...result.errors);
        continue;
      }
      const task = result.task!;
      const previousRow = seen.get(task.taskId);
      if (previousRow) {
        errors.push({
          row: rowNumber,
          taskId: task.taskId,
          column: "Aufgaben-ID",
          message: `Die Aufgaben-ID ist bereits in Excel-Zeile ${previousRow} vorhanden.`,
        });
        continue;
      }
      seen.set(task.taskId, rowNumber);
      parsed.push({ row: rowNumber, task });
    } catch (error) {
      errors.push({
        row: rowNumber,
        taskId: text(row[0]),
        column: inferColumnFromMessage(error),
        message: error instanceof Error ? error.message : "Die Zeile ist ungültig.",
      });
    }
  }

  const newCategories = [
    ...new Set(
      parsed
        .map((entry) => entry.task.categoryName)
        .filter((category) => !knownCategories.has(category)),
    ),
  ].sort();
  if (newCategories.length) {
    warnings.push(
      `Folgende neue Kategorien werden nur nach Bestätigung angelegt: ${newCategories.join(", ")}.`,
    );
  }
  const items: ImportItem[] = parsed.map(({ row, task }) => {
    const existing = existingById.get(task.taskId);
    let kind: ImportItem["kind"] = "new";
    if (existing) {
      kind = sameTask(task, existing)
        ? "unchanged"
        : existing.active && !task.active
          ? "deactivate"
          : "update";
    }
    return { row, task, kind };
  });
  return {
    originalFileName,
    items,
    newCategories,
    warnings,
    errors,
    counts: countKinds(items),
  };
}

function inferColumnFromMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    TASK_IMPORT_HEADERS.find((header) => message.startsWith(header)) ??
    (message.includes("Aktiv") ? "Aktiv" : "Zeile")
  );
}

function countKinds(items: ImportItem[]) {
  return {
    new: items.filter((item) => item.kind === "new").length,
    update: items.filter((item) => item.kind === "update").length,
    unchanged: items.filter((item) => item.kind === "unchanged").length,
    deactivate: items.filter((item) => item.kind === "deactivate").length,
  };
}

function emptyPreview(originalFileName: string, errors: ImportError[]): ImportPreview {
  return {
    originalFileName,
    items: [],
    newCategories: [],
    warnings: [],
    errors,
    counts: { new: 0, update: 0, unchanged: 0, deactivate: 0 },
  };
}

export async function storeImportPreview(
  bytes: Uint8Array,
  preview: ImportPreview,
) {
  const id = randomUUID();
  await prisma.taskImportPreview.create({
    data: {
      id,
      originalFileName: preview.originalFileName,
      fileHash: createHash("sha256").update(bytes).digest("hex"),
      previewJson: JSON.stringify(preview),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  return id;
}

export async function confirmTaskImport(
  previewId: string,
  options: { confirmed: boolean; confirmNewCategories: boolean },
) {
  if (!options.confirmed) {
    throw new Error("Der Import muss ausdrücklich bestätigt werden.");
  }
  const stored = await prisma.taskImportPreview.findUnique({ where: { id: previewId } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error("Die Importvorschau ist nicht vorhanden oder abgelaufen. Bitte prüfen Sie die Datei erneut.");
  }
  const preview = JSON.parse(stored.previewJson) as ImportPreview;
  if (preview.errors.length) {
    throw new Error("Eine fehlerhafte Datei darf nicht importiert werden.");
  }
  if (preview.newCategories.length && !options.confirmNewCategories) {
    throw new Error("Die Anlage neuer Kategorien muss ausdrücklich bestätigt werden.");
  }

  return prisma.$transaction(async (transaction) => {
    const categoryMap = new Map<string, number>();
    let nextCategorySort = (await transaction.taskCategory.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0;
    for (const name of preview.newCategories) {
      nextCategorySort += 10;
      const category = await transaction.taskCategory.create({
        data: { name, sortOrder: nextCategorySort, active: true },
      });
      categoryMap.set(name, category.id);
    }
    const existingCategories = await transaction.taskCategory.findMany();
    for (const category of existingCategories) categoryMap.set(category.name, category.id);

    for (const item of preview.items) {
      const categoryId = categoryMap.get(item.task.categoryName);
      if (!categoryId) throw new Error(`Kategorie „${item.task.categoryName}“ wurde nicht gefunden.`);
      const { categoryName: _categoryName, ...data } = item.task;
      void _categoryName;
      if (item.kind === "new") {
        await transaction.standardTask.create({ data: { ...data, categoryId } });
      } else if (item.kind !== "unchanged") {
        await transaction.standardTask.update({
          where: { taskId: item.task.taskId },
          data: { ...data, taskId: undefined, categoryId },
        });
      }
    }

    const versions = [...new Set(preview.items.map((item) => item.task.professionalVersion))];
    const history = await transaction.taskImportHistory.create({
      data: {
        originalFileName: preview.originalFileName,
        professionalVersion: versions.length === 1 ? versions[0] : versions.join(";"),
        createdCount: preview.counts.new,
        updatedCount: preview.counts.update,
        unchangedCount: preview.counts.unchanged,
        deactivatedCount: preview.counts.deactivate,
        errorRowCount: 0,
        createdCategoryCount: preview.newCategories.length,
        status: "Erfolgreich",
      },
    });
    await transaction.taskImportPreview.delete({ where: { id: previewId } });
    return history;
  });
}

export const IMPORT_ALLOWED_VALUES = {
  checklistTypes: CHECKLIST_TYPES,
  rhythms: TASK_RHYTHMS,
  conditions: FEATURE_CONDITIONS,
};
