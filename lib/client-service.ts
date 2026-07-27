import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  annualProfileSchema,
  clientSchema,
  type AnnualProfileInput,
  type ClientInput,
} from "@/lib/validation";

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

export async function createClient(input: ClientInput) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    return await prisma.client.create({ data: { ...await resolvedClientData(parsed.data), cadence: "monatlich" } });
  } catch (error) {
    translatePrismaError(error);
  }
}

export async function updateClient(id: number, input: ClientInput) {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0].message, "INVALID_INPUT");
  }
  try {
    return await prisma.client.update({
      where: { id },
      data: await resolvedClientData(parsed.data),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new DomainError("Der Mandant wurde nicht gefunden.", "NOT_FOUND");
    }
    translatePrismaError(error);
  }
}

async function resolvedClientData(input: ClientInput) {
  const ids=[input.processorUserId,input.reviewerUserId,input.managementUserId].filter((id):id is number=>Boolean(id));
  const users=await prisma.user.findMany({where:{id:{in:ids},active:true}});
  if(users.length!==new Set(ids).size)throw new DomainError("Inaktive oder unbekannte Benutzer dürfen nicht zugeordnet werden.","INVALID_INPUT");
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
