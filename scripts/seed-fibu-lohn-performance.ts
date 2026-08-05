import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { prisma } from "../lib/prisma.ts";

if(process.env.DATABASE_URL!=="file:./fibu-lohn-performance.db")throw new Error("SCHUTZABBRUCH: Performance-Generator nur für die freigegebene Datenbank.");
const now=new Date();
const year=now.getUTCFullYear();
const batch=async<T>(rows:T[],write:(part:T[])=>Promise<unknown>)=>{for(let index=0;index<rows.length;index+=400)await write(rows.slice(index,index+400))};

const processor=await prisma.user.create({data:{username:"perf.processor",fullName:"Künstliche Performance Bearbeitung",passwordHash:"scrypt$synthetic",active:true,mustChangePassword:false,roles:{create:[{role:"MITARBEITER"}]}}});
const reviewer=await prisma.user.create({data:{username:"perf.reviewer",fullName:"Künstliche Performance Prüfung",passwordHash:"scrypt$synthetic",active:true,mustChangePassword:false,roles:{create:[{role:"PRUEFER"}]}}});
const management=await prisma.user.create({data:{username:"perf.management",fullName:"Künstliche Performance Leitung",passwordHash:"scrypt$synthetic",active:true,mustChangePassword:false,roles:{create:[{role:"KANZLEILEITUNG"}]}}});
const payroll=await prisma.user.create({data:{username:"perf.payroll",fullName:"Künstliche Performance Lohn",passwordHash:"scrypt$synthetic",active:true,mustChangePassword:false,roles:{create:[{role:"LOHNSACHBEARBEITER"}]}}});
const category=await prisma.taskCategory.create({data:{name:"Künstliche Performance FiBu-Lohn",sortOrder:10}});
const standardTask=await prisma.standardTask.create({data:{
  taskId:"PERF-FIBU-LOHN",active:true,checklistType:"Monat",categoryId:category.id,title:"Künstliche FiBu-Lohn-Performanceaufgabe",
  mandatory:true,rhythm:"Monatlich",executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12",legalFormGroups:"Alle",
  profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Ja",fixedAssetsCondition:"Alle",
  receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",permanentExtensionCondition:"Alle",
  knowledgeKey:"FIBU_LOHN_ABSTIMMUNG",sortOrder:10,professionalVersion:"PERF-1",
}});
const topics=[] as Array<{id:number;key:string;title:string;sortOrder:number}>;
for(let index=1;index<=6;index++)topics.push(await prisma.payrollReconciliationTopic.create({data:{
  key:`PERF_TOPIC_${index}`,title:`Künstliches Performance-Thema ${index}`,reviewQuestion:"Liegt ein künstlicher Sachverhalt vor?",
  sortOrder:index*10,status:"Aktiv",validFrom:new Date(Date.UTC(year-1,0,1)),topicType:"Performance",
  vehicleRelated:index===3,followUpAllowed:index===6,requiredStandardFields:"[]",requiredDocumentTypes:"[]",createdByUserId:management.id,
}}));

