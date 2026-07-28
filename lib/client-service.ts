import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  annualProfileSchema,
  clientSchema,
  type AnnualProfileInput,
  type ClientInput,
} from "@/lib/validation";
import type { AuthUser } from "@/lib/permissions";

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "DUPLICATE_CLIENT_NUMBER"
      | "DUPLICATE_ANNUAL_PROFILE"
      | "INVALID_INPUT"
      | "NOT_FOUND",
  ) {
    super(message);
  }
}

function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String(error.meta?.target ?? "");
    if (target.includes("clientNumber")) {
      throw new DomainError(
        "Diese Mandantennummer ist bereits vorhanden.",
        "DUPLICATE_CLIENT_NUMBER",
      );
    }
    throw new DomainError(
      "Für diesen Mandanten ist bereits ein Jahresprofil für das gewählte Kalenderjahr vorhanden.",
      "DUPLICATE_ANNUAL_PROFILE",
    );
  }
  throw error;
}

export async function createClient(input: ClientInput, actor?:AuthUser) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    const data=await resolvedClientData(parsed.data);
    return await prisma.$transaction(async tx=>{
      const client=await tx.client.create({ data: { ...data, cadence: "monatlich" } });
      if(actor){
        const payrollUser=data.payrollUserId?await tx.user.findUnique({where:{id:data.payrollUserId},select:{fullName:true}}):null;
        await tx.clientPayrollResponsibilityHistory.create({data:{
          clientId:client.id,payrollPreparedByFirm:data.payrollPreparedByFirm,payrollUserId:data.payrollUserId,
          payrollUserNameSnapshot:payrollUser?.fullName??null,validFrom:data.payrollServiceStart,
          validUntil:data.payrollServiceEnd,note:data.payrollResponsibilityNote,changedByUserId:actor.id,
        }});
      }
      return client;
    });
  } catch (error) {
    translatePrismaError(error);
  }
}

export async function updateClient(id: number, input: ClientInput, actor?:AuthUser) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    const existing=await prisma.client.findUnique({where:{id}});
    if(!existing)throw new DomainError("Der Mandant wurde nicht gefunden.","NOT_FOUND");
    const data=await resolvedClientData(parsed.data);
    return await prisma.$transaction(async tx=>{
      const client=await tx.client.update({where:{id},data});
      const changed=existing.payrollPreparedByFirm!==data.payrollPreparedByFirm||existing.payrollUserId!==data.payrollUserId||
        existing.payrollServiceStart?.getTime()!==data.payrollServiceStart?.getTime()||existing.payrollServiceEnd?.getTime()!==data.payrollServiceEnd?.getTime()||
        existing.payrollResponsibilityNote!==data.payrollResponsibilityNote;
      if(actor&&changed){
        const payrollUser=data.payrollUserId?await tx.user.findUnique({where:{id:data.payrollUserId},select:{fullName:true}}):null;
        await tx.clientPayrollResponsibilityHistory.create({data:{clientId:id,payrollPreparedByFirm:data.payrollPreparedByFirm,payrollUserId:data.payrollUserId,payrollUserNameSnapshot:payrollUser?.fullName??null,validFrom:data.payrollServiceStart,validUntil:data.payrollServiceEnd,note:data.payrollResponsibilityNote,changedByUserId:actor.id}});
      }
      return client;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new DomainError("Der Mandant wurde nicht gefunden.", "NOT_FOUND");
    }
    translatePrismaError(error);
  }
}

async function resolvedClientData(input: import("zod").output<typeof clientSchema>) {
  const ids=[input.processorUserId,input.reviewerUserId,input.managementUserId,input.payrollUserId].filter((id):id is number=>Boolean(id));
  const users=await prisma.user.findMany({where:{id:{in:ids},active:true},include:{roles:true}});
  if(users.length!==new Set(ids).size)throw new DomainError("Inaktive oder unbekannte Benutzer dürfen nicht zugeordnet werden.","INVALID_INPUT");
  const roles=(id:number|null|undefined)=>new Set(users.find(user=>user.id===id)?.roles.map(entry=>entry.role)??[]);
  const hasAny=(id:number|null|undefined,allowed:string[])=>id===null||id===undefined||allowed.some(role=>roles(id).has(role));
  if(!hasAny(input.processorUserId,["MITARBEITER","PRUEFER","KANZLEILEITUNG"]))throw new DomainError("Der ausgewählte Bearbeiter besitzt keine fachliche Bearbeitungsrolle.","INVALID_INPUT");
  if(!hasAny(input.reviewerUserId,["PRUEFER","KANZLEILEITUNG"]))throw new DomainError("Der ausgewählte Prüfer besitzt keine Prüferrolle.","INVALID_INPUT");
  if(!hasAny(input.managementUserId,["KANZLEILEITUNG"]))throw new DomainError("Die ausgewählte Person besitzt keine Kanzleileitungsrolle.","INVALID_INPUT");
  if(!hasAny(input.payrollUserId,["LOHNSACHBEARBEITER"]))throw new DomainError("Die ausgewählte Person besitzt keine Lohnsachbearbeiterrolle.","INVALID_INPUT");
  if(input.payrollUserId&&[input.processorUserId,input.reviewerUserId,input.managementUserId].includes(input.payrollUserId))throw new DomainError("Lohnsachbearbeiter und Rechnungswesenrollen müssen personell getrennt sein.","INVALID_INPUT");
  const byId=new Map(users.map(user=>[user.id,user.fullName]));
  return {...input,processor:input.processorUserId?byId.get(input.processorUserId)??null:null,reviewer:input.reviewerUserId?byId.get(input.reviewerUserId)??null:null,managementName:input.managementUserId?byId.get(input.managementUserId)??null:null};
}

export async function createAnnualProfile(
  clientId: number,
  input: AnnualProfileInput,
) {
  const parsed = annualProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    return await prisma.annualProfile.create({
      data: { ...parsed.data, clientId },
    });
  } catch (error) {
    translatePrismaError(error);
  }
}

export async function updateAnnualProfile(
  id: number,
  clientId: number,
  input: AnnualProfileInput,
) {
  const parsed = annualProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    return await prisma.annualProfile.update({
      where: { id, clientId },
      data: parsed.data,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new DomainError("Das Jahresprofil wurde nicht gefunden.", "NOT_FOUND");
    }
    translatePrismaError(error);
  }
}

export async function searchClients(search: string) {
  const term = search.trim();
  return prisma.client.findMany({
    where: term
      ? {
          OR: [
            { clientNumber: { contains: term } },
            { name: { contains: term } },
          ],
        }
      : undefined,
    orderBy: { clientNumber: "asc" },
  });
}
