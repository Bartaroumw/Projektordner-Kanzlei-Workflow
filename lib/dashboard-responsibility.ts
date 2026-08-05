export const DASHBOARD_RESPONSIBILITIES = [
  "BEARBEITUNG_AKTIV",
  "PRUEFUNG_AKTIV",
  "FREIGABE_AKTIV",
  "WARTET_AUF_PRUEFUNG",
  "WARTET_AUF_NACHBEARBEITUNG",
  "ABGESCHLOSSEN",
  "NICHT_ZUGEORDNET",
] as const;

export type DashboardResponsibility = typeof DASHBOARD_RESPONSIBILITIES[number];

type Assignments = {
  processorUserId: number | null;
  reviewerUserId: number | null;
  managementUserId?: number | null;
};

export function monthlyDashboardResponsibility(
  status: string,
  userId: number,
  assignments: Assignments,
): DashboardResponsibility {
  if (status === "Abgeschlossen") return "ABGESCHLOSSEN";
  if (["Offen", "In Bearbeitung"].includes(status)) {
    return assignments.processorUserId === userId ? "BEARBEITUNG_AKTIV" : "NICHT_ZUGEORDNET";
  }
  if (status === "Nachbearbeitung") {
    if (assignments.processorUserId === userId) return "BEARBEITUNG_AKTIV";
    if (assignments.reviewerUserId === userId) return "WARTET_AUF_NACHBEARBEITUNG";
    return "NICHT_ZUGEORDNET";
  }
  if (["Zur Prüfung", "In Prüfung"].includes(status)) {
    if (assignments.reviewerUserId === userId) return "PRUEFUNG_AKTIV";
    if (assignments.processorUserId === userId) return "WARTET_AUF_PRUEFUNG";
  }
  return "NICHT_ZUGEORDNET";
}

export function annualDashboardResponsibility(
  status: string,
  userId: number,
  assignments: Required<Assignments>,
): DashboardResponsibility {
  if (status === "Freigegeben") return "ABGESCHLOSSEN";
  if (["Offen", "In Vorbereitung"].includes(status)) {
    return assignments.processorUserId === userId ? "BEARBEITUNG_AKTIV" : "NICHT_ZUGEORDNET";
  }
  if (status === "Nachbearbeitung") {
    if (assignments.processorUserId === userId) return "BEARBEITUNG_AKTIV";
    if (assignments.reviewerUserId === userId) return "WARTET_AUF_NACHBEARBEITUNG";
    return "NICHT_ZUGEORDNET";
  }
  if (["Zur Prüfung", "In Prüfung", "Fachlich abgeschlossen"].includes(status)) {
    if (assignments.reviewerUserId === userId) return "PRUEFUNG_AKTIV";
    if (assignments.processorUserId === userId) return "WARTET_AUF_PRUEFUNG";
    return "NICHT_ZUGEORDNET";
  }
  if (status === "Zur Freigabe") {
    return assignments.managementUserId === userId ? "FREIGABE_AKTIV" : "NICHT_ZUGEORDNET";
  }
  return "NICHT_ZUGEORDNET";
}

export function previousCalendarMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextCalendarMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function berlinCalendarMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export function defaultDashboardMonth(now = new Date()) {
  const current = berlinCalendarMonth(now);
  return previousCalendarMonth(current.year, current.month);
}

export function monthOrdinal(year: number, month: number) {
  return year * 12 + month - 1;
}

/**
 * Ein Vorgang gilt erst dann als alt, wenn zwischen seinem Monat und dem
 * aktuellen Kalendermonat mehr als sechs volle Monatswechsel liegen.
 * Im August 2026 ist damit Januar 2026 alt, Februar 2026 noch nicht.
 */
export function isOlderThanSixMonths(
  year: number,
  month: number,
  referenceYear: number,
  referenceMonth: number,
) {
  return monthOrdinal(referenceYear, referenceMonth) - monthOrdinal(year, month) > 6;
}

export function splitByOperationalAge<T>(
  items: T[],
  periodOf: (item: T) => { year: number; month: number },
  reference: { year: number; month: number },
) {
  const current: T[] = [];
  const older: T[] = [];
  for (const item of items) {
    const period = periodOf(item);
    (isOlderThanSixMonths(period.year, period.month, reference.year, reference.month) ? older : current).push(item);
  }
  return { current, older };
}
