import { notFound, redirect } from "next/navigation";
import { AdministrationBreadcrumbs } from "@/app/components/administration-navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePayrollTopics } from "@/lib/permissions";
import { updatePayrollTopicAction } from "@/app/fibu-lohn/actions";
import { PayrollTopicForm } from "../../topic-form";
import { ToastMessage } from "@/app/components/toast-message";
export default async function EditTopicPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{fehler?:string}>}){const user=await requireUser();if(!canManagePayrollTopics(user))redirect("/zugriff-verweigert?bereich=Rechnungswesen–Lohn-Themen");const id=Number((await params).id);const topic=Number.isInteger(id)?await prisma.payrollReconciliationTopic.findUnique({where:{id}}):null;if(!topic)notFound();const tasks=await prisma.standardTask.findMany({where:{active:true},select:{id:true,taskId:true,title:true},orderBy:{taskId:"asc"}});return <div className="max-w-5xl"><AdministrationBreadcrumbs section="fachliche-grundlagen" current="Rechnungswesen–Lohn-Thema bearbeiten"/><ToastMessage message={(await searchParams).fehler} type="error"/><h1 className="mb-6 text-3xl font-bold">Rechnungswesen–Lohn-Thema bearbeiten</h1><section className="rounded-lg border border-[var(--color-border)] bg-white p-6"><PayrollTopicForm action={updatePayrollTopicAction.bind(null,topic.id)} topic={topic} standardTasks={tasks}/></section></div>}
