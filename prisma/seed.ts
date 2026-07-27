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
import {
  createAnnualChecklist,
  createAnnualTaskFromMonthly,
  reviewAnnualTask,
  transitionAnnualChecklist,
  updateAnnualTask,
} from "../lib/annual-checklist-service.ts";
import type { AuthUser } from "../lib/permissions.ts";

const users:ReadonlyArray<{key:string;username:string;fullName:string;password:string;roles:ReadonlyArray<string>;active?:boolean}> = [
  { key:"maria", username:"maria.muster", fullName:"Maria Muster", password:"Test-Maria-2026!", roles:["MITARBEITER","PRUEFER"] },
  { key:"paul", username:"paul.pruefung", fullName:"Paul Prüfung", password:"Test-Paul-2026!", roles:["PRUEFER"] },
  { key:"klara", username:"klara.leitung", fullName:"Klara Leitung", password:"Test-Klara-2026!", roles:["KANZLEILEITUNG","PRUEFER","STANDARDAUFGABEN_VERWALTEN","ORDO_CAMPUS_VERWALTEN"] },
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

const categoryNames=["Allgemein","Bank","Kasse","Darlehen","Kontenabstimmung","Kontonotizen und Dokumentation","Jahresvorbereitung"];
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
  ["MON-DARL-001","Darlehen","Künstliche Darlehensbewegungen abstimmen","Vierteljährlich","Alle","Bilanzierung","Alle","Ja",false],
  ["MON-BIL-001","Kontenabstimmung","Künstliche Bilanzkonten abstimmen","Monatlich","Alle","Bilanzierung","Alle","Alle",true],
  ["MON-EUER-001","Kontonotizen und Dokumentation","Künstliche EÜR-Notizen dokumentieren","Monatlich","Alle","Einnahmenüberschussrechnung","Alle","Alle",true],
] as const;
for(const [index,row] of taskRows.entries()){
  const [taskId,category,title,rhythm,legalForms,profitMethods,cashCondition,loansCondition,mandatory]=row;
  await prisma.standardTask.create({data:{
    taskId,active:true,checklistType:"Monat",categoryId:categories.get(category)!,title,
    workInstruction:`Künstliche Arbeitsanweisung: ${title}.`,reviewInstruction:"Künstliches Ergebnis nachvollziehen.",
    mandatory,rhythm,executionMonth:null,
    executionMonths:rhythm==="Vierteljährlich"?"3;6;9;12":"1;2;3;4;5;6;7;8;9;10;11;12",
    taskArea:rhythm==="Vierteljährlich"?"Quartalsarbeiten":"Laufende Bearbeitung",
    legalFormGroups:legalForms,profitDeterminationMethods:profitMethods,
    cashCondition,payrollCondition:"Alle",fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",
    loansCondition,vatCondition:"Alle",permanentExtensionCondition:"Alle",sortOrder:(index+1)*10,
    professionalVersion:"TEST-2026",internalNote:"Ausschließlich künstliche Testaufgabe.",
  }});
}

const planningExamples = [
  { taskId:"MON-PLAN-QUARTAL", title:"Künstliche quartalsweise Plausibilitätsprüfung", rhythm:"Vierteljährlich", months:"1;4;7;10", area:"Quartalsarbeiten", category:"Allgemein" },
  { taskId:"MON-PLAN-HALBJAHR", title:"Künstliche halbjährliche Überprüfung von Dauerbuchungen", rhythm:"Halbjährlich", months:"1;7", area:"Halbjahresarbeiten", category:"Allgemein" },
  { taskId:"MON-PLAN-JAHR", title:"Künstliche Jahresvorbereitung Rechnungswesen", rhythm:"Jährlich", months:"1", area:"Jahresvorbereitung", category:"Jahresvorbereitung" },
  { taskId:"MON-PLAN-INDIVIDUELL", title:"Künstliche besondere Prüfung", rhythm:"Benutzerdefinierte Monate", months:"3;6;9;12", area:"Sonstige Aufgaben", category:"Allgemein" },
] as const;
for (const [index, item] of planningExamples.entries()) {
  await prisma.standardTask.create({ data: {
    taskId:item.taskId,active:true,checklistType:"Monat",categoryId:categories.get(item.category)!,title:item.title,
    workInstruction:`Künstliche Arbeitsanweisung: ${item.title}.`,reviewInstruction:"Künstliche rhythmische Prüfung nachvollziehen.",
    mandatory:false,rhythm:item.rhythm,executionMonths:item.months,taskArea:item.area,
    legalFormGroups:"Alle",profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Alle",
    fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",
    permanentExtensionCondition:"Alle",sortOrder:100+(index+1)*10,professionalVersion:"RHYTHMUS-TEST-2026",
    internalNote:"Ausschließlich künstliche Testaufgabe für Ausführungsrhythmen.",
  }});
}

