export const ROLES = ["MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "LOHNSACHBEARBEITER", "ADMINISTRATOR", "MANDANTEN_VERWALTEN", "MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN", "STANDARDAUFGABEN_VERWALTEN", "ORDO_CAMPUS_VERWALTEN", "FIBU_LOHN_THEMEN_VERWALTEN"] as const;
export type Role = typeof ROLES[number];

export type AuthUser = {
  id: number;
  fullName: string;
  username: string;
  active: boolean;
  mustChangePassword: boolean;
  roles: Role[];
};

export function hasRole(user: AuthUser, ...roles: Role[]) {
  return roles.some((role) => user.roles.includes(role));
}

export function canManageUsers(user: AuthUser) {
  return hasRole(user, "ADMINISTRATOR");
}

export function canManageStandardTasks(user: AuthUser) {
  return hasRole(user, "KANZLEILEITUNG", "STANDARDAUFGABEN_VERWALTEN");
}

export function canManageOrdoCampus(user: AuthUser) {
  return hasRole(user, "ORDO_CAMPUS_VERWALTEN");
}

export function canReadCampusReviewerGuidance(user: AuthUser) {
  return hasRole(user, "PRUEFER", "KANZLEILEITUNG");
}

export function canManageClients(user: AuthUser) {
  return hasRole(user, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "MANDANTEN_VERWALTEN");
}

export function canManageCustomTasks(user: AuthUser) {
  return hasRole(user, "PRUEFER", "KANZLEILEITUNG", "MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN");
}

export function canUseAdministrationException(user: AuthUser) {
  return hasRole(user, "KANZLEILEITUNG");
}

export function canViewClient(user: AuthUser, client: { processorUserId: number | null; reviewerUserId: number | null; managementUserId: number | null }) {
  return hasRole(user, "KANZLEILEITUNG") ||
    [client.processorUserId, client.reviewerUserId, client.managementUserId].includes(user.id);
}

export function canProcessPeriod(user: AuthUser, period: { processorUserId: number | null }) {
  return period.processorUserId === user.id && hasRole(user, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG");
}

export function canReviewPeriod(user: AuthUser, period: { processorUserId: number | null; reviewerUserId: number | null; managementUserId: number | null }) {
  return (period.reviewerUserId === user.id && hasRole(user, "PRUEFER", "KANZLEILEITUNG")) ||
    (period.managementUserId === user.id && hasRole(user, "KANZLEILEITUNG"));
}

export function canProcessAnnualChecklist(user: AuthUser, checklist: { processorUserId: number }) {
  return checklist.processorUserId === user.id && hasRole(user, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG");
}

export function canReviewAnnualChecklist(user: AuthUser, checklist: { processorUserId: number; reviewerUserId: number }) {
  return checklist.reviewerUserId === user.id &&
    hasRole(user, "PRUEFER", "KANZLEILEITUNG");
}

export function canReleaseAnnualChecklist(user: AuthUser, checklist: { processorUserId: number; managementUserId: number }) {
  return checklist.managementUserId === user.id &&
    hasRole(user, "KANZLEILEITUNG");
}

export function canViewAnnualChecklist(user: AuthUser, checklist: { processorUserId: number; reviewerUserId: number; managementUserId: number }) {
  return hasRole(user, "KANZLEILEITUNG") ||
    [checklist.processorUserId, checklist.reviewerUserId, checklist.managementUserId].includes(user.id);
}

export function canManageCustomAnnualTasks(user: AuthUser) {
  return canManageCustomTasks(user);
}

export function canManagePayrollTopics(user: AuthUser) {
  return hasRole(user, "KANZLEILEITUNG", "FIBU_LOHN_THEMEN_VERWALTEN");
}

export function canProcessPayrollReconciliation(user: AuthUser, reconciliation: { processorUserId: number | null }) {
  return reconciliation.processorUserId === user.id &&
    hasRole(user, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG");
}

export function canReviewPayrollReconciliation(user: AuthUser, reconciliation: { reviewerUserId: number | null }) {
  return reconciliation.reviewerUserId === user.id && hasRole(user, "PRUEFER", "KANZLEILEITUNG");
}

export function canHandlePayrollReconciliation(user: AuthUser, reconciliation: { payrollUserId: number }) {
  return reconciliation.payrollUserId === user.id && hasRole(user, "LOHNSACHBEARBEITER");
}

export function canViewPayrollReconciliation(
  user: AuthUser,
  reconciliation: { processorUserId: number | null; reviewerUserId: number | null; payrollUserId: number },
) {
  return canProcessPayrollReconciliation(user, reconciliation) ||
    canReviewPayrollReconciliation(user, reconciliation) ||
    canHandlePayrollReconciliation(user, reconciliation) ||
    hasRole(user, "KANZLEILEITUNG");
}
