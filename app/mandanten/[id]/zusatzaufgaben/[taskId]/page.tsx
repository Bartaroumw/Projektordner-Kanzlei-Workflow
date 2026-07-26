import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function CustomTaskDetail({params,searchParams}:{params:Promise<{id:string;taskId:string}>;searchParams:Promise<{erfolg?:string}>}){
  const {id,taskId}=await params;
  const task=await prisma.customClientTask.findFirst({where:{id:Number(taskId),clientId:Number(id)},include:{client:true,category:true,checklistTasks:{select:{id:true}}}});
  if(!task)notFound();
  const success=(await searchParams).erfolg;
  return <div><div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href={`/mandanten/${id}/zusatzaufgaben`}>← Zur Aufgabenübersicht</Link></div>
    {success&&<div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Die Aufgabenvorlage wurde erfolgreich gespeichert.</div>}
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">{task.client.clientNumber} – Zusatzaufgabe</p><h1 className="mt-2 text-3xl font-bold">{task.title}</h1></div><Link className="button-primary" href={`/mandanten/${id}/zusatzaufgaben/${task.id}/bearbeiten`}>Bearbeiten</Link></header>
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Data label="Status" value={task.active?"Aktiv":"Inaktiv"}/><Data label="Kategorie" value={task.category.name}/><Data label="Aufgabenart" value={task.taskType}/><Data label="Gültig ab" value={formatDate(task.validFrom)}/><Data label="Gültig bis" value={task.validUntil?formatDate(task.validUntil):"–"}/><Data label="Zielperiode" value={task.executionYear&&task.executionMonth?`${task.executionMonth}/${task.executionYear}`:"–"}/><Data label="Bearbeiter" value={task.processor??"–"}/><Data label="Prüfer" value={task.reviewer??"–"}/><Data label="Geändert am" value={formatDateTime(task.updatedAt)}/><Data label="Erzeugte Snapshots" value={String(task.checklistTasks.length)}/></dl><div className="mt-5 border-t pt-4"><div className="text-xs font-semibold uppercase text-slate-500">Beschreibung</div><p className="mt-1 whitespace-pre-wrap text-sm">{task.description??"–"}</p></div><p className="mt-4 text-sm text-slate-600">Änderungen und Deaktivierung wirken ausschließlich auf künftig erzeugte Checklisten. Vorhandene Snapshots bleiben unverändert.</p></section>
  </div>
}
function Data({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>}
