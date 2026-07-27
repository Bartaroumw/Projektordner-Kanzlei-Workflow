import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.ts";
import { hashPassword } from "../lib/password.ts";
import { createMonthlyPeriod, reviewChecklistTask, transitionPeriod, updateChecklistTask } from "../lib/monthly-checklist-service.ts";
import { createAnnualChecklist, reviewAnnualTask, transitionAnnualChecklist, updateAnnualTask } from "../lib/annual-checklist-service.ts";
import type { AuthUser } from "../lib/permissions.ts";

const campusPath = resolve(process.env.ORDO_CAMPUS_STORAGE_PATH ?? "tmp/workflow-test-campus");
await mkdir(campusPath, { recursive: true });
await writeFile(resolve(campusPath, "README.txt"), "Ausschließlich künstlicher Workflow-Testbestand.\n");

const current = berlinMonth();
const previous = addMonths(current, -1);
const twoMonthsAgo = addMonths(current, -2);
const lastQuarter = latestMonthOnOrBefore(previous, [3, 6, 9, 12]);
const january = { year: current.month === 1 ? current.year - 1 : current.year, month: 1 };
const fiscalYear = previous.year - 1;

const definitions = [
  ["anna", "anna.bearbeiter", "Anna Bearbeiter", ["MITARBEITER"]],
  ["peter", "peter.pruefer", "Peter Prüfer", ["PRUEFER"]],
  ["maria", "maria.kombiniert", "Maria Kombiniert", ["MITARBEITER", "PRUEFER", "KANZLEILEITUNG"]],
  ["klaus", "klaus.leitung", "Klaus Leitung", ["KANZLEILEITUNG", "PRUEFER"]],
  ["admin", "admin.test", "Admin Test", ["ADMINISTRATOR"]],
  ["campus", "campus.verantwortlich", "Campus Verantwortlich", ["MITARBEITER", "PRUEFER", "ORDO_CAMPUS_VERWALTEN", "STANDARDAUFGABEN_VERWALTEN"]],
] as const;
const users = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();
for (const [key, username, fullName, roles] of definitions) {
  const user = await prisma.user.create({ data: {
    username, fullName, passwordHash: await hashPassword(`Workflow-${key}-2026!`),
    active: true, mustChangePassword: false,
    roles: { create: roles.map((role) => ({ role })) },
  } });
  users.set(key, user);
}
const u = (key:string) => users.get(key)!;
const auth = (key:string):AuthUser => {
  const definition = definitions.find(([candidate]) => candidate === key)!;
  const user = u(key);
  return { id:user.id, fullName:user.fullName, username:user.username, active:true, mustChangePassword:false, roles:[...definition[3]] };
};

