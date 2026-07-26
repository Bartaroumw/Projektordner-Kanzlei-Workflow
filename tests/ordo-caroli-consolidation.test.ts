import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import {
  calculateProgress,
  createMonthlyPeriod,
  nextMonth,
  previewMonthlyPeriod,
  transferChecklistTask,
} from "@/lib/monthly-checklist-service";

let clientId: number;
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
  const category = await prisma.taskCategory.create({ data: { name: "Künstliche Konsolidierung", sortOrder: 10 } });
  const client = await prisma.client.create({ data: {
    clientNumber: "OC-100", name: "Künstlicher Ordo-Mandant", processor: "Mara Muster",
    reviewer: "Peter Prüfung", managementName: "Karla Kanzleileitung",
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
afterAll(async()=>prisma.$disconnect());

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
  it("verlangt Begründung und vollständigen Namen",async()=>{
    const {task}=await firstChecklist();
    await expect(transferChecklistTask(task.id,{reason:"",actorName:"",targetYear:2026,targetMonth:2})).rejects.toMatchObject({code:"TRANSFER_REASON_REQUIRED"});
  });
  it("behandelt eine ordnungsgemäße Übertragung als abgeschlossen",async()=>{
    const {task}=await firstChecklist();
    await transferChecklistTask(task.id,{reason:"Künstliche Unterlage fehlt",actorName:"Mara Muster",targetYear:2026,targetMonth:2});
    const updated=await prisma.checklistTask.findUniqueOrThrow({where:{id:task.id}});
    expect(updated.status).toBe("In Folgemonat übertragen");
    expect(calculateProgress([updated]).mandatoryOpen).toBe(0);
  });
  it("verhindert eine doppelte Übertragung",async()=>{
    const {task}=await firstChecklist();
    const input={reason:"Künstliche Unterlage fehlt",actorName:"Mara Muster",targetYear:2026,targetMonth:2};
    await transferChecklistTask(task.id,input);
    await expect(transferChecklistTask(task.id,input)).rejects.toMatchObject({code:"TRANSFER_DUPLICATE"});
  });
  it("erzeugt im Folgemonat einen eigenständigen Snapshot mit Ursprungsbezug",async()=>{
    const {checklist,task}=await firstChecklist();
    await prisma.checklistTask.update({where:{id:task.id},data:{processingNote:"Vormonatsnotiz",reviewStatus:"Rückfrage",reviewNote:"Prüfnotiz bleibt erhalten"}});
    await transferChecklistTask(task.id,{reason:"Künstliche Unterlage fehlt",actorName:"Mara Muster",targetYear:2026,targetMonth:2,expectedAction:"Unterlage nachfordern"});
    await prisma.accountingPeriod.update({where:{id:checklist.id},data:{processingStatus:"Abgeschlossen",completedAt:new Date()}});
    const february=await createMonthlyPeriod(clientId,2026,2);
    const carried=await prisma.checklistTask.findFirstOrThrow({where:{periodId:february.id,sourceTaskId:task.id}});
    expect(carried).toMatchObject({origin:"Übertrag aus Vormonat",reviewNote:"Prüfnotiz bleibt erhalten",reviewStatus:"Rückfrage"});
    await prisma.checklistTask.update({where:{id:carried.id},data:{processingNote:"Folgemonat geändert"}});
    expect((await prisma.checklistTask.findUniqueOrThrow({where:{id:task.id}})).processingNote).toBe("Vormonatsnotiz");
  });
});

async function firstChecklist(){
  const checklist=await createMonthlyPeriod(clientId,2026,1);
  const task=await prisma.checklistTask.findFirstOrThrow({where:{periodId:checklist.id}});
  return {checklist,task};
}
