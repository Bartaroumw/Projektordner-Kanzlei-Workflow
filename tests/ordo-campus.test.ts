import {afterAll,beforeEach,describe,expect,it} from "vitest";
import {prisma} from "@/lib/prisma";
import type {AuthUser} from "@/lib/permissions";
import {canManageOrdoCampus,canReadCampusReviewerGuidance} from "@/lib/permissions";
import {campusContentIsVisible,createCampusLink,OrdoCampusError,saveCampusKnowledge,updateCampusLink} from "@/lib/ordo-campus-service";

let taskId:number,manager:AuthUser,reader:AuthUser;
beforeEach(async()=>{
  await prisma.standardTaskKnowledgeHistory.deleteMany();await prisma.standardTaskKnowledgeLink.deleteMany();await prisma.standardTaskKnowledge.deleteMany();
  await prisma.standardTask.deleteMany();await prisma.taskCategory.deleteMany();await prisma.session.deleteMany();await prisma.userRole.deleteMany();await prisma.user.deleteMany();
  const managerRecord=await prisma.user.create({data:{username:"campus.manager",fullName:"Künstliche Campus-Pflege",passwordHash:"test",active:true,mustChangePassword:false,roles:{create:{role:"ORDO_CAMPUS_VERWALTEN"}}}});
  const readerRecord=await prisma.user.create({data:{username:"campus.reader",fullName:"Künstliche Campus-Leserin",passwordHash:"test",active:true,mustChangePassword:false,roles:{create:{role:"MITARBEITER"}}}});
  manager={id:managerRecord.id,username:managerRecord.username,fullName:managerRecord.fullName,active:true,mustChangePassword:false,roles:["ORDO_CAMPUS_VERWALTEN"]};
  reader={id:readerRecord.id,username:readerRecord.username,fullName:readerRecord.fullName,active:true,mustChangePassword:false,roles:["MITARBEITER"]};
  const category=await prisma.taskCategory.create({data:{name:"Künstliche Campus-Kategorie"}});
  taskId=(await prisma.standardTask.create({data:{taskId:"CAMPUS-001",active:true,checklistType:"Monat",categoryId:category.id,title:"Künstliche Campus-Aufgabe",mandatory:true,rhythm:"Monatlich",legalFormGroups:"Alle",profitDeterminationMethods:"Alle",cashCondition:"Alle",payrollCondition:"Alle",fixedAssetsCondition:"Alle",receivablesPayablesCondition:"Alle",loansCondition:"Alle",vatCondition:"Alle",permanentExtensionCondition:"Alle",professionalVersion:"TEST"}})).id;
});
afterAll(async()=>{await prisma.standardTaskKnowledgeHistory.deleteMany();await prisma.standardTaskKnowledgeLink.deleteMany();await prisma.standardTaskKnowledge.deleteMany();await prisma.standardTask.deleteMany();await prisma.taskCategory.deleteMany();await prisma.userRole.deleteMany();await prisma.user.deleteMany();await prisma.$disconnect()});

const knowledge=(status="Aktiv")=>({shortDescription:"Künstlicher Überblick",objective:"Künstliches Ziel",processingGuidance:"Künstliche Anleitung",firmStandard:"Künstlicher verbindlicher Standard",reviewerGuidance:"Künstlicher Prüferhinweis",typicalErrors:"Künstlicher Fehler",internalHints:"Künstlicher interner Hinweis",status});
describe("Ordo Campus",()=>{
  it("verleiht Administratoren ohne Zusatzberechtigung kein fachliches Campus-Recht",()=>expect(canManageOrdoCampus({...reader,roles:["ADMINISTRATOR"]})).toBe(false));
  it("erlaubt die Pflege ausschließlich mit der Zusatzberechtigung",async()=>{await expect(saveCampusKnowledge(taskId,knowledge(),reader)).rejects.toBeInstanceOf(OrdoCampusError);expect(await prisma.standardTaskKnowledge.count()).toBe(0);await saveCampusKnowledge(taskId,knowledge(),manager);expect(await prisma.standardTaskKnowledge.count()).toBe(1)});
  it("speichert Status und unveränderlichen Änderungsverlauf mit Benutzer",async()=>{await saveCampusKnowledge(taskId,knowledge("Entwurf"),manager);await saveCampusKnowledge(taskId,{...knowledge("Aktiv"),firmStandard:"Geänderter künstlicher Kanzleistandard"},manager);const entries=await prisma.standardTaskKnowledgeHistory.findMany({where:{standardTaskId:taskId}});expect(entries.some(entry=>entry.changedArea==="Kanzleistandard")).toBe(true);expect(entries.some(entry=>entry.changedArea==="Status")).toBe(true);expect(entries.every(entry=>entry.actorUserId===manager.id&&entry.actorNameSnapshot===manager.fullName)).toBe(true)});
  it("zeigt Entwürfe nur berechtigten Benutzern und aktive Inhalte regulär",()=>{expect(campusContentIsVisible("Entwurf",reader)).toBe(false);expect(campusContentIsVisible("Entwurf",manager)).toBe(true);expect(campusContentIsVisible("Aktiv",reader)).toBe(true)});
  it("zeigt Prüferhinweise ausschließlich fachlich prüfenden Rollen",()=>{expect(canReadCampusReviewerGuidance(reader)).toBe(false);expect(canReadCampusReviewerGuidance({...reader,roles:["PRUEFER"]})).toBe(true);expect(canReadCampusReviewerGuidance({...reader,roles:["KANZLEILEITUNG"]})).toBe(true)});
  it("verwaltet strukturierte Links ohne lokale DATEV-Inhalte",async()=>{await saveCampusKnowledge(taskId,knowledge(),manager);const link=await createCampusLink(taskId,{title:"Künstliche DATEV-Hilfe",url:"https://example.invalid/hilfe",linkType:"DATEV Hilfe",description:"Nur künstliche Metadaten",sortOrder:10,active:true},manager);await updateCampusLink(link.id,{title:link.title,url:link.url,linkType:link.linkType,description:"Archivierter künstlicher Link",sortOrder:10,active:false},manager);expect((await prisma.standardTaskKnowledgeLink.findUniqueOrThrow({where:{id:link.id}})).active).toBe(false);expect(await prisma.standardTaskKnowledgeHistory.count({where:{standardTaskId:taskId,changedArea:"Wissenslinks"}})).toBe(2)});
  it("weist ungültige Linktypen und URLs zurück",async()=>{await saveCampusKnowledge(taskId,knowledge(),manager);await expect(createCampusLink(taskId,{title:"Fehler",url:"javascript:alert(1)",linkType:"Unbekannt",description:"",sortOrder:0,active:true},manager)).rejects.toMatchObject({code:"INVALID_INPUT"})});
});
