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
import {
  completePayrollReconciliation,
  createPayrollQuestion,
  markPayrollReconciliationSeen,
  submitPayrollReconciliation,
  updatePayrollReconciliationItem,
  savePayrollPosition,
} from "../lib/payroll-reconciliation-service.ts";
import {
  createClientVehicle,
  updateClientVehicle,
} from "../lib/payroll-vehicle-service.ts";

const users:ReadonlyArray<{key:string;username:string;fullName:string;password:string;roles:ReadonlyArray<string>;active?:boolean}> = [
  { key:"maria", username:"maria.muster", fullName:"Maria Muster", password:"Test-Maria-2026!", roles:["MITARBEITER","PRUEFER"] },
  { key:"paul", username:"paul.pruefung", fullName:"Paul Prüfung", password:"Test-Paul-2026!", roles:["PRUEFER"] },
  { key:"klara", username:"klara.leitung", fullName:"Klara Leitung", password:"Test-Klara-2026!", roles:["KANZLEILEITUNG","PRUEFER","STANDARDAUFGABEN_VERWALTEN","ORDO_CAMPUS_VERWALTEN"] },
  { key:"anton", username:"anton.admin", fullName:"Anton Administration", password:"Test-Anton-2026!", roles:["ADMINISTRATOR"] },
  { key:"max", username:"max.beispiel", fullName:"Max Beispiel", password:"Test-Max-2026!", roles:["MITARBEITER"] },
  { key:"nina", username:"nina.test", fullName:"Nina Testkonto", password:"Test-Nina-2026!", roles:["MITARBEITER"], active:false },
  { key:"anna", username:"anna.rechnungswesen", fullName:"Anna Rechnungswesen", password:"Test-Anna-2027!", roles:["MITARBEITER"] },
  { key:"peter", username:"peter.pruefer", fullName:"Peter Prüfer", password:"Test-Peter-2027!", roles:["PRUEFER"] },
  { key:"laura", username:"laura.lohn", fullName:"Laura Lohn", password:"Test-Laura-2027!", roles:["LOHNSACHBEARBEITER"] },
  { key:"leon", username:"leon.lohn", fullName:"Leon Lohn", password:"Test-Leon-2027!", roles:["LOHNSACHBEARBEITER"] },
  { key:"klaus", username:"klaus.leitung", fullName:"Klaus Kanzleileitung", password:"Test-Klaus-2027!", roles:["KANZLEILEITUNG","PRUEFER","FIBU_LOHN_THEMEN_VERWALTEN","ORDO_CAMPUS_VERWALTEN"] },
  { key:"admin-test", username:"admin.test", fullName:"Admin Test", password:"Test-Admin-2027!", roles:["ADMINISTRATOR"] },
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
const authUser=async(key:string):Promise<AuthUser>=>{const user=await prisma.user.findUniqueOrThrow({where:{id:u(key).id},include:{roles:true}});return{id:user.id,fullName:user.fullName,username:user.username,active:user.active,mustChangePassword:user.mustChangePassword,roles:user.roles.map(role=>role.role) as AuthUser["roles"]}};

const categoryNames=["Allgemein","Bank","Kasse","Darlehen","Kontenabstimmung","Kontonotizen und Dokumentation","Jahresvorbereitung","FiBu-Lohn-Abstimmung"];
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

const payrollChecklistTask=await prisma.standardTask.create({data:{
  taskId:"MON-FIBU-LOHN-001",active:true,checklistType:"Monat",categoryId:categories.get("FiBu-Lohn-Abstimmung")!,
  title:"Monatliche FiBu-Lohn-Abstimmung",
  workInstruction:"Alle aktiven Abstimmungsthemen bewusst prüfen und vorhandene lohnrelevante Informationen vollständig an den zuständigen Lohnsachbearbeiter übergeben.",
  reviewInstruction:"Vollständigkeit der Themenentscheidungen, Pflichtangaben, Belege und Lohnzuständigkeit kontrollieren. Die Verarbeitung durch Lohn ist nicht Gegenstand der Rechnungswesenprüfung.",
  mandatory:true,rhythm:"Monatlich",executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12",taskArea:"Laufende Bearbeitung",
  legalFormGroups:"Alle",profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Ja",
  fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",
  permanentExtensionCondition:"Alle",knowledgeKey:"FIBU_LOHN_ABSTIMMUNG",sortOrder:15,
  professionalVersion:"FIBU-LOHN-1.0",internalNote:"Ausschließlich künstliche Standardaufgabe für die FiBu-Lohn-Abstimmung.",
}});
const payrollCampusKnowledge=await prisma.standardTaskKnowledge.create({data:{
  standardTaskId:payrollChecklistTask.id,status:"Aktiv",
  shortDescription:"Monatliche strukturierte Übergabe lohnrelevanter Sachverhalte aus dem Rechnungswesen.",
  objective:"Vollständige und nachvollziehbare Information der Lohnabteilung, ohne einen Lohnabrechnungsworkflow abzubilden.",
  processingGuidance:"Alle sechs aktiven Themen bewusst prüfen. Vorhandene Sachverhalte strukturiert erfassen und erforderliche Belege geschützt bereitstellen.",
  firmStandard:"Die Informationspflicht des Rechnungswesens ist erfüllt, sobald alle Themen entschieden und vorhandene Sachverhalte vollständig an Lohn übergeben wurden.",
  reviewerGuidance:"Themensnapshots, Pflichtangaben, Belege und die Zuordnung des Lohnsachbearbeiters prüfen. Der spätere Lohnstatus blockiert die Monatscheckliste nicht.",
  typicalErrors:"Thema nicht bewusst geprüft\nPflichtangabe oder Beleg fehlt\nfalscher Lohnabrechnungsmonat gewählt",
  internalHints:"Künstlicher Campus-Inhalt. Kontenhinweise sind konfigurierbar und keine fest verdrahtete Programmlogik.",
}});
await prisma.standardTaskKnowledgeHistory.create({data:{
  knowledgeId:payrollCampusKnowledge.id,standardTaskId:payrollChecklistTask.id,actorUserId:u("klaus").id,
  actorNameSnapshot:u("klaus").fullName,changedArea:"Wissen",description:"Künstliches Ordo-Campus-Wissen zur FiBu-Lohn-Abstimmung erstellt.",
}});

const payrollTopicRows=[
  {
    key:"ARBEITNEHMER_VORTEILE",title:"Arbeitnehmerbezogene Geschenke, Aufmerksamkeiten, Sachbezüge und Betriebsveranstaltungen",
    description:"Geschenke, Gutscheine, Sachbezüge, Betriebsveranstaltungen und sonstige lohnrelevante Vorteile.",
    question:"Gab es arbeitnehmerbezogene Vorteile oder Betriebsveranstaltungen, die an Lohn zu übergeben sind?",
    fields:["Art des Sachverhalts","Betroffene Arbeitnehmer oder Personengruppe","Datum oder Zeitraum","Beschreibung","Abrechnungsmonat"],
    documents:["Beleg oder Teilnehmerliste"],vehicle:false,followUp:false,
  },
  {
    key:"REISEKOSTEN",title:"Steuerfreie Reisekostenerstattungen",
    description:"Fahrtkosten, Verpflegungsmehraufwendungen, Übernachtungskosten und weitere Reisekostenerstattungen.",
    question:"Wurden Reisekosten an Arbeitnehmer oder angestellte Gesellschafter-Geschäftsführer erstattet?",
    fields:["Arbeitnehmer","Reisezeitraum","Art der Erstattung","Zahlungsweg","Abrechnungsmonat","Beschreibung"],
    documents:["Reisekostenabrechnung","Zahlungs- oder Buchungsbeleg"],vehicle:false,followUp:false,
  },
  {
    key:"FAHRZEUGE",title:"Firmenfahrzeuge, Pkw, E-Bike und Fahrrad",
    description:"Neue, geänderte oder beendete Fahrzeugüberlassungen und Änderungen der Versteuerungsmethode.",
    question:"Gab es Änderungen im dauerhaften Fahrzeugbestand mit möglicher Lohnrelevanz?",
    fields:["Art der Änderung","Fahrzeugbezug","Nutzer","Gültig-ab-Datum","Beschreibung"],
    documents:["Fahrzeugbeleg oder Vertrag"],vehicle:true,followUp:false,
  },
  {
    key:"SCHEINSELBSTSTAENDIGKEIT",title:"Scheinselbstständigkeit und mögliche abhängige Beschäftigung",
    description:"Auffällige Fremdleistungen werden ohne automatische rechtliche Bewertung an Lohn übergeben.",
    question:"Gab es Auffälligkeiten bei Fremdleistungen, die auf eine mögliche abhängige Beschäftigung hindeuten?",
    fields:["Betroffene Person oder Unternehmen","Leistungsart","Zeitraum","Auffällige Merkmale","Beschreibung"],
    documents:["Rechnung oder relevanter Beleg"],vehicle:false,followUp:false,
  },
  {
    key:"GESCHENKE_NICHTARBEITNEHMER",title:"Geschenke an Nichtarbeitnehmer",
    description:"Geschenke an Geschäftspartner und mögliche Pauschalversteuerung.",
    question:"Gab es Geschenke an Nichtarbeitnehmer, die lohnsteuerlich weiterbearbeitet werden müssen?",
    fields:["Empfänger oder Empfängergruppe","Art des Geschenks","Datum","Beschreibung","Hinweis zur möglichen Pauschalversteuerung"],
    documents:["Empfänger- oder Geschenkeliste","Buchungsbeleg"],vehicle:false,followUp:false,
  },
  {
    key:"KSK",title:"Künstlersozialkasse",
    description:"Laufende Sammlung relevanter künstlerischer oder publizistischer Leistungen.",
    question:"Gab es KSK-relevante Eingangsrechnungen oder Leistungen?",
    fields:["Auftragnehmer oder Rechnungsteller","Leistungsart","Rechnungsdatum","Rechnungsbetrag","Relevanter Zeitraum","Beschreibung","Kennzeichnung Jahresmeldung"],
    documents:["Rechnung oder Beleg"],vehicle:false,followUp:true,
  },
] as const;
for(const [index,topic] of payrollTopicRows.entries())await prisma.payrollReconciliationTopic.create({data:{
  key:topic.key,title:topic.title,shortDescription:topic.description,reviewQuestion:topic.question,sortOrder:(index+1)*10,
  status:"Aktiv",validFrom:new Date("2026-01-01T00:00:00Z"),topicType:"Monatliche QM-Abstimmung",
  vehicleRelated:topic.vehicle,followUpAllowed:topic.followUp,campusStandardTaskId:payrollChecklistTask.id,
  requiredStandardFields:JSON.stringify(topic.fields),requiredDocumentTypes:JSON.stringify(topic.documents),
  notes:topic.followUp?"Eine dokumentierte Nachreichung ist fachlich zulässig.":"Erforderliche Belege müssen vor der vollständigen Übergabe vorliegen.",
  createdByUserId:u("klaus").id,
  history:{create:{actorUserId:u("klaus").id,actorNameSnapshot:u("klaus").fullName,action:"Thema erstellt",summary:`Künstliches Startthema „${topic.title}“ wurde angelegt.`}},
}});

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

type ClientSeed={
  number:string;name:string;processor:string;reviewer:string;management?:string;legal:string;profit:string;vat:string;
  payrollPreparedByFirm?:boolean;payrollUser?:string;
};
const clientRows:ClientSeed[]=[
  {number:"10001",name:"Musterpraxis Beispiel",processor:"maria",reviewer:"paul",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Monatlich"},
  {number:"10002",name:"Beispiel Verwaltungs GmbH",processor:"maria",reviewer:"maria",legal:"Kapitalgesellschaft",profit:"Bilanzierung",vat:"Monatlich"},
  {number:"10003",name:"Mustermann Besitz GbR",processor:"maria",reviewer:"klara",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Vierteljährlich"},
  {number:"10004",name:"Künstlicher Mandant ohne aktive Checkliste",processor:"klara",reviewer:"klara",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Keine Voranmeldung"},
  {number:"10005",name:"Künstliches Medizinisches Versorgungszentrum",processor:"max",reviewer:"paul",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Monatlich"},
  {number:"10006",name:"Künstlicher Quartalsmandant",processor:"max",reviewer:"klara",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Vierteljährlich"},
  {number:"91001",name:"Muster GmbH FiBu-Lohn",processor:"anna",reviewer:"peter",management:"klaus",legal:"Kapitalgesellschaft",profit:"Bilanzierung",vat:"Monatlich",payrollPreparedByFirm:true,payrollUser:"laura"},
  {number:"91002",name:"Beispielpraxis FiBu-Lohn",processor:"anna",reviewer:"peter",management:"klaus",legal:"Einzelunternehmen",profit:"Einnahmenüberschussrechnung",vat:"Monatlich",payrollPreparedByFirm:true,payrollUser:"leon"},
  {number:"91003",name:"Besitzgesellschaft ohne Kanzleilohn",processor:"anna",reviewer:"peter",management:"klaus",legal:"Personengesellschaft",profit:"Bilanzierung",vat:"Vierteljährlich",payrollPreparedByFirm:false},
];
const clients=new Map<string,Awaited<ReturnType<typeof prisma.client.create>>>();
for(const row of clientRows){
  const processor=u(row.processor),reviewer=u(row.reviewer),management=u(row.management??"klara"),payrollUser=row.payrollUser?u(row.payrollUser):null;
  const client=await prisma.client.create({data:{
    clientNumber:row.number,name:row.name,processor:processor.fullName,reviewer:reviewer.fullName,managementName:management.fullName,
    processorUserId:processor.id,reviewerUserId:reviewer.id,managementUserId:management.id,
    payrollPreparedByFirm:Boolean(row.payrollPreparedByFirm),payrollUserId:payrollUser?.id??null,
    payrollServiceStart:row.payrollPreparedByFirm?new Date("2026-01-01T00:00:00Z"):null,
    payrollResponsibilityNote:row.payrollPreparedByFirm?"Ausschließlich künstliche Zuständigkeit für lokale FiBu-Lohn-Tests.":null,
    cadence:"monatlich",vatFilingPeriod:row.vat,active:true,internalNote:"Ausschließlich künstlicher Testmandant.",
    annualProfiles:{create:[2024,2025,2026].map(calendarYear=>({calendarYear,legalFormGroup:row.legal,profitDeterminationMethod:row.profit,
      hasCashRegister:row.number==="10001",hasPayroll:row.number==="10005"||Boolean(row.payrollPreparedByFirm),hasFixedAssets:row.profit==="Bilanzierung",
      hasReceivablesPayables:row.profit==="Bilanzierung",hasLoans:row.number==="10002",subjectToVat:true,hasPermanentExtension:false}))},
    payrollResponsibilityHistory:row.payrollPreparedByFirm?{create:{
      payrollPreparedByFirm:true,payrollUserId:payrollUser!.id,payrollUserNameSnapshot:payrollUser!.fullName,
      validFrom:new Date("2026-01-01T00:00:00Z"),note:"Künstliche Erstzuordnung im deterministischen Seed.",changedByUserId:u("klaus").id,
    }}:undefined,
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
  for(const task of tasks.filter(task=>!["Erledigt","Nicht zutreffend","In Folgemonat übertragen"].includes(task.status)))await updateChecklistTask(task.id,{status:"Erledigt",processingNote:"Künstlich vollständig bearbeitet.",processorInitials:actor,notApplicableReason:""});
}
async function completePeriod(periodId:number,processor:string,reviewer:string){
  await finishMandatory(periodId,processor);
  const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(period.processingStatus==="Offen")await transitionPeriod(periodId,"BEGIN_PROCESSING",processor);
  await transitionPeriod(periodId,"SUBMIT_REVIEW",processor);
  await transitionPeriod(periodId,"BEGIN_REVIEW",reviewer);
  const tasks=await prisma.checklistTask.findMany({where:{periodId}});
  for(const task of tasks)await reviewChecklistTask(task.id,{reviewStatus:"In Ordnung",reviewerInitials:reviewer,reviewNote:"Künstlich abschließend geprüft."});
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
await completeRework(reviewTasks[0].id,{response:"Künstliche Nachbearbeitung wurde erläutert.",actorInitials:"Maria Muster",processingNote:"Künstlich ergänzt."});
await transitionPeriod(feb10003.id,"SUBMIT_REVIEW","Maria Muster");
await transitionPeriod(feb10003.id,"BEGIN_REVIEW","Klara Leitung");
await reviewChecklistTask(reviewTasks[1].id,{reviewStatus:"Beanstandung",reviewerInitials:"Klara Leitung",reviewNote:"Künstliche offene Beanstandung zur Nachbearbeitung."});

// FiBu-Lohn: deterministische Monatsabstimmungen mit getrennten Rechnungswesen- und Lohnstatus.
const anna=await authUser("anna"),peter=await authUser("peter"),laura=await authUser("laura");
async function payrollReconciliationFor(periodId:number){
  return prisma.payrollReconciliation.findUniqueOrThrow({where:{accountingPeriodId:periodId},include:{items:{orderBy:{sortOrderSnapshot:"asc"}}}});
}
async function preparePayrollAsNoMatter(periodId:number,processor:AuthUser){
  let reconciliation=await payrollReconciliationFor(periodId);
  for(const item of reconciliation.items)await updatePayrollReconciliationItem(item.id,{status:"Kein Sachverhalt",note:"Künstliche bewusste Prüfung ohne Sachverhalt."},processor);
  reconciliation=await payrollReconciliationFor(periodId);
  return reconciliation;
}

const jan91001=await createMonthlyPeriod(clients.get("91001")!.id,2026,1);
const payrollJan91001=await preparePayrollAsNoMatter(jan91001.id,anna);
await submitPayrollReconciliation(payrollJan91001.id,anna);
await markPayrollReconciliationSeen(payrollJan91001.id,laura);
await completePayrollReconciliation(payrollJan91001.id,laura);
await completePeriod(jan91001.id,anna.fullName,peter.fullName);

const feb91001=await createMonthlyPeriod(clients.get("91001")!.id,2026,2);
const payrollFeb91001=await preparePayrollAsNoMatter(feb91001.id,anna);
await submitPayrollReconciliation(payrollFeb91001.id,anna);
await completePeriod(feb91001.id,anna.fullName,peter.fullName);

const mar91001=await createMonthlyPeriod(clients.get("91001")!.id,2026,3);
const payrollMar91001=await preparePayrollAsNoMatter(mar91001.id,anna);
await submitPayrollReconciliation(payrollMar91001.id,anna);
await markPayrollReconciliationSeen(payrollMar91001.id,laura);
await completePeriod(mar91001.id,anna.fullName,peter.fullName);

const apr91001=await createMonthlyPeriod(clients.get("91001")!.id,2026,4);
const payrollApr91001=await preparePayrollAsNoMatter(apr91001.id,anna);
await submitPayrollReconciliation(payrollApr91001.id,anna);
await markPayrollReconciliationSeen(payrollApr91001.id,laura);
await createPayrollQuestion(payrollApr91001.items[0].id,"Künstliche Rückfrage zur monatlichen Übergabe.",laura);
await completePeriod(apr91001.id,anna.fullName,peter.fullName);

const may91001=await createMonthlyPeriod(clients.get("91001")!.id,2026,5);
const payrollMay91001=await preparePayrollAsNoMatter(may91001.id,anna);

const jan91002=await createMonthlyPeriod(clients.get("91002")!.id,2026,1);
const payrollJan91002=await payrollReconciliationFor(jan91002.id);
const travelItem=payrollJan91002.items.find(item=>item.topicKeySnapshot==="REISEKOSTEN")!;
const contractorItem=payrollJan91002.items.find(item=>item.topicKeySnapshot==="SCHEINSELBSTSTAENDIGKEIT")!;
await updatePayrollReconciliationItem(travelItem.id,{
  status:"Übergabe in Vorbereitung",note:"Künstliche Reisekostenabrechnung wird strukturiert vorbereitet.",
  details:{Arbeitnehmer:"Künstliche Person A",Reisezeitraum:"Januar 2026","Art der Erstattung":"Fahrtkosten",Zahlungsweg:"Bank",Abrechnungsmonat:"Februar 2026",Beschreibung:"Ausschließlich künstlicher Reisekostensachverhalt."},
},anna);
await updatePayrollReconciliationItem(contractorItem.id,{
  status:"Übergabe in Vorbereitung",note:"Künstlicher Hinweis ohne rechtliche Einstufung.",
  details:{"Betroffene Person oder Unternehmen":"Künstliche Fremdleistung GmbH",Leistungsart:"Künstliche Beratung",Zeitraum:"Januar 2026","Auffällige Merkmale":"Regelmäßige Monatsrechnung",Beschreibung:"Nur zur fachlichen Weiterbearbeitung durch Lohn."},
},anna);
await savePayrollPosition(travelItem.id,null,{
  positionType:"Einzelposition",title:"Künstliche Dienstreise Person A",caseCount:1,totalAmount:"184,50",period:"Januar 2026",
  summary:"Künstliche Einzelposition zur Demonstration einer Reisekostenübergabe.",people:["Künstliche Person A"],
  details:{Arbeitnehmer:"Künstliche Person A",Reisezeitraum:"12.01.2026 bis 13.01.2026",Reisebeginn:"2026-01-12",Reiseende:"2026-01-13","Art der Erstattung":"Fahrtkosten",Zahlungsweg:"Bank",Fahrtkosten:"184,50",Abrechnungsmonat:"Februar 2026",Beschreibung:"Künstliche Einzelreise mit vollständigen Testangaben."},
},anna);
await savePayrollPosition(travelItem.id,null,{
  positionType:"Sammelposition",title:"Künstliche Reisekostensammlung",caseCount:3,totalAmount:"426,00",period:"Januar 2026",
  summary:"Drei künstliche Reisekostenfälle als zulässige Sammelposition.",people:["Künstliche Person B","Künstliche Person C","Künstliche Person D"],
  details:{Arbeitnehmer:"Künstliche Personengruppe",Reisezeitraum:"Januar 2026",Reisebeginn:"2026-01-01",Reiseende:"2026-01-31","Art der Erstattung":"Reisekostensammlung",Zahlungsweg:"Bank",Gesamtbetrag:"426,00",Abrechnungsmonat:"Februar 2026",Beschreibung:"Künstliche Sammlung mit drei vollständig beschriebenen Fällen."},
},anna);

const jan91003=await createMonthlyPeriod(clients.get("91003")!.id,2026,1);
if(await prisma.payrollReconciliation.count({where:{accountingPeriodId:jan91003.id}})!==0)throw new Error("Mandant 91003 darf keine FiBu-Lohn-Abstimmung erhalten.");

// Dauerhafter künstlicher Fahrzeugbestand mit verknüpfter Änderungshistorie.
const vehicleTopicItem=payrollMay91001.items.find(item=>item.topicKeySnapshot==="FAHRZEUGE")!;
const leasingVehicle=await createClientVehicle(clients.get("91001")!.id,{
  referenceNumber:"FZ-001",description:"Künstliches Leasingfahrzeug",licensePlate:"TEST-OC 101",
  userName:"Künstliche Person Fahrzeug",userFunction:"Arbeitnehmer",contractAvailable:true,
  contractReference:"KÜNSTLICH-LEASE-001",contractDate:new Date("2025-12-15T00:00:00Z"),ownershipType:"Leasing",
  grossListPriceCents:4800000,documentReference:"Lokale künstliche Vertragsreferenz",onePercentRule:true,logbook:false,
  commuteUse:true,accountingAccount:"Künstliches Konto 4570",accountingBasis:"Leasingvertrag",accountingExplanation:"Monatliche künstliche Zuordnung.",
  validFrom:new Date("2026-01-01T00:00:00Z"),status:"Aktiv",note:"Nur künstlicher Testdatensatz.",
},anna,vehicleTopicItem.id);
await updateClientVehicle(leasingVehicle.id,{
  referenceNumber:"FZ-001",description:"Künstliches Leasingfahrzeug",licensePlate:"TEST-OC 101",
  userName:"Künstliche Person Fahrzeug B",userFunction:"Arbeitnehmer",contractAvailable:true,
  contractReference:"KÜNSTLICH-LEASE-001",contractDate:new Date("2025-12-15T00:00:00Z"),ownershipType:"Leasing",
  grossListPriceCents:4800000,documentReference:"Lokale künstliche Vertragsreferenz",onePercentRule:true,logbook:false,
  commuteUse:true,accountingAccount:"Künstliches Konto 4570",accountingBasis:"Leasingvertrag",accountingExplanation:"Monatliche künstliche Zuordnung.",
  validFrom:new Date("2026-01-01T00:00:00Z"),status:"Aktiv",note:"Künstlicher Nutzerwechsel.",
},"Nutzerwechsel",new Date("2026-05-01T00:00:00Z"),anna,vehicleTopicItem.id);
await createClientVehicle(clients.get("91001")!.id,{
  referenceNumber:"FZ-002",description:"Künstliches Fahrzeug mit Fahrtenbuch",licensePlate:"TEST-OC 102",
  userName:"Künstliche Person Fahrtenbuch",userFunction:"Geschäftsführer",contractAvailable:true,
  contractReference:"KÜNSTLICH-KAUF-002",contractDate:new Date("2024-01-05T00:00:00Z"),ownershipType:"Eigentum",
  grossListPriceCents:6200000,documentReference:"Künstliche Unterlagenreferenz",onePercentRule:false,logbook:true,
  commuteUse:false,accountingAccount:"Künstliches Konto 0320",accountingBasis:"Anlagenverzeichnis",accountingExplanation:"Fahrtenbuch als künstliche Grundlage.",
  validFrom:new Date("2024-01-01T00:00:00Z"),status:"Aktiv",note:"Nur künstlicher Testdatensatz.",
},anna);
await createClientVehicle(clients.get("91002")!.id,{
  referenceNumber:"FZ-ALT-001",description:"Künstlich beendetes Fahrzeug",licensePlate:"TEST-OC 201",
  userName:"Künstliche Person Altbestand",userFunction:"Unternehmer",contractAvailable:false,ownershipType:"Eigentum",
  grossListPriceCents:3500000,onePercentRule:false,logbook:false,commuteUse:false,
  validFrom:new Date("2023-01-01T00:00:00Z"),validUntil:new Date("2025-12-31T00:00:00Z"),status:"Beendet",
  note:"Künstlicher historischer Fahrzeugdatensatz.",
},anna);

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
const maria=await authUser("maria"),paul=await authUser("paul"),klara=await authUser("klara");
async function finishAnnualMandatory(checklistId:number,user:AuthUser){const tasks=await prisma.annualChecklistTask.findMany({where:{annualChecklistId:checklistId}});for(const task of tasks.filter(task=>!["Erledigt","Nicht zutreffend"].includes(task.status)))await updateAnnualTask(task.id,{status:"Erledigt",processingNote:"Künstlich abschließend bearbeitet.",notApplicableReason:""},user)}
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
