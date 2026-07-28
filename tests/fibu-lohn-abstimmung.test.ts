import { rm } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@/lib/client-service";
import { createMonthlyPeriod } from "@/lib/monthly-checklist-service";
import {
  archivePayrollDocument,
  PAYROLL_DOCUMENT_STORAGE_ROOT,
  readPayrollDocument,
  uploadPayrollDocument,
} from "@/lib/payroll-document-service";
import {
  answerPayrollQuestion,
  changePayrollTargetMonth,
  completePayrollDocumentFollowUp,
  completePayrollQuestion,
  completePayrollReconciliation,
  createPayrollQuestion,
  createPayrollReconciliationForChecklist,
  createPayrollTopic,
  markPayrollItemProcessed,
  markPayrollReconciliationSeen,
  submitPayrollReconciliation,
  updatePayrollReconciliationItem,
  updatePayrollTopic,
} from "@/lib/payroll-reconciliation-service";
import {
  createClientVehicle,
  listClientVehicles,
  updateClientVehicle,
} from "@/lib/payroll-vehicle-service";
import {
  canHandlePayrollReconciliation,
  canProcessPayrollReconciliation,
  canReviewPayrollReconciliation,
  type AuthUser,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

let categoryId:number;
let clientId:number;
let processor:AuthUser;
let reviewer:AuthUser;
let payroll:AuthUser;
let secondPayroll:AuthUser;
let management:AuthUser;
let administrator:AuthUser;

async function cleanup(){
  await prisma.payrollDocumentReference.deleteMany();
  await prisma.payrollReconciliationQuestion.deleteMany();
  await prisma.clientVehicleChange.deleteMany();
  await prisma.payrollReconciliationHistory.deleteMany();
  await prisma.payrollReconciliationItem.deleteMany();
  await prisma.payrollReconciliation.deleteMany();
  await prisma.clientVehicle.deleteMany();
  await prisma.payrollReconciliationTopicHistory.deleteMany();
  await prisma.payrollReconciliationTopic.deleteMany();
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany({where:{sourceTaskId:{not:null}}});
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.clientPayrollResponsibilityHistory.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
  await prisma.standardTaskKnowledgeHistory.deleteMany();
  await prisma.standardTaskKnowledgeLink.deleteMany();
  await prisma.standardTaskKnowledge.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await rm(PAYROLL_DOCUMENT_STORAGE_ROOT,{recursive:true,force:true});
}

async function user(username:string,fullName:string,roles:AuthUser["roles"]){
  const record=await prisma.user.create({data:{
    username,fullName,passwordHash:"scrypt$synthetic",active:true,mustChangePassword:false,
    roles:{create:roles.map(role=>({role}))},
  }});
  return{id:record.id,username,fullName,active:true,mustChangePassword:false,roles} satisfies AuthUser;
}

beforeEach(async()=>{
  await cleanup();
  processor=await user("test.fibu","Anna Künstlich",["MITARBEITER"]);
  reviewer=await user("test.pruefer","Peter Künstlich",["PRUEFER"]);
  payroll=await user("test.lohn","Laura Künstlich",["LOHNSACHBEARBEITER"]);
  secondPayroll=await user("test.lohn.zwei","Leon Künstlich",["LOHNSACHBEARBEITER"]);
  management=await user("test.leitung","Klaus Künstlich",["KANZLEILEITUNG","PRUEFER","FIBU_LOHN_THEMEN_VERWALTEN"]);
  administrator=await user("test.admin","Admin Künstlich",["ADMINISTRATOR"]);
  categoryId=(await prisma.taskCategory.create({data:{name:"Künstliche FiBu-Lohn-Kategorie",sortOrder:10}})).id;
  await prisma.standardTask.create({data:{
    taskId:"TEST-FIBU-LOHN",active:true,checklistType:"Monat",categoryId,title:"Monatliche FiBu-Lohn-Abstimmung",
    mandatory:true,rhythm:"Monatlich",executionMonths:"1;2;3;4;5;6;7;8;9;10;11;12",
    legalFormGroups:"Alle",profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Ja",
    fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",
    permanentExtensionCondition:"Alle",knowledgeKey:"FIBU_LOHN_ABSTIMMUNG",sortOrder:10,professionalVersion:"TEST",
  }});
  await prisma.payrollReconciliationTopic.create({data:{
    key:"TEST_REISE",title:"Künstliche Reisekosten",reviewQuestion:"Gab es künstliche Reisekosten?",sortOrder:10,
    status:"Aktiv",validFrom:new Date("2026-01-01T00:00:00Z"),topicType:"Test",vehicleRelated:false,
    requiredStandardFields:JSON.stringify(["Person"]),requiredDocumentTypes:JSON.stringify(["Beleg"]),
    createdByUserId:management.id,
  }});
  await prisma.payrollReconciliationTopic.create({data:{
    key:"TEST_FAHRZEUG",title:"Künstliche Fahrzeuge",reviewQuestion:"Gab es künstliche Fahrzeugänderungen?",sortOrder:20,
    status:"Aktiv",validFrom:new Date("2026-01-01T00:00:00Z"),topicType:"Test",vehicleRelated:true,
    requiredStandardFields:"[]",requiredDocumentTypes:"[]",createdByUserId:management.id,
  }});
  await prisma.payrollReconciliationTopic.create({data:{
    key:"TEST_ARCHIV",title:"Archiviertes Thema",reviewQuestion:"Nicht verwenden",sortOrder:30,
    status:"Archiviert",validFrom:new Date("2026-01-01T00:00:00Z"),topicType:"Test",vehicleRelated:false,
    requiredStandardFields:"[]",requiredDocumentTypes:"[]",createdByUserId:management.id,
  }});
  const client=await prisma.client.create({data:{
    clientNumber:"L-TEST",name:"Künstlicher FiBu-Lohn-Mandant",processor:processor.fullName,reviewer:reviewer.fullName,
    managementName:management.fullName,processorUserId:processor.id,reviewerUserId:reviewer.id,
    managementUserId:management.id,payrollPreparedByFirm:true,payrollUserId:payroll.id,cadence:"monatlich",
    vatFilingPeriod:"Monatlich",active:true,
  }});
  clientId=client.id;
  await prisma.annualProfile.create({data:{
    clientId,calendarYear:2026,legalFormGroup:"Kapitalgesellschaft",profitDeterminationMethod:"Bilanzierung",
    hasCashRegister:false,hasPayroll:true,hasFixedAssets:true,hasReceivablesPayables:true,hasLoans:false,
    subjectToVat:true,hasPermanentExtension:false,
  }});
});

afterAll(async()=>{await cleanup();await prisma.$disconnect();});

async function periodAndReconciliation(month=1){
  const period=await createMonthlyPeriod(clientId,2026,month,month===1?{}:{administrativeException:true,actorName:management.fullName,reason:"Künstlicher Test mehrerer Monatsabstimmungen."});
  const reconciliation=await prisma.payrollReconciliation.findUniqueOrThrow({
    where:{accountingPeriodId:period.id},include:{items:{orderBy:{sortOrderSnapshot:"asc"}}},
  });
  return{period,reconciliation};
}

async function makeReady(reconciliationId:number){
  const items=await prisma.payrollReconciliationItem.findMany({where:{reconciliationId}});
  for(const item of items)await updatePayrollReconciliationItem(item.id,{status:"Kein Sachverhalt"},processor);
  return prisma.payrollReconciliation.findUniqueOrThrow({where:{id:reconciliationId},include:{items:true}});
}

describe("Mandantenkonfiguration und Snapshots",()=>{
  it("schützt Pflege und Archivierung des konfigurierbaren Themenkatalogs",async()=>{
    const input={
      key:"NEUES_TESTTHEMA",title:"Neues künstliches Thema",shortDescription:"Nur für den Test",
      reviewQuestion:"Ist ein künstlicher Sachverhalt vorhanden?",sortOrder:40,status:"Aktiv",
      validFrom:new Date("2026-01-01T00:00:00Z"),validUntil:null,topicType:"Test",vehicleRelated:false,
      followUpAllowed:false,campusStandardTaskId:null,requiredStandardFields:["Beschreibung"],
      requiredDocumentTypes:["Beleg"],notes:"Künstlich",
    };
    await expect(createPayrollTopic(input,administrator)).rejects.toMatchObject({code:"NOT_ALLOWED"});
    const topic=await createPayrollTopic(input,management);
    await updatePayrollTopic(topic.id,{...input,status:"Archiviert"},management);
    expect((await prisma.payrollReconciliationTopic.findUniqueOrThrow({where:{id:topic.id}})).status).toBe("Archiviert");
    expect(await prisma.payrollReconciliationTopicHistory.count({where:{topicId:topic.id}})).toBe(2);
  });

  it("erzeugt ohne Kanzleilohn keine Abstimmung",async()=>{
    await prisma.client.update({where:{id:clientId},data:{payrollPreparedByFirm:false,payrollUserId:null}});
    const period=await createMonthlyPeriod(clientId,2026,1);
    expect(await prisma.payrollReconciliation.count({where:{accountingPeriodId:period.id}})).toBe(0);
  });

  it("verlangt bei Kanzleilohn einen aktiven Lohnsachbearbeiter",async()=>{
    await expect(createClient({
      clientNumber:"L-FEHLT",name:"Künstlich ohne Lohnzuständigkeit",processor:null,reviewer:null,managementName:null,
      processorUserId:null,reviewerUserId:null,managementUserId:null,payrollPreparedByFirm:true,payrollUserId:null,
      vatFilingPeriod:"Monatlich",active:true,internalNote:null,
    })).rejects.toMatchObject({code:"INVALID_INPUT"});
  });

  it("bewahrt Zuständigkeit und Themen als historische Snapshots",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    await prisma.client.update({where:{id:clientId},data:{payrollUserId:secondPayroll.id}});
    await prisma.payrollReconciliationTopic.update({where:{key:"TEST_REISE"},data:{title:"Später geändertes Thema"}});
    const historical=await prisma.payrollReconciliation.findUniqueOrThrow({where:{id:reconciliation.id},include:{items:true}});
    expect(historical.payrollUserId).toBe(payroll.id);
    expect(historical.payrollUserNameSnapshot).toBe(payroll.fullName);
    expect(historical.items.map(item=>item.topicTitleSnapshot)).toContain("Künstliche Reisekosten");
    expect(historical.items).toHaveLength(2);
    const next=await periodAndReconciliation(2);
    expect(next.reconciliation.payrollUserId).toBe(secondPayroll.id);
    expect(next.reconciliation.items.map(item=>item.topicTitleSnapshot)).toContain("Später geändertes Thema");
  });

  it("verhindert eine zweite Abstimmung für denselben Mandanten und Lohnmonat",async()=>{
    const {period,reconciliation}=await periodAndReconciliation();
    await expect(createPayrollReconciliationForChecklist(period.id,reconciliation.checklistTaskId,{year:2026,month:2}))
      .rejects.toMatchObject({code:"DUPLICATE"});
  });

  it("kann den vorgeschlagenen Folgemonat vor der Übergabe kontrolliert korrigieren",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const updated=await changePayrollTargetMonth(reconciliation.id,{year:2026,month:3},processor);
    expect(updated).toMatchObject({accountingYear:2026,accountingMonth:1,payrollYear:2026,payrollMonth:3});
  });
});