const campusSeedRows=[
  ["MON-BANK-001","Abstimmung sämtlicher Bankkonten zum Monatsende.","Sicherstellung der vollständigen Erfassung aller künstlichen Bankbewegungen.","Kontenbewegungen, Salden und künstliche Nachweise nachvollziehen; Differenzen begründet dokumentieren.","Jedes Bankkonto ist mit einem künstlichen Kontoauszug oder Abstimmungsnachweis abzugleichen. Saldo und Nachweis werden nachvollziehbar in der Kontonotiz dokumentiert.","Vollständigkeit, Saldenübereinstimmung und dokumentierte Differenzen prüfen.","Bank nicht vollständig abgestimmt\nKontonotiz oder Abstimmungsnachweis fehlt"],
  ["MON-KASSE-001","Abstimmung des künstlichen Kassenbestands.","Nachvollziehbarer Abgleich von Buchbestand und künstlichem Kassenbestand.","Kassenbewegungen chronologisch prüfen und den Endbestand mit dem künstlichen Nachweis abstimmen.","Der Kassenbestand wird monatlich abgestimmt. Differenzen bleiben niemals ohne verständliche Erläuterung.","Chronologie, Negativbestände und dokumentierte Abstimmung prüfen.","Kassenbestand nicht abgestimmt\nDifferenz ohne Erläuterung"],
  ["MON-BIL-001","Laufende Prüfung künstlicher Bilanzkonten.","Abschlussreife Bilanzkonten bereits unterjährig vorbereiten.","Bilanzkonten anhand künstlicher Nachweise abstimmen und offene Sachverhalte nachhalten.","Abstimmungen und Nachweise werden in einer nachvollziehbaren Kontonotiz dokumentiert oder verlinkt.","Plausibilität der Salden sowie Vollständigkeit der Nachweise prüfen.","Ungeklärter Saldo\nNachweis nicht dokumentiert"],
  ["MON-DARL-001","Abstimmung künstlicher Darlehensverbindlichkeiten.","Vollständige Erfassung von Tilgung, Zins und Restschuld sicherstellen.","Künstlichen Darlehensnachweis mit Buchungen und Restschuld abstimmen.","Darlehen werden mindestens quartalsweise abgestimmt; Abweichungen und Vertragsänderungen werden dokumentiert.","Restschuld, Zinsabgrenzung und Buchungslogik nachvollziehen.","Tilgung falsch zugeordnet\nRestschuld weicht ab"],
  ["MON-EUER-001","Abschließende Prüfung künstlicher Kontonotizen.","Einheitliche und nachvollziehbare Dokumentation des Bearbeitungsstands.","Bebuchte Konten auf erforderliche Erläuterungen und künstliche Nachweislinks prüfen.","Zum Jahresende muss jedes bebuchte Konto mit einer nachvollziehbaren Kontonotiz versehen sein. Mindestens Bearbeitungsjahr, „Konto i. O.“, Bearbeitungsdatum und Bearbeiter werden dokumentiert.","Aussagekraft, Aktualität und Nachweisverknüpfungen prüfen.","Kontonotiz fehlt\nNotiz ist nicht aussagekräftig"],
  ["MON-PLAN-QUARTAL","Künstliche quartalsweise Plausibilitätsprüfung.","Regelmäßige fachliche Auffälligkeiten strukturiert erkennen.","Künstliche Kennzahlen und Abstimmungsergebnisse für den Ausführungsmonat nachvollziehen.","Die quartalsweise Plausibilitätsprüfung wird in den festgelegten Ausführungsmonaten nachvollziehbar dokumentiert.","Prüfumfang, Auffälligkeiten und Folgemaßnahmen nachvollziehen.","Prüfumfang nicht dokumentiert\nAuffälligkeit ohne Folgemaßnahme"],
] as const;
for(const [taskId,shortDescription,objective,processingGuidance,firmStandard,reviewerGuidance,typicalErrors] of campusSeedRows){
 const campusTask=await prisma.standardTask.findUniqueOrThrow({where:{taskId}});
 const campusKnowledge=await prisma.standardTaskKnowledge.create({data:{
  standardTaskId:campusTask.id,status:"Aktiv",shortDescription,objective,processingGuidance,firmStandard,reviewerGuidance,typicalErrors,
  internalHints:"Ausschließlich künstlicher Ordo-Campus-Testinhalt.",
  links:{create:{title:`Künstliche Fachhilfe zu ${taskId}`,url:`https://example.invalid/fachhilfe/${taskId.toLocaleLowerCase("de-DE")}`,linkType:taskId==="MON-BANK-001"?"DATEV Hilfe":"externe Fachquelle",description:"Ausschließlich künstlicher Link ohne fremde Inhalte.",sortOrder:10,active:true}},
 }});
 await prisma.standardTaskKnowledgeHistory.create({data:{knowledgeId:campusKnowledge.id,standardTaskId:campusTask.id,actorUserId:u("klara").id,actorNameSnapshot:u("klara").fullName,changedArea:"Wissen",description:"Künstliches Ordo-Campus-Wissen erstellt."}});
}

