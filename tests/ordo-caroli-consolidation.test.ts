import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import {
  calculateProgress,
  createMonthlyPeriod,
  decideChecklistTaskTransfer,
  nextMonth,
  previewMonthlyPeriod,
  proposeChecklistTaskTransfer,
  reviewChecklistTask,
  transitionPeriod,
  updateChecklistTask,
} from "@/lib/monthly-checklist-service";
import type { AuthUser } from "@/lib/permissions";

let clientId: number;
let processorUser:AuthUser;
let reviewerUser:AuthUser;
beforeEach(async () => {
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany({ where: { sourceTaskId: { not: null } } });
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  const processor=await prisma.user.upsert({where:{username:"consolidation.processor"},update:{active:true},create:{username:"consolidation.processor",fullName:"Mara Muster",passwordHash:"Künstlicher Hash",active:true,mustChangePassword:false}});
  const reviewer=await prisma.user.upsert({where:{username:"consolidation.reviewer"},update:{active:true},create:{username:"consolidation.reviewer",fullName:"Peter Prüfung",passwordHash:"Künstlicher Hash",active:true,mustChangePassword:false}});
  await prisma.userRole.upsert({where:{userId_role:{userId:processor.id,role:"MITARBEITER"}},update:{},create:{userId:processor.id,role:"MITARBEITER"}});
  await prisma.userRole.upsert({where:{userId_role:{userId:reviewer.id,role:"PRUEFER"}},update:{},create:{userId:reviewer.id,role:"PRUEFER"}});
  processorUser={id:processor.id,fullName:processor.fullName,username:processor.username,active:true,mustChangePassword:false,roles:["MITARBEITER"]};
  reviewerUser={id:reviewer.id,fullName:reviewer.fullName,username:reviewer.username,active:true,mustChangePassword:false,roles:["PRUEFER"]};
  const category = await prisma.taskCategory.create({ data: { name: "Künstliche Konsolidierung", sortOrder: 10 } });
  const client = await prisma.client.create({ data: {
    clientNumber: "OC-100", name: "Künstlicher Ordo-Mandant", processor: "Mara Muster",
    reviewer: "Peter Prüfung", managementName: "Karla Kanzleileitung",
    processorUserId:processor.id,reviewerUserId:reviewer.id,
    cadence: "monatlich", vatFilingPeriod: "Vierteljährlich", active: true,
  } });
  clientId = client.id;
  await prisma.annualProfile.create({ data: { clientId, calendarYear: 2026, legalFormGroup: "Einzelunternehmen", profitDeterminationMethod: "Einnahmenüberschussrechnung" } });
  await prisma.standardTask.create({ data: {
    taskId: "MON-OC-001", checklistType: "Monat", categoryId: category.id, title: "Künstliche Pflichtaufgabe",
    mandatory: true, rhythm: "Monatlich", legalFormGroups: "Alle", profitDeterminationMethods: "Alle",
    cashCondition: "Alle", payrollCondition: "Alle", fixedAssetsCondition: "Alle",
    receivablesPayablesCondition: "Alle", loansCondition: "Alle", vatCondition: "Alle",
    permanentExtensionCondition: "Alle", professionalVersion: "TEST-1",
  } });
});
afterAll(async()=>{
  await prisma.workflowHistory.deleteMany();
  await prisma.checklistTask.deleteMany({where:{sourceTaskId:{not:null}}});
  await prisma.checklistTask.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.customClientTask.deleteMany();
  await prisma.annualProfile.deleteMany();
  await prisma.client.deleteMany();
  await prisma.standardTask.deleteMany();
  await prisma.taskCategory.deleteMany();
  const testUsers=await prisma.user.findMany({where:{username:{in:["consolidation.processor","consolidation.reviewer"]}},select:{id:true}});
  await prisma.userRole.deleteMany({where:{userId:{in:testUsers.map(user=>user.id)}}});
  await prisma.user.deleteMany({where:{id:{in:testUsers.map(user=>user.id)}}});
  await prisma.$disconnect();
});