describe("Rechnungswesen- und Lohnstatus",()=>{
  it("startet alle aktiven Themen ungeprüft und lässt archivierte Themen aus",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    expect(reconciliation.items).toHaveLength(2);
    expect(reconciliation.items.every(item=>item.status==="Noch nicht geprüft")).toBe(true);
    expect(reconciliation.items.map(item=>item.topicKeySnapshot)).not.toContain("TEST_ARCHIV");
  });

  it("blockiert offene oder vorbereitete Themen und erlaubt alle gültigen Endzustände",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    await expect(submitPayrollReconciliation(reconciliation.id,processor)).rejects.toMatchObject({code:"INCOMPLETE"});
    await updatePayrollReconciliationItem(reconciliation.items[0].id,{status:"Übergabe in Vorbereitung",details:{Person:"Künstlich"}},processor);
    await expect(submitPayrollReconciliation(reconciliation.id,processor)).rejects.toMatchObject({code:"INCOMPLETE"});
    const ready=await makeReady(reconciliation.id);
    expect(ready.accountingStatus).toBe("Übergabebereit");
    const submitted=await submitPayrollReconciliation(reconciliation.id,processor);
    expect(submitted).toMatchObject({accountingStatus:"Vollständig übergeben",payrollStatus:"Neu"});
  });

  it("validiert Pflichtangaben und Belege serverseitig",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const item=reconciliation.items.find(entry=>entry.topicKeySnapshot==="TEST_REISE")!;
    await expect(updatePayrollReconciliationItem(item.id,{status:"Vollständig an Lohn übergeben"},processor))
      .rejects.toMatchObject({code:"INCOMPLETE"});
    const document=await uploadPayrollDocument(item.id,{
      displayName:"Künstlicher Beleg",documentType:"Beleg",originalFileName:"test.pdf",mimeType:"application/pdf",
      bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34]),
    },processor);
    await updatePayrollReconciliationItem(item.id,{status:"Vollständig an Lohn übergeben",details:{Person:"Künstliche Person"}},processor);
    expect(document.storageKey).not.toContain("test.pdf");
    expect((await prisma.payrollReconciliationItem.findUniqueOrThrow({where:{id:item.id}})).status).toBe("Vollständig an Lohn übergeben");
  });

  it("führt Lohnstatus getrennt fort und verändert Monatscheckliste oder Prüfstatus nicht",async()=>{
    const {period,reconciliation}=await periodAndReconciliation();
    await makeReady(reconciliation.id);
    await submitPayrollReconciliation(reconciliation.id,processor);
    const periodStatusBefore=(await prisma.accountingPeriod.findUniqueOrThrow({where:{id:period.id}})).processingStatus;
    const taskBefore=await prisma.checklistTask.findUniqueOrThrow({where:{id:reconciliation.checklistTaskId}});
    await markPayrollReconciliationSeen(reconciliation.id,payroll);
    await completePayrollReconciliation(reconciliation.id,payroll);
    const periodAfter=await prisma.accountingPeriod.findUniqueOrThrow({where:{id:period.id}});
    const taskAfter=await prisma.checklistTask.findUniqueOrThrow({where:{id:reconciliation.checklistTaskId}});
    expect(periodAfter.processingStatus).toBe(periodStatusBefore);
    expect(taskAfter.reviewStatus).toBe(taskBefore.reviewStatus);
    expect(taskAfter.status).toBe("Erledigt");
    expect((await prisma.payrollReconciliation.findUniqueOrThrow({where:{id:reconciliation.id}})).payrollStatus).toBe("Erledigt");
  });

  it("Rückfrage, Antwort und Erledigung bleiben an Thema und Verlauf gebunden",async()=>{
    const {period,reconciliation}=await periodAndReconciliation();
    await makeReady(reconciliation.id);
    await submitPayrollReconciliation(reconciliation.id,processor);
    const periodStatusBefore=(await prisma.accountingPeriod.findUniqueOrThrow({where:{id:period.id}})).processingStatus;
    const reviewStatus=(await prisma.checklistTask.findUniqueOrThrow({where:{id:reconciliation.checklistTaskId}})).reviewStatus;
    const question=await createPayrollQuestion(reconciliation.items[0].id,"Künstliche fachliche Rückfrage.",payroll);
    expect(question.recipientUserId).toBe(processor.id);
    expect((await prisma.accountingPeriod.findUniqueOrThrow({where:{id:period.id}})).processingStatus).toBe(periodStatusBefore);
    expect((await prisma.checklistTask.findUniqueOrThrow({where:{id:reconciliation.checklistTaskId}})).reviewStatus).toBe(reviewStatus);
    await answerPayrollQuestion(question.id,"Künstliche nachvollziehbare Antwort.",processor);
    await completePayrollQuestion(question.id,payroll);
    expect((await prisma.payrollReconciliationQuestion.findUniqueOrThrow({where:{id:question.id}})).status).toBe("Erledigt durch Lohn");
    expect(await prisma.payrollReconciliationHistory.count({where:{reconciliationId:reconciliation.id}})).toBeGreaterThanOrEqual(5);
  });
});

