import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CUSTOM_TASK_TYPES } from "@/lib/monthly-checklist-service";
import { createCustomTaskAction } from "@/app/monatschecklisten/actions";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { canManageCustomTasks, canViewClient } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";

export default async function CustomTasksPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}){
  const user=await requireUser();
  const id=Number((await params).id);
  const [client,categories]=await Promise.all([
    prisma.client.findUnique({where:{id},include:{customTasks:{include:{category:true},orderBy:{createdAt:"desc"}}}}),
    prisma.taskCategory.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
  ]);
  if(!client)notFound();
  if(!canViewClient(user,client))notFound();
  const mayManage=canManageCustomTasks(user);
  const query=await searchParams;
  return <div>
    <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href={`/mandanten/${id}`}>← Zur Mandantendetailseite</Link></div>
    <h1 className="text-3xl font-bold">Mandantenspezifische Aufgaben</h1><p className="mt-2 text-slate-600">{client.clientNumber} – {client.name}. Neue Aufgaben wirken ausschließlich auf später erzeugte Checklisten.</p>
    {one(query.fehler)&&<div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{one(query.fehler)}</div>}
    {one(query.erfolg)&&<div role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Die Zusatzaufgabe wurde erfolgreich angelegt.</div>}
    {mayManage&&<section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Zusatzaufgabe anlegen</h2>
      <form action={createCustomTaskAction.bind(null,id)} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titel"><input className="input" name="title" required/></Field>
        <Field label="Kategorie"><select className="input" name="categoryId">{categories.map((c)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Aufgabenart"><select className="input" name="taskType">{CUSTOM_TASK_TYPES.map((v)=><option key={v}>{v}</option>)}</select></Field>
        <label className="flex items-end gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked/> Aktiv</label>
        <Field label="Gültig ab"><input className="input" name="validFrom" type="date" defaultValue="2026-01-01" required/></Field>
        <Field label="Gültig bis (optional)"><input className="input" name="validUntil" type="date"/></Field>
        <Field label="Kalenderjahr (nur einmalig)"><input className="input" name="executionYear" type="number" min="2000" max="2100"/></Field>
        <Field label="Monat (nur einmalig)"><input className="input" name="executionMonth" type="number" min="1" max="12"/></Field>
        <Field label="Bearbeiter (optional)"><input className="input" name="processor"/></Field>
        <Field label="Prüfer (optional)"><input className="input" name="reviewer"/></Field>
        <div className="md:col-span-2"><Field label="Beschreibung"><textarea className="input min-h-24" name="description"/></Field></div>
        <div className="md:col-span-2 xl:col-span-4"><button className="button-primary">Zusatzaufgabe anlegen</button></div>
      </form>
    </section>}
    {!mayManage&&<p className="mt-6 rounded border border-[var(--color-border)] bg-white p-4 text-sm">Sie können diese Vorlagen ansehen. Dauerhafte Änderungen sind Prüfern und der Kanzleileitung vorbehalten.</p>}
    <section className="mt-7"><h2 className="mb-3 text-xl font-semibold">Vorhandene Zusatzaufgaben</h2><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[1150px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Titel","Kategorie","Aufgabenart","Status","Gültig ab","Gültig bis","Zielperiode","Geändert am","Aktion"].map((h)=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{client.customTasks.map((t)=><tr className="border-t border-slate-100" key={t.id}><td className="p-3 font-semibold">{t.title}</td><td className="p-3">{t.category.name}</td><td className="p-3">{t.taskType}</td><td className="p-3">{t.active?"Aktiv":"Inaktiv"}</td><td className="p-3">{formatDate(t.validFrom)}</td><td className="p-3">{t.validUntil?formatDate(t.validUntil):"–"}</td><td className="p-3">{t.executionYear&&t.executionMonth?`${t.executionMonth}/${t.executionYear}`:"–"}</td><td className="p-3">{formatDate(t.updatedAt)}</td><td className="p-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/mandanten/${id}/zusatzaufgaben/${t.id}`}>Öffnen</Link></td></tr>)}{client.customTasks.length===0&&<tr><td colSpan={9} className="p-10 text-center text-slate-500">Noch keine mandantenspezifischen Aufgaben vorhanden.</td></tr>}</tbody></table></div></section>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-sm font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
