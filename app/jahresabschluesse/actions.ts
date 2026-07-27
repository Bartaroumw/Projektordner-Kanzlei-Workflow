"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageClients, canManageCustomAnnualTasks, canViewClient } from "@/lib/permissions";
import {
  completeAnnualRework,
  createAnnualChecklist,
  createAnnualTaskFromMonthly,
  createCustomAnnualTask,
  reopenAnnualChecklist,
  reviewAnnualTask,
  transitionAnnualChecklist,
  updateAnnualTask,
  type AnnualAction,
} from "@/lib/annual-checklist-service";

const message=(error:unknown)=>encodeURIComponent(error instanceof Error?error.message:"Die Aktion konnte nicht ausgeführt werden.");
const isRedirect=(error:unknown)=>typeof error==="object"&&error!==null&&"digest" in error&&String(error.digest).startsWith("NEXT_REDIRECT");

export async function createAnnualChecklistAction(formData:FormData){
  const user=await requireUser();
  const clientId=Number(formData.get("clientId")),year=Number(formData.get("fiscalYear"));
  const client=await prisma.client.findUnique({where:{id:clientId}});
  if(!client||!canManageClients(user)||!canViewClient(user,client))throw new Error("Sie dürfen für diesen Mandanten keine Jahresabschlusscheckliste anlegen.");
  try{
    const checklist=await createAnnualChecklist(clientId,year,user);
    revalidatePath("/jahresabschluesse");revalidatePath(`/mandanten/${clientId}`);
    redirect(`/jahresabschluesse/${checklist.id}?erfolg=angelegt`);
  }catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/neu?clientId=${clientId}&fiscalYear=${year}&fehler=${message(error)}`)}
}

export async function updateAnnualTaskAction(taskId:number,checklistId:number,formData:FormData){
  const user=await requireUser();
  try{await updateAnnualTask(taskId,{status:String(formData.get("status")??""),processingNote:String(formData.get("processingNote")??""),notApplicableReason:String(formData.get("notApplicableReason")??"")},user);revalidatePath(`/jahresabschluesse/${checklistId}`);redirect(`/jahresabschluesse/${checklistId}?erfolg=aufgabe#aufgabe-${taskId}`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}#aufgabe-${taskId}`)}
}

export async function reviewAnnualTaskAction(taskId:number,checklistId:number,formData:FormData){
  const user=await requireUser();
  try{await reviewAnnualTask(taskId,{reviewStatus:String(formData.get("reviewStatus")??""),reviewNote:String(formData.get("reviewNote")??"")},user);revalidatePath(`/jahresabschluesse/${checklistId}`);redirect(`/jahresabschluesse/${checklistId}?erfolg=pruefung#aufgabe-${taskId}`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}#aufgabe-${taskId}`)}
}

export async function completeAnnualReworkAction(taskId:number,checklistId:number,formData:FormData){
  const user=await requireUser();
  try{await completeAnnualRework(taskId,String(formData.get("response")??""),user);revalidatePath(`/jahresabschluesse/${checklistId}`);redirect(`/jahresabschluesse/${checklistId}?erfolg=nachbearbeitung#aufgabe-${taskId}`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}#aufgabe-${taskId}`)}
}

export async function transitionAnnualAction(checklistId:number,action:AnnualAction,formData:FormData){
  const user=await requireUser();
  try{await transitionAnnualChecklist(checklistId,action,user,String(formData.get("note")??""));revalidatePath(`/jahresabschluesse/${checklistId}`);revalidatePath("/jahresabschluesse");redirect(`/jahresabschluesse/${checklistId}?erfolg=workflow`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}`)}
}

export async function reopenAnnualAction(checklistId:number,formData:FormData){
  const user=await requireUser();
  try{await reopenAnnualChecklist(checklistId,String(formData.get("reason")??""),user);revalidatePath(`/jahresabschluesse/${checklistId}`);redirect(`/jahresabschluesse/${checklistId}?erfolg=wiedereroeffnet`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}`)}
}

export async function createCustomAnnualTaskAction(checklistId:number,clientId:number,formData:FormData){
  const user=await requireUser(),client=await prisma.client.findUnique({where:{id:clientId}});
  if(!client||!canViewClient(user,client)||!canManageCustomAnnualTasks(user))throw new Error("Sie dürfen dauerhafte Jahresabschlussvorlagen nicht verwalten.");
  try{await createCustomAnnualTask({clientId,title:String(formData.get("title")??""),description:String(formData.get("description")??""),category:String(formData.get("category")??""),validFromYear:Number(formData.get("validFromYear")),validUntilYear:formData.get("validUntilYear")?Number(formData.get("validUntilYear")):null,mandatory:formData.get("mandatory")==="on",sortOrder:Number(formData.get("sortOrder"))||0});redirect(`/jahresabschluesse/${checklistId}?erfolg=vorlage`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}`)}
}

export async function createFromMonthlyAction(checklistId:number,monthlyTaskId:number){
  const user=await requireUser();
  try{await createAnnualTaskFromMonthly(checklistId,monthlyTaskId,user);revalidatePath(`/jahresabschluesse/${checklistId}`);redirect(`/jahresabschluesse/${checklistId}?erfolg=monatspunkt`)}
  catch(error){if(isRedirect(error))throw error;redirect(`/jahresabschluesse/${checklistId}?fehler=${message(error)}`)}
}
