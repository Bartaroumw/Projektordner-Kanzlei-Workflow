import {
  canManageOrdoCampus,
  canManagePayrollTopics,
  canManageStandardTasks,
  canManageUsers,
  hasRole,
  type AuthUser,
} from "@/lib/permissions";

export type AdministrationSection = "fachliche-grundlagen" | "wissensmanagement" | "benutzer-rechte" | "daten-import" | "system";

export const ADMINISTRATION_SECTION_LABELS: Record<AdministrationSection, string> = {
  "fachliche-grundlagen": "Fachliche Grundlagen",
  wissensmanagement: "Wissensmanagement",
  "benutzer-rechte": "Benutzer und Rechte",
  "daten-import": "Daten und Import",
  system: "System",
};

export function canUseCentralCustomTaskOverview(user: AuthUser) {
  return hasRole(user, "KANZLEILEITUNG", "MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN");
}

export function administrationSectionsFor(user: AuthUser): AdministrationSection[] {
  const sections: AdministrationSection[] = [];
  if (
    canManageStandardTasks(user) ||
    canManageOrdoCampus(user) ||
    canManagePayrollTopics(user) ||
    canUseCentralCustomTaskOverview(user)
  ) {
    sections.push("fachliche-grundlagen");
  }
  if (canManageOrdoCampus(user)) sections.push("wissensmanagement");
  if (canManageUsers(user)) sections.push("benutzer-rechte");
  if (canManageStandardTasks(user)) sections.push("daten-import");
  if (canManageUsers(user)) sections.push("system");
  return sections;
}

export function canOpenAdministration(user: AuthUser) {
  return administrationSectionsFor(user).length > 0;
}

export function administrationHref(section?: AdministrationSection) {
  return section ? `/verwaltung?bereich=${section}` : "/verwaltung";
}
