import type { AnnualProfile, StandardTask, TaskCategory } from "@prisma/client";
import { prisma } from "./prisma.ts";
import type { AuthUser } from "./permissions.ts";
import { checklistCompletionMessage } from "./checklist-workflow-rules.ts";

export const ANNUAL_STATUSES = ["Offen", "In Vorbereitung", "Zur Prüfung", "In Prüfung", "Nachbearbeitung", "Fachlich abgeschlossen", "Zur Freigabe", "Freigegeben"] as const;
export const ANNUAL_TASK_STATUSES = ["Offen", "In Bearbeitung", "Erledigt", "Nicht zutreffend"] as const;
export const ANNUAL_REVIEW_STATUSES = ["Nicht geprüft", "In Prüfung", "In Ordnung", "Rückfrage", "Beanstandung", "Erledigt nach Nachbearbeitung"] as const;

export class AnnualChecklistError extends Error {
  constructor(public code: "CLIENT_NOT_FOUND"|"PROFILE_MISSING"|"ROLE_MISSING"|"CHECKLIST_EXISTS"|"INVALID_INPUT"|"NOT_ALLOWED"|"INVALID_TRANSITION"|"MANDATORY_OPEN"|"REVIEW_POINTS_OPEN"|"REASON_REQUIRED"|"LOCKED"|"CONFLICT", message: string) {
    super(message);
  }
}

type TaskWithCategory = StandardTask & { category: TaskCategory };
const values=(stored:string)=>stored.split(";").map(value=>value.trim());
const multiMatches=(stored:string,actual:string)=>values(stored).includes("Alle")||values(stored).includes(actual);
const conditionMatches=(condition:string,actual:boolean)=>condition==="Alle"||(condition==="Ja"?actual:!actual);

export function annualStandardTaskMatches(task:TaskWithCategory, profile:AnnualProfile) {
  return task.active &&
    ["Jahresabschluss","Beide"].includes(task.checklistType) &&
    (task.checklistType === "Beide" || task.rhythm === "Jährlich") &&
    multiMatches(task.legalFormGroups,profile.legalFormGroup) &&
    multiMatches(task.profitDeterminationMethods,profile.profitDeterminationMethod) &&
    conditionMatches(task.cashCondition,profile.hasCashRegister) &&
    conditionMatches(task.payrollCondition,profile.hasPayroll) &&
    conditionMatches(task.fixedAssetsCondition,profile.hasFixedAssets) &&
    conditionMatches(task.receivablesPayablesCondition,profile.hasReceivablesPayables) &&
    conditionMatches(task.loansCondition,profile.hasLoans) &&
    conditionMatches(task.vatCondition,profile.subjectToVat) &&
    conditionMatches(task.permanentExtensionCondition,profile.hasPermanentExtension);
}

export function annualProgress(tasks:Array<{status:string;mandatorySnapshot:boolean;reviewStatus:string;notApplicableReason?:string|null}>) {
  const completed=tasks.filter(task=>["Erledigt","Nicht zutreffend"].includes(task.status)).length;
  const mandatoryOpen=tasks.filter(task=>task.mandatorySnapshot&&!["Erledigt","Nicht zutreffend"].includes(task.status)).length;
  const openReviewPoints=tasks.filter(task=>["Rückfrage","Beanstandung"].includes(task.reviewStatus)).length;
  return {total:tasks.length,completed,percent:tasks.length?Math.round(completed/tasks.length*100):0,mandatoryOpen,openReviewPoints};
}

function roleSnapshot(user:AuthUser){return user.roles.join(", ")}
async function history(checklistId:number,user:AuthUser,eventType:string,description:string,previousValue?:string,newValue?:string,taskId?:number,reason?:string){
  await prisma.annualWorkflowHistory.create({data:{annualChecklistId:checklistId,annualChecklistTaskId:taskId,actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:roleSnapshot(user),eventType,description,previousValue,newValue,reason}});
}

