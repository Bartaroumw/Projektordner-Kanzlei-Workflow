import { z } from "zod";

export const CHECKLIST_TYPES = ["Monat", "Jahresabschluss"] as const;
export const TASK_RHYTHMS = [
  "Monatlich",
  "Quartalsweise",
  "Bestimmter Monat",
  "Jährlich",
] as const;
export const TASK_LEGAL_FORMS = [
  "Alle",
  "Einzelunternehmen",
  "Personengesellschaft",
  "Kapitalgesellschaft",
] as const;
export const TASK_PROFIT_METHODS = [
  "Alle",
  "Einnahmenüberschussrechnung",
  "Bilanzierung",
] as const;
export const FEATURE_CONDITIONS = ["Alle", "Ja", "Nein"] as const;

const optionalLongText = z
  .preprocess(
    (value) => value ?? "",
    z.string().trim().max(5000, "Der Text darf höchstens 5.000 Zeichen lang sein."),
  )
  .transform((value) => value || null);

const optionalShortText = z
  .preprocess(
    (value) => value ?? "",
    z.string().trim().max(200, "Der Text darf höchstens 200 Zeichen lang sein."),
  )
  .transform((value) => value || null);

export function parseMultiValue(
  value: unknown,
  allowed: readonly string[],
  label: string,
) {
  const values = String(value ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(`${label} ist erforderlich.`);
  }
  const invalid = values.find((entry) => !allowed.includes(entry));
  if (invalid) {
    throw new Error(`„${invalid}“ ist kein zulässiger Wert für ${label}.`);
  }
  if (values.includes("Alle") && values.length > 1) {
    throw new Error(`„Alle“ darf bei ${label} nicht mit weiteren Werten kombiniert werden.`);
  }
  return [...new Set(values)].join(";");
}

export const standardTaskSchema = z
  .object({
    taskId: z
      .string()
      .trim()
      .min(1, "Die Aufgaben-ID ist erforderlich.")
      .max(50, "Die Aufgaben-ID darf höchstens 50 Zeichen lang sein.")
      .regex(
        /^[A-ZÄÖÜ0-9]+(?:-[A-ZÄÖÜ0-9]+)+$/,
        "Die Aufgaben-ID muss aus Großbuchstaben, Zahlen und Bindestrichen bestehen.",
      ),
    active: z.boolean(),
    checklistType: z.enum(CHECKLIST_TYPES, {
      message: "Zulässig sind „Monat“ und „Jahresabschluss“.",
    }),
    categoryName: z.string().trim().min(1, "Die Kategorie ist erforderlich.").max(120),
    subcategory: optionalShortText,
    title: z.string().trim().min(1, "Die Aufgabenbezeichnung ist erforderlich.").max(300),
    workInstruction: optionalLongText,
    reviewInstruction: optionalLongText,
    mandatory: z.boolean(),
    rhythm: z.enum(TASK_RHYTHMS, { message: "Der Rhythmus ist ungültig." }),
    executionMonth: z.number().int().min(1).max(12).nullable(),
    legalFormGroups: z.string(),
    profitDeterminationMethods: z.string(),
    cashCondition: z.enum(FEATURE_CONDITIONS),
    payrollCondition: z.enum(FEATURE_CONDITIONS),
    fixedAssetsCondition: z.enum(FEATURE_CONDITIONS),
    receivablesPayablesCondition: z.enum(FEATURE_CONDITIONS),
    loansCondition: z.enum(FEATURE_CONDITIONS),
    vatCondition: z.enum(FEATURE_CONDITIONS),
    permanentExtensionCondition: z.enum(FEATURE_CONDITIONS),
    knowledgeKey: optionalShortText,
    sortOrder: z.number().int().min(0, "Die Sortierreihenfolge darf nicht negativ sein."),
    professionalVersion: z.string().trim().min(1, "Die fachliche Version ist erforderlich.").max(50),
    internalNote: optionalLongText,
  })
  .superRefine((value, context) => {
    if (value.rhythm === "Bestimmter Monat" && value.executionMonth === null) {
      context.addIssue({
        code: "custom",
        path: ["executionMonth"],
        message: "Beim Rhythmus „Bestimmter Monat“ ist ein Monat von 1 bis 12 erforderlich.",
      });
    }
    if (value.rhythm !== "Bestimmter Monat" && value.executionMonth !== null) {
      context.addIssue({
        code: "custom",
        path: ["executionMonth"],
        message: "Der Ausführungsmonat muss bei diesem Rhythmus leer bleiben.",
      });
    }
    if (value.checklistType === "Jahresabschluss" && value.rhythm !== "Jährlich") {
      context.addIssue({
        code: "custom",
        path: ["rhythm"],
        message: "Jahresabschlussaufgaben müssen den Rhythmus „Jährlich“ verwenden.",
      });
    }
  });

export type StandardTaskInput = z.infer<typeof standardTaskSchema>;

export function validateStandardTaskInput(
  raw: Omit<StandardTaskInput, "legalFormGroups" | "profitDeterminationMethods"> & {
    legalFormGroups: unknown;
    profitDeterminationMethods: unknown;
  },
) {
  const normalized = {
    ...raw,
    legalFormGroups: parseMultiValue(
      raw.legalFormGroups,
      TASK_LEGAL_FORMS,
      "Rechtsformgruppe",
    ),
    profitDeterminationMethods: parseMultiValue(
      raw.profitDeterminationMethods,
      TASK_PROFIT_METHODS,
      "Gewinnermittlungsart",
    ),
  };
  return standardTaskSchema.safeParse(normalized);
}
