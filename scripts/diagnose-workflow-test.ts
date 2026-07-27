import { prisma } from "../lib/prisma.ts";

const [users, clients, periods, annuals, standardTasks, campusKnowledge, campusLinks] = await Promise.all([
  prisma.user.count({ where: { active: true } }),
  prisma.client.count({ where: { clientNumber: { startsWith: "900" } } }),
  prisma.accountingPeriod.findMany({ include: { tasks: true } }),
  prisma.annualChecklist.count(),
  prisma.standardTask.count(),
  prisma.standardTaskKnowledge.count(),
  prisma.standardTaskKnowledgeLink.count(),
]);
const errors: string[] = [];
if (users !== 6) errors.push(`Erwartet: 6 aktive Benutzer, vorhanden: ${users}.`);
if (clients !== 12) errors.push(`Erwartet: 12 Workflow-Mandanten, vorhanden: ${clients}.`);
for (const period of periods) {
  if (!period.processorUserId || !period.reviewerUserId || !period.managementUserId) errors.push(`${period.periodLabel}: Rollenreferenz fehlt.`);
  if (!period.tasks.length) errors.push(`${period.periodLabel}: keine Aufgaben.`);
}
const activeByClient = new Map<number, number>();
for (const period of periods.filter((entry) => entry.processingStatus !== "Abgeschlossen")) {
  activeByClient.set(period.clientId, (activeByClient.get(period.clientId) ?? 0) + 1);
}
for (const [clientId, count] of activeByClient) if (count > 1) errors.push(`Mandant ${clientId}: ${count} aktive Checklisten.`);
if (errors.length) {
  console.error(errors.join("\n"));
  await prisma.$disconnect();
  process.exit(1);
}
console.log(`Konsistenzprüfung erfolgreich: ${users} Benutzer, ${clients} Mandanten, ${standardTasks} Standardaufgaben, ${campusKnowledge} Campus-Einträge, ${campusLinks} Wissenslinks, ${periods.length} Rechnungswesen- und ${annuals} Jahresabschlusschecklisten.`);
await prisma.$disconnect();
