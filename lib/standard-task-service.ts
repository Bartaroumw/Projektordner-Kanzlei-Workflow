import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  standardTaskSchema,
  type StandardTaskInput,
} from "@/lib/standard-task-validation";
import type { AuthUser } from "@/lib/permissions";
import { formatExecutionPlanning } from "@/lib/task-execution-planning";

export class StandardTaskError extends Error {
  constructor(
    message: string,
    public readonly code: "DUPLICATE_TASK_ID" | "INVALID_INPUT" | "NOT_FOUND",
  ) {
    super(message);
  }
}

async function categoryId(name: string) {
  const category = await prisma.taskCategory.findUnique({ where: { name } });
  if (!category) {
    throw new StandardTaskError("Die gewählte Kategorie ist nicht vorhanden.", "INVALID_INPUT");
  }
  return category.id;
}

export async function createStandardTask(input: StandardTaskInput, actor?: AuthUser) {
  const result = standardTaskSchema.safeParse(input);
  if (!result.success) {
    throw new StandardTaskError(result.error.issues[0].message, "INVALID_INPUT");
  }
  const { categoryName, ...data } = result.data;
  try {
    const task = await prisma.standardTask.create({
      data: { ...data, categoryId: await categoryId(categoryName) },
    });
    if (actor && task.checklistType !== "Jahresabschluss") {
      await prisma.standardTaskPlanningHistory.create({
        data: {
          standardTaskId: task.id,
          actorUserId: actor.id,
          actorNameSnapshot: actor.fullName,
          changedArea: "Ausführungsplanung angelegt",
          newValue: formatExecutionPlanning(task.rhythm, task.executionMonths),
        },
      });
    }
    return task;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StandardTaskError("Diese Aufgaben-ID ist bereits vorhanden.", "DUPLICATE_TASK_ID");
    }
    throw error;
  }
}

export async function updateStandardTask(id: number, input: StandardTaskInput, actor?: AuthUser) {
  const result = standardTaskSchema.safeParse(input);
  if (!result.success) {
    throw new StandardTaskError(result.error.issues[0].message, "INVALID_INPUT");
  }
  const existing = await prisma.standardTask.findUnique({ where: { id } });
  if (!existing) throw new StandardTaskError("Die Standardaufgabe wurde nicht gefunden.", "NOT_FOUND");
  if (existing.taskId !== result.data.taskId) {
    throw new StandardTaskError(
      "Die Aufgaben-ID ist dauerhaft und kann nicht geändert werden.",
      "INVALID_INPUT",
    );
  }
  const { categoryName, taskId: _taskId, ...data } = result.data;
  void _taskId;
  const updated = await prisma.standardTask.update({
    where: { id },
    data: { ...data, categoryId: await categoryId(categoryName) },
  });
  if (actor && (
    existing.rhythm !== updated.rhythm ||
    existing.executionMonths !== updated.executionMonths ||
    existing.taskArea !== updated.taskArea
  )) {
    const changes = [
      existing.rhythm !== updated.rhythm ? "Rhythmus" : null,
      existing.executionMonths !== updated.executionMonths ? "Ausführungsmonate" : null,
      existing.taskArea !== updated.taskArea ? "Aufgabenbereich" : null,
    ].filter(Boolean).join(", ");
    await prisma.standardTaskPlanningHistory.create({
      data: {
        standardTaskId: id,
        actorUserId: actor.id,
        actorNameSnapshot: actor.fullName,
        changedArea: `${changes} geändert`,
        previousValue: `${formatExecutionPlanning(existing.rhythm, existing.executionMonths)} · ${existing.taskArea ?? "ohne Aufgabenbereich"}`,
        newValue: `${formatExecutionPlanning(updated.rhythm, updated.executionMonths)} · ${updated.taskArea ?? "ohne Aufgabenbereich"}`,
      },
    });
  }
  return updated;
}
