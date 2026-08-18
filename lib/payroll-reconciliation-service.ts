import { Prisma, type PayrollReconciliationItem } from "@prisma/client";
import { prisma } from "./prisma.ts";
import {
  canHandlePayrollReconciliation,
  canManagePayrollTopics,
  canProcessPayrollReconciliation,
  type AuthUser,
} from "./permissions.ts";
import { FIBU_LOHN_COLLECTION_TOPIC_KEYS } from "./fibu-lohn-topic-catalog.ts";

export const PAYROLL_RECONCILIATION_KNOWLEDGE_KEY = "FIBU_LOHN_ABSTIMMUNG";
export const PAYROLL_TOPIC_STATUSES = ["Noch nicht geprüft", "Kein Sachverhalt", "Übergabe in Vorbereitung", "Vollständig an Lohn übergeben"] as const;
export const PAYROLL_ACCOUNTING_STATUSES = ["Offen", "In Bearbeitung", "Übergabebereit", "Vollständig übergeben"] as const;
export const PAYROLL_STATUSES = ["Neu", "In Bearbeitung", "Rückfrage offen", "Erledigt"] as const;
export const PAYROLL_USER_DECISIONS = ["Noch nicht geprüft", "Kein relevanter Sachverhalt", "Sachverhalt vorhanden"] as const;
export const PAYROLL_COLLECTION_TOPICS = new Set<string>(FIBU_LOHN_COLLECTION_TOPIC_KEYS);

export type PayrollReconciliationSummaryInput = {
  status:string;
  matterPresent:string;
  payrollProcessingStatus:string;
  documentToFollow:boolean;
  documents?:Array<{status:string}>;
  questions?:Array<{status:string}>;
};

export function payrollReconciliationSummary(items:PayrollReconciliationSummaryInput[]) {
  const reviewed=items.filter(item=>item.status!=="Noch nicht geprüft").length;
  const matters=items.filter(item=>item.matterPresent==="Ja").length;
  const fullyTransferred=items.filter(item=>item.status==="Vollständig an Lohn übergeben").length;
  const documents=items.reduce((total,item)=>total+(item.documents?.filter(document=>document.status==="Aktiv").length??0),0);
  const openQuestions=items.reduce((total,item)=>total+(item.questions?.filter(question=>question.status!=="Erledigt durch Lohn").length??0),0);
  const openFollowUps=items.filter(item=>item.documentToFollow).length;
  const processed=items.filter(item=>item.matterPresent==="Ja"&&item.payrollProcessingStatus==="Verarbeitet").length;
  return {total:items.length,reviewed,matters,fullyTransferred,documents,openQuestions,openFollowUps,processed};
}

export class PayrollReconciliationError extends Error {
  constructor(
    public readonly code:
      | "NOT_ALLOWED"
      | "INVALID_INPUT"
      | "CLIENT_NOT_CONFIGURED"
      | "ASSIGNEE_MISSING"
      | "TOPICS_MISSING"
      | "DUPLICATE"
      | "INCOMPLETE"
      | "CONFLICT"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

export type PayrollTopicInput={
  key:string;title:string;shortDescription?:string;reviewQuestion:string;sortOrder:number;status:string;
  validFrom:Date;validUntil?:Date|null;topicType:string;vehicleRelated:boolean;followUpAllowed:boolean;campusStandardTaskId?:number|null;
  requiredStandardFields:string[];requiredDocumentTypes:string[];notes?:string;
};

function validateTopic(input:PayrollTopicInput){
  const key=input.key.trim().toUpperCase();
  if(!/^[A-Z0-9_]{2,50}$/.test(key))throw new PayrollReconciliationError("INVALID_INPUT","Der Themenschlüssel ist ungültig.");
  if(!input.title.trim()||!input.reviewQuestion.trim())throw new PayrollReconciliationError("INVALID_INPUT","Bezeichnung und Prüffrage sind erforderlich.");
  if(!["Aktiv","Archiviert"].includes(input.status))throw new PayrollReconciliationError("INVALID_INPUT","Der Themenstatus ist ungültig.");
  if(input.validUntil&&input.validUntil<input.validFrom)throw new PayrollReconciliationError("INVALID_INPUT","Das Gültig-bis-Datum darf nicht vor dem Beginn liegen.");
  return{...input,key,title:input.title.trim(),shortDescription:input.shortDescription?.trim()||null,reviewQuestion:input.reviewQuestion.trim(),
    validUntil:input.validUntil??null,campusStandardTaskId:input.campusStandardTaskId??null,
    requiredStandardFields:JSON.stringify([...new Set(input.requiredStandardFields.map(value=>value.trim()).filter(Boolean))]),
    requiredDocumentTypes:JSON.stringify([...new Set(input.requiredDocumentTypes.map(value=>value.trim()).filter(Boolean))]),
    notes:input.notes?.trim()||null};
}

export async function createPayrollTopic(input:PayrollTopicInput,user:AuthUser){
  assertCanManagePayrollTopics(user);const data=validateTopic(input);
  return prisma.$transaction(async tx=>{
    const topic=await tx.payrollReconciliationTopic.create({data:{...data,createdByUserId:user.id}});
    await tx.payrollReconciliationTopicHistory.create({data:{topicId:topic.id,actorUserId:user.id,actorNameSnapshot:user.fullName,action:"Thema erstellt",summary:`Abstimmungsthema „${topic.title}“ wurde erstellt.`,newValue:JSON.stringify(data)}});
    return topic;
  });
}

export async function updatePayrollTopic(id:number,input:PayrollTopicInput,user:AuthUser){
  assertCanManagePayrollTopics(user);const data=validateTopic(input);
  const existing=await prisma.payrollReconciliationTopic.findUnique({where:{id}});
  if(!existing)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  return prisma.$transaction(async tx=>{
    const topic=await tx.payrollReconciliationTopic.update({where:{id},data});
    await tx.payrollReconciliationTopicHistory.create({data:{topicId:id,actorUserId:user.id,actorNameSnapshot:user.fullName,action:topic.status==="Archiviert"&&existing.status!=="Archiviert"?"Thema archiviert":"Thema geändert",summary:`Abstimmungsthema „${topic.title}“ wurde geändert.`,previousValue:JSON.stringify(existing),newValue:JSON.stringify(data)}});
    return topic;
  });
}

type ReconciliationTransaction = Prisma.TransactionClient;
type ReconciliationAssignment = {
  clientId:number;
  accountingYear:number;
  accountingMonth:number;
  payrollYear:number;
  payrollMonth:number;
  accountingPeriodId:number;
  checklistTaskId:number;
  processorUserId:number|null;
  processorNameSnapshot:string|null;
  reviewerUserId:number|null;
  reviewerNameSnapshot:string|null;
  payrollUserId:number;
  payrollUserNameSnapshot:string;
};

export function nextPayrollMonth(year:number,month:number) {
  return month===12 ? {year:year+1,month:1} : {year,month:month+1};
}

export function parseConfiguredList(value:string) {
  try {
    const parsed=JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry):entry is string=>typeof entry==="string") : [];
  } catch {
    return value.split(";").map(entry=>entry.trim()).filter(Boolean);
  }
}

