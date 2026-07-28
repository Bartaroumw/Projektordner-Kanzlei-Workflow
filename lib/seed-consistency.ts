import type { PrismaClient } from "@prisma/client";

export async function seedDiagnostics(prisma:PrismaClient){
  const [activeUsers,clients,periods,payrollReconciliations,payrollTopics]=await Promise.all([
    prisma.user.count({where:{active:true}}),
    prisma.client.findMany({include:{processorUser:true,reviewerUser:true,managementUser:true,payrollUser:{include:{roles:true}}}}),
    prisma.accountingPeriod.findMany({where:{checklistType:"Monat"},include:{tasks:{select:{id:true}}}}),
    prisma.payrollReconciliation.findMany({include:{client:true,payrollUser:{include:{roles:true}},items:true}}),
    prisma.payrollReconciliationTopic.findMany(),
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
    orphanedUserReferences:clients.filter(client=>(client.processorUserId&&!client.processorUser)||(client.reviewerUserId&&!client.reviewerUser)||(client.managementUserId&&!client.managementUser)).length,
    clientsWithMultipleActivePeriods:[...activeByClient.values()].filter(count=>count>1).length,
    activePeriodsWithoutTasks:activePeriods.filter(period=>period.tasks.length===0).length,
    inactiveAssignments:clients.filter(client=>(client.processorUser&&!client.processorUser.active)||(client.reviewerUser&&!client.reviewerUser.active)||(client.managementUser&&!client.managementUser.active)).length,
    payrollClients:clients.filter(client=>client.payrollPreparedByFirm).length,
    payrollClientsWithoutAssignee:clients.filter(client=>client.payrollPreparedByFirm&&!client.payrollUserId).length,
    payrollClientsWithInvalidAssignee:clients.filter(client=>client.payrollPreparedByFirm&&(
      !client.payrollUser?.active||
      !client.payrollUser.roles.some(role=>role.role==="LOHNSACHBEARBEITER")||
      [client.processorUserId,client.reviewerUserId,client.managementUserId].includes(client.payrollUserId)
    )).length,
    payrollReconciliations:payrollReconciliations.length,
    payrollReconciliationsWithoutRoleSnapshots:payrollReconciliations.filter(item=>!item.processorUserId||!item.reviewerUserId||!item.payrollUserId||!item.processorNameSnapshot||!item.reviewerNameSnapshot||!item.payrollUserNameSnapshot).length,
    payrollReconciliationsWithInvalidAssignee:payrollReconciliations.filter(item=>!item.payrollUser.active||!item.payrollUser.roles.some(role=>role.role==="LOHNSACHBEARBEITER")).length,
    payrollReconciliationsWithoutItems:payrollReconciliations.filter(item=>item.items.length===0).length,
    payrollReconciliationsWithClientMismatch:payrollReconciliations.filter(item=>!item.client.payrollPreparedByFirm).length,
    activePayrollTopics:payrollTopics.filter(topic=>topic.status==="Aktiv").length,
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
  if(report.orphanedUserReferences)errors.push("verwaiste Benutzerreferenz");
  if(report.clientsWithMultipleActivePeriods)errors.push("mehr als eine aktive Checkliste pro Mandant");
  if(report.activePeriodsWithoutTasks)errors.push("aktive Checkliste ohne Aufgaben");
  if(report.inactiveAssignments)errors.push("inaktiver Benutzer ist zugeordnet");
  if(report.payrollClientsWithoutAssignee)errors.push("Kanzleilohn-Mandant ohne Lohnsachbearbeiter");
  if(report.payrollClientsWithInvalidAssignee)errors.push("Kanzleilohn-Mandant mit ungültiger oder nicht getrennter Lohnzuständigkeit");
  if(report.payrollReconciliationsWithoutRoleSnapshots)errors.push("FiBu-Lohn-Abstimmung ohne vollständige Rollen-Snapshots");
  if(report.payrollReconciliationsWithInvalidAssignee)errors.push("FiBu-Lohn-Abstimmung mit ungültigem Lohnsachbearbeiter");
  if(report.payrollReconciliationsWithoutItems)errors.push("FiBu-Lohn-Abstimmung ohne Themen-Snapshots");
  if(report.payrollReconciliationsWithClientMismatch)errors.push("FiBu-Lohn-Abstimmung für Mandant ohne Kanzleilohn");
  if(report.payrollClients&&report.activePayrollTopics<1)errors.push("Kanzleilohn ist aktiviert, aber der Themenkatalog ist leer");
  if(errors.length)throw new Error(`Seed-Konsistenzprüfung fehlgeschlagen: ${errors.join(", ")}.`);
  return report;
}
