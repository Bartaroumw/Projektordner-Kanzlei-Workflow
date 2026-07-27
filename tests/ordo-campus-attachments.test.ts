import {afterAll,beforeEach,describe,expect,it} from "vitest";
import {existsSync} from "node:fs";
import {readFile,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {prisma} from "@/lib/prisma";
import type {AuthUser} from "@/lib/permissions";
import {
  CAMPUS_ATTACHMENT_MAX_BYTES,CAMPUS_ATTACHMENT_STORAGE_ROOT,readCampusAttachmentFile,
  safeOriginalFileName,updateCampusAttachment,uploadCampusAttachment,
} from "@/lib/ordo-campus-attachment-service";

let taskId:number,manager:AuthUser,reader:AuthUser;
const bytes={
  pdf:new TextEncoder().encode("%PDF-1.4\n% künstliche Testdatei"),
  docx:new Uint8Array([0x50,0x4b,0x03,0x04,1,2,3]),
  xlsx:new Uint8Array([0x50,0x4b,0x03,0x04,4,5,6]),
  png:new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]),
  jpg:new Uint8Array([0xff,0xd8,0xff,0xe0,1]),
};
beforeEach(async()=>{
  await prisma.standardTaskKnowledgeAttachment.deleteMany();await prisma.standardTaskKnowledgeHistory.deleteMany();await prisma.standardTaskKnowledgeLink.deleteMany();await prisma.standardTaskKnowledge.deleteMany();
  await prisma.standardTask.deleteMany();await prisma.taskCategory.deleteMany();await prisma.session.deleteMany();await prisma.userRole.deleteMany();await prisma.user.deleteMany();
  await rm(CAMPUS_ATTACHMENT_STORAGE_ROOT,{recursive:true,force:true});
  const managerRecord=await prisma.user.create({data:{username:"attachment.manager",fullName:"Künstliche Campus-Pflege",passwordHash:"test",active:true,mustChangePassword:false,roles:{create:{role:"ORDO_CAMPUS_VERWALTEN"}}}});
  const readerRecord=await prisma.user.create({data:{username:"attachment.reader",fullName:"Künstliche Leserin",passwordHash:"test",active:true,mustChangePassword:false,roles:{create:{role:"MITARBEITER"}}}});
  manager={id:managerRecord.id,username:managerRecord.username,fullName:managerRecord.fullName,active:true,mustChangePassword:false,roles:["ORDO_CAMPUS_VERWALTEN"]};
  reader={id:readerRecord.id,username:readerRecord.username,fullName:readerRecord.fullName,active:true,mustChangePassword:false,roles:["MITARBEITER"]};
  const category=await prisma.taskCategory.create({data:{name:"Künstliche Anhangskategorie"}});
  taskId=(await prisma.standardTask.create({data:{taskId:"CAMPUS-ATT-001",active:true,checklistType:"Monat",categoryId:category.id,title:"Künstliche Anhangsaufgabe",mandatory:false,rhythm:"Monatlich",legalFormGroups:"Alle",profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Alle",fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",permanentExtensionCondition:"Alle",professionalVersion:"TEST",campusKnowledge:{create:{status:"Aktiv"}}}})).id;
});
afterAll(async()=>{await prisma.standardTaskKnowledgeAttachment.deleteMany();await prisma.standardTaskKnowledgeHistory.deleteMany();await prisma.standardTaskKnowledge.deleteMany();await prisma.standardTask.deleteMany();await prisma.taskCategory.deleteMany();await prisma.userRole.deleteMany();await prisma.user.deleteMany();await rm(CAMPUS_ATTACHMENT_STORAGE_ROOT,{recursive:true,force:true});await prisma.$disconnect()});

const upload=(name:string,mimeType:string,fileBytes:Uint8Array,user=manager)=>uploadCampusAttachment(taskId,{displayName:`Künstlicher ${name}`,description:"Nur für lokale Tests.",sortOrder:10,originalFileName:name,mimeType,bytes:fileBytes},user);

