import { prisma } from "../lib/prisma.ts";
import { hashPassword } from "../lib/password.ts";
import { createAnnualProfile, createClient, updateClient } from "../lib/client-service.ts";
import {
  createMonthlyPeriod,
  reviewChecklistTask,
  transitionPeriod,
  updateChecklistTask,
} from "../lib/monthly-checklist-service.ts";
import {
  completePayrollReconciliation,
  createPayrollQuestion,
  recordPayrollReconciliationView,
  markPayrollItemProcessed,
  parseConfiguredList,
  submitPayrollReconciliation,
  updatePayrollReconciliationItem,
} from "../lib/payroll-reconciliation-service.ts";
import { uploadPayrollDocument } from "../lib/payroll-document-service.ts";
import { createClientVehicle, updateClientVehicle } from "../lib/payroll-vehicle-service.ts";
import type { AuthUser } from "../lib/permissions.ts";

const REQUIRED_DATABASE_URL="file:./fibu-lohn-acceptance.db";
if(process.env.DATABASE_URL!==REQUIRED_DATABASE_URL){
  throw new Error(`SCHUTZABBRUCH: Der FiBu-Lohn-Abnahmeseed darf nur mit DATABASE_URL=${REQUIRED_DATABASE_URL} ausgeführt werden.`);
}
if(!process.env.FIBU_LOHN_STORAGE_DIR?.replaceAll("\\","/").endsWith("/tmp/fibu-lohn-acceptance-storage")){
  throw new Error("SCHUTZABBRUCH: Der FiBu-Lohn-Abnahmeseed benötigt den ausdrücklich freigegebenen Abnahmespeicher.");
}

function berlinYearMonth(){
  const parts=new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",year:"numeric",month:"numeric"}).formatToParts(new Date());
  return{year:Number(parts.find(part=>part.type==="year")?.value),month:Number(parts.find(part=>part.type==="month")?.value)};
}
function offsetMonth(offset:number){
  const current=berlinYearMonth();
  const date=new Date(Date.UTC(current.year,current.month-1+offset,15));
  return{year:date.getUTCFullYear(),month:date.getUTCMonth()+1};
}
function utcDate(year:number,month:number,day=1){return new Date(Date.UTC(year,month-1,day,10,0,0))}
function monthText(value:{year:number;month:number}){
  return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"Europe/Berlin"}).format(utcDate(value.year,value.month,15));
}

const previousPrevious=offsetMonth(-2);
const previous=offsetMonth(-1);
const current=offsetMonth(0);
const next=offsetMonth(1);
const relevantYears=[...new Set([previousPrevious.year,previous.year,current.year,next.year])];

const existingUsers=await prisma.user.findMany({include:{roles:true}});
const usersByName=new Map(existingUsers.map(user=>[user.username,user]));
if(!usersByName.has("campus.verantwortlich")){
  const campus=await prisma.user.create({data:{
    username:"campus.verantwortlich",fullName:"Campus Verantwortlich",
    passwordHash:await hashPassword("Test-Campus-2027!"),active:true,mustChangePassword:false,shortLabel:"CV",
    roles:{create:[{role:"ORDO_CAMPUS_VERWALTEN"}]},
  },include:{roles:true}});
  usersByName.set(campus.username,campus);
}

async function auth(username:string):Promise<AuthUser>{
  const user=await prisma.user.findUniqueOrThrow({where:{username},include:{roles:true}});
  return{id:user.id,fullName:user.fullName,username:user.username,active:user.active,mustChangePassword:user.mustChangePassword,roles:user.roles.map(role=>role.role) as AuthUser["roles"]};
}
const anna=await auth("anna.rechnungswesen");
const peter=await auth("peter.pruefer");
const laura=await auth("laura.lohn");
const leon=await auth("leon.lohn");
const klaus=await auth("klaus.leitung");