describe("Begriffe und Oberfläche",()=>{
  it("verwendet sichtbar den Produktnamen Ordo Caroli",()=>{
    expect(readFileSync("app/components/app-shell.tsx","utf8")).toContain("Ordo Caroli");
    expect(readFileSync("app/layout.tsx","utf8")).toContain('title: "Ordo Caroli"');
  });
  it("verwendet nicht mehr die Aktion Periode erzeugen",()=>{
    const files=["app/page.tsx","app/monatschecklisten/page.tsx","app/monatschecklisten/neu/page.tsx"];
    expect(files.map(file=>readFileSync(file,"utf8")).join("\n")).not.toContain("Periode erzeugen");
  });
  it("enthält weder Teamfilter noch Teamspalten in den zentralen Übersichten",()=>{
    const files=["app/page.tsx","app/mandanten/page.tsx","app/monatschecklisten/page.tsx"];
    expect(files.map(file=>readFileSync(file,"utf8")).join("\n")).not.toMatch(/Teamfilter|>Team<|label="Team"/);
  });
  it("stellt Toast und fokussierbare Fehlermeldungen bereit",()=>{
    const toast=readFileSync("app/components/toast-message.tsx","utf8");
    expect(toast).toContain('role={type === "error" ? "alert" : "status"}');
    expect(toast).toContain("document.getElementById(focusId)?.focus()");
  });
  it("schützt interaktive Elemente in vollständig anklickbaren Zeilen",()=>{
    const row=readFileSync("app/components/clickable-table-row.tsx","utf8");
    expect(row).toContain('closest("a,button,input,select,textarea,label")');
    expect(row).toContain('event.key === "Enter" || event.key === " "');
  });
  it("migriert Bezeichnungen additiv ohne Snapshot- oder Verlaufsdaten zu löschen",()=>{
    const sql=readFileSync("prisma/migrations/20260726193000_ordo_caroli_consolidation/migration.sql","utf8");
    expect(sql).toContain('UPDATE "AccountingPeriod"');
    expect(sql).not.toMatch(/DELETE FROM "(AccountingPeriod|ChecklistTask|WorkflowHistory)"/);
  });
});

describe("Monatliche Folge und Rollen",()=>{
  it("erlaubt trotz vierteljährlicher USt-Voranmeldung eine Februarcheckliste",async()=>{
    expect((await createMonthlyPeriod(clientId,2026,2)).periodLabel).toBe("Februar 2026");
  });
  it("verhindert eine zweite aktive Monatscheckliste",async()=>{
    await createMonthlyPeriod(clientId,2026,1);
    await expect(createMonthlyPeriod(clientId,2026,2)).rejects.toMatchObject({code:"ACTIVE_CHECKLIST_EXISTS"});
  });
  it("schlägt nach Abschluss den direkten Folgemonat vor",async()=>{
    const january=await createMonthlyPeriod(clientId,2026,1);
    await prisma.accountingPeriod.update({where:{id:january.id},data:{processingStatus:"Abgeschlossen",completedAt:new Date()}});
    expect(await previewMonthlyPeriod(clientId,2026,2)).toMatchObject({label:"Februar 2026"});
    await expect(previewMonthlyPeriod(clientId,2026,3)).rejects.toMatchObject({code:"CHECKLIST_SEQUENCE_INVALID"});
  });
  it("berechnet den Jahreswechsel korrekt",()=>expect(nextMonth(2026,12)).toEqual({year:2027,month:1}));
  it("bewahrt vollständige Rollen-Snapshots nach Stammdatenänderung",async()=>{
    const checklist=await createMonthlyPeriod(clientId,2026,1);
    await prisma.client.update({where:{id:clientId},data:{processor:"Neue Person",managementName:"Neue Leitung"}});
    expect(await prisma.accountingPeriod.findUniqueOrThrow({where:{id:checklist.id}})).toMatchObject({
      processorSnapshot:"Mara Muster",reviewerSnapshot:"Peter Prüfung",managementNameSnapshot:"Karla Kanzleileitung",
    });
  });
});

