import { notFound } from "next/navigation";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedDiagnostics } from "@/lib/seed-consistency";

export default async function DiagnosePage(){
  const user=await requireRole("ADMINISTRATOR");
  if(process.env.NODE_ENV==="production")notFound();
  const report=await seedDiagnostics(prisma);
  const labels:Record<keyof typeof report,string>={
    activeUsers:"Aktive Benutzer",clients:"Mandanten",clientsWithoutProcessor:"Mandanten ohne Bearbeiter",
    clientsWithoutReviewer:"Mandanten ohne Prüfer",clientsWithoutManagement:"Mandanten ohne Kanzleileitung",
    periods:"Monatschecklisten",activePeriods:"Aktive Monatschecklisten",
    periodsWithoutUserReferences:"Checklisten ohne Benutzerreferenzen",
    orphanedUserReferences:"Verwaiste Benutzerreferenzen",clientsWithMultipleActivePeriods:"Mandanten mit mehreren aktiven Checklisten",
    activePeriodsWithoutTasks:"Aktive Checklisten ohne Aufgaben",inactiveAssignments:"Zuordnungen zu inaktiven Benutzern",
    payrollClients:"Mandanten mit Kanzleilohn",payrollClientsWithoutAssignee:"Kanzleilohn-Mandanten ohne Lohnsachbearbeiter",
    payrollClientsWithInvalidAssignee:"Kanzleilohn-Mandanten mit ungültiger Lohnzuständigkeit",
    payrollReconciliations:"Rechnungswesen–Lohn-Abstimmungen",payrollReconciliationsWithoutRoleSnapshots:"Abstimmungen ohne Rollen-Snapshots",
    payrollReconciliationsWithInvalidAssignee:"Abstimmungen mit ungültigem Lohnsachbearbeiter",
    payrollReconciliationsWithoutItems:"Abstimmungen ohne Themen-Snapshots",
    payrollReconciliationsWithClientMismatch:"Abstimmungen ohne aktivierten Kanzleilohn",
    activePayrollTopics:"Aktive Rechnungswesen–Lohn-Themen",
  };
  return <><AdministrationBreadcrumbs section="system" current="Diagnose künstlicher Daten"/><AdministrationTabs user={user} active="system"/><h1 className="text-3xl font-semibold">Diagnose künstlicher Daten</h1><p className="mt-2 text-sm">Nur im lokalen Entwicklungsmodus. Passwörter, Hashes und Sitzungen werden nicht angezeigt.</p>
  <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(report).map(([key,value])=><div className="rounded border bg-white p-4" key={key}><dt className="text-sm text-[var(--color-text-muted)]">{labels[key as keyof typeof report]}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>)}</dl></>
}
