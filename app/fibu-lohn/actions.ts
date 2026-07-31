"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  addPayrollReconciliationSupplement,
  answerPayrollQuestion,
  completePayrollDocumentFollowUp,
  completePayrollQuestion,
  completePayrollReconciliation,
  createPayrollQuestion,
  markPayrollItemProcessed,
  markPayrollReconciliationSeen,
  PayrollReconciliationError,
  submitPayrollReconciliation,
  updatePayrollReconciliationItem,
  createPayrollTopic,
  updatePayrollTopic,
  savePayrollPosition,
  duplicatePayrollPosition,
  removePayrollPosition,
} from "@/lib/payroll-reconciliation-service";
import { archivePayrollDocument } from "@/lib/payroll-document-service";
import { createClientVehicle, updateClientVehicle, type VehicleInput } from "@/lib/payroll-vehicle-service";

function text(formData:FormData,name:string){return String(formData.get(name)??"").trim()}
export type PayrollFormState={error?:string;success?:string};
function optionalDate(formData:FormData,name:string){const value=text(formData,name);return value?new Date(`${value}T00:00:00.000Z`):null}
function checkbox(formData:FormData,name:string){return formData.get(name)==="on"||formData.get(name)==="true"}
function numberOrNull(formData:FormData,name:string){const value=text(formData,name);if(!value)return null;const parsed=Number(value.replace(",", "."));return Number.isFinite(parsed)?Math.round(parsed*100):null}
function target(id:number,success?:string,error?:string,itemId?:number){
  const query=new URLSearchParams();
  if(success)query.set("erfolg",success);
  if(error)query.set("fehler",error);
  const suffix=query.size?`?${query.toString()}`:"";
  return `/fibu-lohn/${id}${suffix}${itemId?`#thema-${itemId}`:""}`;
}
function friendly(error:unknown){
  if(error instanceof PayrollReconciliationError)return error.message;
  console.error("FiBu-Lohn-Aktion fehlgeschlagen",error);
  return "Die Aktion konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.";
}
async function reconciliationIdForItem(itemId:number){
  const {prisma}=await import("@/lib/prisma");
  return (await prisma.payrollReconciliationItem.findUniqueOrThrow({where:{id:itemId},select:{reconciliationId:true}})).reconciliationId;
}
async function reconciliationIdForQuestion(questionId:number){
  const {prisma}=await import("@/lib/prisma");
  return (await prisma.payrollReconciliationQuestion.findUniqueOrThrow({where:{id:questionId},select:{reconciliationId:true,reconciliationItemId:true}}));
}

export async function updatePayrollItemAction(itemId:number,_state:PayrollFormState,formData:FormData):Promise<PayrollFormState>{
  const user=await requireUser();
  const reconciliationId=await reconciliationIdForItem(itemId);
  const details:Record<string,unknown>={};
  for(const [key,value] of formData.entries())if(key.startsWith("detail."))details[key.slice(7)]=typeof value==="string"?value.trim():value;
  try{
    const decision=text(formData,"decision");
    const status=decision
      ? decision==="Kein relevanter Sachverhalt"?"Kein Sachverhalt":decision==="Sachverhalt vorhanden"?"Übergabe in Vorbereitung":"Noch nicht geprüft"
      : text(formData,"status")||"Noch nicht geprüft";
    await updatePayrollReconciliationItem(itemId,{
      status,note:text(formData,"note"),details,
      documentToFollow:checkbox(formData,"documentToFollow"),followUpReason:text(formData,"followUpReason"),
      expectedFollowUpAt:optionalDate(formData,"expectedFollowUpAt"),missingDocumentType:text(formData,"missingDocumentType"),
    },user);
    revalidatePath(`/fibu-lohn/${reconciliationId}`);
    return{success:"Das Abstimmungsthema wurde gespeichert."};
  }catch(error){return{error:friendly(error)}}
}

