import { randomUUID } from "node:crypto";
import { mkdir,readFile,unlink,writeFile } from "node:fs/promises";
import { basename,extname,resolve,sep } from "node:path";
import { prisma } from "@/lib/prisma";
import { canProcessPayrollReconciliation,canViewPayrollReconciliation,type AuthUser } from "@/lib/permissions";
import { PayrollReconciliationError } from "@/lib/payroll-reconciliation-service";

export const PAYROLL_DOCUMENT_MAX_BYTES=15*1024*1024;
export const PAYROLL_DOCUMENT_STORAGE_ROOT=process.env.FIBU_LOHN_STORAGE_DIR
  ?resolve(process.env.FIBU_LOHN_STORAGE_DIR)
  :resolve(process.cwd(),process.env.NODE_ENV==="test"?"tmp/fibu-lohn-test":"storage/fibu-lohn");
const allowed:Record<string,readonly string[]>={
  ".pdf":["application/pdf"],
  ".docx":["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xlsx":["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".png":["image/png"],".jpg":["image/jpeg"],".jpeg":["image/jpeg"],
};
export type PayrollDocumentUpload={displayName:string;documentType:string;description?:string;originalFileName:string;mimeType:string;bytes:Uint8Array;questionId?:number};

function safeName(value:string){return basename(value.replaceAll("\\","/")).normalize("NFKC").replace(/[<>:"/\\|?*\u0000-\u001f]/g,"_").replace(/\s+/g," ").trim().slice(0,240)||"datei";}
function starts(bytes:Uint8Array,signature:number[]){return signature.every((value,index)=>bytes[index]===value);}
function signature(extension:string,bytes:Uint8Array){
  if(extension===".pdf")return starts(bytes,[0x25,0x50,0x44,0x46,0x2d]);
  if(extension===".png")return starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if(extension===".jpg"||extension===".jpeg")return starts(bytes,[0xff,0xd8,0xff]);
  return [".docx",".xlsx"].includes(extension)&&starts(bytes,[0x50,0x4b]);
}
function storagePath(key:string){const target=resolve(PAYROLL_DOCUMENT_STORAGE_ROOT,key);if(!target.startsWith(`${PAYROLL_DOCUMENT_STORAGE_ROOT}${sep}`))throw new PayrollReconciliationError("INVALID_INPUT","Der Belegpfad ist ungültig.");return target;}

function validate(input:PayrollDocumentUpload){
  if(!input.displayName.trim()||!input.documentType.trim())throw new PayrollReconciliationError("INVALID_INPUT","Anzeigename und Belegart sind erforderlich.");
  if(!input.bytes.byteLength||input.bytes.byteLength>PAYROLL_DOCUMENT_MAX_BYTES)throw new PayrollReconciliationError("INVALID_INPUT","Der Beleg ist leer oder größer als 15 MB.");
  const originalFileName=safeName(input.originalFileName),extension=extname(originalFileName).toLowerCase(),types=allowed[extension];
  if(!types||!types.includes(input.mimeType.toLowerCase())||!signature(extension,input.bytes))throw new PayrollReconciliationError("INVALID_INPUT","Dateityp, Dateiendung oder Dateiinhalt sind nicht zulässig.");
  return{displayName:input.displayName.trim().slice(0,300),documentType:input.documentType.trim().slice(0,120),description:input.description?.trim().slice(0,2000)||null,originalFileName,extension,mimeType:types[0]};
}

export async function uploadPayrollDocument(itemId:number,input:PayrollDocumentUpload,user:AuthUser){
  const item=await prisma.payrollReconciliationItem.findUnique({where:{id:itemId},include:{reconciliation:true}});
  if(!item)throw new PayrollReconciliationError("NOT_FOUND","Das Abstimmungsthema wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,item.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen für dieses Abstimmungsthema keine Belege hochladen.");
  if(input.questionId){
    const question=await prisma.payrollReconciliationQuestion.findFirst({where:{id:input.questionId,reconciliationItemId:item.id}});
    if(!question)throw new PayrollReconciliationError("INVALID_INPUT","Die angegebene Rückfrage gehört nicht zu diesem Abstimmungsthema.");
  }
  const data=validate(input);await mkdir(PAYROLL_DOCUMENT_STORAGE_ROOT,{recursive:true});
  const storedFileName=`${randomUUID()}${data.extension}`,target=storagePath(storedFileName);
  try{await writeFile(target,input.bytes,{flag:"wx"});}catch{throw new PayrollReconciliationError("INVALID_INPUT","Der Beleg konnte nicht gespeichert werden.");}
  try{return await prisma.$transaction(async tx=>{
    const document=await tx.payrollDocumentReference.create({data:{reconciliationItemId:item.id,questionId:input.questionId,displayName:data.displayName,originalFileName:data.originalFileName,storedFileName,storageKey:storedFileName,fileExtension:data.extension.slice(1).toUpperCase(),mimeType:data.mimeType,fileSizeBytes:input.bytes.byteLength,documentType:data.documentType,description:data.description,uploadedByUserId:user.id}});
    await tx.payrollReconciliationHistory.create({data:{reconciliationId:item.reconciliationId,reconciliationItemId:item.id,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Beleg hochgeladen",summary:`Beleg „${document.displayName}“ wurde geschützt bereitgestellt.`}});
    return document;
  });}catch{await unlink(target).catch(()=>undefined);throw new PayrollReconciliationError("INVALID_INPUT","Der Beleg konnte nicht gespeichert werden.");}
}

export async function archivePayrollDocument(documentId:number,user:AuthUser){
  const document=await prisma.payrollDocumentReference.findUnique({where:{id:documentId},include:{reconciliationItem:{include:{reconciliation:true}}}});
  if(!document)throw new PayrollReconciliationError("NOT_FOUND","Der Beleg wurde nicht gefunden.");
  if(!canProcessPayrollReconciliation(user,document.reconciliationItem.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diesen Beleg nicht archivieren.");
  return prisma.$transaction(async tx=>{
    const updated=await tx.payrollDocumentReference.update({where:{id:document.id},data:{status:"Archiviert",archivedAt:new Date(),archivedByUserId:user.id}});
    await tx.payrollReconciliationHistory.create({data:{reconciliationId:document.reconciliationItem.reconciliationId,reconciliationItemId:document.reconciliationItemId,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Beleg archiviert",summary:`Beleg „${document.displayName}“ wurde archiviert.`}});
    return updated;
  });
}

export async function readPayrollDocument(documentId:number,user:AuthUser){
  const document=await prisma.payrollDocumentReference.findUnique({where:{id:documentId},include:{reconciliationItem:{include:{reconciliation:true}}}});
  if(!document||document.status!=="Aktiv")throw new PayrollReconciliationError("NOT_FOUND","Der Beleg ist nicht verfügbar.");
  if(!canViewPayrollReconciliation(user,document.reconciliationItem.reconciliation))throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen diesen Beleg nicht öffnen.");
  return{document,bytes:await readFile(storagePath(document.storageKey))};
}

