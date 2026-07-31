import { notFound, redirect } from "next/navigation";
import { AdministrationBreadcrumbs } from "@/app/components/administration-navigation";
import { updateTaskAction } from "@/app/standardaufgaben/actions";
import { TaskForm } from "@/app/standardaufgaben/task-form";
import { requireUser } from "@/lib/auth";
import { canManageStandardTasks } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user=await requireUser();
  if(!canManageStandardTasks(user))redirect("/zugriff-verweigert?bereich=Standardaufgaben");
  const id = Number((await params).id);
  const [task, categories] = await Promise.all([
    Number.isInteger(id) ? prisma.standardTask.findUnique({ where: { id }, include: { category: true } }) : null,
    prisma.taskCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!task) notFound();
  return <div className="max-w-6xl"><AdministrationBreadcrumbs section="fachliche-grundlagen" current="Standardaufgabe bearbeiten"/><header className="mb-6"><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">{task.taskId}</p><h1 className="text-3xl font-bold">Standardaufgabe bearbeiten</h1><p className="mt-2 text-slate-600">Die Aufgaben-ID bleibt unverändert. Deaktivierung ersetzt eine physische Löschung.</p></header><section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><TaskForm action={updateTaskAction.bind(null, task.id)} categories={categories} task={task} cancelHref={`/standardaufgaben/${task.id}`} /></section></div>;
}
