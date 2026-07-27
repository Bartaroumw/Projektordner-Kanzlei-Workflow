import { prisma } from "../lib/prisma.ts";
import { hashPassword } from "../lib/password.ts";
import {
  completeRework,
  createMonthlyPeriod,
  reviewChecklistTask,
  transferChecklistTask,
  transitionPeriod,
  updateChecklistTask,
} from "../lib/monthly-checklist-service.ts";
import { validateSeedConsistency } from "../lib/seed-consistency.ts";

const users:ReadonlyArray<{key:string;username:string;fullName:string;password:string;roles:ReadonlyArray<string>;active?:boolean}> = [
  { key:"maria", username:"maria.muster", fullName:"Maria Muster", password:"Test-Maria-2026!", roles:["MITARBEITER"] },
  { key:"paul", username:"paul.pruefung", fullName:"Paul Prüfung", password:"Test-Paul-2026!", roles:["PRUEFER"] },
  { key:"klara", username:"klara.leitung", fullName:"Klara Leitung", password:"Test-Klara-2026!", roles:["KANZLEILEITUNG","PRUEFER","STANDARDAUFGABEN_VERWALTEN"] },
  { key:"anton", username:"anton.admin", fullName:"Anton Administration", password:"Test-Anton-2026!", roles:["ADMINISTRATOR"] },
  { key:"max", username:"max.beispiel", fullName:"Max Beispiel", password:"Test-Max-2026!", roles:["MITARBEITER"] },
  { key:"nina", username:"nina.test", fullName:"Nina Testkonto", password:"Test-Nina-2026!", roles:["MITARBEITER"], active:false },
];

const userMap = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();
for (const item of users) {
  const user=await prisma.user.create({data:{
    username:item.username,fullName:item.fullName,passwordHash:await hashPassword(item.password),
    active:item.active??true,mustChangePassword:false,shortLabel:item.fullName.split(" ").map(part=>part[0]).join(""),
    roles:{create:item.roles.map(role=>({role}))},
  }});
  userMap.set(item.key,user);
}
const u=(key:string)=>userMap.get(key)!;

const categoryNames=["Allgemein","Bank","Kasse","Darlehen","Kontenabstimmung","Kontonotizen und Dokumentation"];
const categories=new Map<string,number>();
for(const [index,name] of categoryNames.entries()){
  const category=await prisma.taskCategory.create({data:{name,description:`Künstliche Beispielkategorie ${name}.`,sortOrder:(index+1)*10,active:true}});
  categories.set(name,category.id);
}

const taskRows=[
  ["MON-ALLG-001","Allgemein","Künstliche Unterlagenvollständigkeit prüfen","Monatlich","Alle","Alle","Alle","Alle",true],
  ["MON-ALLG-002","Allgemein","Künstliche offene Punkte nachhalten","Monatlich","Alle","Alle","Alle","Alle",true],
  ["MON-BANK-001","Bank","Künstliche Bankkonten abstimmen","Monatlich","Alle","Alle","Alle","Alle",true],
  ["MON-KASSE-001","Kasse","Künstlichen Kassenbestand abstimmen","Monatlich","Alle","Alle","Ja","Alle",false],
  ["MON-DARL-001","Darlehen","Künstliche Darlehensbewegungen abstimmen","Quartalsweise","Alle","Bilanzierung","Alle","Ja",false],
  ["MON-BIL-001","Kontenabstimmung","Künstliche Bilanzkonten abstimmen","Monatlich","Alle","Bilanzierung","Alle","Alle",true],
  ["MON-EUER-001","Kontonotizen und Dokumentation","Künstliche EÜR-Notizen dokumentieren","Monatlich","Alle","Einnahmenüberschussrechnung","Alle","Alle",true],
] as const;
for(const [index,row] of taskRows.entries()){
  const [taskId,category,title,rhythm,legalForms,profitMethods,cashCondition,loansCondition,mandatory]=row;
  await prisma.standardTask.create({data:{
    taskId,active:true,checklistType:"Monat",categoryId:categories.get(category)!,title,
    workInstruction:`Künstliche Arbeitsanweisung: ${title}.`,reviewInstruction:"Künstliches Ergebnis nachvollziehen.",
    mandatory,rhythm,executionMonth:null,legalFormGroups:legalForms,profitDeterminationMethods:profitMethods,
    cashCondition,payrollCondition:"Alle",fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",
    loansCondition,vatCondition:"Alle",permanentExtensionCondition:"Alle",sortOrder:(index+1)*10,
    professionalVersion:"TEST-2026",internalNote:"Ausschließlich künstliche Testaufgabe.",
  }});
}