const clientRows=Array.from({length:500},(_,index)=>({
  clientNumber:`P${String(index+1).padStart(5,"0")}`,name:`Künstlicher Performance-Mandant ${String(index+1).padStart(5,"0")}`,
  processor:processor.fullName,reviewer:reviewer.fullName,managementName:management.fullName,
  processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,
  payrollPreparedByFirm:index<300,payrollUserId:index<300?payroll.id:null,cadence:"monatlich",vatFilingPeriod:"Monatlich",active:true,
}));
await batch(clientRows,part=>prisma.client.createMany({data:part}));
const clients=await prisma.client.findMany({orderBy:{clientNumber:"asc"}});
await batch(clients.map(client=>({clientId:client.id,calendarYear:year,legalFormGroup:"Kapitalgesellschaft",profitDeterminationMethod:"Bilanzierung",hasPayroll:client.payrollPreparedByFirm,hasFixedAssets:true,hasReceivablesPayables:true,subjectToVat:true})),part=>prisma.annualProfile.createMany({data:part}));
const payrollClients=clients.slice(0,300);
const periodRows=payrollClients.flatMap((client,clientIndex)=>Array.from({length:12},(_,monthIndex)=>({
  clientId:client.id,calendarYear:year,month:monthIndex+1,periodLabel:`${monthIndex+1}/${year}`,checklistType:"Monat",
  processingStatus:clientIndex%5===0?"Abgeschlossen":"In Bearbeitung",processorSnapshot:processor.fullName,reviewerSnapshot:reviewer.fullName,
  managementNameSnapshot:management.fullName,processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,
  profileLegalFormGroup:"Kapitalgesellschaft",profileProfitDeterminationMethod:"Bilanzierung",profileHasCashRegister:false,
  profileHasPayroll:true,profileHasFixedAssets:true,profileHasReceivablesPayables:true,profileHasLoans:false,
  profileSubjectToVat:true,profileHasPermanentExtension:false,
})));
await batch(periodRows,part=>prisma.accountingPeriod.createMany({data:part}));
const periods=await prisma.accountingPeriod.findMany({orderBy:{id:"asc"}});
await batch(periods.map(period=>({
  periodId:period.id,standardTaskId:standardTask.id,taskIdSnapshot:standardTask.taskId,categorySnapshot:category.name,
  categorySortOrder:10,titleSnapshot:standardTask.title,mandatorySnapshot:true,sortOrderSnapshot:10,
  professionalVersionSnapshot:"PERF-1",origin:"Standardaufgabe",status:"Erledigt",
})),part=>prisma.checklistTask.createMany({data:part}));
const checklistTasks=await prisma.checklistTask.findMany({orderBy:{periodId:"asc"}});
await batch(periods.map((period,index)=>({
  clientId:period.clientId,accountingYear:period.calendarYear,accountingMonth:period.month,
  payrollYear:period.month===12?period.calendarYear+1:period.calendarYear,payrollMonth:period.month===12?1:period.month+1,
  accountingPeriodId:period.id,checklistTaskId:checklistTasks[index].id,processorUserId:processor.id,processorNameSnapshot:processor.fullName,
  reviewerUserId:reviewer.id,reviewerNameSnapshot:reviewer.fullName,payrollUserId:payroll.id,payrollUserNameSnapshot:payroll.fullName,
  accountingStatus:"Vollständig übergeben",payrollStatus:["Neu","Gesehen","Rückfrage offen","Erledigt"][index%4],transferredAt:new Date(),
})),part=>prisma.payrollReconciliation.createMany({data:part}));
const reconciliations=await prisma.payrollReconciliation.findMany({orderBy:{id:"asc"}});
await batch(reconciliations.flatMap(reconciliation=>topics.map(topic=>({
  reconciliationId:reconciliation.id,sourceTopicId:topic.id,topicKeySnapshot:topic.key,topicTitleSnapshot:topic.title,
  reviewQuestionSnapshot:"Liegt ein künstlicher Sachverhalt vor?",sortOrderSnapshot:topic.sortOrder,topicTypeSnapshot:"Performance",
  vehicleRelatedSnapshot:topic.key==="PERF_TOPIC_3",requiredFieldsSnapshot:"[]",requiredDocumentsSnapshot:"[]",
  status:"Kein Sachverhalt",matterPresent:"Nein",payrollProcessingStatus:"Offen",
}))),part=>prisma.payrollReconciliationItem.createMany({data:part}));
const items=await prisma.payrollReconciliationItem.findMany({orderBy:{id:"asc"}});
await batch(reconciliations.slice(0,600).map((reconciliation,index)=>({
  reconciliationId:reconciliation.id,reconciliationItemId:items[index*6].id,senderUserId:payroll.id,recipientUserId:processor.id,
  senderDepartment:"Lohn",recipientDepartment:"Rechnungswesen",message:"Künstliche Performance-Rückfrage",status:index%2?"Beantwortet":"Offen beim Rechnungswesen",
})),part=>prisma.payrollReconciliationQuestion.createMany({data:part}));
await batch(payrollClients.slice(0,300).map((client,index)=>({
  clientId:client.id,referenceNumber:`PERF-FZ-${index+1}`,description:`Künstliches Performance-Fahrzeug ${index+1}`,
  userName:`Künstliche Person ${index+1}`,userFunction:"Arbeitnehmer",contractAvailable:index%2===0,ownershipType:index%2?"Eigentum":"Leasing",
  onePercentRule:index%2===0,logbook:index%2===1,commuteUse:true,validFrom:new Date(Date.UTC(year,0,1)),status:"Aktiv",
  createdByUserId:processor.id,updatedByUserId:processor.id,
})),part=>prisma.clientVehicle.createMany({data:part}));