export async function savePayrollPositionAction(itemId:number,positionId:number|null,formData:FormData){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{
    const details:Record<string,unknown>={};
    for(const [key,value] of formData.entries())if(key.startsWith("detail."))details[key.slice(7)]=typeof value==="string"?value.trim():value;
    await savePayrollPosition(itemId,positionId,{
      positionType:text(formData,"positionType") as "Einzelposition"|"Sammelposition",
      title:text(formData,"title"),caseCount:Number(text(formData,"caseCount"))||1,totalAmount:text(formData,"totalAmount"),
      period:text(formData,"period"),summary:text(formData,"summary"),people:text(formData,"people").split(/\r?\n/),
      details,requiredListType:text(formData,"requiredListType"),requiredListDocumentName:text(formData,"requiredListDocumentName"),
    },user);
    revalidatePath(`/fibu-lohn/${reconciliationId}`);
    redirect(target(reconciliationId,"position",undefined,itemId));
  }catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}

export async function duplicatePayrollPositionAction(positionId:number,itemId:number){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await duplicatePayrollPosition(positionId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"position-dupliziert",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}

export async function removePayrollPositionAction(positionId:number,itemId:number){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await removePayrollPosition(positionId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"position-entfernt",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}

export async function submitPayrollAction(reconciliationId:number,formData:FormData){
  const user=await requireUser();
  if(formData.get("confirmed")!=="on")redirect(target(reconciliationId,undefined,"Bitte bestätigen Sie die verbindliche Gesamtübergabe."));
  try{await submitPayrollReconciliation(reconciliationId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"uebergeben"))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error)))}
}
export async function markSeenAction(reconciliationId:number){
  const user=await requireUser();
  try{await markPayrollReconciliationSeen(reconciliationId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"gesehen"))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error)))}
}
export async function markProcessedAction(itemId:number){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await markPayrollItemProcessed(itemId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"verarbeitet",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}
export async function completePayrollAction(reconciliationId:number){
  const user=await requireUser();
  try{await completePayrollReconciliation(reconciliationId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"erledigt"))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error)))}
}
export async function createPayrollQuestionAction(itemId:number,formData:FormData){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await createPayrollQuestion(itemId,text(formData,"message"),user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"rueckfrage",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}
export async function answerPayrollQuestionAction(questionId:number,formData:FormData){
  const user=await requireUser();const question=await reconciliationIdForQuestion(questionId);
  try{await answerPayrollQuestion(questionId,text(formData,"answer"),user);revalidatePath(`/fibu-lohn/${question.reconciliationId}`);redirect(target(question.reconciliationId,"beantwortet",undefined,question.reconciliationItemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(question.reconciliationId,undefined,friendly(error),question.reconciliationItemId))}
}
export async function completePayrollQuestionAction(questionId:number){
  const user=await requireUser();const question=await reconciliationIdForQuestion(questionId);
  try{await completePayrollQuestion(questionId,user);revalidatePath(`/fibu-lohn/${question.reconciliationId}`);redirect(target(question.reconciliationId,"rueckfrage-erledigt",undefined,question.reconciliationItemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(question.reconciliationId,undefined,friendly(error),question.reconciliationItemId))}
}
export async function archivePayrollDocumentAction(documentId:number,reconciliationId:number,itemId:number){
  const user=await requireUser();
  try{await archivePayrollDocument(documentId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"beleg-archiviert",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}
export async function addPayrollSupplementAction(itemId:number,formData:FormData){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await addPayrollReconciliationSupplement(itemId,text(formData,"supplement"),user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"ergänzt",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}
export async function completePayrollFollowUpAction(itemId:number){
  const user=await requireUser();const reconciliationId=await reconciliationIdForItem(itemId);
  try{await completePayrollDocumentFollowUp(itemId,user);revalidatePath(`/fibu-lohn/${reconciliationId}`);redirect(target(reconciliationId,"nachreichung-erledigt",undefined,itemId))}
  catch(error){if(isRedirect(error))throw error;redirect(target(reconciliationId,undefined,friendly(error),itemId))}
}

function vehicleInput(formData:FormData):VehicleInput{
  return{
    referenceNumber:text(formData,"referenceNumber"),description:text(formData,"description"),licensePlate:text(formData,"licensePlate"),
    userName:text(formData,"userName"),userFunction:text(formData,"userFunction"),contractAvailable:checkbox(formData,"contractAvailable"),
    contractReference:text(formData,"contractReference"),contractDate:optionalDate(formData,"contractDate"),
    ownershipType:text(formData,"ownershipType"),grossListPriceCents:numberOrNull(formData,"grossListPrice"),
    documentReference:text(formData,"documentReference"),onePercentRule:checkbox(formData,"onePercentRule"),logbook:checkbox(formData,"logbook"),
    commuteUse:checkbox(formData,"commuteUse"),accountingAccount:text(formData,"accountingAccount"),accountingBasis:text(formData,"accountingBasis"),
    accountingExplanation:text(formData,"accountingExplanation"),validFrom:optionalDate(formData,"validFrom")??new Date(),
    validUntil:optionalDate(formData,"validUntil"),status:text(formData,"status")||"Aktiv",note:text(formData,"note"),
  };
}
export async function createVehicleAction(clientId:number,reconciliationItemId:number|undefined,formData:FormData){
  const user=await requireUser();
  const effectiveClientId=clientId||Number(text(formData,"clientId"));
  try{
    const vehicle=await createClientVehicle(effectiveClientId,vehicleInput(formData),user,reconciliationItemId);
    const returnTo=text(formData,"returnTo");
    revalidatePath(`/fibu-lohn/fahrzeuge/${vehicle.id}`);
    redirect(returnTo?`${returnTo}?erfolg=fahrzeug#thema-${reconciliationItemId}`:`/fibu-lohn/fahrzeuge/${vehicle.id}?erfolg=angelegt`);
  }catch(error){if(isRedirect(error))throw error;redirect(`/fibu-lohn/fahrzeuge/neu?clientId=${effectiveClientId||""}&fehler=${encodeURIComponent(friendly(error))}${reconciliationItemId?`&itemId=${reconciliationItemId}`:""}`)}
}
export async function updateVehicleAction(vehicleId:number,formData:FormData){
  const user=await requireUser();
  try{
    await updateClientVehicle(vehicleId,vehicleInput(formData),text(formData,"changeType")||"Fahrzeug geändert",optionalDate(formData,"effectiveFrom")??new Date(),user,Number(text(formData,"reconciliationItemId"))||undefined);
    revalidatePath(`/fibu-lohn/fahrzeuge/${vehicleId}`);redirect(`/fibu-lohn/fahrzeuge/${vehicleId}?erfolg=gespeichert`);
  }catch(error){if(isRedirect(error))throw error;redirect(`/fibu-lohn/fahrzeuge/${vehicleId}/bearbeiten?fehler=${encodeURIComponent(friendly(error))}`)}
}

function topicInput(formData:FormData){
  return{
    key:text(formData,"key"),title:text(formData,"title"),shortDescription:text(formData,"shortDescription"),
    reviewQuestion:text(formData,"reviewQuestion"),sortOrder:Number(text(formData,"sortOrder"))||0,status:text(formData,"status")||"Aktiv",
    validFrom:optionalDate(formData,"validFrom")??new Date(),validUntil:optionalDate(formData,"validUntil"),
    topicType:text(formData,"topicType")||"Monatliche QM-Abstimmung",vehicleRelated:checkbox(formData,"vehicleRelated"),
    followUpAllowed:checkbox(formData,"followUpAllowed"),campusStandardTaskId:Number(text(formData,"campusStandardTaskId"))||null,
    requiredStandardFields:text(formData,"requiredStandardFields").split(";").map(value=>value.trim()).filter(Boolean),
    requiredDocumentTypes:text(formData,"requiredDocumentTypes").split(";").map(value=>value.trim()).filter(Boolean),
    notes:text(formData,"notes"),
  };
}
export async function createPayrollTopicAction(formData:FormData){
  const user=await requireUser();
  try{await createPayrollTopic(topicInput(formData),user);revalidatePath("/fibu-lohn/themen");redirect("/fibu-lohn/themen?erfolg=angelegt")}
  catch(error){if(isRedirect(error))throw error;redirect(`/fibu-lohn/themen/neu?fehler=${encodeURIComponent(friendly(error))}`)}
}
export async function updatePayrollTopicAction(topicId:number,formData:FormData){
  const user=await requireUser();
  try{await updatePayrollTopic(topicId,topicInput(formData),user);revalidatePath("/fibu-lohn/themen");redirect("/fibu-lohn/themen?erfolg=gespeichert")}
  catch(error){if(isRedirect(error))throw error;redirect(`/fibu-lohn/themen/${topicId}/bearbeiten?fehler=${encodeURIComponent(friendly(error))}`)}
}

function isRedirect(error:unknown){return typeof error==="object"&&error!==null&&"digest" in error&&String(error.digest).startsWith("NEXT_REDIRECT")}
