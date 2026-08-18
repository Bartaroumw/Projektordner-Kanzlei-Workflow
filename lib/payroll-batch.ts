export type PayrollTopicDraft={
  decision:string;
  note:string;
  details:Record<string,string>;
  documentToFollow:boolean;
  followUpReason:string;
  expectedFollowUpAt:string;
  missingDocumentType:string;
};

export type PayrollPositionDraft={
  itemId:number;
  positionId:number|null;
  positionType:"Einzelposition"|"Sammelposition";
  title:string;
  caseCount:number;
  totalAmount:string;
  period:string;
  summary:string;
  people:string;
  details:Record<string,string>;
  requiredListType:string;
  requiredListDocumentName:string;
};

export type PayrollTopicChange=PayrollTopicDraft&{itemId:number;expectedUpdatedAt:string};
export type PayrollPositionChange=PayrollPositionDraft&{key:string;expectedUpdatedAt?:string};
export type PayrollBatchChange={topics:PayrollTopicChange[];positions:PayrollPositionChange[]};

export type PayrollBatchSaveResultItem={
  key:string;
  ok:boolean;
  code:"SAVED"|"VALIDATION"|"FORBIDDEN"|"CONFLICT"|"NOT_FOUND"|"TECHNICAL";
  message:string;
  savedTopic?:PayrollTopicDraft&{updatedAt:string};
  savedPosition?:PayrollPositionDraft&{positionId:number;updatedAt:string};
};
export type PayrollBatchSaveResult={results:PayrollBatchSaveResultItem[]};

export function samePayrollDraft(left:PayrollTopicDraft|PayrollPositionDraft,right:PayrollTopicDraft|PayrollPositionDraft){return JSON.stringify(left)===JSON.stringify(right)}

export function validatePayrollTopicDraft(draft:PayrollTopicDraft){
  if(!["Noch nicht geprüft","Kein relevanter Sachverhalt","Sachverhalt vorhanden"].includes(draft.decision))return "Bitte treffen Sie eine gültige Themenentscheidung.";
  if(draft.documentToFollow&&(!draft.followUpReason.trim()||!draft.missingDocumentType.trim()))return "Eine Nachreichung benötigt Belegart und Begründung.";
  return null;
}

export function validatePayrollPositionDraft(draft:PayrollPositionDraft){
  if(!draft.title.trim())return "Die Position benötigt eine verständliche Bezeichnung.";
  if(draft.positionType==="Sammelposition"&&(!Number.isInteger(draft.caseCount)||draft.caseCount<2))return "Eine Sammelposition benötigt mindestens zwei Fälle.";
  return null;
}