export function validateTopicCompleteness(
  item: Pick<PayrollReconciliationItem,"status"|"detailsJson"|"requiredFieldsSnapshot"|"requiredDocumentsSnapshot"|"documentToFollow"|"followUpAllowed"|"followUpReason"|"missingDocumentType">,
  activeDocumentTypes:string[],
) {
  if(item.status!=="Vollständig an Lohn übergeben")return {complete:true,missing:[] as string[]};
  const details=readDetails(item.detailsJson);
  const missing=parseConfiguredList(item.requiredFieldsSnapshot).filter(field=>!hasValue(details[field])).map(field=>`Pflichtangabe „${field}“ fehlt.`);
  const missingDocuments=parseConfiguredList(item.requiredDocumentsSnapshot).filter(type=>!activeDocumentTypes.includes(type));
  if(missingDocuments.length){
    const validFollowUp=item.documentToFollow&&item.followUpAllowed&&Boolean(item.followUpReason?.trim())&&
      Boolean(item.missingDocumentType?.trim())&&missingDocuments.includes(item.missingDocumentType!.trim());
    if(!validFollowUp)missing.push(...missingDocuments.map(type=>`Erforderlicher Beleg „${type}“ fehlt.`));
  }
  return {complete:missing.length===0,missing};
}

function readDetails(value:string|null|undefined):Record<string,unknown>{
  if(!value)return {};
  try{const parsed=JSON.parse(value);return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};}catch{return {};}
}
function hasValue(value:unknown){return typeof value==="boolean"||typeof value==="number"||typeof value==="string"&&Boolean(value.trim())||Array.isArray(value)&&value.length>0;}
function actorDepartment(user:AuthUser){return user.roles.includes("LOHNSACHBEARBEITER")?"Lohn":"Rechnungswesen";}

export async function createPayrollReconciliationInTransaction(
  tx:ReconciliationTransaction,
  assignment:ReconciliationAssignment,
) {
  const topics=await tx.payrollReconciliationTopic.findMany({
    where:{status:"Aktiv",validFrom:{lte:new Date()},OR:[{validUntil:null},{validUntil:{gte:new Date()}}]},
    orderBy:[{sortOrder:"asc"},{key:"asc"}],
  });
  if(!topics.length)throw new PayrollReconciliationError("TOPICS_MISSING","Für die FiBu-Lohn-Abstimmung sind keine aktiven Themen vorhanden.");
  try{
    const reconciliation=await tx.payrollReconciliation.create({data:{
      ...assignment,
      items:{create:topics.map(topic=>({
        sourceTopicId:topic.id,
        topicKeySnapshot:topic.key,
        topicTitleSnapshot:topic.title,
        descriptionSnapshot:topic.shortDescription,
        reviewQuestionSnapshot:topic.reviewQuestion,
        sortOrderSnapshot:topic.sortOrder,
        topicTypeSnapshot:topic.topicType,
        vehicleRelatedSnapshot:topic.vehicleRelated,
        requiredFieldsSnapshot:topic.requiredStandardFields,
        requiredDocumentsSnapshot:topic.requiredDocumentTypes,
        followUpAllowed:topic.followUpAllowed,
      }))},
    }});
    const actorUserId=assignment.processorUserId??assignment.reviewerUserId;
    const actorName=assignment.processorNameSnapshot??assignment.reviewerNameSnapshot;
    if(actorUserId&&actorName)await tx.payrollReconciliationHistory.create({data:{
      reconciliationId:reconciliation.id,actorUserId,actorNameSnapshot:actorName,actorDepartment:"Rechnungswesen",
      action:"Abstimmung erstellt",summary:`FiBu-Lohn-Abstimmung mit ${topics.length} Themen-Snapshots erstellt.`,
    }});
    return reconciliation;
  }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")throw new PayrollReconciliationError("DUPLICATE","Für diesen Mandanten und Lohnabrechnungsmonat besteht bereits eine FiBu-Lohn-Abstimmung.");
    throw error;
  }
}