const general = await prisma.taskCategory.create({ data: { name:"Laufende Bearbeitung", description:"Künstliche Workflow-Testkategorie.", sortOrder:10, active:true } });
const bank = await prisma.taskCategory.create({ data: { name:"Bank und Zahlungsverkehr", description:"Künstliche Abstimmungsbeispiele.", sortOrder:20, active:true } });
const assets = await prisma.taskCategory.create({ data: { name:"Anlagevermögen", description:"Künstliche Anlagenbuchführungsbeispiele.", sortOrder:30, active:true } });
const taxes = await prisma.taskCategory.create({ data: { name:"Steuern und Meldungen", description:"Künstliche Steuer- und Meldebeispiele.", sortOrder:40, active:true } });
const documentation = await prisma.taskCategory.create({ data: { name:"Dokumentation und Qualität", description:"Künstliche Dokumentationsbeispiele.", sortOrder:50, active:true } });
const annualPreparation = await prisma.taskCategory.create({ data: { name:"Abschlussvorbereitung", description:"Künstliche Abschlussvorbereitung.", sortOrder:60, active:true } });
const annualValuation = await prisma.taskCategory.create({ data: { name:"Bilanz und Bewertung", description:"Künstliche Bewertungsbeispiele.", sortOrder:70, active:true } });
const annualCategory = await prisma.taskCategory.create({ data: { name:"Abschlussprüfung und Freigabe", description:"Künstliche Jahresabschluss-Testkategorie.", sortOrder:80, active:true } });
const taskDefaults = {
  active:true, legalFormGroups:"Alle", profitDeterminationMethods:"Alle", cashCondition:"Alle", payrollCondition:"Alle",
  fixedAssetsCondition:"Alle", receivablesPayablesCondition:"Alle", loansCondition:"Alle", vatCondition:"Alle",
  permanentExtensionCondition:"Alle", professionalVersion:"WORKFLOW-TEST", internalNote:"Ausschließlich künstlich.",
};
await prisma.standardTask.createMany({ data: [
  { ...taskDefaults, taskId:"WF-MON-001", checklistType:"Monat", categoryId:general.id, title:"Künstliche Pflichtabstimmung", workInstruction:"Künstlichen Sachverhalt nachvollziehen.", reviewInstruction:"Künstliche Bearbeitung prüfen.", mandatory:true, rhythm:"Monatlich", executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12", taskArea:"Laufende Bearbeitung", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-MON-002", checklistType:"Monat", categoryId:general.id, title:"Künstliche optionale Dokumentation", mandatory:false, rhythm:"Monatlich", executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12", taskArea:"Laufende Bearbeitung", sortOrder:20 },
  { ...taskDefaults, taskId:"WF-BANK-001", checklistType:"Monat", categoryId:bank.id, title:"Künstliche Bankkonten abstimmen", workInstruction:"Alle künstlichen Bankkonten mit den Beispielauszügen abstimmen und Differenzen dokumentieren.", reviewInstruction:"Vollständigkeit, Salden und dokumentierte Differenzen nachvollziehen.", mandatory:true, rhythm:"Monatlich", executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12", taskArea:"Laufende Bearbeitung", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-QUARTAL", checklistType:"Monat", categoryId:documentation.id, title:"Künstliche quartalsweise Plausibilitätsprüfung", workInstruction:"Künstliche Kennzahlen mit dem Vorquartal vergleichen und Auffälligkeiten kommentieren.", reviewInstruction:"Vergleichsgrundlage und Folgemaßnahmen prüfen.", mandatory:false, rhythm:"Vierteljährlich", executionMonths:"3;6;9;12", taskArea:"Quartalsarbeiten", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-HALBJAHR", checklistType:"Monat", categoryId:documentation.id, title:"Künstliche halbjährliche Dauerbuchungskontrolle", mandatory:false, rhythm:"Halbjährlich", executionMonths:"1;7", taskArea:"Halbjahresarbeiten", sortOrder:20 },
  { ...taskDefaults, taskId:"WF-CUSTOM", checklistType:"Monat", categoryId:taxes.id, title:"Künstliche Prüfung in individuellen Meldemonaten", mandatory:false, rhythm:"Benutzerdefinierte Monate", executionMonths:"3;6;9;12", taskArea:"Sonstige Aufgaben", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-JANUAR", checklistType:"Monat", categoryId:annualPreparation.id, title:"Künstliche Jahresvorbereitung Januar", workInstruction:"Künstliche Dauerbuchungen, Stammdaten und Vorjahreshinweise prüfen.", mandatory:false, rhythm:"Jährlich", executionMonths:"1", taskArea:"Jahresvorbereitung", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-DEZEMBER", checklistType:"Monat", categoryId:documentation.id, title:"Künstliche Jahresenddokumentation vorbereiten", mandatory:false, rhythm:"Jährlich", executionMonths:"12", taskArea:"Jahresendarbeiten", sortOrder:30 },
  { ...taskDefaults, taskId:"WF-ANLAGE-001", checklistType:"Monat", categoryId:assets.id, title:"Künstliche Anlagenzugänge dokumentieren", mandatory:false, rhythm:"Monatlich", executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12", taskArea:"Laufende Bearbeitung", fixedAssetsCondition:"Ja", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-LOHN-001", checklistType:"Monat", categoryId:general.id, title:"Künstliche Lohnverrechnung abstimmen", mandatory:false, rhythm:"Monatlich", executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12", taskArea:"Laufende Bearbeitung", payrollCondition:"Ja", sortOrder:30 },
  { ...taskDefaults, taskId:"WF-JA-001", checklistType:"Jahresabschluss", categoryId:annualCategory.id, title:"Künstliche Jahresabschluss-Pflichtprüfung", workInstruction:"Künstlichen Abschluss auf Vollständigkeit und Plausibilität prüfen.", reviewInstruction:"Künstliches Ergebnis und dokumentierte Nachweise nachvollziehen.", mandatory:true, rhythm:"Jährlich", executionMonths:"12", taskArea:"Abschlussprüfung", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-JA-RUECK", checklistType:"Jahresabschluss", categoryId:annualValuation.id, title:"Künstliche Rückstellungsprüfung", workInstruction:"Künstliche Sachverhalte auf mögliche Rückstellungen untersuchen.", reviewInstruction:"Ansatz, Bewertung und Dokumentation nachvollziehen.", mandatory:false, rhythm:"Jährlich", executionMonths:"12", taskArea:"Bilanz und Bewertung", profitDeterminationMethods:"Bilanzierung", sortOrder:10 },
  { ...taskDefaults, taskId:"WF-JA-FORD", checklistType:"Jahresabschluss", categoryId:annualValuation.id, title:"Künstliche Forderungsbewertung", workInstruction:"Künstliche Forderungen hinsichtlich Werthaltigkeit beurteilen.", reviewInstruction:"Einzelrisiken und Wertberichtigungen prüfen.", mandatory:false, rhythm:"Jährlich", executionMonths:"12", taskArea:"Bilanz und Bewertung", receivablesPayablesCondition:"Ja", sortOrder:20 },
  { ...taskDefaults, taskId:"WF-JA-ANLAGE", checklistType:"Jahresabschluss", categoryId:assets.id, title:"Künstliche abschließende Anlagenprüfung", workInstruction:"Künstliche Anlagenbewegungen und Abschreibungen abschließend würdigen.", mandatory:false, rhythm:"Jährlich", executionMonths:"12", taskArea:"Abschlussprüfung", fixedAssetsCondition:"Ja", sortOrder:20 },
  { ...taskDefaults, taskId:"WF-JA-EUER", checklistType:"Jahresabschluss", categoryId:annualCategory.id, title:"Künstliche EÜR-Abschlusskontrolle", workInstruction:"Künstliche Betriebseinnahmen und Betriebsausgaben abschließend plausibilisieren.", mandatory:false, rhythm:"Jährlich", executionMonths:"12", taskArea:"Abschlussprüfung", profitDeterminationMethods:"Einnahmenüberschussrechnung", sortOrder:30 },
] });
const campusExamples = [
  {
    taskId:"WF-BANK-001", status:"Aktiv", shortDescription:"Abstimmung sämtlicher künstlicher Bankkonten zum Monatsende.",
    objective:"Sicherstellen, dass alle künstlichen Bankbewegungen vollständig und im richtigen Monat erfasst wurden.",
    processingGuidance:"1. Beispielauszüge vollständig abgleichen.\n2. Endsalden mit den Sachkonten vergleichen.\n3. Differenzen in einer Kontonotiz erläutern.\n4. Künstlichen Abstimmungsnachweis verlinken.",
    firmStandard:"Jedes Bankkonto wird monatlich abgestimmt. Saldo, Abstimmungsdatum und Bearbeiter werden in der Kontonotiz dokumentiert. Ungeklärte Differenzen bleiben nicht ohne Verantwortlichkeit und nächsten Bearbeitungsschritt.",
    reviewerGuidance:"Vollständigkeit der Konten, Saldenübereinstimmung und Nachvollziehbarkeit offener Differenzen prüfen.",
    typicalErrors:"Bankkonto übersehen\nAbstimmungsdatum fehlt\nSaldo nur fortgeschrieben\nDifferenz ohne Folgemaßnahme",
    internalHints:"Die Beispiele enthalten ausschließlich künstliche Konten und Nachweise.",
    links:[
      ["Künstliche DATEV-Hilfe zur Bankabstimmung","DATEV Hilfe","https://example.invalid/datev-hilfe-bank","Beispiel für einen extern gepflegten DATEV-Hilfelink."],
      ["Künstliches Lernvideo Bankabstimmung","DATEV Lernvideo","https://example.invalid/lernvideo-bank","Beispiel für eine Lernressource."],
    ],
  },
  {
    taskId:"WF-QUARTAL", status:"Aktiv", shortDescription:"Quartalsweiser Blick auf künstliche Kennzahlen und Auffälligkeiten.",
    objective:"Ungewöhnliche Entwicklungen früh erkennen und nachvollziehbar bearbeiten.",
    processingGuidance:"Umsatz, Kostenarten und ausgewählte Bilanzpositionen mit Vorquartal und künstlichem Erwartungswert vergleichen. Wesentliche Abweichungen kommentieren.",
    firmStandard:"Die verwendete Vergleichsgrundlage, festgestellte Auffälligkeiten und vereinbarte Folgemaßnahmen werden nachvollziehbar dokumentiert.",
    reviewerGuidance:"Prüfen, ob alle festgelegten Kennzahlen berücksichtigt und Auffälligkeiten fachlich plausibel beantwortet wurden.",
    typicalErrors:"Vergleichszeitraum nicht genannt\nAuffälligkeit ohne Erklärung\nFolgemaßnahme ohne Verantwortlichen",
    internalHints:"Das Beispiel zeigt Wissen zu einer rhythmisch ausgeführten Aufgabe.",
    links:[["Künstliche interne Arbeitshilfe Plausibilität","interne Wissensseite","https://example.invalid/intern/plausibilitaet","Beispiel einer internen Wissensseite."]],
  },
  {
    taskId:"WF-JANUAR", status:"Aktiv", shortDescription:"Vorbereitung des neuen Rechnungswesensjahres anhand künstlicher Stammdaten.",
    objective:"Wiederkehrende Einstellungen und Vorjahreshinweise kontrolliert in das neue Jahr übernehmen.",
    processingGuidance:"Dauerbuchungen prüfen, künstliche Stammdaten abgleichen und offene Vorjahreshinweise mit Verantwortlichkeit dokumentieren.",
    firmStandard:"Vorjahreseinstellungen werden nicht ungeprüft übernommen. Jede Änderung und jede bewusst unveränderte wesentliche Einstellung wird kurz dokumentiert.",
    reviewerGuidance:"Stichprobenartig Übernahme, Aktualität und dokumentierte Entscheidungen prüfen.",
    typicalErrors:"Dauerbuchung ungeprüft übernommen\nveraltete Stammdaten\nVorjahreshinweis nicht zugeordnet",
    internalHints:"Jährliche Rechnungswesenaufgabe, keine Jahresabschlussaufgabe.",
    links:[["Künstliche Checkhilfe Jahreswechsel","sonstiger Link","https://example.invalid/jahreswechsel","Beispiel einer ergänzenden Arbeitshilfe."]],
  },
  {
    taskId:"WF-JA-001", status:"Aktiv", shortDescription:"Abschließende künstliche Vollständigkeits- und Plausibilitätskontrolle.",
    objective:"Dokumentieren, dass der künstliche Abschluss fachlich bearbeitet und prüfbar vorbereitet ist.",
    processingGuidance:"Offene Punkte, Abschlussbuchungen, Nachweise und Hinweise strukturiert zusammenstellen.",
    firmStandard:"Der fachliche Abschluss setzt nachvollziehbare Bearbeitungsnachweise, erledigte Pflichtaufgaben und dokumentierte Besonderheiten voraus.",
    reviewerGuidance:"Prüfungsschwerpunkte, wesentliche Ermessensentscheidungen und offene Risiken nachvollziehen.",
    typicalErrors:"Abschlussbuchung ohne Nachweis\nBesonderheit nicht dokumentiert\nPrüfungsschwerpunkt fehlt",
    internalHints:"Dieses Wissen ist auch in bereits erzeugten Checklisten aktuell sichtbar, weil es zentral an der Standardaufgabe liegt.",
    links:[
      ["Künstliches Gesetzesbeispiel","Gesetz","https://www.gesetze-im-internet.de/","Beispiel für eine externe Gesetzesquelle."],
      ["Künstliche externe Fachquelle","externe Fachquelle","https://example.invalid/fachquelle-abschluss","Beispiel für einen Fachlink."],
    ],
  },
  {
    taskId:"WF-HALBJAHR", status:"Entwurf", shortDescription:"Entwurf eines halbjährlichen Wissenseintrags.",
    objective:"Zeigen, dass Campus-Wissen zunächst als Entwurf gepflegt werden kann.",
    processingGuidance:"Künstliche Dauerbuchungen anhand einer vorbereiteten Liste prüfen.",
    firmStandard:"Entwurfsinhalt – noch nicht als verbindlicher Kanzleistandard aktiviert.",
    reviewerGuidance:"Entwurf auf Verständlichkeit und Prüfbarkeit beurteilen.",
    typicalErrors:"Prüfumfang unklar",
    internalHints:"Dieser Eintrag ist regulären Benutzern nicht sichtbar.",
    links:[],
  },
] as const;
for (const example of campusExamples) {
  const standardTask=await prisma.standardTask.findUniqueOrThrow({where:{taskId:example.taskId}});
  const knowledge=await prisma.standardTaskKnowledge.create({data:{
    standardTaskId:standardTask.id,status:example.status,shortDescription:example.shortDescription,objective:example.objective,
    processingGuidance:example.processingGuidance,firmStandard:example.firmStandard,reviewerGuidance:example.reviewerGuidance,
    typicalErrors:example.typicalErrors,internalHints:example.internalHints,
    links:{create:example.links.map(([title,linkType,url,description],index)=>({title,linkType,url,description,sortOrder:(index+1)*10,active:true}))},
  }});
  await prisma.standardTaskKnowledgeHistory.create({data:{
    knowledgeId:knowledge.id,standardTaskId:standardTask.id,actorUserId:u("campus").id,
    actorNameSnapshot:u("campus").fullName,changedArea:"Wissen",description:`Künstliches Campus-Beispiel für ${example.taskId} angelegt.`,
  }});
}

type ClientDefinition = { number:string; name:string; processor:string; reviewer:string; management:string };
const clientDefinitions:ClientDefinition[] = [
  {number:"10000",name:"Testmandant Februarprüfung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90001",name:"Bearbeitung offen",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90002",name:"Bereit zur Prüfung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90003",name:"In Prüfung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90004",name:"Nachbearbeitung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90005",name:"Offene Rückfrage",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90006",name:"Kombinierte Rolle",processor:"maria",reviewer:"maria",management:"klaus"},
  {number:"90007",name:"Alle Funktionen identisch",processor:"maria",reviewer:"maria",management:"maria"},
  {number:"90008",name:"Quartalsmandant",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90009",name:"Jahresvorbereitung Januar",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90010",name:"Jahresabschluss zur Prüfung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90011",name:"Jahresabschluss Nachbearbeitung",processor:"anna",reviewer:"peter",management:"klaus"},
  {number:"90012",name:"Vollständig abgeschlossen",processor:"anna",reviewer:"peter",management:"klaus"},
];
const clients = new Map<string, Awaited<ReturnType<typeof prisma.client.create>>>();
for (const definition of clientDefinitions) {
  const processor=u(definition.processor), reviewer=u(definition.reviewer), management=u(definition.management);
  const years=[...new Set([current.year,previous.year,twoMonthsAgo.year,january.year,fiscalYear])];
  const client=await prisma.client.create({ data:{
    clientNumber:definition.number,name:definition.name,processor:processor.fullName,reviewer:reviewer.fullName,managementName:management.fullName,
    processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,cadence:"monatlich",vatFilingPeriod:definition.number==="90008"?"Vierteljährlich":"Monatlich",
    active:true,internalNote:`Künstlicher Workflow-Testfall ${definition.number}.`,
    annualProfiles:{create:years.map(calendarYear=>({
      calendarYear,
      legalFormGroup:["90010","90012"].includes(definition.number)?"Kapitalgesellschaft":"Einzelunternehmen",
      profitDeterminationMethod:["90010","90012"].includes(definition.number)?"Bilanzierung":"Einnahmenüberschussrechnung",
      hasPayroll:definition.number==="90006",
      hasFixedAssets:["90008","90010","90012"].includes(definition.number),
      hasReceivablesPayables:["90010","90012"].includes(definition.number),
      hasLoans:definition.number==="90008",
      subjectToVat:true,
    }))},
  }});
  clients.set(definition.number,client);
}

async function create(number:string,when:{year:number;month:number}) {
  return createMonthlyPeriod(clients.get(number)!.id,when.year,when.month);
}
async function finishTasks(periodId:number, actor:string) {
  const tasks=await prisma.checklistTask.findMany({where:{periodId}});
  for(const task of tasks) {
    await updateChecklistTask(task.id,{status:"Erledigt",processingNote:"Künstlich erledigt.",processorInitials:actor,notApplicableReason:""});
  }
}
async function submit(periodId:number,processor:string) {
  await finishTasks(periodId,processor);
  const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(period.processingStatus==="Offen")await transitionPeriod(periodId,"BEGIN_PROCESSING",processor);
  await transitionPeriod(periodId,"SUBMIT_REVIEW",processor);
}
async function complete(periodId:number,processor:string,reviewer:string) {
  await submit(periodId,processor); await transitionPeriod(periodId,"BEGIN_REVIEW",reviewer);
  for(const task of await prisma.checklistTask.findMany({where:{periodId}})){
    if(task.status!=="In Folgemonat übertragen")await reviewChecklistTask(task.id,{reviewStatus:"In Ordnung",reviewerInitials:reviewer,reviewNote:"Künstlich einzeln geprüft."});
  }
  await transitionPeriod(periodId,"COMPLETE_REVIEW",reviewer);
}
async function issue(periodId:number,kind:"Rückfrage"|"Beanstandung") {
  await submit(periodId,"Anna Bearbeiter"); await transitionPeriod(periodId,"BEGIN_REVIEW","Peter Prüfer");
  const task=await prisma.checklistTask.findFirstOrThrow({where:{periodId}});
  await reviewChecklistTask(task.id,{reviewStatus:kind,reviewerInitials:"Peter Prüfer",reviewNote:`Künstliche ${kind} für den Workflowtest.`});
  await transitionPeriod(periodId,"RETURN_REWORK","Peter Prüfer");
}

await create("90001",previous);
const p10000=await create("10000",{year:2026,month:2});await submit(p10000.id,"Anna Bearbeiter");
const p2=await create("90002",previous); await submit(p2.id,"Anna Bearbeiter");
const p3=await create("90003",previous); await submit(p3.id,"Anna Bearbeiter"); await transitionPeriod(p3.id,"BEGIN_REVIEW","Peter Prüfer");
const p4=await create("90004",previous); await issue(p4.id,"Beanstandung");
const p5=await create("90005",twoMonthsAgo); await issue(p5.id,"Rückfrage");
const p6=await create("90006",previous); const p6task=await prisma.checklistTask.findFirstOrThrow({where:{periodId:p6.id}}); await updateChecklistTask(p6task.id,{status:"In Bearbeitung",processingNote:"Künstliche kombinierte Bearbeitung.",processorInitials:"Maria Kombiniert",notApplicableReason:""});
const p7=await create("90007",previous); await submit(p7.id,"Maria Kombiniert");
await create("90008",lastQuarter);
await create("90009",january);
const p12=await create("90012",previous); await complete(p12.id,"Anna Bearbeiter","Peter Prüfer");

async function annual(number:string,status:"Zur Prüfung"|"Nachbearbeitung"|"Zur Freigabe"|"Freigegeben") {
  const checklist=await createAnnualChecklist(clients.get(number)!.id,fiscalYear,auth(clientDefinitions.find((item)=>item.number===number)!.processor));
  const processorKey=clientDefinitions.find((item)=>item.number===number)!.processor;
  const reviewerKey=clientDefinitions.find((item)=>item.number===number)!.reviewer;
  const managementKey=clientDefinitions.find((item)=>item.number===number)!.management;
  for(const task of await prisma.annualChecklistTask.findMany({where:{annualChecklistId:checklist.id}}))await updateAnnualTask(task.id,{status:"Erledigt",processingNote:"Künstlich erledigt.",notApplicableReason:""},auth(processorKey));
  await transitionAnnualChecklist(checklist.id,"SUBMIT_REVIEW",auth(processorKey));
  if(status==="Zur Prüfung")return checklist;
  await transitionAnnualChecklist(checklist.id,"BEGIN_REVIEW",auth(reviewerKey));
  if(status==="Nachbearbeitung"){
    const task=await prisma.annualChecklistTask.findFirstOrThrow({where:{annualChecklistId:checklist.id}});
    await reviewAnnualTask(task.id,{reviewStatus:"Beanstandung",reviewNote:"Künstliche Jahresabschluss-Beanstandung."},auth(reviewerKey));
    await transitionAnnualChecklist(checklist.id,"RETURN_REWORK",auth(reviewerKey)); return checklist;
  }
  for(const task of await prisma.annualChecklistTask.findMany({where:{annualChecklistId:checklist.id}}))await reviewAnnualTask(task.id,{reviewStatus:"In Ordnung",reviewNote:"Künstlich geprüft."},auth(reviewerKey));
  await transitionAnnualChecklist(checklist.id,"PROFESSIONAL_COMPLETE",auth(reviewerKey));
  await transitionAnnualChecklist(checklist.id,"SUBMIT_RELEASE",auth(reviewerKey));
  if(status==="Zur Freigabe")return checklist;
  await transitionAnnualChecklist(checklist.id,"RELEASE",auth(managementKey),"Künstliche Freigabe."); return checklist;
}
await annual("90010","Zur Prüfung");
await annual("90011","Nachbearbeitung");
await annual("90008","Zur Freigabe");
await annual("90012","Freigegeben");

console.log(`Workflow-Testbestand: Standardmonat ${previous.month}/${previous.year}, Altmonat ${twoMonthsAgo.month}/${twoMonthsAgo.year}.`);
await prisma.$disconnect();

function berlinMonth(){
  const parts=new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",year:"numeric",month:"numeric"}).formatToParts(new Date());
  return {year:Number(parts.find((part)=>part.type==="year")!.value),month:Number(parts.find((part)=>part.type==="month")!.value)};
}
function addMonths(value:{year:number;month:number},offset:number){const index=value.year*12+value.month-1+offset;return {year:Math.floor(index/12),month:(index%12+12)%12+1}}
function latestMonthOnOrBefore(value:{year:number;month:number},months:number[]){for(let offset=0;offset>-12;offset--){const candidate=addMonths(value,offset);if(months.includes(candidate.month))return candidate}return value}