type ClientSeed={number:string;name:string;processor:string;reviewer:string;legal:string;profit:string;vat:string};
const clientRows:ClientSeed[]=[
  {number:"10001",name:"Musterpraxis Beispiel",processor:"maria",reviewer:"paul",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Monatlich"},
  {number:"10002",name:"Beispiel Verwaltungs GmbH",processor:"maria",reviewer:"klara",legal:"Kapitalgesellschaft",profit:"Bilanzierung",vat:"Monatlich"},
  {number:"10003",name:"Mustermann Besitz GbR",processor:"max",reviewer:"paul",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Vierteljährlich"},
  {number:"10004",name:"Künstlicher Mandant ohne aktive Checkliste",processor:"maria",reviewer:"paul",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Keine Voranmeldung"},
];
const clients=new Map<string,Awaited<ReturnType<typeof prisma.client.create>>>();
for(const row of clientRows){
  const processor=u(row.processor),reviewer=u(row.reviewer),management=u("klara");
  const client=await prisma.client.create({data:{
    clientNumber:row.number,name:row.name,processor:processor.fullName,reviewer:reviewer.fullName,managementName:management.fullName,
    processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,
    cadence:"monatlich",vatFilingPeriod:row.vat,active:true,internalNote:"Ausschließlich künstlicher Testmandant.",
    annualProfiles:{create:{calendarYear:2026,legalFormGroup:row.legal,profitDeterminationMethod:row.profit,
      hasCashRegister:row.number==="10001",hasPayroll:false,hasFixedAssets:row.profit==="Bilanzierung",
      hasReceivablesPayables:row.profit==="Bilanzierung",hasLoans:row.number==="10002",subjectToVat:true,hasPermanentExtension:false}},
  }});
  clients.set(row.number,client);
}

await prisma.customClientTask.create({data:{
  clientId:clients.get("10001")!.id,title:"Künstliche monatliche Mandantenaufgabe",description:"Nur für lokale Tests.",
  categoryId:categories.get("Allgemein")!,active:true,taskType:"Wiederkehrend monatlich",validFrom:new Date("2026-01-01T00:00:00Z"),
  processor:"Maria Muster",reviewer:"Paul Prüfung",
}});

async function finishMandatory(periodId:number,actor:string){
  const tasks=await prisma.checklistTask.findMany({where:{periodId}});
  for(const task of tasks.filter(task=>task.mandatorySnapshot))await updateChecklistTask(task.id,{status:"Erledigt",processingNote:"Künstlich vollständig bearbeitet.",processorInitials:actor,notApplicableReason:""});
}
async function completePeriod(periodId:number,processor:string,reviewer:string){
  await finishMandatory(periodId,processor);
  const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(period.processingStatus==="Offen")await transitionPeriod(periodId,"BEGIN_PROCESSING",processor);
  await transitionPeriod(periodId,"SUBMIT_REVIEW",processor);
  await transitionPeriod(periodId,"BEGIN_REVIEW",reviewer);
  await transitionPeriod(periodId,"COMPLETE_REVIEW",reviewer);
}

// 10001: Januar mit Übertrag abschließen, Februar in Bearbeitung.
const jan10001=await createMonthlyPeriod(clients.get("10001")!.id,2026,1);
const transferSource=await prisma.checklistTask.findFirstOrThrow({where:{periodId:jan10001.id}});
await transferChecklistTask(transferSource.id,{reason:"Künstliche Unterlage folgt im Februar.",actorName:"Maria Muster",targetYear:2026,targetMonth:2,expectedAction:"Künstliche Unterlage prüfen."});
await completePeriod(jan10001.id,"Maria Muster","Paul Prüfung");
const feb10001=await createMonthlyPeriod(clients.get("10001")!.id,2026,2);
const first10001=await prisma.checklistTask.findFirstOrThrow({where:{periodId:feb10001.id}});
await updateChecklistTask(first10001.id,{status:"In Bearbeitung",processingNote:"Künstliche laufende Bearbeitung.",processorInitials:"Maria Muster",notApplicableReason:""});

// 10002: Januar abgeschlossen, Februar zur Prüfung.
const jan10002=await createMonthlyPeriod(clients.get("10002")!.id,2026,1);
await completePeriod(jan10002.id,"Maria Muster","Klara Leitung");
const feb10002=await createMonthlyPeriod(clients.get("10002")!.id,2026,2);
await finishMandatory(feb10002.id,"Maria Muster");
await transitionPeriod(feb10002.id,"SUBMIT_REVIEW","Maria Muster");

// 10003: Januar abgeschlossen, Februar Nachbearbeitung mit offenem und erledigtem Prüfpunkt.
const jan10003=await createMonthlyPeriod(clients.get("10003")!.id,2026,1);
await completePeriod(jan10003.id,"Max Beispiel","Paul Prüfung");
const feb10003=await createMonthlyPeriod(clients.get("10003")!.id,2026,2);
await finishMandatory(feb10003.id,"Max Beispiel");
await transitionPeriod(feb10003.id,"SUBMIT_REVIEW","Max Beispiel");
await transitionPeriod(feb10003.id,"BEGIN_REVIEW","Paul Prüfung");
const reviewTasks=await prisma.checklistTask.findMany({where:{periodId:feb10003.id},take:2,orderBy:{id:"asc"}});
await reviewChecklistTask(reviewTasks[0].id,{reviewStatus:"Rückfrage",reviewerInitials:"Paul Prüfung",reviewNote:"Künstliche offene Rückfrage."});
await reviewChecklistTask(reviewTasks[1].id,{reviewStatus:"Beanstandung",reviewerInitials:"Paul Prüfung",reviewNote:"Künstliche Beanstandung zur Nachbearbeitung."});
await transitionPeriod(feb10003.id,"RETURN_REWORK","Paul Prüfung");
await completeRework(reviewTasks[1].id,{response:"Künstliche Nachbearbeitung wurde erläutert.",actorInitials:"Max Beispiel",processingNote:"Künstlich ergänzt."});

await validateSeedConsistency(prisma);
await prisma.$disconnect();
console.log("Deterministische künstliche Testdaten wurden konsistent angelegt.");