describe("Übertrag in den Folgemonat",()=>{
  it("verlangt Begründung und erwartete weitere Handlung",async()=>{
    const {task}=await firstChecklist();
    await expect(proposeChecklistTaskTransfer(task.id,{reason:"",targetYear:2026,targetMonth:2,expectedAction:""},processorUser)).rejects.toMatchObject({code:"TRANSFER_REASON_REQUIRED"});
  });
  it("behandelt einen Vorschlag als bearbeitungsseitig vollständig, erzeugt aber keine Zielaufgabe",async()=>{
    const {task}=await firstChecklist();
    await proposeChecklistTaskTransfer(task.id,{reason:"Künstliche Unterlage fehlt",targetYear:2026,targetMonth:2,expectedAction:"Unterlage nachfordern"},processorUser);
    const updated=await prisma.checklistTask.findUniqueOrThrow({where:{id:task.id}});
    expect(updated.status).toBe("Übertragung vorgeschlagen");
    expect(await prisma.checklistTask.count({where:{sourceTaskId:task.id}})).toBe(0);
    expect(calculateProgress([updated]).mandatoryOpen).toBe(0);
  });
  it("verhindert einen doppelten Übertragungsvorschlag",async()=>{
    const {task}=await firstChecklist();
    const input={reason:"Künstliche Unterlage fehlt",targetYear:2026,targetMonth:2,expectedAction:"Unterlage nachfordern"};
    await proposeChecklistTaskTransfer(task.id,input,processorUser);
    await expect(proposeChecklistTaskTransfer(task.id,input,processorUser)).rejects.toMatchObject({code:"TRANSFER_DUPLICATE"});
  });
  it("erzeugt erst nach Prüfergenehmigung im Folgemonat einen eigenständigen Snapshot mit Ursprungsbezug",async()=>{
    const {checklist,task}=await firstChecklist();
    await prisma.checklistTask.update({where:{id:task.id},data:{processingNote:"Vormonatsnotiz",reviewStatus:"Rückfrage",reviewNote:"Prüfnotiz bleibt erhalten"}});
    await proposeChecklistTaskTransfer(task.id,{reason:"Künstliche Unterlage fehlt",targetYear:2026,targetMonth:2,expectedAction:"Unterlage nachfordern"},processorUser);
    expect(await prisma.checklistTask.count({where:{sourceTaskId:task.id}})).toBe(0);
    await prisma.accountingPeriod.update({where:{id:checklist.id},data:{processingStatus:"Zur Prüfung"}});
    await decideChecklistTaskTransfer(task.id,"APPROVE","Übertrag fachlich geprüft.",reviewerUser);
    await prisma.accountingPeriod.update({where:{id:checklist.id},data:{processingStatus:"Abgeschlossen",completedAt:new Date()}});
    const february=await createMonthlyPeriod(clientId,2026,2);
    const carried=await prisma.checklistTask.findFirstOrThrow({where:{periodId:february.id,sourceTaskId:task.id}});
    expect(carried.origin).toContain("Übertrag aus Januar 2026");
    await prisma.checklistTask.update({where:{id:carried.id},data:{processingNote:"Folgemonat geändert"}});
    expect((await prisma.checklistTask.findUniqueOrThrow({where:{id:task.id}})).processingNote).toBe("Vormonatsnotiz");
  });
  it("lehnt nur mit Begründung ab und setzt die aktuelle Periode in Nachbearbeitung",async()=>{
    const {checklist,task}=await firstChecklist();
    await proposeChecklistTaskTransfer(task.id,{reason:"Künstliche Unterlage fehlt",targetYear:2026,targetMonth:2,expectedAction:"Unterlage nachfordern"},processorUser);
    await prisma.accountingPeriod.update({where:{id:checklist.id},data:{processingStatus:"Zur Prüfung"}});
    await expect(decideChecklistTaskTransfer(task.id,"REJECT","",reviewerUser)).rejects.toMatchObject({code:"TRANSFER_DECISION_REQUIRED"});
    await decideChecklistTaskTransfer(task.id,"REJECT","Bitte in der aktuellen Periode erledigen.",reviewerUser);
    expect(await prisma.accountingPeriod.findUniqueOrThrow({where:{id:checklist.id}})).toMatchObject({processingStatus:"Nachbearbeitung"});
    expect(await prisma.checklistTask.findUniqueOrThrow({where:{id:task.id}})).toMatchObject({status:"In Bearbeitung",transferStatus:"Abgelehnt",reviewStatus:"Beanstandung"});
    expect(await prisma.checklistTask.count({where:{sourceTaskId:task.id}})).toBe(0);
  });
});

describe("Automatischer Prüfungsbeginn",()=>{
  it("beginnt nicht beim Öffnen oder bei einer ungültigen Entscheidung, sondern erst nach erfolgreichem Speichern",async()=>{
    const {checklist,task}=await firstChecklist();
    await updateChecklistTask(task.id,{status:"Erledigt",processingNote:"Künstlich bearbeitet",processorInitials:processorUser.fullName,notApplicableReason:""});
    await transitionPeriod(checklist.id,"SUBMIT_REVIEW",processorUser.fullName);
    expect((await prisma.accountingPeriod.findUniqueOrThrow({where:{id:checklist.id}})).processingStatus).toBe("Zur Prüfung");
    await expect(reviewChecklistTask(task.id,{reviewStatus:"Beanstandung",reviewerInitials:reviewerUser.fullName,reviewNote:""},{reviewUser:reviewerUser})).rejects.toMatchObject({code:"REVIEW_NOTE_REQUIRED"});
    expect((await prisma.accountingPeriod.findUniqueOrThrow({where:{id:checklist.id}})).processingStatus).toBe("Zur Prüfung");
    await reviewChecklistTask(task.id,{reviewStatus:"In Ordnung",reviewerInitials:reviewerUser.fullName,reviewNote:"Künstlich geprüft"},{reviewUser:reviewerUser});
    expect((await prisma.accountingPeriod.findUniqueOrThrow({where:{id:checklist.id}})).processingStatus).toBe("In Prüfung");
    expect(await prisma.workflowHistory.count({where:{periodId:checklist.id,eventType:"Prüfung automatisch begonnen"}})).toBe(1);
  });
});

async function firstChecklist(){
  const checklist=await createMonthlyPeriod(clientId,2026,1);
  const task=await prisma.checklistTask.findFirstOrThrow({where:{periodId:checklist.id}});
  return {checklist,task};
}