export async function createPayrollReconciliationForChecklist(
  periodId:number,
  checklistTaskId:number,
  payrollTarget?:{year:number;month:number},
) {
  const period=await prisma.accountingPeriod.findUnique({where:{id:periodId},include:{client:{include:{payrollUser:{include:{roles:true}}}}}});
  if(!period)throw new PayrollReconciliationError("NOT_FOUND","Die Monatscheckliste wurde nicht gefunden.");
  const client=period.client;
  if(!client.payrollPreparedByFirm)throw new PayrollReconciliationError("CLIENT_NOT_CONFIGURED","Für diesen Mandanten wird keine Lohnabrechnung durch die Kanzlei erstellt.");
  if(client.payrollServiceStart){const start=client.payrollServiceStart.getUTCFullYear()*12+client.payrollServiceStart.getUTCMonth()+1,current=period.calendarYear*12+period.month;if(current<start)throw new PayrollReconciliationError("CLIENT_NOT_CONFIGURED","Der Rechnungswesenmonat liegt vor dem Beginn der Lohnbetreuung.");}
  const payrollUser=client.payrollUser;
  if(!client.payrollUserId||!payrollUser?.active||!payrollUser.roles.some(role=>role.role==="LOHNSACHBEARBEITER"))throw new PayrollReconciliationError("ASSIGNEE_MISSING","Ein aktiver Lohnsachbearbeiter mit entsprechender Rolle ist erforderlich.");
  const target=payrollTarget??nextPayrollMonth(period.calendarYear,period.month);
  if(!validMonth(target.year,target.month))throw new PayrollReconciliationError("INVALID_INPUT","Der Lohnabrechnungsmonat ist ungültig.");
  return prisma.$transaction(tx=>createPayrollReconciliationInTransaction(tx,{
    clientId:client.id,accountingYear:period.calendarYear,accountingMonth:period.month,payrollYear:target.year,payrollMonth:target.month,
    accountingPeriodId:period.id,checklistTaskId,processorUserId:period.processorUserId,processorNameSnapshot:period.processorSnapshot,
    reviewerUserId:period.reviewerUserId,reviewerNameSnapshot:period.reviewerSnapshot,payrollUserId:payrollUser.id,
    payrollUserNameSnapshot:payrollUser.fullName,
  }));
}

