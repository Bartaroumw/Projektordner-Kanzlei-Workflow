export const EXECUTION_RHYTHMS = [
  "Monatlich",
  "Vierteljährlich",
  "Halbjährlich",
  "Jährlich",
  "Benutzerdefinierte Monate",
] as const;

export type ExecutionRhythm = (typeof EXECUTION_RHYTHMS)[number];

export const MONTHS = [
  { value: 1, label: "Januar", short: "Jan" },
  { value: 2, label: "Februar", short: "Feb" },
  { value: 3, label: "März", short: "Mär" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "Mai", short: "Mai" },
  { value: 6, label: "Juni", short: "Jun" },
  { value: 7, label: "Juli", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "Oktober", short: "Okt" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "Dezember", short: "Dez" },
] as const;

export const ALL_MONTHS = MONTHS.map((month) => month.value);

export function normalizeExecutionRhythm(value: string): ExecutionRhythm {
  if (value === "Quartalsweise") return "Vierteljährlich";
  if (value === "Bestimmter Monat") return "Benutzerdefinierte Monate";
  if (EXECUTION_RHYTHMS.includes(value as ExecutionRhythm)) return value as ExecutionRhythm;
  throw new Error("Der Ausführungsrhythmus ist ungültig.");
}

export function parseExecutionMonths(value: string | null | undefined): number[] {
  if (!value?.trim()) return [];
  return value.split(/[;,]/).map((entry) => Number(entry.trim())).filter(Number.isInteger);
}

export function serializeExecutionMonths(months: readonly number[]) {
  return [...new Set(months)].sort((left, right) => left - right).join(";");
}

export function validateExecutionPlanning(
  rhythmValue: string,
  monthsValue: string | readonly number[] | null | undefined,
) {
  const rhythm = normalizeExecutionRhythm(rhythmValue);
  const rawMonths = Array.isArray(monthsValue)
    ? monthsValue.map(Number)
    : parseExecutionMonths(typeof monthsValue === "string" ? monthsValue : null);
  if (rawMonths.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) {
    throw new Error("Ausführungsmonate müssen zwischen Januar und Dezember liegen.");
  }
  const months = [...new Set(rawMonths)].sort((left, right) => left - right);
  if (months.length !== rawMonths.length) throw new Error("Ausführungsmonate dürfen nicht doppelt ausgewählt werden.");
  const expected = rhythm === "Monatlich" ? 12 : rhythm === "Vierteljährlich" ? 4 : rhythm === "Halbjährlich" ? 2 : rhythm === "Jährlich" ? 1 : null;
  if (expected !== null && months.length !== expected) {
    throw new Error(rhythm === "Monatlich"
      ? "Monatliche Aufgaben müssen in allen zwölf Monaten ausgeführt werden."
      : `${rhythm}e Aufgaben benötigen genau ${expected} unterschiedliche Ausführungsmonate.`);
  }
  if (rhythm === "Benutzerdefinierte Monate" && (months.length < 1 || months.length > 12)) {
    throw new Error("Benutzerdefinierte Aufgaben benötigen mindestens einen Ausführungsmonat.");
  }
  return { rhythm, months, serializedMonths: serializeExecutionMonths(months) };
}

export function executionPlanningMatches(executionMonths: string | null | undefined, month: number) {
  return parseExecutionMonths(executionMonths).includes(month);
}

export function formatExecutionPlanning(rhythm: string, executionMonths: string | null | undefined) {
  const months = parseExecutionMonths(executionMonths);
  if (rhythm === "Monatlich") return "Monatlich";
  const labels = months.map((value) => MONTHS.find((month) => month.value === value)?.short ?? String(value));
  return `${rhythm === "Benutzerdefinierte Monate" ? "Individuell" : rhythm}${labels.length ? ` · ${labels.join("/")}` : ""}`;
}

export function defaultExecutionMonths(rhythm: string) {
  if (rhythm === "Monatlich") return ALL_MONTHS;
  if (["Vierteljährlich", "Quartalsweise"].includes(rhythm)) return [3, 6, 9, 12];
  if (rhythm === "Halbjährlich") return [6, 12];
  if (rhythm === "Jährlich") return [1];
  return [1];
}