type ClientSeed={number:string;name:string;payroll:boolean;payrollUser?:AuthUser};
const clientSeeds:ClientSeed[]=[
  {number:"92001",name:"Künstliche vollständige Übergabe",payroll:true,payrollUser:laura},
  {number:"92002",name:"Künstliche neue Abstimmung bei Lohn",payroll:true,payrollUser:laura},
  {number:"92003",name:"Künstliche offene Lohnrückfrage",payroll:true,payrollUser:laura},
  {number:"92004",name:"Künstliche offene Nachreichung",payroll:true,payrollUser:laura},
  {number:"92005",name:"Künstlicher Fahrzeugwechsel",payroll:true,payrollUser:laura},
  {number:"92006",name:"Künstlicher Mandant ohne Kanzleilohn",payroll:false},
  {number:"92007",name:"Künstlicher Zuständigkeitswechsel",payroll:true,payrollUser:laura},
  {number:"92008",name:"Künstlich durch Lohn erledigt",payroll:true,payrollUser:laura},
];

const clients=new Map<string,Awaited<ReturnType<typeof createClient>>>();
for(const seed of clientSeeds){
  const client=await createClient({
    clientNumber:seed.number,name:seed.name,
    processor:anna.fullName,reviewer:peter.fullName,managementName:klaus.fullName,
    processorUserId:anna.id,reviewerUserId:peter.id,managementUserId:klaus.id,
    payrollPreparedByFirm:seed.payroll,payrollUserId:seed.payrollUser?.id??null,
    payrollServiceStart:seed.payroll?utcDate(previousPrevious.year,previousPrevious.month):null,
    payrollServiceEnd:null,payrollResponsibilityNote:seed.payroll?"Ausschließlich künstliche Zuständigkeit im FiBu-Lohn-Abnahmebestand.":null,
    vatFilingPeriod:"Monatlich",active:true,internalNote:"Ausschließlich künstlicher FiBu-Lohn-Abnahmemandant.",
  },klaus);
  clients.set(seed.number,client);
  for(const year of relevantYears)await createAnnualProfile(client.id,{
    calendarYear:year,legalFormGroup:seed.number==="92006"?"Personengesellschaft":"Kapitalgesellschaft",
    profitDeterminationMethod:"Bilanzierung",hasCashRegister:seed.number==="92002",hasPayroll:seed.payroll,
    hasFixedAssets:true,hasReceivablesPayables:true,hasLoans:seed.number==="92005",
    subjectToVat:true,hasPermanentExtension:false,
  });
}

