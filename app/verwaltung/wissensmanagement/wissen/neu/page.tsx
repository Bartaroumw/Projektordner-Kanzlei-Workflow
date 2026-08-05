import Link from "next/link";
import { redirect } from "next/navigation";
import { KnowledgeForm } from "../knowledge-form";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NewKnowledgeContentPage() {
  const user = await requireUser(); if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement"); const data = await formData();
  return <div><header className="mb-6"><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href="/verwaltung/wissensmanagement">← Wissensinhalte</Link><h1 className="mt-3 text-3xl font-bold">Wissensinhalt anlegen</h1></header><KnowledgeForm {...data}/></div>;
}
export async function formData() { const [areas,users,tasks,topics]=await Promise.all([prisma.knowledgeArea.findMany({where:{status:"Aktiv"},orderBy:[{sortOrder:"asc"},{title:"asc"}]}),prisma.user.findMany({where:{active:true},select:{id:true,fullName:true},orderBy:{fullName:"asc"}}),prisma.standardTask.findMany({where:{active:true},select:{id:true,taskId:true,title:true,checklistType:true},orderBy:[{checklistType:"asc"},{taskId:"asc"}]}),prisma.payrollReconciliationTopic.findMany({where:{status:"Aktiv"},select:{id:true,key:true,title:true},orderBy:{sortOrder:"asc"}})]); return {areas,users,tasks,topics}; }
