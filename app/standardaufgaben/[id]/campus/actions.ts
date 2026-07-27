"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createCampusLink, saveCampusKnowledge, updateCampusLink } from "@/lib/ordo-campus-service";
import { updateCampusAttachment, uploadCampusAttachment } from "@/lib/ordo-campus-attachment-service";

const text=(data:FormData,name:string)=>String(data.get(name)??"");
const bool=(data:FormData,name:string)=>data.get(name)==="on";
const target=(taskId:number)=>`/standardaufgaben/${taskId}/campus`;

export async function saveCampusKnowledgeAction(taskId:number,formData:FormData){
  const user=await requireUser();
  try{
    await saveCampusKnowledge(taskId,{
      shortDescription:text(formData,"shortDescription"),objective:text(formData,"objective"),
      processingGuidance:text(formData,"processingGuidance"),firmStandard:text(formData,"firmStandard"),
      reviewerGuidance:text(formData,"reviewerGuidance"),typicalErrors:text(formData,"typicalErrors"),
      internalHints:text(formData,"internalHints"),status:text(formData,"status"),
    },user);
  }catch(error){redirect(`${target(taskId)}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Das Wissen konnte nicht gespeichert werden.")}`)}
  revalidatePath(`/standardaufgaben/${taskId}`);
  revalidatePath("/standardaufgaben");
  redirect(`${target(taskId)}?erfolg=wissen`);
}

export async function createCampusLinkAction(taskId:number,formData:FormData){
  const user=await requireUser();
  try{
    await createCampusLink(taskId,{title:text(formData,"title"),url:text(formData,"url"),linkType:text(formData,"linkType"),description:text(formData,"description"),sortOrder:Number(formData.get("sortOrder")??0),active:true},user);
  }catch(error){redirect(`${target(taskId)}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Der Link konnte nicht gespeichert werden.")}`)}
  revalidatePath(target(taskId));
  redirect(`${target(taskId)}?erfolg=link`);
}

export async function updateCampusLinkAction(taskId:number,linkId:number,formData:FormData){
  const user=await requireUser();
  try{
    await updateCampusLink(linkId,{title:text(formData,"title"),url:text(formData,"url"),linkType:text(formData,"linkType"),description:text(formData,"description"),sortOrder:Number(formData.get("sortOrder")??0),active:bool(formData,"active")},user);
  }catch(error){redirect(`${target(taskId)}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Der Link konnte nicht gespeichert werden.")}`)}
  revalidatePath(target(taskId));
  redirect(`${target(taskId)}?erfolg=link`);
}

export async function uploadCampusAttachmentAction(taskId:number,formData:FormData){
  const user=await requireUser();
  const file=formData.get("file");
  try{
    if(!(file instanceof File))throw new Error("Bitte wählen Sie eine Datei aus.");
    await uploadCampusAttachment(taskId,{
      displayName:text(formData,"displayName"),description:text(formData,"description"),
      sortOrder:Number(formData.get("sortOrder")??0),originalFileName:file.name,mimeType:file.type,
      bytes:new Uint8Array(await file.arrayBuffer()),
    },user);
  }catch(error){redirect(`${target(taskId)}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Die Datei konnte nicht gespeichert werden.")}`)}
  revalidatePath(target(taskId));
  redirect(`${target(taskId)}?erfolg=anhang`);
}

export async function updateCampusAttachmentAction(taskId:number,attachmentId:number,formData:FormData){
  const user=await requireUser();
  try{
    await updateCampusAttachment(attachmentId,{
      displayName:text(formData,"displayName"),description:text(formData,"description"),
      sortOrder:Number(formData.get("sortOrder")??0),active:bool(formData,"active"),
    },user);
  }catch(error){redirect(`${target(taskId)}?fehler=${encodeURIComponent(error instanceof Error?error.message:"Der Anhang konnte nicht gespeichert werden.")}`)}
  revalidatePath(target(taskId));
  redirect(`${target(taskId)}?erfolg=anhang`);
}