describe("Berechtigungen, Fahrzeuge und Belege",()=>{
  it("trennt Rechnungswesen-, Prüf-, Lohn- und Administratorrechte",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    expect(canProcessPayrollReconciliation(processor,reconciliation)).toBe(true);
    expect(canReviewPayrollReconciliation(reviewer,reconciliation)).toBe(true);
    expect(canHandlePayrollReconciliation(payroll,reconciliation)).toBe(true);
    expect(canHandlePayrollReconciliation(administrator,reconciliation)).toBe(false);
    await expect(markPayrollReconciliationSeen(reconciliation.id,processor)).rejects.toMatchObject({code:"NOT_ALLOWED"});
    await expect(updatePayrollReconciliationItem(reconciliation.items[0].id,{status:"Kein Sachverhalt"},payroll))
      .rejects.toMatchObject({code:"NOT_ALLOWED"});
  });

  it("erlaubt Lohn nur den zugeordneten Fahrzeugbestand zu lesen, nicht zu ändern",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const item=reconciliation.items.find(entry=>entry.topicKeySnapshot==="TEST_FAHRZEUG")!;
    const vehicle=await createClientVehicle(clientId,{
      referenceNumber:"TEST-1",description:"Künstliches Leasingfahrzeug",userName:"Künstliche Person",
      userFunction:"Arbeitnehmer",contractAvailable:true,ownershipType:"Leasing",onePercentRule:true,
      logbook:false,commuteUse:true,validFrom:new Date("2026-01-01T00:00:00Z"),status:"Aktiv",
    },processor,item.id);
    await updateClientVehicle(vehicle.id,{
      referenceNumber:"TEST-1",description:"Künstliches Leasingfahrzeug",userName:"Künstliche Person Zwei",
      userFunction:"Arbeitnehmer",contractAvailable:true,ownershipType:"Leasing",onePercentRule:true,
      logbook:false,commuteUse:true,validFrom:new Date("2026-01-01T00:00:00Z"),status:"Aktiv",
    },"Nutzerwechsel",new Date("2026-02-01T00:00:00Z"),processor,item.id);
    const visible=await listClientVehicles(clientId,payroll);
    expect(visible[0].changes.map(change=>change.changeType)).toContain("Nutzerwechsel");
    await expect(createClientVehicle(clientId,{
      description:"Unzulässige Änderung durch Lohn",userName:"Künstlich",userFunction:"Arbeitnehmer",
      contractAvailable:false,ownershipType:"Eigentum",onePercentRule:false,logbook:false,commuteUse:false,
      validFrom:new Date(),status:"Aktiv",
    },payroll)).rejects.toMatchObject({code:"NOT_ALLOWED"});
  });

  it("schützt Belegtypen, Downloads, Archivierung und physische Pfade",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const item=reconciliation.items[0];
    await expect(uploadPayrollDocument(item.id,{
      displayName:"Schadhaft",documentType:"Beleg",originalFileName:"schadhaft.txt",mimeType:"text/plain",
      bytes:new TextEncoder().encode("nicht zulässig"),
    },processor)).rejects.toMatchObject({code:"INVALID_INPUT"});
    const document=await uploadPayrollDocument(item.id,{
      displayName:"Künstlicher PDF-Beleg",documentType:"Beleg",originalFileName:"sichtbarer-name.pdf",mimeType:"application/pdf",
      bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34]),
    },processor);
    expect(document.storageKey).not.toContain("sichtbarer-name");
    await expect(readPayrollDocument(document.id,administrator)).rejects.toMatchObject({code:"NOT_ALLOWED"});
    expect((await readPayrollDocument(document.id,payroll)).bytes.byteLength).toBeGreaterThan(0);
    await archivePayrollDocument(document.id,processor);
    expect((await prisma.payrollDocumentReference.findUniqueOrThrow({where:{id:document.id}})).status).toBe("Archiviert");
    expect(await prisma.payrollReconciliationHistory.count({where:{reconciliationItemId:item.id,action:{in:["Beleg hochgeladen","Beleg archiviert"]}}})).toBe(2);
  });

  it("verarbeitet übergebene Themen und blockiert den Lohnabschluss bei offenen Rückfragen",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const transferred=reconciliation.items[0];
    await updatePayrollReconciliationItem(transferred.id,{status:"Kein Sachverhalt"},processor);
    await updatePayrollReconciliationItem(reconciliation.items[1].id,{status:"Vollständig an Lohn übergeben",details:{}},processor);
    await submitPayrollReconciliation(reconciliation.id,processor);
    const question=await createPayrollQuestion(transferred.id,"Künstliche offene Rückfrage.",payroll);
    await expect(completePayrollReconciliation(reconciliation.id,payroll)).rejects.toMatchObject({code:"INCOMPLETE"});
    await answerPayrollQuestion(question.id,"Künstliche Antwort.",processor);
    await completePayrollQuestion(question.id,payroll);
    await markPayrollItemProcessed(reconciliation.items[1].id,payroll);
    expect((await completePayrollReconciliation(reconciliation.id,payroll)).payrollStatus).toBe("Erledigt");
  });

  it("blockiert den Lohnabschluss bis eine angekündigte Nachreichung bereitgestellt und abgeschlossen ist",async()=>{
    await prisma.payrollReconciliationTopic.update({where:{key:"TEST_REISE"},data:{followUpAllowed:true}});
    const {reconciliation}=await periodAndReconciliation();
    const item=reconciliation.items.find(entry=>entry.topicKeySnapshot==="TEST_REISE")!;
    await updatePayrollReconciliationItem(item.id,{
      status:"Vollständig an Lohn übergeben",details:{Person:"Künstliche Person"},documentToFollow:true,
      followUpReason:"Der ausschließlich künstliche Pflichtbeleg wird kontrolliert nachgereicht.",missingDocumentType:"Beleg",
    },processor);
    await updatePayrollReconciliationItem(reconciliation.items.find(entry=>entry.id!==item.id)!.id,{status:"Kein Sachverhalt"},processor);
    await submitPayrollReconciliation(reconciliation.id,processor);
    await expect(completePayrollReconciliation(reconciliation.id,payroll)).rejects.toMatchObject({code:"INCOMPLETE"});
    await uploadPayrollDocument(item.id,{
      displayName:"Künstliche Nachreichung",documentType:"Beleg",originalFileName:"nachreichung.pdf",
      mimeType:"application/pdf",bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31]),
    },processor);
    await completePayrollDocumentFollowUp(item.id,processor);
    await markPayrollItemProcessed(item.id,payroll);
    expect((await completePayrollReconciliation(reconciliation.id,payroll)).payrollStatus).toBe("Erledigt");
  });

  it("prüft alle erlaubten Dateitypen, Signaturen, Größen, Dateinamen und kollisionssichere Speicherpfade",async()=>{
    const {reconciliation}=await periodAndReconciliation();
    const item=reconciliation.items[0];
    const validFiles=[
      ["beleg.pdf","application/pdf",[0x25,0x50,0x44,0x46,0x2d]],
      ["beleg.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document",[0x50,0x4b,0x03,0x04]],
      ["beleg.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",[0x50,0x4b,0x03,0x04]],
      ["beleg.png","image/png",[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
      ["beleg.jpg","image/jpeg",[0xff,0xd8,0xff,0xdb]],
    ] as const;
    for(const [name,mime,bytes] of validFiles)await uploadPayrollDocument(item.id,{
      displayName:`Künstlich ${name}`,documentType:"Beleg",originalFileName:name,mimeType:mime,bytes:new Uint8Array(bytes),
    },processor);
    await expect(uploadPayrollDocument(item.id,{
      displayName:"Zu groß",documentType:"Beleg",originalFileName:"gross.pdf",mimeType:"application/pdf",
      bytes:new Uint8Array(15*1024*1024+1),
    },processor)).rejects.toMatchObject({code:"INVALID_INPUT"});
    for(const invalid of [
      {originalFileName:"programm.exe",mimeType:"application/octet-stream",bytes:new Uint8Array([0x4d,0x5a])},
      {originalFileName:"falsch.pdf",mimeType:"text/plain",bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d])},
      {originalFileName:"manipuliert.pdf",mimeType:"application/pdf",bytes:new TextEncoder().encode("kein PDF")},
      {originalFileName:"leer.pdf",mimeType:"application/pdf",bytes:new Uint8Array()},
    ])await expect(uploadPayrollDocument(item.id,{displayName:"Ungültig",documentType:"Beleg",...invalid},processor)).rejects.toMatchObject({code:"INVALID_INPUT"});
    const first=await uploadPayrollDocument(item.id,{
      displayName:"Pfadtest",documentType:"Beleg",originalFileName:"../../sichtbar.pdf",mimeType:"application/pdf",
      bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d]),
    },processor);
    const second=await uploadPayrollDocument(item.id,{
      displayName:"Kollisionstest",documentType:"Beleg",originalFileName:"sichtbar.pdf",mimeType:"application/pdf",
      bytes:new Uint8Array([0x25,0x50,0x44,0x46,0x2d]),
    },processor);
    expect(first.originalFileName).toBe("sichtbar.pdf");
    expect(first.storageKey).not.toContain("sichtbar");
    expect(first.storageKey).not.toBe(second.storageKey);
  });
});
