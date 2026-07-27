import { z } from "zod";
import type { AuthUser } from "@/lib/permissions";
import { canManageOrdoCampus } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const CAMPUS_STATUSES = ["Entwurf", "Aktiv", "Archiviert"] as const;
export const CAMPUS_LINK_TYPES = [
  "DATEV Hilfe",
  "DATEV Info-Dokument",
  "DATEV Lernplattform",
  "DATEV Lernvideo",
  "Gesetz",
  "Verwaltungsanweisung",
  "interne Wissensseite",
  "externe Fachquelle",
  "sonstiger Link",
] as const;

const optionalText = z.string().trim().max(20_000).transform(value => value || null);
export const campusKnowledgeSchema = z.object({
  shortDescription: optionalText,
  objective: optionalText,
  processingGuidance: optionalText,
  firmStandard: optionalText,
  reviewerGuidance: optionalText,
  typicalErrors: optionalText,
  internalHints: optionalText,
  status: z.enum(CAMPUS_STATUSES),
});
export const campusLinkSchema = z.object({
  title: z.string().trim().min(1, "Der Linktitel ist erforderlich.").max(300),
  url: z.string().trim().refine(value => value.startsWith("/") || /^https?:\/\/\S+$/i.test(value), "Bitte geben Sie eine gültige HTTP-, HTTPS- oder interne URL an."),
  linkType: z.enum(CAMPUS_LINK_TYPES),
  description: z.string().trim().max(2_000).transform(value => value || null),
  sortOrder: z.coerce.number().int().min(0).max(999_999),
  active: z.boolean(),
});

export type CampusKnowledgeInput = {
  shortDescription:string; objective:string; processingGuidance:string; firmStandard:string;
  reviewerGuidance:string; typicalErrors:string; internalHints:string; status:string;
};
export type CampusLinkInput = {
  title:string; url:string; linkType:string; description:string; sortOrder:number; active:boolean;
};

export class OrdoCampusError extends Error {
  constructor(message:string, public code:"NOT_ALLOWED"|"NOT_FOUND"|"INVALID_INPUT"){super(message)}
}

function authorize(user:AuthUser){
  if(!user.active||!canManageOrdoCampus(user))throw new OrdoCampusError("Sie sind nicht berechtigt, Ordo-Campus-Inhalte zu verwalten.","NOT_ALLOWED");
}

export async function saveCampusKnowledge(standardTaskId:number,input:CampusKnowledgeInput,user:AuthUser){
  authorize(user);
  const parsed=campusKnowledgeSchema.safeParse(input);
  if(!parsed.success)throw new OrdoCampusError(parsed.error.issues[0].message,"INVALID_INPUT");
  const task=await prisma.standardTask.findUnique({where:{id:standardTaskId},include:{campusKnowledge:true}});
  if(!task)throw new OrdoCampusError("Die Standardaufgabe wurde nicht gefunden.","NOT_FOUND");
  const previous=task.campusKnowledge;
  const areas:Array<[keyof typeof parsed.data,string]>=[
    ["shortDescription","Kurzbeschreibung"],["objective","Ziel der Aufgabe"],["processingGuidance","Bearbeitungshinweise"],
    ["firmStandard","Kanzleistandard"],["reviewerGuidance","Prüferhinweise"],["typicalErrors","Typische Fehler"],
    ["internalHints","Interne Hinweise"],["status","Status"],
  ];
  const changed=previous?areas.filter(([field])=>previous[field]!==parsed.data[field]).map(([,label])=>label):["Wissen"];
  return prisma.$transaction(async tx=>{
    const knowledge=await tx.standardTaskKnowledge.upsert({where:{standardTaskId},create:{standardTaskId,...parsed.data},update:parsed.data});
    for(const area of changed)await tx.standardTaskKnowledgeHistory.create({data:{
      knowledgeId:knowledge.id,standardTaskId,actorUserId:user.id,actorNameSnapshot:user.fullName,
      changedArea:area,description:previous?`${area} geändert.`:"Ordo-Campus-Wissen erstellt.",
    }});
    return knowledge;
  });
}

export async function createCampusLink(standardTaskId:number,input:CampusLinkInput,user:AuthUser){
  authorize(user);
  const parsed=campusLinkSchema.safeParse(input);
  if(!parsed.success)throw new OrdoCampusError(parsed.error.issues[0].message,"INVALID_INPUT");
  const knowledge=await prisma.standardTaskKnowledge.findUnique({where:{standardTaskId}});
  if(!knowledge)throw new OrdoCampusError("Bitte speichern Sie zuerst den Wissensbereich.","NOT_FOUND");
  return prisma.$transaction(async tx=>{
    const link=await tx.standardTaskKnowledgeLink.create({data:{knowledgeId:knowledge.id,...parsed.data}});
    await tx.standardTaskKnowledgeHistory.create({data:{knowledgeId:knowledge.id,standardTaskId,actorUserId:user.id,actorNameSnapshot:user.fullName,changedArea:"Wissenslinks",description:`Link „${link.title}“ ergänzt.`}});
    return link;
  });
}

export async function updateCampusLink(linkId:number,input:CampusLinkInput,user:AuthUser){
  authorize(user);
  const parsed=campusLinkSchema.safeParse(input);
  if(!parsed.success)throw new OrdoCampusError(parsed.error.issues[0].message,"INVALID_INPUT");
  const existing=await prisma.standardTaskKnowledgeLink.findUnique({where:{id:linkId},include:{knowledge:true}});
  if(!existing)throw new OrdoCampusError("Der Wissenslink wurde nicht gefunden.","NOT_FOUND");
  return prisma.$transaction(async tx=>{
    const link=await tx.standardTaskKnowledgeLink.update({where:{id:linkId},data:parsed.data});
    await tx.standardTaskKnowledgeHistory.create({data:{knowledgeId:existing.knowledgeId,standardTaskId:existing.knowledge.standardTaskId,actorUserId:user.id,actorNameSnapshot:user.fullName,changedArea:"Wissenslinks",description:`Link „${link.title}“ geändert${link.active?"":" und deaktiviert"}.`}});
    return link;
  });
}

export function campusContentIsVisible(status:string,user:AuthUser){
  return status==="Aktiv"||canManageOrdoCampus(user);
}

export async function getCampusKnowledgeForChecklistTask(kind:"Monat"|"Jahresabschluss",taskId:number,user:AuthUser){
  const task=kind==="Monat"
    ? await prisma.checklistTask.findUnique({where:{id:taskId},select:{standardTaskId:true}})
    : await prisma.annualChecklistTask.findUnique({where:{id:taskId},select:{standardTaskId:true}});
  if(!task?.standardTaskId)return null;
  const knowledge=await prisma.standardTaskKnowledge.findUnique({where:{standardTaskId:task.standardTaskId},include:{links:{where:canManageOrdoCampus(user)?{}:{active:true},orderBy:[{sortOrder:"asc"},{title:"asc"}]}}});
  return knowledge&&campusContentIsVisible(knowledge.status,user)?knowledge:null;
}