async function reconciliationFor(periodId:number){
  return prisma.payrollReconciliation.findUniqueOrThrow({where:{accountingPeriodId:periodId},include:{items:{orderBy:{sortOrderSnapshot:"asc"}}}});
}
function artificialDetails(item:{requiredFieldsSnapshot:string},label:string){
  return Object.fromEntries(parseConfiguredList(item.requiredFieldsSnapshot).map(field=>[field,`${label}: künstliche Angabe zu ${field}`]));
}
const minimalPdf=new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0x20,0x4f,0x72,0x64,0x6f]);
async function uploadRequiredDocuments(item:{id:number;requiredDocumentsSnapshot:string},label:string){
  for(const [index,documentType] of parseConfiguredList(item.requiredDocumentsSnapshot).entries())await uploadPayrollDocument(item.id,{
    displayName:`${label} – ${documentType}`,documentType,description:"Künstlicher Abnahmebeleg ohne echte Personen- oder Mandantendaten.",
    originalFileName:`kuenstlicher-beleg-${item.id}-${index+1}.pdf`,mimeType:"application/pdf",bytes:minimalPdf,
  },anna);
}
async function prepare(reconciliationId:number,matterCount:number,{followUp=false}:{followUp?:boolean}={}){
  const reconciliation=await prisma.payrollReconciliation.findUniqueOrThrow({where:{id:reconciliationId},include:{items:{orderBy:{sortOrderSnapshot:"asc"}}}});
  for(const [index,item] of reconciliation.items.entries()){
    if(followUp&&item.topicKeySnapshot==="KSK"){
      await updatePayrollReconciliationItem(item.id,{
        status:"Vollständig an Lohn übergeben",details:artificialDetails(item,"Nachreichung"),
        documentToFollow:true,missingDocumentType:parseConfiguredList(item.requiredDocumentsSnapshot)[0],
        followUpReason:"Der ausschließlich künstliche KSK-Beleg wird kontrolliert im Abnahmeprozess nachgereicht.",
        expectedFollowUpAt:utcDate(current.year,current.month,20),note:"Künstliche zulässige Nachreichung.",
      },anna);
    }else if(index<matterCount){
      await uploadRequiredDocuments(item,`Mandant ${reconciliation.clientId}`);
      await updatePayrollReconciliationItem(item.id,{
        status:"Vollständig an Lohn übergeben",details:artificialDetails(item,"Abnahme"),
        note:"Künstlicher strukturierter Sachverhalt für die Modulabnahme.",
      },anna);
    }else{
      await updatePayrollReconciliationItem(item.id,{status:"Kein Sachverhalt",note:"Künstliche bewusste Prüfung ohne Sachverhalt."},anna);
    }
  }
  return reconciliationFor(reconciliation.accountingPeriodId);
}
async function finishMonthlyChecklist(periodId:number){
  const tasks=await prisma.checklistTask.findMany({where:{periodId}});
  for(const task of tasks.filter(task=>!["Erledigt","Nicht zutreffend","In Folgemonat übertragen"].includes(task.status))){
    await updateChecklistTask(task.id,{status:"Erledigt",processingNote:"Künstlich vollständig bearbeitet.",processorInitials:anna.fullName,notApplicableReason:""});
  }
  const period=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:periodId}});
  if(period.processingStatus==="Offen")await transitionPeriod(periodId,"BEGIN_PROCESSING",anna.fullName);
  await transitionPeriod(periodId,"SUBMIT_REVIEW",anna.fullName);
  await transitionPeriod(periodId,"BEGIN_REVIEW",peter.fullName);
  for(const task of await prisma.checklistTask.findMany({where:{periodId}})){
    await reviewChecklistTask(task.id,{reviewStatus:"In Ordnung",reviewerInitials:peter.fullName,reviewNote:"Künstlich abschließend geprüft."});
  }
  await transitionPeriod(periodId,"COMPLETE_REVIEW",peter.fullName);
}

// 92001: drei Sachverhalte, drei bewusste Negativentscheidungen, noch nicht insgesamt abgesendet.
const period92001=await createMonthlyPeriod(clients.get("92001")!.id,previous.year,previous.month);
const reconciliation92001=await prepare((await reconciliationFor(period92001.id)).id,3);
const vehicleItem92001=reconciliation92001.items.find(item=>item.topicKeySnapshot==="FAHRZEUGE")!;
await createClientVehicle(clients.get("92001")!.id,{
  referenceNumber:"ABN-92001-FZ-1",description:"Künstliches aktives Leasingfahrzeug",licensePlate:"TEST-AC 101",
  userName:"Künstliche Fahrzeugperson",userFunction:"Arbeitnehmer",contractAvailable:true,
  contractReference:"KÜNSTLICH-LEASE-92001",contractDate:utcDate(previousPrevious.year,previousPrevious.month,10),
  ownershipType:"Leasing",grossListPriceCents:4200000,onePercentRule:true,logbook:false,commuteUse:true,
  accountingAccount:"Künstliches Konto 4570",accountingBasis:"Künstlicher Leasingvertrag",
  accountingExplanation:"Ausschließlich künstliche Monatszuordnung.",validFrom:utcDate(previousPrevious.year,previousPrevious.month),
  status:"Aktiv",note:"Künstlicher Abnahmebestand.",
},anna,vehicleItem92001.id);

