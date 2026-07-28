import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.ts";

const REQUIRED_DATABASE_URL="file:./fibu-lohn-acceptance.db";
if(process.env.DATABASE_URL!==REQUIRED_DATABASE_URL)throw new Error(`SCHUTZABBRUCH: Die Diagnose ist ausschließlich für ${REQUIRED_DATABASE_URL} freigegeben.`);
const storageRoot=resolve(process.env.FIBU_LOHN_STORAGE_DIR??"tmp/fibu-lohn-acceptance-storage");

type CountRow={count:bigint};
async function count(sql:string){const rows=await prisma.$queryRawUnsafe<CountRow[]>(sql);return Number(rows[0]?.count??0)}
async function files(root:string){
  try{return(await readdir(root,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>entry.name).sort();}
  catch{return[]}
}

const acceptanceClients=await prisma.client.findMany({
  where:{clientNumber:{startsWith:"920"}},
  include:{payrollUser:{include:{roles:true}},processorUser:{include:{roles:true}},reviewerUser:{include:{roles:true}},managementUser:{include:{roles:true}}},
  orderBy:{clientNumber:"asc"},
});
const acceptanceClientIds=acceptanceClients.map(client=>client.id);
const reconciliations=await prisma.payrollReconciliation.findMany({
  where:{clientId:{in:acceptanceClientIds}},
  include:{items:true,questions:true,payrollUser:{include:{roles:true}},client:{include:{payrollResponsibilityHistory:true}}},
  orderBy:[{client:{clientNumber:"asc"}},{accountingYear:"asc"},{accountingMonth:"asc"}],
});
const documents=await prisma.payrollDocumentReference.findMany({where:{reconciliationItem:{reconciliation:{clientId:{in:acceptanceClientIds}}}},select:{id:true,storageKey:true,status:true}});
const storedFiles=await files(storageRoot);
const referenced=new Set(documents.map(document=>document.storageKey));

const findings={
  duplicateReconciliations:await count(`SELECT COUNT(*) AS count FROM (
    SELECT clientId,payrollYear,payrollMonth FROM PayrollReconciliation
    GROUP BY clientId,payrollYear,payrollMonth HAVING COUNT(*)>1
  ) duplicates`),
  orphanItems:await count(`SELECT COUNT(*) AS count FROM PayrollReconciliationItem item LEFT JOIN PayrollReconciliation reconciliation ON reconciliation.id=item.reconciliationId WHERE reconciliation.id IS NULL`),
  orphanQuestions:await count(`SELECT COUNT(*) AS count FROM PayrollReconciliationQuestion question LEFT JOIN PayrollReconciliationItem item ON item.id=question.reconciliationItemId LEFT JOIN PayrollReconciliation reconciliation ON reconciliation.id=question.reconciliationId WHERE item.id IS NULL OR reconciliation.id IS NULL OR item.reconciliationId<>question.reconciliationId`),
  questionsWithWrongRecipient:await count(`SELECT COUNT(*) AS count FROM PayrollReconciliationQuestion question JOIN PayrollReconciliation reconciliation ON reconciliation.id=question.reconciliationId WHERE question.recipientDepartment='Rechnungswesen' AND (reconciliation.processorUserId IS NULL OR question.recipientUserId<>reconciliation.processorUserId)`),
  orphanVehicles:await count(`SELECT COUNT(*) AS count FROM ClientVehicle vehicle LEFT JOIN Client client ON client.id=vehicle.clientId WHERE client.id IS NULL`),
  orphanVehicleChanges:await count(`SELECT COUNT(*) AS count FROM ClientVehicleChange change LEFT JOIN ClientVehicle vehicle ON vehicle.id=change.vehicleId WHERE vehicle.id IS NULL`),
  foreignVehicleChanges:await count(`SELECT COUNT(*) AS count FROM ClientVehicleChange change JOIN ClientVehicle vehicle ON vehicle.id=change.vehicleId JOIN PayrollReconciliationItem item ON item.id=change.reconciliationItemId JOIN PayrollReconciliation reconciliation ON reconciliation.id=item.reconciliationId WHERE vehicle.clientId<>reconciliation.clientId`),
  orphanDocuments:await count(`SELECT COUNT(*) AS count FROM PayrollDocumentReference document LEFT JOIN PayrollReconciliationItem item ON item.id=document.reconciliationItemId WHERE item.id IS NULL`),
  payrollWithoutAccountingTransfer:reconciliations.filter(entry=>entry.payrollStatus!=="Neu"&&entry.accountingStatus!=="Vollständig übergeben").map(entry=>entry.id),
  completedWithOpenQuestion:reconciliations.filter(entry=>entry.payrollStatus==="Erledigt"&&entry.questions.some(question=>question.status!=="Erledigt durch Lohn")).map(entry=>entry.id),
  completedWithOpenFollowUp:reconciliations.filter(entry=>entry.payrollStatus==="Erledigt"&&entry.items.some(item=>item.documentToFollow)).map(entry=>entry.id),
  completedWithUnprocessedMatter:reconciliations.filter(entry=>entry.payrollStatus==="Erledigt"&&entry.items.some(item=>item.status==="Vollständig an Lohn übergeben"&&item.payrollProcessingStatus!=="Verarbeitet")).map(entry=>entry.id),
  invalidClientPeriods:acceptanceClients.filter(client=>client.payrollServiceStart&&client.payrollServiceEnd&&client.payrollServiceStart>client.payrollServiceEnd).map(client=>client.clientNumber),
  invalidVehiclePeriods:(await prisma.clientVehicle.findMany({where:{clientId:{in:acceptanceClientIds}}})).filter(vehicle=>vehicle.validUntil&&vehicle.validFrom>vehicle.validUntil).map(vehicle=>vehicle.id),
  payrollRoleOverlaps:acceptanceClients.filter(client=>client.payrollUserId&&[client.processorUserId,client.reviewerUserId,client.managementUserId].includes(client.payrollUserId)).map(client=>client.clientNumber),
  assignedUsersWithoutRole:acceptanceClients.flatMap(client=>{
    const issues:string[]=[];
    if(client.payrollPreparedByFirm&&!client.payrollUser?.roles.some(role=>role.role==="LOHNSACHBEARBEITER"))issues.push(`${client.clientNumber}: Lohnrolle`);
    if(client.processorUser&&!client.processorUser.roles.some(role=>["MITARBEITER","PRUEFER","KANZLEILEITUNG"].includes(role.role)))issues.push(`${client.clientNumber}: Bearbeiterrolle`);
    if(client.reviewerUser&&!client.reviewerUser.roles.some(role=>["PRUEFER","KANZLEILEITUNG"].includes(role.role)))issues.push(`${client.clientNumber}: Prüferrolle`);
    if(client.managementUser&&!client.managementUser.roles.some(role=>role.role==="KANZLEILEITUNG"))issues.push(`${client.clientNumber}: Kanzleileitung`);
    return issues;
  }),
  historicalPayrollWithoutResponsibility:reconciliations.filter(entry=>entry.payrollUserId!==entry.client.payrollUserId&&!entry.client.payrollResponsibilityHistory.some(history=>history.payrollUserId===entry.payrollUserId)).map(entry=>entry.id),
  missingFiles:documents.filter(document=>!storedFiles.includes(document.storageKey)).map(document=>document.storageKey),
  filesWithoutDatabaseRecord:storedFiles.filter(file=>!referenced.has(file)),
  wrongItemCounts:reconciliations.filter(entry=>entry.items.length!==6).map(entry=>entry.id),
};

const expectedUsers=["anna.rechnungswesen","peter.pruefer","laura.lohn","leon.lohn","klaus.leitung","admin.test","campus.verantwortlich"];
const presentUsers=await prisma.user.findMany({where:{username:{in:expectedUsers},active:true},select:{username:true}});
const result={
  database:REQUIRED_DATABASE_URL,
  storageRoot,
  acceptance:{
    activeRequiredUsers:presentUsers.length,
    clients:acceptanceClients.length,
    payrollClients:acceptanceClients.filter(client=>client.payrollPreparedByFirm).length,
    reconciliations:reconciliations.length,
    reconciliationItems:reconciliations.reduce((sum,entry)=>sum+entry.items.length,0),
    documents:documents.length,
    questions:reconciliations.reduce((sum,entry)=>sum+entry.questions.length,0),
    vehicles:await prisma.clientVehicle.count({where:{clientId:{in:acceptanceClientIds}}}),
  },
  requiredUsersMissing:expectedUsers.filter(username=>!presentUsers.some(user=>user.username===username)),
  requiredClientsMissing:["92001","92002","92003","92004","92005","92006","92007","92008"].filter(number=>!acceptanceClients.some(client=>client.clientNumber===number)),
  findings,
};
console.log(JSON.stringify(result,null,2));
const findingGroups:(number|string[]|number[])[]=[
  ...Object.values(findings),
  result.requiredUsersMissing,
  result.requiredClientsMissing,
];
const findingCount=findingGroups.reduce<number>(
  (sum,value)=>sum+(Array.isArray(value)?value.length:Number(value)),
  0,
);
await prisma.$disconnect();
if(findingCount>0)process.exitCode=1;