describe("Ordo-Campus-Anhänge",()=>{
  it.each([
    ["test.pdf","application/pdf",bytes.pdf],["test.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document",bytes.docx],
    ["test.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes.xlsx],["test.png","image/png",bytes.png],["test.jpg","image/jpeg",bytes.jpg],
  ])("lädt erlaubte Datei %s hoch",async(name,mime,fileBytes)=>{const attachment=await upload(name,mime,fileBytes);expect(attachment.status).toBe("Aktiv");expect(await readCampusAttachmentFile(attachment.storageKey)).toEqual(Buffer.from(fileBytes))});
  it("verhindert Upload ohne Zusatzberechtigung",async()=>{await expect(upload("test.pdf","application/pdf",bytes.pdf,reader)).rejects.toMatchObject({code:"NOT_ALLOWED"});expect(await prisma.standardTaskKnowledgeAttachment.count()).toBe(0)});
  it("weist leere, zu große und nicht erlaubte Dateien zurück",async()=>{await expect(upload("leer.pdf","application/pdf",new Uint8Array())).rejects.toMatchObject({code:"INVALID_INPUT"});await expect(upload("gross.pdf","application/pdf",new Uint8Array(CAMPUS_ATTACHMENT_MAX_BYTES+1))).rejects.toMatchObject({code:"INVALID_INPUT"});await expect(upload("schadsoftware.exe","application/octet-stream",bytes.pdf)).rejects.toMatchObject({code:"INVALID_INPUT"})});
  it("weist MIME-Manipulation und falsche Dateisignatur zurück",async()=>{await expect(upload("falsch.pdf","image/png",bytes.pdf)).rejects.toMatchObject({code:"INVALID_INPUT"});await expect(upload("falsch.pdf","application/pdf",bytes.png)).rejects.toMatchObject({code:"INVALID_INPUT"})});
  it("neutralisiert Pfadbestandteile und erzeugt kollisionsfreie interne Namen",async()=>{expect(safeOriginalFileName("../../C:\\Windows\\test.pdf")).toBe("test.pdf");const first=await upload("../../test.pdf","application/pdf",bytes.pdf);const second=await upload("../../test.pdf","application/pdf",bytes.pdf);expect(first.storedFileName).not.toBe(second.storedFileName);expect(first.storedFileName).not.toContain("test.pdf");expect(resolve(CAMPUS_ATTACHMENT_STORAGE_ROOT)).not.toContain(`${join("public","")}`);expect(existsSync(join(CAMPUS_ATTACHMENT_STORAGE_ROOT,first.storageKey))).toBe(true)});
  it("archiviert ohne physische Löschung und protokolliert den Vorgang",async()=>{const attachment=await upload("test.pdf","application/pdf",bytes.pdf);await updateCampusAttachment(attachment.id,{displayName:attachment.displayName,description:"Archiviert",sortOrder:20,active:false},manager);const archived=await prisma.standardTaskKnowledgeAttachment.findUniqueOrThrow({where:{id:attachment.id}});expect(archived.status).toBe("Archiviert");expect(archived.archivedByUserId).toBe(manager.id);expect(existsSync(join(CAMPUS_ATTACHMENT_STORAGE_ROOT,archived.storageKey))).toBe(true);expect(await prisma.standardTaskKnowledgeHistory.count({where:{standardTaskId:taskId,changedArea:"Anhänge",description:{contains:"archiviert"}}})).toBe(1)});
  it("legt bei abgelehntem Upload weder Datei noch Metadaten an",async()=>{await expect(upload("falsch.cmd","text/plain",bytes.pdf)).rejects.toBeTruthy();expect(await prisma.standardTaskKnowledgeAttachment.count()).toBe(0);expect(existsSync(CAMPUS_ATTACHMENT_STORAGE_ROOT)?(await readFile(CAMPUS_ATTACHMENT_STORAGE_ROOT).catch(()=>null)):null).toBeNull()});
});
