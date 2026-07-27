import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CUSTOM_TASK_TYPES } from "@/lib/monthly-checklist-service";
import { updateCustomTaskAction } from "@/app/monatschecklisten/actions";
import { requireUser } from "@/lib/auth";
import { canManageCustomTasks } from "@/lib/permissions";
import { ExecutionPlanningFields } from "@/app/standardaufgaben/execution-planning-fields";

export default async function EditCustomTask({params,searchParams}:{params:Promise<{id:string;taskId:string}>;searchParams:Promise<{fehler?:string}>}){
  const user=await requireUser();
  if(!canManageCustomTasks(user))redirect("/zugriff-verweigert?bereich=Aufgabenvorlage");
  const {id,taskId}=await params;
  const [task,categories]=await Promise.all([
    prisma.customClientTask.findFirst({where:{id:Number(taskId),clientId:Number(id)}}),
    prisma.taskCategory.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
  ]);
  if(!task)notFound();
  const error=(await searchParams).fehler;
  const date=(value:Date)=>value.toISOString().slice(0,10);
  return <div><div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href={`/mandanten/${id}/zusatzaufgaben/${task.id}`}>← Zur Detailansicht</Link></div><h1 className="text-3xl font-bold">Aufgabenvorlage bearbeiten</h1>
    {error&&<div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
    <form action={updateCustomTaskAction.bind(null,Number(id),task.id)} className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <Field label="Titel"><input className="input" name="title" defaultValue={task.title} required/></Field><Field label="Kategorie"><select className="input" name="categoryId" defaultValue={task.categoryId}>{categories.map((c)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field><Field label="Aufgabenart"><select className="input" name="taskType" defaultValue={task.taskType}>{CUSTOM_TASK_TYPES.map((v)=><option key={v}>{v}</option>)}</select></Field><label className="flex items-end gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={task.active}/> Aktiv</label>
      <Field label="Gültig ab"><input className="input" name="validFrom" type="date" defaultValue={date(task.validFrom)} required/></Field><Field label="Gültig bis"><input className="input" name="validUntil" type="date" defaultValue={task.validUntil?date(task.validUntil):""}/></Field><Field label="Kalenderjahr (nur einmalig)"><input className="input" name="executionYear" type="number" min="2000" max="2100" defaultValue={task.executionYear??""}/></Field><Field label="Monat (nur einmalig)"><input className="input" name="executionMonth" type="number" min="1" max="12" defaultValue={task.executionMonth??""}/></Field>
      <Field label="Bearbeiter"><input className="input" name="processor" defaultValue={task.processor??""}/></Field><Field label="Prüfer"><input className="input" name="reviewer" defaultValue={task.reviewer??""}/></Field><div className="md:col-span-2"><Field label="Beschreibung"><textarea className="input min-h-24" name="description" defaultValue={task.description??""}/></Field></div>
      <div className="md:col-span-2 xl:col-span-4"><ExecutionPlanningFields initialRhythm={task.executionRhythm??(task.taskType==="Wiederkehrend quartalsweise"?"Vierteljährlich":task.taskType==="Wiederkehrend jährlich"?"Jährlich":"Monatlich")} initialMonths={task.executionMonths} initialArea={task.taskArea} annualOnly={false} rhythmName="executionRhythm" monthsName="customExecutionMonths"/></div>
      <div className="md:col-span-2 xl:col-span-4 flex gap-2"><button className="button-primary">Speichern</button><Link className="button-secondary" href={`/mandanten/${id}/zusatzaufgaben/${task.id}`}>Abbrechen</Link></div>
    </form>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-sm font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
