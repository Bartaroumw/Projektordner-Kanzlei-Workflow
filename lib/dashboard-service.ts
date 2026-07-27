import type { AccountingPeriod, ChecklistTask, Client } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateProgress, hasRoleConflict, workflowSummary } from "@/lib/monthly-checklist-service";

export type DashboardFilters = {
  year: number;
  month: number;
  clientId?: number;
  search?: string;
  processor?: string;
  reviewer?: string;
  management?: string;
  status?: string;
  onlyOldOpen?: boolean;
  onlyOpenMandatory?: boolean;
  onlyOpenReviewPoints?: boolean;
  workViewName?: string;
  userId?: number;
  officeWide?: boolean;
};

export type DashboardPeriod = AccountingPeriod & {
  client: Client;
  tasks: Pick<ChecklistTask, "status" | "mandatorySnapshot" | "reviewStatus" | "processingNote">[];
  progress: ReturnType<typeof calculateProgress>;
  summary: ReturnType<typeof workflowSummary>;
};

export function isOldOpenPeriod(period: Pick<AccountingPeriod, "calendarYear" | "month" | "processingStatus">, year: number, month: number) {
  return period.processingStatus !== "Abgeschlossen" &&
    (period.calendarYear < year || (period.calendarYear === year && period.month < month));
}

export function priorityOf(period: DashboardPeriod, year: number, month: number) {
  if (period.processingStatus === "Nachbearbeitung" && period.summary.openReviewPoints > 0) return 1;
  if (period.processingStatus === "Zur Prüfung") return 2;
  if (period.processingStatus === "In Prüfung") return 3;
  if (isOldOpenPeriod(period, year, month)) return 4;
  if (period.processingStatus === "In Bearbeitung") return 5;
  if (period.processingStatus === "Offen") return 6;
  return 7;
}

export function sortByPriority(periods: DashboardPeriod[], year: number, month: number) {
  return [...periods].sort((a, b) =>
    priorityOf(a, year, month) - priorityOf(b, year, month) ||
    a.calendarYear - b.calendarYear ||
    a.month - b.month ||
    a.updatedAt.getTime() - b.updatedAt.getTime() ||
    a.client.clientNumber.localeCompare(b.client.clientNumber, "de-DE")
  );
}

export function periodMatchesFilters(period: DashboardPeriod, filters: DashboardFilters, includeMonth = true) {
  const search = filters.search?.trim().toLocaleLowerCase("de-DE");
  return (
    period.calendarYear === filters.year &&
    (!includeMonth || period.month === filters.month) &&
    (!filters.clientId || period.clientId === filters.clientId) &&
    (!search || period.client.clientNumber.toLocaleLowerCase("de-DE").includes(search) || period.client.name.toLocaleLowerCase("de-DE").includes(search)) &&
    (!filters.processor || period.processorSnapshot === filters.processor) &&
    (!filters.reviewer || period.reviewerSnapshot === filters.reviewer) &&
    (!filters.management || period.managementNameSnapshot === filters.management) &&
    (!filters.status || period.processingStatus === filters.status) &&
    (!filters.onlyOldOpen || isOldOpenPeriod(period, filters.year, filters.month)) &&
    (!filters.onlyOpenMandatory || period.progress.mandatoryOpen > 0) &&
    (!filters.onlyOpenReviewPoints || period.summary.openReviewPoints > 0)
  );
}

export function dashboardMetrics(periods: DashboardPeriod[], year: number, month: number) {
  const selected = periods.filter((period) => period.calendarYear === year && period.month === month);
  const status = (value: string) => selected.filter((period) => period.processingStatus === value).length;
  return {
    total: selected.length,
    open: status("Offen"),
    processing: status("In Bearbeitung"),
    readyForReview: status("Zur Prüfung"),
    inReview: status("In Prüfung"),
    rework: status("Nachbearbeitung"),
    completed: status("Abgeschlossen"),
    openMandatory: selected.reduce((sum, period) => sum + period.progress.mandatoryOpen, 0),
    openReviewPoints: selected.reduce((sum, period) => sum + period.summary.openReviewPoints, 0),
    oldOpen: periods.filter((period) => isOldOpenPeriod(period, year, month)).length,
  };
}

export function expectedPeriodMissing(client: Client, periods: DashboardPeriod[], year: number, month: number) {
  if (!client.active) return false;
  const clientPeriods = periods.filter((period) => period.clientId === client.id).sort((a,b)=>a.calendarYear-b.calendarYear||a.month-b.month);
  if (clientPeriods.some((period)=>period.processingStatus!=="Abgeschlossen")) return false;
  if (!clientPeriods.length) return !periods.some((period)=>period.clientId===client.id&&period.calendarYear===year&&period.month===month);
  const latest=clientPeriods.at(-1)!;
  const expected=latest.month===12?{year:latest.calendarYear+1,month:1}:{year:latest.calendarYear,month:latest.month+1};
  return expected.year===year&&expected.month===month&&!clientPeriods.some(period=>period.calendarYear===year&&period.month===month);
}

