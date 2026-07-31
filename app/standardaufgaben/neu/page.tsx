import { createTaskAction } from "@/app/standardaufgaben/actions";
import { AdministrationBreadcrumbs } from "@/app/components/administration-navigation";
import { TaskForm } from "@/app/standardaufgaben/task-form";
import { requireUser } from "@/lib/auth";
import { canManageStandardTasks } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewTaskPage() {
  const user=await requireUser();
  if(!canManageStandardTasks(user))redirect("/zugriff-verweigert?bereich=Standardaufgaben");
  const categories = await prisma.taskCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return <div className="max-w-6xl"><AdministrationBreadcrumbs section="fachliche-grundlagen" current="Standardaufgabe anlegen"/><header className="mb-6"><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Standardaufgaben</p><h1 className="text-3xl font-bold">Standardaufgabe anlegen</h1><p className="mt-2 text-slate-600">Die gleichen fachlichen Regeln wie beim Excel-Import werden angewendet.</p></header><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><TaskForm action={createTaskAction} categories={categories} cancelHref="/standardaufgaben" /></section></div>;
}
