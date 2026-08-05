export const MAIN_ROLE_ORDER = [
  "KANZLEILEITUNG",
  "PRUEFER",
  "MITARBEITER",
  "LOHNSACHBEARBEITER",
  "ADMINISTRATOR",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  KANZLEILEITUNG: "Kanzleileitung",
  PRUEFER: "Prüfer",
  MITARBEITER: "Bearbeiter",
  LOHNSACHBEARBEITER: "Lohnsachbearbeiter",
  ADMINISTRATOR: "Administrator",
  MANDANTEN_VERWALTEN: "Mandanten verwalten",
  MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN: "Mandantenspezifische Aufgaben verwalten",
  STANDARDAUFGABEN_VERWALTEN: "Standardaufgaben verwalten",
  ORDO_CAMPUS_VERWALTEN: "Ordo Campus verwalten",
  FIBU_LOHN_THEMEN_VERWALTEN: "Rechnungswesen–Lohn-Themen verwalten",
};

export function splitRoleDisplay(roles: string[]) {
  const unique = new Set(roles);
  const main = MAIN_ROLE_ORDER.filter((role) => unique.has(role)).map((role) => ROLE_LABELS[role]);
  const mainSet = new Set<string>(MAIN_ROLE_ORDER);
  const additional = [...unique]
    .filter((role) => !mainSet.has(role))
    .map((role) => ROLE_LABELS[role] ?? role)
    .sort((a, b) => a.localeCompare(b, "de"));
  return { main, additional };
}