const pageSize=100;
const dashboardWhere={payrollUserId:payroll.id};
async function measure<T>(name:string,operation:()=>Promise<T>){const started=performance.now();const result=await operation();return{name,milliseconds:Math.round((performance.now()-started)*10)/10,rows:Array.isArray(result)?result.length:typeof result==="number"?result:1}}
const results=[
  await measure("Lohn-Dashboard-Gesamtzahl",()=>prisma.payrollReconciliation.count({where:dashboardWhere})),
  await measure("Lohn-Dashboard-Statusauswertung",()=>prisma.payrollReconciliation.findMany({where:dashboardWhere,select:{id:true,payrollYear:true,payrollMonth:true,payrollStatus:true,transferredAt:true,createdAt:true,client:{select:{clientNumber:true}},items:{select:{status:true,matterPresent:true,payrollProcessingStatus:true,documentToFollow:true,questions:{select:{status:true}}}}}})),
  await measure("Lohn-Dashboard-Seite 1",()=>prisma.payrollReconciliation.findMany({where:dashboardWhere,include:{client:true,items:{include:{documents:{select:{status:true}},questions:{select:{status:true}}}}},orderBy:{id:"asc"},take:pageSize})),
  await measure("Lohn-Dashboard-letzte Seite",()=>prisma.payrollReconciliation.findMany({where:dashboardWhere,include:{client:true,items:{include:{documents:{select:{status:true}},questions:{select:{status:true}}}}},orderBy:{id:"asc"},skip:reconciliations.length-pageSize,take:pageSize})),
  await measure("Mandantensuche",()=>prisma.payrollReconciliation.findMany({where:{payrollUserId:payroll.id,client:{OR:[{clientNumber:{contains:"P001"}},{name:{contains:"001"}}]}},include:{client:true},take:100})),
  await measure("Abstimmungsdetail",()=>prisma.payrollReconciliation.findUnique({where:{id:reconciliations[0].id},include:{items:{include:{documents:true,questions:true,vehicleChanges:true}},history:true,client:true} })),
  await measure("Fahrzeugliste",()=>prisma.clientVehicle.findMany({where:{client:{payrollUserId:payroll.id}},include:{client:true,changes:{take:1}},take:200})),
  await measure("Rückfragenübersicht",()=>prisma.payrollReconciliationQuestion.findMany({where:{OR:[{senderUserId:payroll.id},{recipientUserId:payroll.id}],status:{not:"Erledigt durch Lohn"}},include:{reconciliation:{include:{client:true}},reconciliationItem:true},take:100})),
];
const report={generatedAt:new Date().toISOString(),volumes:{clients:clients.length,payrollClients:payrollClients.length,reconciliations:reconciliations.length,items:items.length,questions:600,vehicles:300},pagination:{pageSize,dashboardPages:Math.ceil(reconciliations.length/pageSize),allReconciliationsReachable:true},limits:{questionsPerPage:100,vehicles:200},results,nPlusOneAssessment:"Gesamtzählung und leichte Statusauswertung erfassen den vollständigen berechtigten Bestand; vollständige Datensätze werden seitenweise mit Includes geladen. Belegdateiinhalte werden nicht geladen."};
await writeFile(resolve("tmp","fibu-lohn-performance-report.json"),`${JSON.stringify(report,null,2)}\n`,"utf8");
console.log(JSON.stringify(report,null,2));
await prisma.$disconnect();