type ClientSeed={number:string;name:string;processor:string;reviewer:string;legal:string;profit:string;vat:string};
const clientRows:ClientSeed[]=[
  {number:"10001",name:"Musterpraxis Beispiel",processor:"maria",reviewer:"paul",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Monatlich"},
  {number:"10002",name:"Beispiel Verwaltungs GmbH",processor:"maria",reviewer:"maria",legal:"Kapitalgesellschaft",profit:"Bilanzierung",vat:"Monatlich"},
  {number:"10003",name:"Mustermann Besitz GbR",processor:"maria",reviewer:"klara",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Vierteljährlich"},
  {number:"10004",name:"Künstlicher Mandant ohne aktive Checkliste",processor:"klara",reviewer:"klara",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Keine Voranmeldung"},
  {number:"10005",name:"Künstliches Medizinisches Versorgungszentrum",processor:"max",reviewer:"paul",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Monatlich"},
  {number:"10006",name:"Künstlicher Quartalsmandant",processor:"max",reviewer:"klara",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Vierteljährlich"},
];
const clients=new Map<string,Awaited<ReturnType<typeof prisma.client.create>>>();
for(const row of clientRows){
  const processor=u(row.processor),reviewer=u(row.reviewer),management=u("klara");
  const client=await prisma.client.create({data:{
    clientNumber:row.number,name:row.name,processor:processor.fullName,reviewer:reviewer.fullName,managementName:management.fullName,
    processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,
    cadence:"monatlich",vatFilingPeriod:row.vat,active:true,internalNote:"Ausschließlich künstlicher Testmandant.",
    annualProfiles:{create:[2024,2025,2026].map(calendarYear=>({calendarYear,legalFormGroup:row.legal,profitDeterminationMethod:row.profit,
      hasCashRegister:row.number==="10001",hasPayroll:row.number==="10005",hasFixedAssets:row.profit==="Bilanzierung",
      hasReceivablesPayables:row.profit==="Bilanzierung",hasLoans:row.number==="10002",subjectToVat:true,hasPermanentExtension:false}))},
  }});
  clients.set(row.number,client);
}

await prisma.customClientTask.create({data:{
  clientId:clients.get("10001")!.id,title:"Künstliche monatliche Mandantenaufgabe",description:"Nur für lokale Tests.",
  categoryId:categories.get("Allgemein")!,active:true,taskType:"Wiederkehrend monatlich",validFrom:new Date("2026-01-01T00:00:00Z"),
  processor:"Maria Muster",reviewer:"Paul Prüfung",
}});
await prisma.customClientTask.createMany({data:[
  {
    clientId:clients.get("10005")!.id,title:"Künstliche wiederkehrende MVZ-Abstimmung",description:"Ausschließlich künstliche Abnahmeaufgabe.",
    categoryId:categories.get("Allgemein")!,active:true,taskType:"Wiederkehrend monatlich",validFrom:new Date("2026-01-01T00:00:00Z"),
    executionRhythm:"Monatlich",executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12",taskArea:"Laufende Bearbeitung",
    processor:"Max Beispiel",reviewer:"Paul Prüfung",
  },
  {
    clientId:clients.get("10005")!.id,title:"Künstliche einmalige MVZ-Unterlagenprüfung",description:"Ausschließlich künstliche Abnahmeaufgabe.",
    categoryId:categories.get("Allgemein")!,active:true,taskType:"Einmalig",validFrom:new Date("2026-01-01T00:00:00Z"),
    executionYear:2026,executionMonth:10,processor:"Max Beispiel",reviewer:"Paul Prüfung",
  },
]});

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
await completePeriod(jan10002.id,"Maria Muster","Maria Muster");
const feb10002=await createMonthlyPeriod(clients.get("10002")!.id,2026,2);
await finishMandatory(feb10002.id,"Maria Muster");
await transitionPeriod(feb10002.id,"SUBMIT_REVIEW","Maria Muster");

// 10003: Januar abgeschlossen, Februar Nachbearbeitung mit offenem und erledigtem Prüfpunkt.
const jan10003=await createMonthlyPeriod(clients.get("10003")!.id,2026,1);
await completePeriod(jan10003.id,"Maria Muster","Klara Leitung");
const feb10003=await createMonthlyPeriod(clients.get("10003")!.id,2026,2);
await finishMandatory(feb10003.id,"Maria Muster");
await transitionPeriod(feb10003.id,"SUBMIT_REVIEW","Maria Muster");
await transitionPeriod(feb10003.id,"BEGIN_REVIEW","Klara Leitung");
const reviewTasks=await prisma.checklistTask.findMany({where:{periodId:feb10003.id},take:2,orderBy:{id:"asc"}});
await reviewChecklistTask(reviewTasks[0].id,{reviewStatus:"Rückfrage",reviewerInitials:"Klara Leitung",reviewNote:"Künstliche offene Rückfrage."});
await reviewChecklistTask(reviewTasks[1].id,{reviewStatus:"Beanstandung",reviewerInitials:"Klara Leitung",reviewNote:"Künstliche Beanstandung zur Nachbearbeitung."});
await transitionPeriod(feb10003.id,"RETURN_REWORK","Klara Leitung");
await completeRework(reviewTasks[1].id,{response:"Künstliche Nachbearbeitung wurde erläutert.",actorInitials:"Maria Muster",processingNote:"Künstlich ergänzt."});

const annualCategoryNames=["Abschlussvorbereitung","Bilanz und Bewertung","Anlagevermögen","Forderungen und Verbindlichkeiten","Rückstellungen","Rechnungsabgrenzung","Personal","Steuern","Gesellschaftsrecht","Anhang und Bericht","Offenlegung","Abschlussprüfung","Freigabe und Ausgabe"];
for(const [index,name] of annualCategoryNames.entries()){
  if(!categories.has(name)){const category=await prisma.taskCategory.create({data:{name,description:`Künstliche Jahresabschlusskategorie ${name}.`,sortOrder:200+(index+1)*10,active:true}});categories.set(name,category.id)}
}
const annualTitles=[
 ["Abschlussvorbereitung","Künstliche Abschlussunterlagen vollständig abgrenzen","Alle","Alle","Alle","Alle"],
 ["Abschlussvorbereitung","Künstliche stichtagsbezogene Saldenübernahme prüfen","Alle","Bilanzierung","Alle","Alle"],
 ["Bilanz und Bewertung","Künstliche Bewertungsgrundsätze abschließend dokumentieren","Alle","Bilanzierung","Alle","Alle"],
 ["Bilanz und Bewertung","Künstliche Forderungsbewertung zum Stichtag prüfen","Alle","Bilanzierung","Alle","Alle"],
 ["Forderungen und Verbindlichkeiten","Künstliche Verbindlichkeiten vollständig abgrenzen","Alle","Bilanzierung","Alle","Alle"],
 ["Rückstellungen","Künstlichen Rückstellungsbedarf abschließend beurteilen","Alle","Bilanzierung","Alle","Alle"],
 ["Rechnungsabgrenzung","Künstliche Rechnungsabgrenzung zum Stichtag prüfen","Alle","Bilanzierung","Alle","Alle"],
 ["Anlagevermögen","Künstliche Jahresabschreibungen abschließend prüfen","Alle","Bilanzierung","Ja","Alle"],
 ["Anlagevermögen","Künstliche Anlagenabgänge zum Stichtag beurteilen","Alle","Alle","Ja","Alle"],
 ["Personal","Künstliche Arbeitnehmeranzahl zum Stichtag dokumentieren","Alle","Alle","Alle","Ja"],
 ["Steuern","Künstliche steuerliche Abschlussunterlagen abstimmen","Alle","Alle","Alle","Alle"],
 ["Steuern","Künstliche Abschlusssteuern plausibilisieren","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Gesellschaftsrecht","Künstliche Gesellschafterbeschlüsse prüfen","Kapitalgesellschaft;Personengesellschaft","Bilanzierung","Alle","Alle"],
 ["Gesellschaftsrecht","Künstliche Ergebnisverwendung dokumentieren","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Anhang und Bericht","Künstliche Anhangangaben vollständig prüfen","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Anhang und Bericht","Künstlichen Lageberichtsumfang beurteilen","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Offenlegung","Künstliche Offenlegungsunterlagen vorbereiten","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Offenlegung","Künstliche Offenlegungsfristen dokumentieren","Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
 ["Abschlussprüfung","Künstliche Abschlussplausibilität abschließend beurteilen","Alle","Alle","Alle","Alle"],
 ["Freigabe und Ausgabe","Künstliche finale Abschlussformulare zusammenstellen","Alle","Alle","Alle","Alle"],
 ["Abschlussvorbereitung","Künstliche EÜR-Abschlussabgrenzung prüfen","Einzelunternehmen;Personengesellschaft","Einnahmenüberschussrechnung","Alle","Alle"],
 ["Steuern","Künstliche EÜR-Anlagen abschließend abstimmen","Alle","Einnahmenüberschussrechnung","Alle","Alle"],
 ["Bilanz und Bewertung","Künstliche Darlehensstände zum Stichtag bestätigen","Alle","Bilanzierung","Alle","Alle"],
 ["Gesellschaftsrecht","Künstliche Gesellschafterverrechnung beurteilen","Personengesellschaft;Kapitalgesellschaft","Bilanzierung","Alle","Alle"],
] as const;
for(const [index,[category,title,legal,profit,fixed,payroll]] of annualTitles.entries())await prisma.standardTask.create({data:{
 taskId:`JA-TEST-${String(index+1).padStart(3,"0")}`,active:true,checklistType:"Jahresabschluss",categoryId:categories.get(category)!,title,
 workInstruction:`Künstliche Arbeitsanweisung: ${title}.`,reviewInstruction:"Künstliche stichtagsbezogene Prüfung nachvollziehen.",mandatory:index<8,
 rhythm:"Jährlich",legalFormGroups:legal,profitDeterminationMethods:profit,cashCondition:"Alle",payrollCondition:payroll,fixedAssetsCondition:fixed,
 receivablesPayablesCondition:"Alle",loansCondition:index===22?"Ja":"Alle",vatCondition:"Alle",permanentExtensionCondition:"Alle",
 sortOrder:(index+1)*10,professionalVersion:"JA-TEST-2026",internalNote:"Ausschließlich künstliche Jahresabschlussaufgabe.",
}});
const annualCampusTask=await prisma.standardTask.findUniqueOrThrow({where:{taskId:"JA-TEST-001"}});
const annualCampusKnowledge=await prisma.standardTaskKnowledge.create({data:{
 standardTaskId:annualCampusTask.id,status:"Aktiv",
 shortDescription:"Künstlicher Überblick zur Abschlussvorbereitung.",
 objective:"Künstliches Ziel: stichtagsbezogene Unterlagen nachvollziehbar vorbereiten.",
 processingGuidance:"1. Künstliche Unterlagenliste prüfen.\n2. Fehlende künstliche Nachweise dokumentieren.",
 firmStandard:"**Verbindlicher künstlicher Standard:** Die Abschlussvorbereitung wird vollständig und nachvollziehbar dokumentiert.",
 reviewerGuidance:"Künstliche Vollständigkeit und Plausibilität der Vorbereitung prüfen.",
 typicalErrors:"- Künstlicher Nachweis fehlt\n- Künstliche Dokumentation ist unvollständig",
 internalHints:"Ausschließlich künstlicher Ordo-Campus-Testinhalt.",
 links:{create:{title:"Künstliche Jahresabschluss-Fachhilfe",url:"https://example.invalid/jahresabschluss-hilfe",linkType:"externe Fachquelle",description:"Nur künstliche Linkmetadaten für lokale Tests.",sortOrder:10,active:true}},
}});
await prisma.standardTaskKnowledgeHistory.create({data:{knowledgeId:annualCampusKnowledge.id,standardTaskId:annualCampusTask.id,actorUserId:u("klara").id,actorNameSnapshot:u("klara").fullName,changedArea:"Wissen",description:"Künstliches Jahresabschlusswissen erstellt."}});

await prisma.customAnnualTask.create({data:{clientId:clients.get("10001")!.id,title:"Künstliche mandantenspezifische Jahresabschlussvorlage",description:"Nur für lokale Tests.",category:"Abschlussvorbereitung",validFromYear:2025,mandatory:false,sortOrder:900}});
const authUser=async(key:string):Promise<AuthUser>=>{const user=await prisma.user.findUniqueOrThrow({where:{id:u(key).id},include:{roles:true}});return{id:user.id,fullName:user.fullName,username:user.username,active:user.active,mustChangePassword:user.mustChangePassword,roles:user.roles.map(role=>role.role) as AuthUser["roles"]}};
const maria=await authUser("maria"),paul=await authUser("paul"),klara=await authUser("klara");
async function finishAnnualMandatory(checklistId:number,user:AuthUser){const tasks=await prisma.annualChecklistTask.findMany({where:{annualChecklistId:checklistId,mandatorySnapshot:true}});for(const task of tasks)await updateAnnualTask(task.id,{status:"Erledigt",processingNote:"Künstlich abschließend bearbeitet.",notApplicableReason:""},user)}
async function advanceToReview(checklistId:number,processor:AuthUser){await finishAnnualMandatory(checklistId,processor);const item=await prisma.annualChecklist.findUniqueOrThrow({where:{id:checklistId}});if(item.status==="Offen")await transitionAnnualChecklist(checklistId,"BEGIN",processor);await transitionAnnualChecklist(checklistId,"SUBMIT_REVIEW",processor)}
async function closeAnnualReview(checklistId:number,reviewer:AuthUser){await transitionAnnualChecklist(checklistId,"BEGIN_REVIEW",reviewer);const tasks=await prisma.annualChecklistTask.findMany({where:{annualChecklistId:checklistId}});for(const task of tasks)await reviewAnnualTask(task.id,{reviewStatus:"In Ordnung",reviewNote:"Künstlich geprüft."},reviewer);await transitionAnnualChecklist(checklistId,"PROFESSIONAL_COMPLETE",reviewer)}

const annual10001=await createAnnualChecklist(clients.get("10001")!.id,2025,maria);await transitionAnnualChecklist(annual10001.id,"BEGIN",maria);
const annual10001Current=await createAnnualChecklist(clients.get("10001")!.id,2026,maria);await createAnnualTaskFromMonthly(annual10001Current.id,transferSource.id,paul);
const annual10002=await createAnnualChecklist(clients.get("10002")!.id,2025,maria);await advanceToReview(annual10002.id,maria);
const annual10003=await createAnnualChecklist(clients.get("10003")!.id,2025,maria);await advanceToReview(annual10003.id,maria);await closeAnnualReview(annual10003.id,klara);await transitionAnnualChecklist(annual10003.id,"SUBMIT_RELEASE",klara);
const annual10004=await createAnnualChecklist(clients.get("10004")!.id,2025,klara);await advanceToReview(annual10004.id,klara);await transitionAnnualChecklist(annual10004.id,"BEGIN_REVIEW",klara);const annualIssue=await prisma.annualChecklistTask.findFirstOrThrow({where:{annualChecklistId:annual10004.id}});await reviewAnnualTask(annualIssue.id,{reviewStatus:"Rückfrage",reviewNote:"Künstliche Rückfrage zum Jahresabschluss."},klara);await transitionAnnualChecklist(annual10004.id,"RETURN_REWORK",klara);
const annualOlder=await createAnnualChecklist(clients.get("10004")!.id,2024,klara);await advanceToReview(annualOlder.id,klara);await closeAnnualReview(annualOlder.id,klara);await transitionAnnualChecklist(annualOlder.id,"SUBMIT_RELEASE",klara);await transitionAnnualChecklist(annualOlder.id,"RELEASE",klara,"Künstliche Freigabe eines älteren Abschlusses.");

await validateSeedConsistency(prisma);
await prisma.$disconnect();
console.log("Deterministische künstliche Testdaten wurden konsistent angelegt.");
