import { z } from "zod";

export const VAT_FILING_PERIODS = ["Monatlich", "Vierteljährlich", "Jährlich", "Keine Voranmeldung"] as const;
export const LEGAL_FORM_GROUPS = [
  "Einzelunternehmen",
  "Personengesellschaft",
  "Kapitalgesellschaft",
] as const;
export const PROFIT_METHODS = [
  "Einnahmenüberschussrechnung",
  "Bilanzierung",
] as const;

const optionalText = z
  .preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .max(200, "Die Eingabe darf höchstens 200 Zeichen lang sein."),
  )
  .transform((value) => value || null);

export const clientSchema = z.object({
  clientNumber: z
    .string()
    .trim()
    .min(1, "Bitte geben Sie eine Mandantennummer ein.")
    .max(30, "Die Mandantennummer darf höchstens 30 Zeichen lang sein."),
  name: z
    .string()
    .trim()
    .min(1, "Bitte geben Sie einen Mandantennamen ein.")
    .max(200, "Der Mandantenname darf höchstens 200 Zeichen lang sein."),
  processor: optionalText,
  reviewer: optionalText,
  managementName: optionalText,
  processorUserId: z.number().int().positive().nullable().optional(),
  reviewerUserId: z.number().int().positive().nullable().optional(),
  managementUserId: z.number().int().positive().nullable().optional(),
  payrollPreparedByFirm: z.boolean().default(false),
  payrollUserId: z.number().int().positive().nullable().optional(),
  payrollServiceStart: z.date().nullable().optional(),
  payrollServiceEnd: z.date().nullable().optional(),
  payrollResponsibilityNote: z
    .preprocess(
      (value) => value ?? "",
      z.string().trim().max(2000, "Der Hinweis zur Lohnzuständigkeit darf höchstens 2.000 Zeichen lang sein."),
    )
    .transform((value) => value || null)
    .optional(),
  vatFilingPeriod: z.enum(VAT_FILING_PERIODS, {
    message: "Bitte wählen Sie einen gültigen USt-Voranmeldungszeitraum.",
  }),
  active: z.boolean(),
  internalNote: z
    .preprocess(
      (value) => value ?? "",
      z
        .string()
        .trim()
        .max(
          2000,
          "Der interne Hinweis darf höchstens 2.000 Zeichen lang sein.",
        ),
    )
    .transform((value) => value || null),
}).superRefine((value, context) => {
  if (value.payrollPreparedByFirm && !value.payrollUserId) {
    context.addIssue({
      code: "custom",
      path: ["payrollUserId"],
      message: "Bei Lohnabrechnung durch die Kanzlei ist ein Lohnsachbearbeiter erforderlich.",
    });
  }
  if (value.payrollServiceStart && value.payrollServiceEnd && value.payrollServiceEnd < value.payrollServiceStart) {
    context.addIssue({
      code: "custom",
      path: ["payrollServiceEnd"],
      message: "Das Ende der Lohnbetreuung darf nicht vor dem Beginn liegen.",
    });
  }
});

export const annualProfileSchema = z
  .object({
    calendarYear: z
      .number()
      .int("Das Kalenderjahr muss eine ganze Zahl sein.")
      .min(2000, "Das Kalenderjahr muss mindestens 2000 sein.")
      .max(2100, "Das Kalenderjahr darf höchstens 2100 sein."),
    legalFormGroup: z.enum(LEGAL_FORM_GROUPS, {
      message: "Bitte wählen Sie eine gültige Rechtsformgruppe.",
    }),
    profitDeterminationMethod: z.enum(PROFIT_METHODS, {
      message: "Bitte wählen Sie eine gültige Gewinnermittlungsart.",
    }),
    hasCashRegister: z.boolean(),
    hasPayroll: z.boolean(),
    hasFixedAssets: z.boolean(),
    hasReceivablesPayables: z.boolean(),
    hasLoans: z.boolean(),
    subjectToVat: z.boolean(),
    hasPermanentExtension: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.legalFormGroup === "Kapitalgesellschaft" &&
      value.profitDeterminationMethod !== "Bilanzierung"
    ) {
      context.addIssue({
        code: "custom",
        path: ["profitDeterminationMethod"],
        message:
          "Für Kapitalgesellschaften ist ausschließlich Bilanzierung zulässig.",
      });
    }
  });

export type ClientInput = z.input<typeof clientSchema>;
export type AnnualProfileInput = z.infer<typeof annualProfileSchema>;
