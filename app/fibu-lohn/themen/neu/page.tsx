import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePayrollTopics } from "@/lib/permissions";
import { createPayrollTopicAction } from "@/app/fibu-lohn/actions";
import { PayrollTopicForm } from "../topic-form";
import { ToastMessage } from "@/app/components/toast-message";
export default async function NewTopicPage({searchParams}:{searchParams:Promise<{fehler?:string}>}){const user=await requireUser();if(!canManagePayrollTopics(user))redirect("/zugriff-verweigert?bereich=FiBu-Lohn-Themen");const tasks=await prisma.standardTask.findMany({where:{active:true},select:{id:true,taskId:true,title:true},orderBy:{taskId:"asc"}});return <div className="max-w-5xl"><ToastMessage message={(await searchParams).fehler} type="error"/><h1 className="mb-6 text-3xl font-bold">FiBu-Lohn-Thema anlegen</h1><section className="rounded-lg border border-[var(--color-border)] bg-white p-6"><PayrollTopicForm action={createPayrollTopicAction} standardTasks={tasks}/></section></div>}
