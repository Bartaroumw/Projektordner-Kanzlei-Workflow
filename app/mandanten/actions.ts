"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAnnualProfile,
  createClient,
  DomainError,
  updateAnnualProfile,
  updateClient,
} from "@/lib/client-service";
import {
  annualProfileSchema,
  clientSchema,
  type AnnualProfileInput,
  type ClientInput,
} from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { canManageClients } from "@/lib/permissions";

async function requireClientManagement() {
  const user=await requireUser();
  if(!canManageClients(user)) throw new Error("Sie sind nicht berechtigt, Mandantenstammdaten zu verwalten.");
  return user;
}

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function booleanValue(formData: FormData, field: string) {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

function optionalDate(formData: FormData, field: string) {
  const value=String(formData.get(field)??"").trim();
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function clientInput(formData: FormData):
  | { success: true; data: ClientInput }
  | { success: false; state: FormState } {
  const result = clientSchema.safeParse({
    clientNumber: formData.get("clientNumber"),
    name: formData.get("name"),
    processor: formData.get("processor") ?? "",
    reviewer: formData.get("reviewer") ?? "",
    managementName: formData.get("managementName") ?? "",
    processorUserId: formData.get("processorUserId") ? Number(formData.get("processorUserId")) : null,
    reviewerUserId: formData.get("reviewerUserId") ? Number(formData.get("reviewerUserId")) : null,
    managementUserId: formData.get("managementUserId") ? Number(formData.get("managementUserId")) : null,
    payrollPreparedByFirm: booleanValue(formData, "payrollPreparedByFirm"),
    payrollUserId: formData.get("payrollUserId") ? Number(formData.get("payrollUserId")) : null,
    payrollServiceStart: optionalDate(formData, "payrollServiceStart"),
    payrollServiceEnd: null,
    payrollResponsibilityNote: formData.get("payrollResponsibilityNote") ?? "",
    vatFilingPeriod: formData.get("vatFilingPeriod"),
    active: booleanValue(formData, "active"),
    internalNote: formData.get("internalNote") ?? "",
  });
  return result.success
    ? { success: true, data: result.data }
    : { success: false, state: {
        error: "Bitte prüfen Sie die markierten Angaben.",
        fieldErrors: result.error.flatten().fieldErrors,
      } };
}

function annualInput(formData: FormData):
  | { success: true; data: AnnualProfileInput }
  | { success: false; state: FormState } {
  const result = annualProfileSchema.safeParse({
    calendarYear: Number(formData.get("calendarYear")),
    legalFormGroup: formData.get("legalFormGroup"),
    profitDeterminationMethod: formData.get("profitDeterminationMethod"),
    hasCashRegister: booleanValue(formData, "hasCashRegister"),
    hasPayroll: booleanValue(formData, "hasPayroll"),
    hasFixedAssets: booleanValue(formData, "hasFixedAssets"),
    hasReceivablesPayables: booleanValue(formData, "hasReceivablesPayables"),
    hasLoans: booleanValue(formData, "hasLoans"),
    subjectToVat: booleanValue(formData, "subjectToVat"),
    hasPermanentExtension: booleanValue(formData, "hasPermanentExtension"),
  });
  if (formData.get("confirmed") !== "on") {
    return { success: false, state: {
      error: "Bitte bestätigen Sie, dass Sie die Angaben geprüft haben.",
      fieldErrors: { confirmed: ["Die Bestätigung ist erforderlich."] },
    } };
  }
  return result.success
    ? { success: true, data: result.data }
    : { success: false, state: {
        error: "Bitte prüfen Sie die markierten Angaben.",
        fieldErrors: result.error.flatten().fieldErrors,
      } };
}

function friendlyError(error: unknown): FormState {
  if (error instanceof DomainError) {
    return { error: error.message };
  }
  console.error(error);
  return {
    error:
      "Die Angaben konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.",
  };
}

export async function createClientAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user=await requireClientManagement();
  const input = clientInput(formData);
  if (!input.success) return input.state;
  const createAnnual=booleanValue(formData,"createAnnualProfile");
  const annual=createAnnual?annualInput(formData):null;
  if(annual&&!annual.success)return annual.state;
  try {
    const client = await createClient(input.data,user,annual?.success?annual.data:null);
    revalidatePath("/mandanten");
    redirect(`/mandanten/${client.id}?erfolg=angelegt`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return friendlyError(error);
  }
}

export async function updateClientAction(
  id: number,
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user=await requireClientManagement();
  const input = clientInput(formData);
  if (!input.success) return input.state;
  try {
    await updateClient(id, input.data,user);
    revalidatePath("/mandanten");
    revalidatePath(`/mandanten/${id}`);
    redirect(`/mandanten/${id}?erfolg=gespeichert`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return friendlyError(error);
  }
}

export async function createAnnualProfileAction(
  clientId: number,
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireClientManagement();
  const input = annualInput(formData);
  if (!input.success) return input.state;
  try {
    await createAnnualProfile(clientId, input.data);
    revalidatePath(`/mandanten/${clientId}`);
    redirect(`/mandanten/${clientId}?erfolg=jahresprofil-angelegt`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return friendlyError(error);
  }
}

export async function updateAnnualProfileAction(
  profileId: number,
  clientId: number,
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireClientManagement();
  const input = annualInput(formData);
  if (!input.success) return input.state;
  try {
    await updateAnnualProfile(profileId, clientId, input.data);
    revalidatePath(`/mandanten/${clientId}`);
    redirect(`/mandanten/${clientId}?erfolg=jahresprofil-gespeichert`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return friendlyError(error);
  }
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT")
  );
}