export async function createAnnualChecklist(clientId:number,fiscalYear:number,user:AuthUser) {
  if(!Number.isInteger(fiscalYear)||fiscalYear<2000||fiscalYear>2100)throw new AnnualChecklistError("INVALID_INPUT","Bitte geben Sie ein gültiges Wirtschaftsjahr an.");
  const client=await prisma.client.findUnique({where:{id:clientId},include:{annualProfiles:{where:{calendarYear:fiscalYear}},processorUser:{include:{roles:true}},reviewerUser:{include:{roles:true}},managementUser:{include:{roles:true}}}});
  if(!client||!client.active)throw new AnnualChecklistError("CLIENT_NOT_FOUND","Der aktive Mandant wurde nicht gefunden.");
  const profile=client.annualProfiles[0];
  if(!profile)throw new AnnualChecklistError("PROFILE_MISSING",`Für ${fiscalYear} ist kein Jahresprofil vorhanden.`);
  if(!client.processorUser?.active||!client.reviewerUser?.active||!client.managementUser?.active)throw new AnnualChecklistError("ROLE_MISSING","Bearbeiter, Prüfer und Kanzleileitung müssen als aktive Benutzer zugeordnet sein.");
  const processorUser=client.processorUser,reviewerUser=client.reviewerUser,managementUser=client.managementUser;
  const hasAny=(roles:Array<{role:string}>,allowed:string[])=>allowed.some(role=>roles.some(entry=>entry.role===role));
  if(!hasAny(processorUser.roles,["MITARBEITER","PRUEFER","KANZLEILEITUNG"])||!hasAny(reviewerUser.roles,["PRUEFER","KANZLEILEITUNG"])||!hasAny(managementUser.roles,["KANZLEILEITUNG"]))throw new AnnualChecklistError("ROLE_MISSING","Die zugeordneten Benutzer besitzen nicht alle erforderlichen fachlichen Rollen.");
  if(await prisma.annualChecklist.count({where:{clientId,fiscalYear}}))throw new AnnualChecklistError("CHECKLIST_EXISTS","Für dieses Wirtschaftsjahr besteht bereits eine Jahresabschlusscheckliste.");
  const standardTasks=(await prisma.standardTask.findMany({where:{active:true},include:{category:true}})).filter(task=>annualStandardTaskMatches(task,profile));
  const customTasks=await prisma.customAnnualTask.findMany({where:{clientId,active:true,validFromYear:{lte:fiscalYear},OR:[{validUntilYear:null},{validUntilYear:{gte:fiscalYear}}]}});
  const checklist=await prisma.$transaction(async tx=>{
    const created=await tx.annualChecklist.create({data:{
      clientId,fiscalYear,closingDate:new Date(Date.UTC(fiscalYear,11,31)),legalFormSnapshot:profile.legalFormGroup,profitDeterminationSnapshot:profile.profitDeterminationMethod,
      processorUserId:client.processorUserId!,reviewerUserId:client.reviewerUserId!,managementUserId:client.managementUserId!,
      processorNameSnapshot:processorUser.fullName,reviewerNameSnapshot:reviewerUser.fullName,managementNameSnapshot:managementUser.fullName,
    }});
    if(standardTasks.length)await tx.annualChecklistTask.createMany({data:standardTasks.map(task=>({
      annualChecklistId:created.id,standardTaskId:task.id,taskIdSnapshot:task.taskId,categorySnapshot:task.category.name,categorySortOrder:task.category.sortOrder,
      titleSnapshot:task.title,workInstructionSnapshot:task.workInstruction,reviewInstructionSnapshot:task.reviewInstruction,mandatorySnapshot:task.mandatory,
      sortOrderSnapshot:task.sortOrder,professionalVersionSnapshot:task.professionalVersion,origin:"Standardaufgabe",
    }))});
    if(customTasks.length)await tx.annualChecklistTask.createMany({data:customTasks.map(task=>({
      annualChecklistId:created.id,customAnnualTaskId:task.id,taskIdSnapshot:`JA-MAND-${task.id}`,categorySnapshot:task.category,titleSnapshot:task.title,
      workInstructionSnapshot:task.description,mandatorySnapshot:task.mandatory,sortOrderSnapshot:task.sortOrder,origin:"Mandantenspezifisch",
    }))});
    return created;
  });
  await history(checklist.id,user,"Jahresabschlusscheckliste angelegt",`Jahresabschlusscheckliste ${fiscalYear} wurde mit unveränderlichen Rollen- und Aufgabensnapshots angelegt.`,undefined,"Offen");
  return checklist;
}

