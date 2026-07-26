import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  standardTaskSchema,
  type StandardTaskInput,
} from "@/lib/standard-task-validation";

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

export async function createStandardTask(input: StandardTaskInput) {
  const result = standardTaskSchema.safeParse(input);
  if (!result.success) {
    throw new StandardTaskError(result.error.issues[0].message, "INVALID_INPUT");
  }
  const { categoryName, ...data } = result.data;
  try {
    return await prisma.standardTask.create({
      data: { ...data, categoryId: await categoryId(categoryName) },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StandardTaskError("Diese Aufgaben-ID ist bereits vorhanden.", "DUPLICATE_TASK_ID");
    }
    throw error;
  }
}

export async function updateStandardTask(id: number, input: StandardTaskInput) {
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
  return prisma.standardTask.update({
    where: { id },
    data: { ...data, categoryId: await categoryId(categoryName) },
  });
}
