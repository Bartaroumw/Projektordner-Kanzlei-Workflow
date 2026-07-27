"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createStandardTask,
  StandardTaskError,
  updateStandardTask,
} from "@/lib/standard-task-service";
import {
  validateStandardTaskInput,
  type StandardTaskInput,
} from "@/lib/standard-task-validation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ALL_MONTHS, serializeExecutionMonths } from "@/lib/task-execution-planning";

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function bool(formData: FormData, field: string) {
  return formData.get(field) === "on";
}

function inputFromForm(formData: FormData):
  | { success: true; data: StandardTaskInput }
  | { success: false; state: TaskFormState } {
  const raw = {
    taskId: String(formData.get("taskId") ?? ""),
    active: bool(formData, "active"),
    checklistType: String(formData.get("checklistType") ?? ""),
    categoryName: String(formData.get("categoryName") ?? ""),
    subcategory: String(formData.get("subcategory") ?? ""),
    title: String(formData.get("title") ?? ""),
    workInstruction: String(formData.get("workInstruction") ?? ""),
    reviewInstruction: String(formData.get("reviewInstruction") ?? ""),
    mandatory: bool(formData, "mandatory"),
    rhythm: String(formData.get("rhythm") ?? ""),
    executionMonth: null,
    executionMonths: formData.getAll("executionMonths").length
      ? serializeExecutionMonths(formData.getAll("executionMonths").map(Number))
      : serializeExecutionMonths(ALL_MONTHS),
    taskArea: String(formData.get("taskArea") ?? ""),
    legalFormGroups: String(formData.get("legalFormGroups") ?? ""),
    profitDeterminationMethods: String(formData.get("profitDeterminationMethods") ?? ""),
    cashCondition: String(formData.get("cashCondition") ?? ""),
    payrollCondition: String(formData.get("payrollCondition") ?? ""),
    fixedAssetsCondition: String(formData.get("fixedAssetsCondition") ?? ""),
    receivablesPayablesCondition: String(formData.get("receivablesPayablesCondition") ?? ""),
    loansCondition: String(formData.get("loansCondition") ?? ""),
    vatCondition: String(formData.get("vatCondition") ?? ""),
    permanentExtensionCondition: String(formData.get("permanentExtensionCondition") ?? ""),
    knowledgeKey: String(formData.get("knowledgeKey") ?? ""),
    sortOrder: Number(formData.get("sortOrder")),
    professionalVersion: String(formData.get("professionalVersion") ?? ""),
    internalNote: String(formData.get("internalNote") ?? ""),
  };
  try {
    const result = validateStandardTaskInput(raw as never);
    return result.success
      ? { success: true, data: result.data }
      : {
          success: false,
          state: {
            error: "Bitte prüfen Sie die markierten Angaben.",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        };
  } catch (error) {
    return {
      success: false,
      state: { error: error instanceof Error ? error.message : "Die Angaben sind ungültig." },
    };
  }
}

function friendly(error: unknown): TaskFormState {
  if (error instanceof StandardTaskError) return { error: error.message };
  console.error(error);
  return { error: "Die Standardaufgabe konnte nicht gespeichert werden." };
}

export async function createTaskAction(
  _state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireRole("KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const parsed = inputFromForm(formData);
  if (!parsed.success) return parsed.state;
  try {
    const task = await createStandardTask(parsed.data, user);
    revalidatePath("/standardaufgaben");
    redirect(`/standardaufgaben/${task.id}?erfolg=angelegt`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return friendly(error);
  }
}

export async function updateTaskAction(
  id: number,
  _state: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireRole("KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const parsed = inputFromForm(formData);
  if (!parsed.success) return parsed.state;
  try {
    await updateStandardTask(id, parsed.data, user);
    revalidatePath("/standardaufgaben");
    redirect(`/standardaufgaben/${id}?erfolg=gespeichert`);
  } catch (error) {
    if (isRedirect(error)) throw error;
    return friendly(error);
  }
}

export async function createCategoryAction(formData: FormData) {
  await requireRole("KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/standardaufgaben/kategorien?fehler=Name");
  try {
    await prisma.taskCategory.create({
      data: {
        name,
        description: String(formData.get("description") ?? "").trim() || null,
        sortOrder: Number(formData.get("sortOrder")) || 0,
        active: true,
      },
    });
  } catch {
    redirect("/standardaufgaben/kategorien?fehler=Doppelt");
  }
  revalidatePath("/standardaufgaben");
  redirect("/standardaufgaben/kategorien?erfolg=angelegt");
}

export async function updateCategoryAction(id: number, formData: FormData) {
  await requireRole("KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/standardaufgaben/kategorien?fehler=Name");
  try {
    await prisma.taskCategory.update({
      where: { id },
      data: {
        name,
        description: String(formData.get("description") ?? "").trim() || null,
        sortOrder: Number(formData.get("sortOrder")) || 0,
        active: bool(formData, "active"),
      },
    });
  } catch {
    redirect("/standardaufgaben/kategorien?fehler=Speichern");
  }
  revalidatePath("/standardaufgaben");
  redirect("/standardaufgaben/kategorien?erfolg=gespeichert");
}

function isRedirect(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error &&
    String(error.digest).startsWith("NEXT_REDIRECT");
}