// 92002: vollständig übergeben und neu bei Lohn.
const period92002=await createMonthlyPeriod(clients.get("92002")!.id,previous.year,previous.month);
const reconciliation92002=await prepare((await reconciliationFor(period92002.id)).id,2);
await submitPayrollReconciliation(reconciliation92002.id,anna);

// 92003: offene Rückfrage.
const period92003=await createMonthlyPeriod(clients.get("92003")!.id,previous.year,previous.month);
const reconciliation92003=await prepare((await reconciliationFor(period92003.id)).id,1);
await submitPayrollReconciliation(reconciliation92003.id,anna);
await recordPayrollReconciliationView(reconciliation92003.id,laura);
await createPayrollQuestion(reconciliation92003.items[0].id,"Künstliche offene Rückfrage zur fachlichen Einordnung des übergebenen Sachverhalts.",laura);

// 92004: zulässige, aber für den Lohnabschluss noch offene Nachreichung.
const period92004=await createMonthlyPeriod(clients.get("92004")!.id,previous.year,previous.month);
const reconciliation92004=await prepare((await reconciliationFor(period92004.id)).id,0,{followUp:true});
await submitPayrollReconciliation(reconciliation92004.id,anna);

// 92005: Fahrzeugbestand mit verknüpftem Nutzer- und Methodenwechsel.
const period92005=await createMonthlyPeriod(clients.get("92005")!.id,previous.year,previous.month);
const reconciliation92005=await reconciliationFor(period92005.id);
const vehicleTopic92005=reconciliation92005.items.find(item=>item.topicKeySnapshot==="FAHRZEUGE")!;
const vehicle92005=await createClientVehicle(clients.get("92005")!.id,{
  referenceNumber:"ABN-92005-FZ-1",description:"Künstliches Fahrzeug mit Änderungshistorie",licensePlate:"TEST-AC 505",
  userName:"Künstliche Person A",userFunction:"Arbeitnehmer",contractAvailable:true,contractReference:"KÜNSTLICH-92005",
  contractDate:utcDate(previousPrevious.year,previousPrevious.month,5),ownershipType:"Eigentum",grossListPriceCents:5100000,
  onePercentRule:true,logbook:false,commuteUse:true,accountingAccount:"Künstliches Konto 0320",
  accountingBasis:"Künstlicher Kaufvertrag",accountingExplanation:"Künstliche Ausgangslage.",
  validFrom:utcDate(previousPrevious.year,previousPrevious.month),status:"Aktiv",note:"Künstlicher Abnahmebestand.",
},anna,vehicleTopic92005.id);
await updateClientVehicle(vehicle92005.id,{
  referenceNumber:"ABN-92005-FZ-1",description:"Künstliches Fahrzeug mit Änderungshistorie",licensePlate:"TEST-AC 505",
  userName:"Künstliche Person B",userFunction:"Arbeitnehmer",contractAvailable:true,contractReference:"KÜNSTLICH-92005",
  contractDate:utcDate(previousPrevious.year,previousPrevious.month,5),ownershipType:"Eigentum",grossListPriceCents:5100000,
  onePercentRule:true,logbook:false,commuteUse:true,accountingAccount:"Künstliches Konto 0320",
  accountingBasis:"Künstlicher Kaufvertrag",accountingExplanation:"Künstlicher Nutzerwechsel.",
  validFrom:utcDate(previousPrevious.year,previousPrevious.month),status:"Aktiv",note:"Künstlicher Nutzerwechsel.",
},"Nutzerwechsel",utcDate(previous.year,previous.month,1),anna,vehicleTopic92005.id);
await updateClientVehicle(vehicle92005.id,{
  referenceNumber:"ABN-92005-FZ-1",description:"Künstliches Fahrzeug mit Änderungshistorie",licensePlate:"TEST-AC 505",
  userName:"Künstliche Person B",userFunction:"Arbeitnehmer",contractAvailable:true,contractReference:"KÜNSTLICH-92005",
  contractDate:utcDate(previousPrevious.year,previousPrevious.month,5),ownershipType:"Eigentum",grossListPriceCents:5100000,
  onePercentRule:false,logbook:true,commuteUse:true,accountingAccount:"Künstliches Konto 0320",
  accountingBasis:"Künstlicher Kaufvertrag",accountingExplanation:"Künstlicher Methodenwechsel.",
  validFrom:utcDate(previousPrevious.year,previousPrevious.month),status:"Aktiv",note:"Künstlicher Methodenwechsel.",
},"Versteuerungsmethode geändert",utcDate(current.year,current.month,1),anna,vehicleTopic92005.id);