export async function updatePayrollReconciliationItem(
  itemId:number,
  input:{status:string;note?:string;details?:Record<string,unknown>;documentToFollow?:boolean;followUpReason?:string;expectedFollowUpAt?:Date|null;missingDocumentType?:string;expectedUpdatedAt?:string},
  user:AuthUser,
) {
  if(!PAYROLL_TOPIC_STATUSES.includes(input.status as typeof PAYROLL_TOPIC_STATUSES[number]))throw new PayrollReconciliationError("INVALID_INPUT","Der Themenstatus ist ungültig.");
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true,documents:{where:{status:"Aktiv"}},positions:{where:{status:{not:"Archiviert"}}}}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(input.expectedUpdatedAt&&item.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new PayrollReconciliationError("CONFLICT",`Das Thema „${item.topicTitleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
  if(!canProcessPayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen dieses Abstimmungsthema nicht bearbeiten.");
  if(item.reconciliation.accountingStatus==="Vollständig übergeben")throw new PayrollReconciliationError("INVALID_INPUT","Eine bereits vollständig übergebene Abstimmung kann nicht nachträglich geändert werden.");
  if(input.status==="Kein Sachverhalt"&&item.positions.length)throw new PayrollReconciliationError("INVALID_INPUT","Ein Thema mit vorhandenen Sachverhaltspositionen kann nicht als „Kein Sachverhalt“ gespeichert werden. Entfernen oder archivieren Sie zuerst die Positionen.");
  if(input.status==="Vollständig an Lohn übergeben"){
    const check=validateTopicCompleteness({
      ...item,status:input.status,detailsJson:JSON.stringify(input.details??readDetails(item.detailsJson)),
      documentToFollow:Boolean(input.documentToFollow),followUpReason:input.followUpReason??null,
      missingDocumentType:input.missingDocumentType??null,
    },item.documents.map(document=>document.documentType));
    if(!check.complete)throw new PayrollReconciliationError("INCOMPLETE",`Die Übergabe ist noch unvollständig: ${check.missing.join(" ")}`);
  }
  const matterPresent=input.status==="Kein Sachverhalt"?"Nein":input.status==="Noch nicht geprüft"?"Noch offen":"Ja";
  return prisma.$transaction(async tx=>{
    const write=await tx.payrollReconciliationItem.updateMany({where:{id:item.id,updatedAt:item.updatedAt},data:{
      status:input.status,matterPresent,note:input.note?.trim()||null,detailsJson:input.details?JSON.stringify(input.details):item.detailsJson,
      processedByUserId:user.id,reviewedAt:new Date(),fullyTransferredAt:input.status==="Vollständig an Lohn übergeben"?new Date():null,
      documentToFollow:Boolean(input.documentToFollow),followUpReason:input.followUpReason?.trim()||null,
      expectedFollowUpAt:input.expectedFollowUpAt??null,missingDocumentType:input.missingDocumentType?.trim()||null,
    }});
    if(write.count!==1)throw new PayrollReconciliationError("CONFLICT",`Das Thema „${item.topicTitleSnapshot}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
    const updated=await tx.payrollReconciliationItem.findUniqueOrThrow({where:{id:item.id}});
    await tx.payrollReconciliationHistory.create({data:{reconciliationId:item.reconciliationId,reconciliationItemId:item.id,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Thema geprüft",summary:`Thema „${item.topicTitleSnapshot}“ wurde auf „${input.status}“ gesetzt.`,previousValue:item.status,newValue:input.status}});
    if(input.status==="Übergabe in Vorbereitung"&&item.positions.length)await refreshPositionBasedTopicStatus(tx,item.id);
    await updateAccountingSummary(tx,item.reconciliationId);
    return updated;
  });
}

export type PayrollPositionInput = {
  positionType: "Einzelposition" | "Sammelposition";
  title: string;
  caseCount: number;
  totalAmount?: string;
  period?: string;
  summary?: string;
  people?: string[];
  details?: Record<string, unknown>;
  requiredListType?: string;
  requiredListDocumentName?: string;
  expectedUpdatedAt?:string;
};

export function validatePayrollPositionInput(
  topicKey: string,
  input: PayrollPositionInput,
  requiredFields: string[] = [],
) {
  const title = input.title.trim();
  if (!title) throw new PayrollReconciliationError("INVALID_INPUT", "Die Position benötigt eine verständliche Bezeichnung.");
  if (!["Einzelposition", "Sammelposition"].includes(input.positionType)) {
    throw new PayrollReconciliationError("INVALID_INPUT", "Die Positionsart ist ungültig.");
  }
  if (input.positionType === "Sammelposition" && !PAYROLL_COLLECTION_TOPICS.has(topicKey)) {
    throw new PayrollReconciliationError("INVALID_INPUT", "Für dieses Abstimmungsthema sind keine Sammelpositionen zulässig.");
  }
  const caseCount = input.positionType === "Sammelposition" ? Number(input.caseCount) : 1;
  if (!Number.isInteger(caseCount) || caseCount < 1 || (input.positionType === "Sammelposition" && caseCount < 2)) {
    throw new PayrollReconciliationError("INVALID_INPUT", "Bitte geben Sie eine gültige Anzahl der enthaltenen Fälle an.");
  }
  const details = input.details ?? {};
  const missing = requiredFields.filter((field) => !hasValue(details[field]));
  const requiresRecipientList = topicKey === "GESCHENKE_NICHTARBEITNEHMER" && input.positionType === "Sammelposition";
  const requiresInvoiceList = topicKey === "KSK" && input.positionType === "Sammelposition";
  const requiredListType = requiresRecipientList ? "Empfängerliste" : requiresInvoiceList ? "Rechnungsliste" : input.requiredListType?.trim() || null;
  const complete = Boolean(input.summary?.trim()) && missing.length === 0 &&
    (!requiredListType || Boolean(input.requiredListDocumentName?.trim()));
  return {
    positionType: input.positionType,
    title,
    caseCount,
    totalAmountCents: moneyToCents(input.totalAmount),
    period: input.period?.trim() || null,
    summary: input.summary?.trim() || null,
    peopleJson: JSON.stringify((input.people ?? []).map((entry) => entry.trim()).filter(Boolean)),
    detailsJson: JSON.stringify(details),
    requiredListType,
    requiredListDocumentName: input.requiredListDocumentName?.trim() || null,
    status: complete ? "Vollständig" : "Entwurf",
    missing,
  };
}

export async function savePayrollPosition(
  itemId: number,
  positionId: number | null,
  input: PayrollPositionInput,
  user: AuthUser,
) {
  const item = await prisma.payrollReconciliationItem.findUnique({
    where: { id: itemId },
    include: { reconciliation: true },
  });
  if (!item) throw new PayrollReconciliationError("NOT_FOUND", "Das Abstimmungsthema wurde nicht gefunden.");
  if (!canProcessPayrollReconciliation(user, item.reconciliation)) {
    throw new PayrollReconciliationError("NOT_ALLOWED", "Sie dürfen Positionen dieses Abstimmungsthemas nicht bearbeiten.");
  }
  if (item.reconciliation.accountingStatus === "Vollständig übergeben") {
    throw new PayrollReconciliationError("INVALID_INPUT", "Nach der Gesamtübergabe können Positionen nur noch nachvollziehbar ergänzt werden.");
  }
  const existing = positionId
    ? await prisma.payrollReconciliationPosition.findFirst({ where: { id: positionId, reconciliationItemId: itemId } })
    : null;
  if (positionId && !existing) throw new PayrollReconciliationError("NOT_FOUND", "Die Position wurde nicht gefunden.");
  if(existing&&input.expectedUpdatedAt&&existing.updatedAt.toISOString()!==input.expectedUpdatedAt)throw new PayrollReconciliationError("CONFLICT",`Die Position „${existing.title}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`);
  const data = validatePayrollPositionInput(item.topicKeySnapshot, input, parseConfiguredList(item.requiredFieldsSnapshot));
  const requiredListUploaded = existing && data.requiredListType
    ? await prisma.payrollDocumentReference.count({
        where: {
          positionId: existing.id,
          status: "Aktiv",
          fileExtension: { in: ["PDF", "XLSX"] },
        },
      }) > 0
    : false;
  const { missing: _missing, ...validatedPositionData } = data;
  const positionData = {
    ...validatedPositionData,
    status: data.requiredListType && !requiredListUploaded ? "Entwurf" : validatedPositionData.status,
  };
  return prisma.$transaction(async (tx) => {
    if(existing){const write=await tx.payrollReconciliationPosition.updateMany({where:{id:existing.id,updatedAt:existing.updatedAt},data:{...positionData,updatedByUserId:user.id}});if(write.count!==1)throw new PayrollReconciliationError("CONFLICT",`Die Position „${existing.title}“ wurde zwischenzeitlich geändert. Ihre Eingaben wurden nicht überschrieben.`)}
    const position = existing
      ? await tx.payrollReconciliationPosition.findUniqueOrThrow({where:{id:existing.id}})
      : await tx.payrollReconciliationPosition.create({ data: { ...positionData, reconciliationItemId: item.id, createdByUserId: user.id, updatedByUserId: user.id } });
    await tx.payrollReconciliationItem.update({
      where: { id: item.id },
      data: { matterPresent: "Ja", status: "Übergabe in Vorbereitung", processedByUserId: user.id, reviewedAt: new Date() },
    });
    await tx.payrollReconciliationHistory.create({ data: {
      reconciliationId: item.reconciliationId,
      reconciliationItemId: item.id,
      positionId: position.id,
      actorUserId: user.id,
      actorNameSnapshot: user.fullName,
      actorDepartment: "Rechnungswesen",
      action: existing ? "Position geändert" : "Position angelegt",
      summary: `${position.positionType} „${position.title}“ wurde ${existing ? "geändert" : "angelegt"}.`,
      previousValue: existing ? JSON.stringify(existing) : null,
      newValue: JSON.stringify({ ...positionData, missingRequiredFields: _missing }),
    } });
    await refreshPositionBasedTopicStatus(tx, item.id);
    await updateAccountingSummary(tx, item.reconciliationId);
    return position;
  });
}

export async function duplicatePayrollPosition(positionId: number, user: AuthUser) {
  const position = await prisma.payrollReconciliationPosition.findUnique({
    where: { id: positionId },
    include: { reconciliationItem: { include: { reconciliation: true } } },
  });
  if (!position) throw new PayrollReconciliationError("NOT_FOUND", "Die Position wurde nicht gefunden.");
  if (!canProcessPayrollReconciliation(user, position.reconciliationItem.reconciliation)) {
    throw new PayrollReconciliationError("NOT_ALLOWED", "Sie dürfen diese Position nicht duplizieren.");
  }
  if (position.reconciliationItem.reconciliation.accountingStatus === "Vollständig übergeben") {
    throw new PayrollReconciliationError("INVALID_INPUT", "Nach der Gesamtübergabe kann eine Position nicht dupliziert werden.");
  }
  return prisma.$transaction(async (tx) => {
    const copy = await tx.payrollReconciliationPosition.create({ data: {
      reconciliationItemId: position.reconciliationItemId,
      positionType: position.positionType,
      title: `${position.title} – Kopie`,
      caseCount: position.positionType === "Sammelposition" ? position.caseCount : 1,
      period: position.period,
      summary: position.summary,
      detailsJson: position.detailsJson,
      requiredListType: position.requiredListType,
      status: "Entwurf",
      duplicatedFromId: position.id,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    } });
    await tx.payrollReconciliationHistory.create({ data: {
      reconciliationId: position.reconciliationItem.reconciliationId,
      reconciliationItemId: position.reconciliationItemId,
      positionId: copy.id,
      actorUserId: user.id,
      actorNameSnapshot: user.fullName,
      actorDepartment: "Rechnungswesen",
      action: "Position dupliziert",
      summary: `Position „${position.title}“ wurde als Entwurf dupliziert; Personen, Beträge und Belege wurden nicht übernommen.`,
    } });
    return copy;
  });
}

export async function removePayrollPosition(positionId: number, user: AuthUser) {
  const position = await prisma.payrollReconciliationPosition.findUnique({
    where: { id: positionId },
    include: { reconciliationItem: { include: { reconciliation: true } } },
  });
  if (!position) throw new PayrollReconciliationError("NOT_FOUND", "Die Position wurde nicht gefunden.");
  if (!canProcessPayrollReconciliation(user, position.reconciliationItem.reconciliation)) {
    throw new PayrollReconciliationError("NOT_ALLOWED", "Sie dürfen diese Position nicht entfernen.");
  }
  return prisma.$transaction(async (tx) => {
    if (position.reconciliationItem.reconciliation.accountingStatus === "Vollständig übergeben") {
      const archived = await tx.payrollReconciliationPosition.update({
        where: { id: position.id },
        data: { status: "Archiviert", archivedAt: new Date(), updatedByUserId: user.id },
      });
      await tx.payrollReconciliationHistory.create({ data: {
        reconciliationId: position.reconciliationItem.reconciliationId,
        reconciliationItemId: position.reconciliationItemId,
        positionId: position.id,
        actorUserId: user.id, actorNameSnapshot: user.fullName, actorDepartment: "Rechnungswesen",
        action: "Position archiviert", summary: `Position „${position.title}“ wurde nach der Übergabe archiviert.`,
      } });
      return archived;
    }
    if (position.status !== "Entwurf") throw new PayrollReconciliationError("INVALID_INPUT", "Nur Entwürfe dürfen gelöscht werden. Vollständige Positionen können archiviert werden.");
    await tx.payrollReconciliationHistory.create({ data: {
      reconciliationId: position.reconciliationItem.reconciliationId,
      reconciliationItemId: position.reconciliationItemId,
      actorUserId: user.id, actorNameSnapshot: user.fullName, actorDepartment: "Rechnungswesen",
      action: "Positionsentwurf gelöscht", summary: `Entwurf „${position.title}“ wurde gelöscht.`,
      previousValue: JSON.stringify(position),
    } });
    await tx.payrollReconciliationPosition.delete({ where: { id: position.id } });
    await refreshPositionBasedTopicStatus(tx, position.reconciliationItemId);
    await updateAccountingSummary(tx, position.reconciliationItem.reconciliationId);
    return null;
  });
}

async function refreshPositionBasedTopicStatus(tx: ReconciliationTransaction, itemId: number) {
  const positions = await tx.payrollReconciliationPosition.findMany({
    where: { reconciliationItemId: itemId, status: { not: "Archiviert" } },
    select: { status: true },
  });
  const status = positions.length > 0 && positions.every((position) => position.status === "Vollständig")
    ? "Vollständig an Lohn übergeben"
    : positions.length > 0 ? "Übergabe in Vorbereitung" : "Noch nicht geprüft";
  await tx.payrollReconciliationItem.update({
    where: { id: itemId },
    data: {
      status,
      matterPresent: positions.length ? "Ja" : "Noch offen",
      fullyTransferredAt: status === "Vollständig an Lohn übergeben" ? new Date() : null,
    },
  });
}

function moneyToCents(value: string | undefined) {
  const normalized = value?.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new PayrollReconciliationError("INVALID_INPUT", "Der Gesamtbetrag ist ungültig.");
  return Math.round(amount * 100);
}

export async function changePayrollTargetMonth(
  reconciliationId:number,
  target:{year:number;month:number},
  user:AuthUser,
){
  if(!validMonth(target.year,target.month))throw new PayrollReconciliationError("INVALID_INPUT","Der Lohnabrechnungsmonat ist ungültig.");
  const reconciliation=await prisma.payrollReconciliation.findUnique({where:{id:reconciliationId}});
  if(!reconciliation)throw new PayrollReconciliationError("NOT_FOUND","Die FiBu-Lohn-Abstimmung wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen den Lohnabrechnungsmonat nicht ändern.");
  if(reconciliation.accountingStatus==="Vollständig übergeben")throw new PayrollReconciliationError("INVALID_INPUT","Nach der verbindlichen Übergabe kann der Lohnabrechnungsmonat nicht mehr geändert werden.");
  try{
    return await prisma.$transaction(async tx=>{
      const updated=await tx.payrollReconciliation.update({where:{id:reconciliationId},data:{payrollYear:target.year,payrollMonth:target.month}});
      await addHistory(tx,reconciliationId,user,"Lohnabrechnungsmonat geändert",`Der vorgesehene Lohnabrechnungsmonat wurde auf ${target.month}/${target.year} geändert.`,`${reconciliation.payrollMonth}/${reconciliation.payrollYear}`,`${target.month}/${target.year}`);
      return updated;
    });
  }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")throw new PayrollReconciliationError("DUPLICATE","Für diesen Mandanten und Lohnabrechnungsmonat besteht bereits eine FiBu-Lohn-Abstimmung.");
    throw error;
  }
}

async function updateAccountingSummary(tx:ReconciliationTransaction,reconciliationId:number){
  const items=await tx.payrollReconciliationItem.findMany({where:{reconciliationId},select:{status:true}});
  const final=items.every(item=>["Kein Sachverhalt","Vollständig an Lohn übergeben"].includes(item.status));
  const untouched=items.every(item=>item.status==="Noch nicht geprüft");
  const status=final?"Übergabebereit":untouched?"Offen":"In Bearbeitung";
  await tx.payrollReconciliation.update({where:{id:reconciliationId},data:{accountingStatus:status}});
}

export async function submitPayrollReconciliation(reconciliationId:number,user:AuthUser){
  const reconciliation=await prisma.payrollReconciliation.findUnique({where:{id:reconciliationId},include:{items:true}});
  if(!reconciliation)throw new PayrollReconciliationError("NOT_FOUND","Die FiBu-Lohn-Abstimmung wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Abstimmung nicht an Lohn übergeben.");
  const blocking=reconciliation.items.filter(item=>!["Kein Sachverhalt","Vollständig an Lohn übergeben"].includes(item.status));
  if(blocking.length)throw new PayrollReconciliationError("INCOMPLETE",`${blocking.length} Abstimmungsthemen sind noch nicht vollständig geprüft.`);
  return prisma.$transaction(async tx=>{
    const now=new Date();
    const updated=await tx.payrollReconciliation.update({where:{id:reconciliation.id},data:{accountingStatus:"Vollständig übergeben",payrollStatus:"Neu",transferredAt:now}});
    await tx.checklistTask.update({where:{id:reconciliation.checklistTaskId},data:{status:"Erledigt",processedAt:now,processorInitials:user.fullName,processingNote:"FiBu-Lohn-Abstimmung vollständig übergeben."}});
    await tx.workflowHistory.create({data:{periodId:reconciliation.accountingPeriodId,checklistTaskId:reconciliation.checklistTaskId,eventType:"FiBu-Lohn-Abstimmung übergeben",actorUserId:user.id,actorNameSnapshot:user.fullName,actorRoleSnapshot:"Bearbeiter",description:"Die FiBu-Lohn-Abstimmung wurde vollständig an Lohn übergeben.",newValue:"Erledigt"}});
    await tx.payrollReconciliationHistory.create({data:{reconciliationId:reconciliation.id,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Übergabe vollständig abgesendet",summary:"Die Informationspflicht des Rechnungswesens ist erfüllt.",previousValue:reconciliation.accountingStatus,newValue:"Vollständig übergeben"}});
    return updated;
  });
}

export async function recordPayrollReconciliationView(reconciliationId:number,user:AuthUser){
  const reconciliation=await requirePayrollAssignment(reconciliationId,user);
  if(reconciliation.accountingStatus!=="Vollständig übergeben")throw new PayrollReconciliationError("INVALID_INPUT","Die Abstimmung wurde noch nicht vollständig an Lohn übergeben.");
  return prisma.$transaction(async tx=>{
    const now=new Date();
    const first=await tx.payrollReconciliation.updateMany({where:{id:reconciliation.id,firstViewedAt:null},data:{firstViewedAt:now,firstViewedByUserId:user.id,seenAt:now,lastViewedAt:now}});
    const updated=first.count?await tx.payrollReconciliation.findUniqueOrThrow({where:{id:reconciliation.id}}):await tx.payrollReconciliation.update({where:{id:reconciliation.id},data:{lastViewedAt:now}});
    if(first.count)await addHistory(tx,reconciliation.id,user,"Erstansicht durch Lohn","Die Abstimmung wurde erstmals vom zugeordneten Lohnsachbearbeiter geöffnet.",null,now.toISOString());
    return updated;
  });
}

async function ensurePayrollProcessingStarted(tx:ReconciliationTransaction,reconciliation:{id:number;payrollStatus:string},user:AuthUser){
  if(reconciliation.payrollStatus!=="Neu")return;
  const started=await tx.payrollReconciliation.updateMany({where:{id:reconciliation.id,payrollStatus:"Neu"},data:{payrollStatus:"In Bearbeitung"}});
  if(started.count)await addHistory(tx,reconciliation.id,user,"Lohnbearbeitung automatisch begonnen","Die Lohnbearbeitung wurde mit der ersten fachlichen Lohnaktion automatisch begonnen.","Neu","In Bearbeitung");
}

export async function createPayrollQuestion(itemId:number,message:string,user:AuthUser){
  const text=message.trim();if(text.length<5)throw new PayrollReconciliationError("INVALID_INPUT","Bitte geben Sie eine verständliche Rückfrage ein.");
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(!canHandlePayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Nur der zugeordnete Lohnsachbearbeiter darf eine Rückfrage stellen.");
  if(!item.reconciliation.processorUserId)throw new PayrollReconciliationError("ASSIGNEE_MISSING","Der ursprüngliche Rechnungswesenbearbeiter fehlt.");
  return prisma.$transaction(async tx=>{
    await ensurePayrollProcessingStarted(tx,item.reconciliation,user);
    const question=await tx.payrollReconciliationQuestion.create({data:{reconciliationId:item.reconciliationId,reconciliationItemId:item.id,senderUserId:user.id,recipientUserId:item.reconciliation.processorUserId!,senderDepartment:"Lohn",recipientDepartment:"Rechnungswesen",message:text}});
    await tx.payrollReconciliation.update({where:{id:item.reconciliationId},data:{payrollStatus:"Rückfrage offen"}});
    await addHistory(tx,item.reconciliationId,user,"Rückfrage gestellt",`Rückfrage zu „${item.topicTitleSnapshot}“ gestellt.`,null,"Offen beim Rechnungswesen",item.id);
    return question;
  });
}

export async function answerPayrollQuestion(questionId:number,answer:string,user:AuthUser){
  const text=answer.trim();if(text.length<3)throw new PayrollReconciliationError("INVALID_INPUT","Bitte geben Sie eine verständliche Antwort ein.");
  const question=await prisma.payrollReconciliationQuestion.findUnique({where:{id:questionId},include:{reconciliationItem:true,reconciliation:true}});
  if(!question)throw new PayrollReconciliationError("NOT_FOUND","Die Rückfrage wurde nicht gefunden.");
  if(question.recipientUserId!==user.id||!canProcessPayrollReconciliation(user,question.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Rückfrage nicht beantworten.");
  return prisma.$transaction(async tx=>{
    const updated=await tx.payrollReconciliationQuestion.update({where:{id:question.id},data:{answer:text,answeredAt:new Date(),status:"Beantwortet"}});
    const otherOpenQuestions=await tx.payrollReconciliationQuestion.count({where:{
      reconciliationId:question.reconciliationId,id:{not:question.id},status:"Offen beim Rechnungswesen",
    }});
    await tx.payrollReconciliation.update({where:{id:question.reconciliationId},data:{payrollStatus:otherOpenQuestions?"Rückfrage offen":"In Bearbeitung"}});
    await addHistory(tx,question.reconciliationId,user,"Rückfrage beantwortet",`Rückfrage zu „${question.reconciliationItem.topicTitleSnapshot}“ beantwortet.`,"Offen beim Rechnungswesen","Beantwortet",question.reconciliationItemId);
    return updated;
  });
}

export async function completePayrollQuestion(questionId:number,user:AuthUser){
  const question=await prisma.payrollReconciliationQuestion.findUnique({where:{id:questionId},include:{reconciliation:true}});
  if(!question)throw new PayrollReconciliationError("NOT_FOUND","Die Rückfrage wurde nicht gefunden.");
  if(!canHandlePayrollReconciliation(user,question.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Rückfrage nicht erledigen.");
  if(question.status!=="Beantwortet")throw new PayrollReconciliationError("INVALID_INPUT","Die Rückfrage wurde noch nicht beantwortet.");
  return prisma.$transaction(async tx=>{
    await ensurePayrollProcessingStarted(tx,question.reconciliation,user);
    const updated=await tx.payrollReconciliationQuestion.update({where:{id:question.id},data:{status:"Erledigt durch Lohn",completedAt:new Date()}});
    const remaining=await tx.payrollReconciliationQuestion.count({where:{reconciliationId:question.reconciliationId,id:{not:question.id},status:{not:"Erledigt durch Lohn"}}});
    if(!remaining)await tx.payrollReconciliation.update({where:{id:question.reconciliationId},data:{payrollStatus:"In Bearbeitung"}});
    await addHistory(tx,question.reconciliationId,user,"Rückfrage erledigt","Die Rückfrage wurde durch Lohn erledigt.","Beantwortet","Erledigt durch Lohn",question.reconciliationItemId);
    return updated;
  });
}

export async function markPayrollItemProcessed(itemId:number,user:AuthUser){
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(!canHandlePayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen dieses Thema nicht als verarbeitet markieren.");
  if(item.status==="Übergabe in Vorbereitung"||item.status==="Noch nicht geprüft")throw new PayrollReconciliationError("INVALID_INPUT","Das Thema wurde vom Rechnungswesen noch nicht vollständig übergeben.");
  return prisma.$transaction(async tx=>{
    await ensurePayrollProcessingStarted(tx,item.reconciliation,user);
    const updated=await tx.payrollReconciliationItem.update({where:{id:item.id},data:{payrollProcessingStatus:"Verarbeitet",payrollProcessedAt:new Date()}});
    await addHistory(tx,item.reconciliationId,user,"Thema verarbeitet",`Thema „${item.topicTitleSnapshot}“ wurde durch Lohn verarbeitet.`,item.payrollProcessingStatus,"Verarbeitet",item.id);
    return updated;
  });
}

export async function addPayrollReconciliationSupplement(itemId:number,supplement:string,user:AuthUser){
  const text=supplement.trim();
  if(text.length<5)throw new PayrollReconciliationError("INVALID_INPUT","Bitte beschreiben Sie die nachträgliche Ergänzung verständlich.");
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen dieses Abstimmungsthema nicht ergänzen.");
  if(item.reconciliation.accountingStatus!=="Vollständig übergeben")throw new PayrollReconciliationError("INVALID_INPUT","Nachträgliche Ergänzungen sind erst nach der Gesamtübergabe erforderlich.");
  const timestamp=new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Berlin"}).format(new Date());
  const note=[item.note?.trim(),`Nachträgliche Ergänzung vom ${timestamp} durch ${user.fullName}: ${text}`].filter(Boolean).join("\n\n");
  return prisma.$transaction(async tx=>{
    const updated=await tx.payrollReconciliationItem.update({where:{id:item.id},data:{note}});
    await addHistory(tx,item.reconciliationId,user,"Nachträgliche Ergänzung erfasst",`Zum Thema „${item.topicTitleSnapshot}“ wurde nach der Übergabe eine nachvollziehbare Ergänzung erfasst.`,item.note,note,item.id);
    return updated;
  });
}

export async function completePayrollDocumentFollowUp(itemId:number,user:AuthUser){
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true,documents:{where:{status:"Aktiv"},select:{documentType:true}}}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Nachreichung nicht abschließen.");
  if(!item.documentToFollow)throw new PayrollReconciliationError("INVALID_INPUT","Für dieses Thema ist keine Nachreichung offen.");
  const expected=item.missingDocumentType?.trim().toLocaleLowerCase("de-DE");
  const matchingDocument=!expected||item.documents.some(document=>document.documentType.trim().toLocaleLowerCase("de-DE")===expected);
  if(!matchingDocument)throw new PayrollReconciliationError("INCOMPLETE",`Bitte stellen Sie zuerst einen Beleg der Art „${item.missingDocumentType}“ bereit.`);
  return prisma.$transaction(async tx=>{
    const updated=await tx.payrollReconciliationItem.update({where:{id:item.id},data:{documentToFollow:false,expectedFollowUpAt:null}});
    await addHistory(tx,item.reconciliationId,user,"Nachreichung abgeschlossen",`Die angekündigte Nachreichung zum Thema „${item.topicTitleSnapshot}“ wurde bereitgestellt und abgeschlossen.`,"Offen","Abgeschlossen",item.id);
    return updated;
  });
}

export async function completePayrollReconciliation(reconciliationId:number,user:AuthUser){
  const reconciliation=await prisma.payrollReconciliation.findUnique({where:{id:reconciliationId},include:{items:true,questions:true}});
  if(!reconciliation)throw new PayrollReconciliationError("NOT_FOUND","Die FiBu-Lohn-Abstimmung wurde nicht gefunden.");
  if(!canHandlePayrollReconciliation(user,reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Abstimmung nicht erledigen.");
  if(reconciliation.questions.some(question=>question.status!=="Erledigt durch Lohn"))throw new PayrollReconciliationError("INCOMPLETE","Es bestehen noch offene oder beantwortete Rückfragen.");
  if(reconciliation.items.some(item=>item.documentToFollow))throw new PayrollReconciliationError("INCOMPLETE","Mindestens eine angekündigte Nachreichung ist noch nicht fachlich abgeschlossen.");
  if(reconciliation.items.some(item=>item.status==="Vollständig an Lohn übergeben"&&item.payrollProcessingStatus!=="Verarbeitet"))throw new PayrollReconciliationError("INCOMPLETE","Noch nicht alle übergebenen Themen wurden durch Lohn verarbeitet.");
  return prisma.$transaction(async tx=>{
    await ensurePayrollProcessingStarted(tx,reconciliation,user);
    const updated=await tx.payrollReconciliation.update({where:{id:reconciliation.id},data:{payrollStatus:"Erledigt",completedAt:new Date()}});
    await addHistory(tx,reconciliation.id,user,"Abstimmung durch Lohn erledigt","Die Lohnabteilung hat die monatliche Abstimmung erledigt.",reconciliation.payrollStatus,"Erledigt");
    return updated;
  });
}

async function requirePayrollAssignment(reconciliationId:number,user:AuthUser){
  const reconciliation=await prisma.payrollReconciliation.findUnique({where:{id:reconciliationId}});
  if(!reconciliation)throw new PayrollReconciliationError("NOT_FOUND","Die FiBu-Lohn-Abstimmung wurde nicht gefunden.");
  if(!canHandlePayrollReconciliation(user,reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diese Abstimmung nicht bearbeiten.");
  return reconciliation;
}

async function addHistory(tx:ReconciliationTransaction,reconciliationId:number,user:AuthUser,action:string,summary:string,previousValue:string|null,newValue:string|null,itemId?:number){
  await tx.payrollReconciliationHistory.create({data:{reconciliationId,reconciliationItemId:itemId,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:actorDepartment(user),action,summary,previousValue,newValue}});
}

function validMonth(year:number,month:number){return Number.isInteger(year)&&year>=2000&&year<=2100&&Number.isInteger(month)&&month>=1&&month<=12;}

export function assertCanManagePayrollTopics(user:AuthUser){
  if(!canManagePayrollTopics(user))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen den FiBu-Lohn-Themenkatalog nicht verwalten.");
}
