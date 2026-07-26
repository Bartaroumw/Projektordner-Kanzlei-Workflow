import { createTaskAction } from "@/app/standardaufgaben/actions";
import { TaskForm } from "@/app/standardaufgaben/task-form";
import { prisma } from "@/lib/prisma";

export default async function NewTaskPage() {
  const categories = await prisma.taskCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <div className="max-w-6xl"><header className="mb-6"><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Standardaufgaben</p><h1 className="text-3xl font-bold">Standardaufgabe anlegen</h1><p className="mt-2 text-slate-600">Die gleichen fachlichen Regeln wie beim Excel-Import werden angewendet.</p></header><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><TaskForm action={createTaskAction} categories={categories} cancelHref="/standardaufgaben" /></section></div>;
}
