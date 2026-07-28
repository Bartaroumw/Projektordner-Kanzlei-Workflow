import { prisma } from "./prisma.ts";
import { hasRole, type AuthUser } from "./permissions.ts";
import { PayrollReconciliationError } from "./payroll-reconciliation-service.ts";

export type VehicleInput={
  referenceNumber?:string;
  description:string;
  licensePlate?:string;
  userName:string;
  userFunction:string;
  contractAvailable:boolean;
  contractReference?:string;
  contractDate?:Date|null;
  ownershipType:string;
  grossListPriceCents?:number|null;
  documentReference?:string;
  onePercentRule:boolean;
  logbook:boolean;
  commuteUse:boolean;
  accountingAccount?:string;
  accountingBasis?:string;
  accountingExplanation?:string;
  validFrom:Date;
  validUntil?:Date|null;
  status:string;
  note?:string;
};

function normalized(input:VehicleInput){
  if(!input.description.trim()||!input.userName.trim())throw new PayrollReconciliationError("INVALID_INPUT","Fahrzeugbezeichnung und Nutzer sind erforderlich.");
  if(!["Geschäftsführer","Unternehmer","Arbeitnehmer","sonstige"].includes(input.userFunction))throw new PayrollReconciliationError("INVALID_INPUT","Die Funktion des Fahrzeugnutzers ist ungültig.");
  if(!["Eigentum","Leasing"].includes(input.ownershipType))throw new PayrollReconciliationError("INVALID_INPUT","Bitte wählen Sie Eigentum oder Leasing.");
  if(!["Aktiv","Beendet","Archiviert"].includes(input.status))throw new PayrollReconciliationError("INVALID_INPUT","Der Fahrzeugstatus ist ungültig.");
  if(input.validUntil&&input.validUntil<input.validFrom)throw new PayrollReconciliationError("INVALID_INPUT","Das Gültig-bis-Datum darf nicht vor dem Beginn liegen.");
  return {
    referenceNumber:input.referenceNumber?.trim()||null,description:input.description.trim(),
    licensePlate:input.licensePlate?.trim()||null,userName:input.userName.trim(),userFunction:input.userFunction,
    contractAvailable:input.contractAvailable,contractReference:input.contractReference?.trim()||null,
    contractDate:input.contractDate??null,ownershipType:input.ownershipType,grossListPriceCents:input.grossListPriceCents??null,
    documentReference:input.documentReference?.trim()||null,onePercentRule:input.onePercentRule,logbook:input.logbook,
    commuteUse:input.commuteUse,accountingAccount:input.accountingAccount?.trim()||null,
    accountingBasis:input.accountingBasis?.trim()||null,accountingExplanation:input.accountingExplanation?.trim()||null,
    validFrom:input.validFrom,validUntil:input.validUntil??null,status:input.status,note:input.note?.trim()||null,
  };
}

async function requireVehicleManagement(clientId:number,user:AuthUser){
  const client=await prisma.client.findUnique({where:{id:clientId},select:{processorUserId:true}});
  if(!client)throw new PayrollReconciliationError("NOT_FOUND","Der Mandant wurde nicht gefunden.");
  const allowed=client.processorUserId===user.id&&hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG")||hasRole(user,"KANZLEILEITUNG");
  if(!allowed)throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen den Fahrzeugbestand dieses Mandanten nicht verändern.");
}

export async function listClientVehicles(clientId:number,user:AuthUser){
  const client=await prisma.client.findUnique({where:{id:clientId},select:{processorUserId:true,reviewerUserId:true,managementUserId:true,payrollUserId:true}});
  if(!client)throw new PayrollReconciliationError("NOT_FOUND","Der Mandant wurde nicht gefunden.");
  const allowed=[client.processorUserId,client.reviewerUserId,client.managementUserId,client.payrollUserId].includes(user.id)&&
    hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG","LOHNSACHBEARBEITER")||hasRole(user,"KANZLEILEITUNG");
  if(!allowed)throw new PayrollReconciliationError("NOT_ALLOWED","Sie dürfen den Fahrzeugbestand dieses Mandanten nicht einsehen.");
  return prisma.clientVehicle.findMany({where:{clientId},include:{changes:{orderBy:[{effectiveFrom:"desc"},{createdAt:"desc"}]}},orderBy:[{status:"asc"},{description:"asc"}]});
}

export async function createClientVehicle(clientId:number,input:VehicleInput,user:AuthUser,reconciliationItemId?:number){
  await requireVehicleManagement(clientId,user);
  const data=normalized(input);
  return prisma.$transaction(async tx=>{
    const vehicle=await tx.clientVehicle.create({data:{clientId,...data,createdByUserId:user.id,updatedByUserId:user.id}});
    const change=await tx.clientVehicleChange.create({data:{vehicleId:vehicle.id,reconciliationItemId,changeType:"Fahrzeug angelegt",effectiveFrom:data.validFrom,summary:`Fahrzeug „${vehicle.description}“ wurde angelegt.`,newValueJson:JSON.stringify(data),createdByUserId:user.id}});
    if(reconciliationItemId){
      const item=await tx.payrollReconciliationItem.findUniqueOrThrow({where:{id:reconciliationItemId}});
      await tx.payrollReconciliationHistory.create({data:{reconciliationId:item.reconciliationId,reconciliationItemId,vehicleId:vehicle.id,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Fahrzeug angelegt",summary:change.summary}});
    }
    return vehicle;
  });
}

export async function updateClientVehicle(vehicleId:number,input:VehicleInput,changeType:string,effectiveFrom:Date,user:AuthUser,reconciliationItemId?:number){
  const existing=await prisma.clientVehicle.findUnique({where:{id:vehicleId}});
  if(!existing)throw new PayrollReconciliationError("NOT_FOUND","Das Fahrzeug wurde nicht gefunden.");
  await requireVehicleManagement(existing.clientId,user);
  const data=normalized(input);
  const summary=changeType.trim();
  if(summary.length<3)throw new PayrollReconciliationError("INVALID_INPUT","Bitte geben Sie eine verständliche Änderungsart an.");
  return prisma.$transaction(async tx=>{
    const vehicle=await tx.clientVehicle.update({where:{id:vehicleId},data:{...data,updatedByUserId:user.id}});
    await tx.clientVehicleChange.create({data:{vehicleId,reconciliationItemId,changeType:summary,effectiveFrom,summary:`${summary}: „${vehicle.description}“.`,previousValueJson:JSON.stringify(existing),newValueJson:JSON.stringify(data),createdByUserId:user.id}});
    if(reconciliationItemId){
      const item=await tx.payrollReconciliationItem.findUniqueOrThrow({where:{id:reconciliationItemId}});
      await tx.payrollReconciliationHistory.create({data:{reconciliationId:item.reconciliationId,reconciliationItemId,vehicleId,actorUserId:user.id,actorNameSnapshot:user.fullName,actorDepartment:"Rechnungswesen",action:"Fahrzeug geändert",summary:`${summary}: „${vehicle.description}“.`}});
    }
    return vehicle;
  });
}