export async function getDashboardData(filters: DashboardFilters) {
  const [rawPeriods, clients] = await Promise.all([
    prisma.accountingPeriod.findMany({
      where: { calendarYear: filters.year, checklistType: "Monat" },
      include: {
        client: true,
        tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true, processingNote: true } },
      },
    }),
    prisma.client.findMany({
      where: { active: true },
      include: { annualProfiles: { where: { calendarYear: filters.year }, select: { id: true } } },
      orderBy: { clientNumber: "asc" },
    }),
  ]);
  const periods: DashboardPeriod[] = rawPeriods.map((period) => ({
    ...period,
    progress: calculateProgress(period.tasks),
    summary: workflowSummary(period.tasks),
  }));
  const visiblePeriods=filters.officeWide||!filters.userId?periods:periods.filter(period=>[period.processorUserId,period.reviewerUserId,period.managementUserId].includes(filters.userId!));
  const visibleClients=filters.officeWide||!filters.userId?clients:clients.filter(client=>[client.processorUserId,client.reviewerUserId,client.managementUserId].includes(filters.userId!));
  const filteredClients = visibleClients.filter((client) => {
    const search = filters.search?.trim().toLocaleLowerCase("de-DE");
    return (!filters.clientId || client.id === filters.clientId) &&
      (!search || client.clientNumber.toLocaleLowerCase("de-DE").includes(search) || client.name.toLocaleLowerCase("de-DE").includes(search)) &&
      (!filters.processor || client.processor === filters.processor) &&
      (!filters.reviewer || client.reviewer === filters.reviewer) &&
      (!filters.management || client.managementName === filters.management);
  });
  const selected = sortByPriority(visiblePeriods.filter((period) => periodMatchesFilters(period, filters)), filters.year, filters.month);
  const yearFiltered = sortByPriority(visiblePeriods.filter((period) => periodMatchesFilters(period, filters, false)), filters.year, filters.month);
  const oldOpen = yearFiltered.filter((period) => isOldOpenPeriod(period, filters.year, filters.month));
  const workViewName = filters.workViewName?.trim();
  return {
    periods: visiblePeriods,
    clients: visibleClients,
    selected,
    metrics: dashboardMetrics(visiblePeriods.filter((period) => periodMatchesFilters(period, { ...filters, onlyOldOpen: false }, false)), filters.year, filters.month),
    work: selected.filter((period) => ["Offen", "In Bearbeitung", "Nachbearbeitung"].includes(period.processingStatus)),
    review: selected.filter((period) => ["Zur Prüfung", "In Prüfung"].includes(period.processingStatus)),
    reviewPoints: yearFiltered.filter((period) => period.summary.openReviewPoints > 0),
    oldOpen,
    recent: [...yearFiltered].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 10),
    myProcessing: filters.userId ? yearFiltered.filter((period) => period.processorUserId === filters.userId && period.processingStatus !== "Abgeschlossen") : workViewName ? yearFiltered.filter((period) => period.processorSnapshot === workViewName && ["Offen","In Bearbeitung","Nachbearbeitung"].includes(period.processingStatus)) : [],
    myReviews: filters.userId ? yearFiltered.filter((period) => period.reviewerUserId === filters.userId && period.processingStatus !== "Abgeschlossen") : workViewName ? yearFiltered.filter((period) => period.reviewerSnapshot === workViewName && ["Zur Prüfung","In Prüfung"].includes(period.processingStatus)) : [],
    myQuestions: filters.userId ? yearFiltered.filter((period)=>period.processorUserId===filters.userId&&period.summary.openReviewPoints>0) : [],
    missing: filteredClients.filter((client) => expectedPeriodMissing(client, visiblePeriods, filters.year, filters.month)),
    quality: [
      ...filteredClients.filter((client) => client.annualProfiles.length === 0).map((client) => ({ key: `profile-${client.id}`, text: `${client.clientNumber}: Jahresprofil ${filters.year} fehlt.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.processor).map((client) => ({ key: `processor-${client.id}`, text: `${client.clientNumber}: Bearbeiter fehlt.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.reviewer).map((client) => ({ key: `reviewer-${client.id}`, text: `${client.clientNumber}: Prüfer fehlt.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.managementName).map((client) => ({ key: `management-${client.id}`, text: `${client.clientNumber}: Zuständige Kanzleileitung fehlt.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.processorUserId).map((client) => ({ key: `processor-user-${client.id}`, text: `${client.clientNumber}: Bearbeiter konnte keinem aktiven Benutzer zugeordnet werden.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.reviewerUserId).map((client) => ({ key: `reviewer-user-${client.id}`, text: `${client.clientNumber}: Prüfer konnte keinem aktiven Benutzer zugeordnet werden.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => !client.managementUserId).map((client) => ({ key: `management-user-${client.id}`, text: `${client.clientNumber}: Kanzleileitung konnte keinem aktiven Benutzer zugeordnet werden.`, href: `/mandanten/${client.id}` })),
      ...filteredClients.filter((client) => hasRoleConflict(client.processor, client.reviewer)).map((client) => ({ key: `roles-${client.id}`, text: `${client.clientNumber}: Bearbeiter und Prüfer sind identisch.`, href: `/mandanten/${client.id}` })),
      ...yearFiltered.filter((period) => period.tasks.length === 0).map((period) => ({ key: `empty-${period.id}`, text: `${period.client.clientNumber} ${period.periodLabel}: Monatscheckliste enthält keine Aufgaben.`, href: `/monatschecklisten/${period.id}` })),
      ...yearFiltered.filter((period) => !period.processorSnapshot || !period.reviewerSnapshot).map((period) => ({ key: `checklist-roles-${period.id}`, text: `${period.client.clientNumber} ${period.periodLabel}: Bearbeiter oder Prüfer fehlt.`, href: `/monatschecklisten/${period.id}` })),
    ],
  };
}