// 92006: Negativfall ohne Kanzleilohn.
const period92006=await createMonthlyPeriod(clients.get("92006")!.id,previous.year,previous.month);
if(await prisma.payrollReconciliation.count({where:{accountingPeriodId:period92006.id}})!==0)throw new Error("SCHUTZABBRUCH: 92006 darf keine FiBu-Lohn-Abstimmung besitzen.");

// 92007: historische Laura-Zuordnung bleibt bestehen; neue Abstimmung gehört Leon.
const historicalPeriod92007=await createMonthlyPeriod(clients.get("92007")!.id,previousPrevious.year,previousPrevious.month);
const historicalReconciliation92007=await prepare((await reconciliationFor(historicalPeriod92007.id)).id,0);
await submitPayrollReconciliation(historicalReconciliation92007.id,anna);
await recordPayrollReconciliationView(historicalReconciliation92007.id,laura);
await completePayrollReconciliation(historicalReconciliation92007.id,laura);
await finishMonthlyChecklist(historicalPeriod92007.id);
const client92007=clients.get("92007")!;
await updateClient(client92007.id,{
  clientNumber:client92007.clientNumber,name:client92007.name,processor:anna.fullName,reviewer:peter.fullName,managementName:klaus.fullName,
  processorUserId:anna.id,reviewerUserId:peter.id,managementUserId:klaus.id,payrollPreparedByFirm:true,payrollUserId:leon.id,
  payrollServiceStart:utcDate(previous.year,previous.month),payrollServiceEnd:null,
  payrollResponsibilityNote:"Künstlicher Zuständigkeitswechsel von Laura Lohn zu Leon Lohn.",
  vatFilingPeriod:"Monatlich",active:true,internalNote:client92007.internalNote,
},klaus);
const currentPeriod92007=await createMonthlyPeriod(client92007.id,previous.year,previous.month);
await prepare((await reconciliationFor(currentPeriod92007.id)).id,1);

// 92008: vollständig durch Lohn erledigt.
const period92008=await createMonthlyPeriod(clients.get("92008")!.id,previousPrevious.year,previousPrevious.month);
const reconciliation92008=await prepare((await reconciliationFor(period92008.id)).id,2);
await submitPayrollReconciliation(reconciliation92008.id,anna);
await recordPayrollReconciliationView(reconciliation92008.id,laura);
for(const item of reconciliation92008.items.filter(item=>item.status==="Vollständig an Lohn übergeben"))await markPayrollItemProcessed(item.id,laura);
await completePayrollReconciliation(reconciliation92008.id,laura);
await finishMonthlyChecklist(period92008.id);

console.log(JSON.stringify({
  acceptanceDatabase:REQUIRED_DATABASE_URL,
  periods:{previousPrevious:monthText(previousPrevious),previous:monthText(previous),current:monthText(current),next:monthText(next)},
  users:["anna.rechnungswesen","peter.pruefer","laura.lohn","leon.lohn","klaus.leitung","admin.test","campus.verantwortlich"],
  clients:[...clients.keys()],
},null,2));
await prisma.$disconnect();