export async function updateAnnualTask(taskId:number,input:{status:string;processingNote:string;notApplicableReason:string;expectedUpdatedAt?:string},user:AuthUser){
  const task=await prisma.annualChecklistTask.findUnique({where:{id:taskId},include:{annualChecklist:true}});
  if(!task)throw new AnnualChecklistError("INVALID_INPUT","Die Aufgabe wurde nicht gefunden.");
  if(input.expectedUpdatedAt&&task.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new AnnualChecklistError("CONFLICT",`Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
  if(task.annualChecklist.processorUserId!==user.id)throw new AnnualChecklistError("NOT_ALLOWED","Nur der zugeordnete Bearbeiter darf diese Aufgabe bearbeiten.");
  if(!["Offen","In Vorbereitung","Nachbearbeitung"].includes(task.annualChecklist.status))throw new AnnualChecklistError("LOCKED","Die Jahresabschlusscheckliste ist für die Bearbeitung gesperrt.");
  if(!ANNUAL_TASK_STATUSES.includes(input.status as never))throw new AnnualChecklistError("INVALID_INPUT","Der Aufgabenstatus ist ungültig.");
  if(input.status==="Nicht zutreffend"&&!input.notApplicableReason.trim())throw new AnnualChecklistError("REASON_REQUIRED","Nicht zutreffend verlangt eine Begründung.");
  const processingNote=input.processingNote.trim();
  const nextReason=input.status==="Nicht zutreffend"?input.notApplicableReason.trim():task.notApplicableReason;
  const write=await prisma.annualChecklistTask.updateMany({where:{id:taskId,updatedAt:task.updatedAt},data:{status:input.status,processingNote:processingNote||null,notApplicableReason:nextReason,processedByName:user.fullName,processedAt:new Date()}});
  if(write.count!==1)throw new AnnualChecklistError("CONFLICT",`Die Aufgabe „${task.titleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
  const updated=await prisma.annualChecklistTask.findUniqueOrThrow({where:{id:taskId}});
  if(task.annualChecklist.status==="Offen")await prisma.annualChecklist.update({where:{id:task.annualChecklistId},data:{status:"In Vorbereitung"}});
  await history(task.annualChecklistId,user,"Aufgabe bearbeitet",`${task.taskIdSnapshot} wurde bearbeitet.`,task.status,input.status,task.id);
  if((task.processingNote??"")!==processingNote)await history(task.annualChecklistId,user,"Bearbeitungsnotiz geändert",`Bearbeitungsnotiz zu ${task.taskIdSnapshot} wurde geändert.`,undefined,undefined,task.id);
  if((task.notApplicableReason??"")!==(nextReason??""))await history(task.annualChecklistId,user,"Begründung geändert",`Begründung für „Nicht zutreffend“ zu ${task.taskIdSnapshot} wurde geändert.`,undefined,undefined,task.id);
  return updated;
}

export async function reviewAnnualTask(taskId:number,input:{reviewStatus:string;reviewNote:string},user:AuthUser){
  const task=await prisma.annualChecklistTask.findUnique({where:{id:taskId},include:{annualChecklist:true}});
  if(!task)throw new AnnualChecklistError("INVALID_INPUT","Die Aufgabe wurde nicht gefunden.");
  if(task.annualChecklist.reviewerUserId!==user.id)throw new AnnualChecklistError("NOT_ALLOWED","Nur der zugeordnete Prüfer darf diese Aufgabe prüfen.");
  if(task.annualChecklist.status!=="In Prüfung")throw new AnnualChecklistError("INVALID_TRANSITION","Aufgaben können nur im Status „In Prüfung“ geprüft werden.");
  const note=input.reviewNote.trim(),issue=["Rückfrage","Beanstandung"].includes(input.reviewStatus);
  if(!ANNUAL_REVIEW_STATUSES.includes(input.reviewStatus as never)||input.reviewStatus==="Nicht geprüft")throw new AnnualChecklistError("INVALID_INPUT","Der Prüfstatus ist ungültig.");
  if(issue&&!note)throw new AnnualChecklistError("REASON_REQUIRED","Rückfrage und Beanstandung verlangen eine Prüfnotiz.");
  const updated=await prisma.annualChecklistTask.update({where:{id:taskId},data:{reviewStatus:input.reviewStatus,reviewNote:note||task.reviewNote,reviewedByName:user.fullName,reviewedAt:new Date(),reviewIssueCreatedAt:issue?new Date():task.reviewIssueCreatedAt}});
  await history(task.annualChecklistId,user,issue?input.reviewStatus:"Prüfstatus geändert",`${task.taskIdSnapshot}: Prüfstatus ${input.reviewStatus} durch ${user.fullName} in der Funktion Prüfer.`,task.reviewStatus,input.reviewStatus,task.id);
  if(issue){
    await prisma.annualChecklist.update({where:{id:task.annualChecklistId},data:{status:"Nachbearbeitung",returnedAt:new Date()}});
    await history(task.annualChecklistId,user,"Zur Nachbearbeitung zurückgegeben",`${task.taskIdSnapshot} wurde wegen ${input.reviewStatus.toLocaleLowerCase("de-DE")} an den Bearbeiter zurückgegeben.`,task.annualChecklist.status,"Nachbearbeitung",task.id);
  }
  return updated;
}

export async function completeAnnualRework(taskId:number,response:string,user:AuthUser){
  const task=await prisma.annualChecklistTask.findUnique({where:{id:taskId},include:{annualChecklist:true}});
  if(!task||task.annualChecklist.status!=="Nachbearbeitung"||!["Rückfrage","Beanstandung"].includes(task.reviewStatus))throw new AnnualChecklistError("INVALID_TRANSITION","Die Aufgabe besitzt keinen offenen Prüfpunkt in Nachbearbeitung.");
  if(task.annualChecklist.processorUserId!==user.id)throw new AnnualChecklistError("NOT_ALLOWED","Nur der Bearbeiter darf antworten.");
  if(!response.trim())throw new AnnualChecklistError("REASON_REQUIRED","Bitte erfassen Sie eine Antwort.");
  const updated=await prisma.annualChecklistTask.update({where:{id:taskId},data:{processorResponse:response.trim(),respondedByName:user.fullName,respondedAt:new Date(),reviewStatus:"Erledigt nach Nachbearbeitung"}});
  await history(task.annualChecklistId,user,"Nachbearbeitung erledigt",`${task.taskIdSnapshot} wurde beantwortet.`,task.reviewStatus,"Erledigt nach Nachbearbeitung",task.id);
  return updated;
}

export type AnnualAction="BEGIN"|"SUBMIT_REVIEW"|"BEGIN_REVIEW"|"RETURN_REWORK"|"PROFESSIONAL_COMPLETE"|"SUBMIT_RELEASE"|"RELEASE";
export async function transitionAnnualChecklist(checklistId:number,action:AnnualAction,user:AuthUser,note=""){
  const checklist=await prisma.annualChecklist.findUnique({where:{id:checklistId},include:{tasks:true}});
  if(!checklist)throw new AnnualChecklistError("INVALID_INPUT","Die Jahresabschlusscheckliste wurde nicht gefunden.");
  const summary=annualProgress(checklist.tasks);
  const isProcessor=checklist.processorUserId===user.id,isReviewer=checklist.reviewerUserId===user.id,isManagement=checklist.managementUserId===user.id;
  let next:string;
  if(action==="BEGIN"&&checklist.status==="Offen"&&isProcessor)next="In Vorbereitung";
  else if(action==="SUBMIT_REVIEW"&&["In Vorbereitung","Nachbearbeitung"].includes(checklist.status)&&isProcessor){
    if(summary.mandatoryOpen)throw new AnnualChecklistError("MANDATORY_OPEN",`${summary.mandatoryOpen} Pflichtaufgaben sind noch offen.`);
    if(summary.openReviewPoints)throw new AnnualChecklistError("REVIEW_POINTS_OPEN","Offene Prüfpunkte müssen beantwortet werden.");
    next="Zur Prüfung";
  } else if(action==="BEGIN_REVIEW"&&checklist.status==="Zur Prüfung"&&isReviewer)next="In Prüfung";
  else if(action==="RETURN_REWORK"&&["In Prüfung","Nachbearbeitung"].includes(checklist.status)&&isReviewer){
    if(!summary.openReviewPoints)throw new AnnualChecklistError("REVIEW_POINTS_OPEN","Die Rückgabe verlangt mindestens einen offenen Prüfpunkt.");
    next="Nachbearbeitung";
  } else if(action==="PROFESSIONAL_COMPLETE"&&["In Prüfung","Nachbearbeitung"].includes(checklist.status)&&isReviewer){
    const completionError=checklistCompletionMessage(checklist.tasks);
    if(completionError)throw new AnnualChecklistError("REVIEW_POINTS_OPEN",completionError);
    next="Fachlich abgeschlossen";
  } else if(action==="SUBMIT_RELEASE"&&checklist.status==="Fachlich abgeschlossen"&&isReviewer)next="Zur Freigabe";
  else if(action==="RELEASE"&&checklist.status==="Zur Freigabe"&&isManagement){
    const completionError=checklistCompletionMessage(checklist.tasks);
    if(completionError)throw new AnnualChecklistError("MANDATORY_OPEN",completionError);
    next="Freigegeben";
  } else throw new AnnualChecklistError("NOT_ALLOWED","Diese Aktion ist im aktuellen Status oder für Ihre Rolle nicht zulässig.");
  const now=new Date();
  const data:Record<string,unknown>={status:next};
  if(next==="Zur Prüfung")data.submittedForReviewAt=now;
  if(next==="In Prüfung")data.reviewStartedAt=now;
  if(next==="Nachbearbeitung")data.returnedAt=now;
  if(next==="Fachlich abgeschlossen")data.professionallyCompletedAt=now;
  if(next==="Zur Freigabe")data.submittedForReleaseAt=now;
  if(next==="Freigegeben")Object.assign(data,{releasedAt:now,completedAt:now,releaseUserId:user.id,releaseNameSnapshot:user.fullName,releaseNote:note.trim()||null});
  await prisma.annualChecklist.update({where:{id:checklistId},data});
  const functionName=next==="Freigegeben"?"Kanzleileitung":next==="In Prüfung"||next==="Fachlich abgeschlossen"||next==="Zur Freigabe"?"Prüfer":"Bearbeiter";
  await history(checklistId,user,next,`Status wurde auf „${next}“ gesetzt durch ${user.fullName} in der Funktion ${functionName}.`,checklist.status,next,undefined,note.trim()||undefined);
  return next;
}

export async function reopenAnnualChecklist(checklistId:number,reason:string,user:AuthUser){
  const checklist=await prisma.annualChecklist.findUnique({where:{id:checklistId}});
  if(!checklist||checklist.status!=="Freigegeben")throw new AnnualChecklistError("INVALID_TRANSITION","Nur eine freigegebene Checkliste kann wieder geöffnet werden.");
  if(checklist.managementUserId!==user.id||!user.roles.includes("KANZLEILEITUNG"))throw new AnnualChecklistError("NOT_ALLOWED","Nur die zuständige Kanzleileitung darf wieder öffnen.");
  if(!reason.trim())throw new AnnualChecklistError("REASON_REQUIRED","Die Wiederöffnung verlangt eine Begründung.");
  await prisma.annualChecklist.update({where:{id:checklistId},data:{status:"Nachbearbeitung",releasedAt:null,completedAt:null,releaseNote:null}});
  await history(checklistId,user,"Freigabe wieder geöffnet","Die freigegebene Jahresabschlusscheckliste wurde zur Nachbearbeitung wieder geöffnet.","Freigegeben","Nachbearbeitung",undefined,reason.trim());
}

export async function createCustomAnnualTask(input:{clientId:number;title:string;description:string;category:string;validFromYear:number;validUntilYear:number|null;mandatory:boolean;sortOrder:number}){
  if(!input.title.trim()||!input.category.trim())throw new AnnualChecklistError("INVALID_INPUT","Titel und Kategorie sind erforderlich.");
  if(input.validUntilYear&&input.validUntilYear<input.validFromYear)throw new AnnualChecklistError("INVALID_INPUT","Das Gültigkeitsende darf nicht vor dem Beginn liegen.");
  return prisma.customAnnualTask.create({data:{...input,title:input.title.trim(),description:input.description.trim()||null,category:input.category.trim()}});
}

export async function createAnnualTaskFromMonthly(checklistId:number,monthlyTaskId:number,user:AuthUser){
  const checklist=await prisma.annualChecklist.findUniqueOrThrow({where:{id:checklistId}});
  if(![checklist.reviewerUserId,checklist.managementUserId].includes(user.id))throw new AnnualChecklistError("NOT_ALLOWED","Nur Prüfer oder Kanzleileitung dürfen einen offenen Punkt übernehmen.");
  const task=await prisma.checklistTask.findUnique({where:{id:monthlyTaskId},include:{period:true}});
  if(!task||task.period.clientId!==checklist.clientId||task.period.calendarYear!==checklist.fiscalYear)throw new AnnualChecklistError("INVALID_INPUT","Der offene Monatspunkt gehört nicht zu diesem Jahresabschluss.");
  return prisma.annualChecklistTask.create({data:{annualChecklistId:checklistId,sourceMonthlyTaskId:task.id,createdByUserId:user.id,taskIdSnapshot:`JA-UEBER-${task.id}`,categorySnapshot:"Abschlussvorbereitung",titleSnapshot:task.titleSnapshot,workInstructionSnapshot:task.workInstructionSnapshot,mandatorySnapshot:task.mandatorySnapshot,origin:"Offener Punkt aus Monatscheckliste",sourceMonthLabel:task.period.periodLabel,sourceNoteSnapshot:[task.processingNote,task.reviewNote].filter(Boolean).join(" · ")||null}});
}
