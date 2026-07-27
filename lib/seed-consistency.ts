import type { PrismaClient } from "@prisma/client";

export async function seedDiagnostics(prisma:PrismaClient){
  const [activeUsers,clients,periods]=await Promise.all([
    prisma.user.count({where:{active:true}}),
    prisma.client.findMany({include:{processorUser:true,reviewerUser:true,managementUser:true}}),
    prisma.accountingPeriod.findMany({where:{checklistType:"Monat"},include:{tasks:{select:{id:true}}}}),
  ]);
  const activePeriods=periods.filter(period=>period.processingStatus!=="Abgeschlossen");
  const activeByClient=new Map<number,number>();
  for(const period of activePeriods)activeByClient.set(period.clientId,(activeByClient.get(period.clientId)??0)+1);
  return {
    activeUsers,
    clients:clients.length,
    clientsWithoutProcessor:clients.filter(client=>!client.processorUserId).length,
    clientsWithoutReviewer:clients.filter(client=>!client.reviewerUserId).length,
    clientsWithoutManagement:clients.filter(client=>!client.managementUserId).length,
    periods:periods.length,
    activePeriods:activePeriods.length,
    periodsWithoutUserReferences:periods.filter(period=>!period.processorUserId||!period.reviewerUserId||!period.managementUserId).length,
    periodsWithRoleConflict:periods.filter(period=>period.processorUserId===period.reviewerUserId).length,
    orphanedUserReferences:clients.filter(client=>(client.processorUserId&&!client.processorUser)||(client.reviewerUserId&&!client.reviewerUser)||(client.managementUserId&&!client.managementUser)).length,
    clientsWithMultipleActivePeriods:[...activeByClient.values()].filter(count=>count>1).length,
    activePeriodsWithoutTasks:activePeriods.filter(period=>period.tasks.length===0).length,
    inactiveAssignments:clients.filter(client=>(client.processorUser&&!client.processorUser.active)||(client.reviewerUser&&!client.reviewerUser.active)||(client.managementUser&&!client.managementUser.active)).length,
  };
}

export async function validateSeedConsistency(prisma:PrismaClient){
  const report=await seedDiagnostics(prisma);
  validateSeedReport(report);
  console.log("Seed-Konsistenzprüfung erfolgreich:",report);
  return report;
}

export function validateSeedReport(report:Awaited<ReturnType<typeof seedDiagnostics>>){
  const errors:string[]=[];
  if(report.clientsWithoutProcessor)errors.push("Mandant ohne Bearbeiter");
  if(report.clientsWithoutReviewer)errors.push("Mandant ohne Prüfer");
  if(report.clientsWithoutManagement)errors.push("Mandant ohne Kanzleileitung");
  if(report.periodsWithoutUserReferences)errors.push("Checkliste ohne Rollenreferenz");
  if(report.periodsWithRoleConflict)errors.push("Bearbeiter und Prüfer identisch");
  if(report.orphanedUserReferences)errors.push("verwaiste Benutzerreferenz");
  if(report.clientsWithMultipleActivePeriods)errors.push("mehr als eine aktive Checkliste pro Mandant");
  if(report.activePeriodsWithoutTasks)errors.push("aktive Checkliste ohne Aufgaben");
  if(report.inactiveAssignments)errors.push("inaktiver Benutzer ist zugeordnet");
  if(errors.length)throw new Error(`Seed-Konsistenzprüfung fehlgeschlagen: ${errors.join(", ")}.`);
  return report;
}
