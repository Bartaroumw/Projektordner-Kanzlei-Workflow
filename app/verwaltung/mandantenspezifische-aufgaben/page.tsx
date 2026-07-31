import Link from "next/link";
import { redirect } from "next/navigation";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireUser } from "@/lib/auth";
import { canUseCentralCustomTaskOverview } from "@/lib/administration-navigation";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { EXECUTION_RHYTHMS, MONTHS, formatExecutionPlanning, parseExecutionMonths } from "@/lib/task-execution-planning";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function CentralCustomTasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (!canUseCentralCustomTaskOverview(user)) redirect("/zugriff-verweigert?bereich=Mandantenspezifische%20Aufgaben");
  const query = await searchParams;
  const client = one(query.mandant).trim();
  const title = one(query.aufgabe).trim();
  const status = one(query.status);
  const rhythm = one(query.rhythmus);
  const month = Number(one(query.monat)) || 0;
  const area = one(query.bereich);
  const tasks = (await prisma.customClientTask.findMany({
    where: {
      ...(client ? { OR: [{ client: { clientNumber: { contains: client } } }, { client: { name: { contains: client } } }] } : {}),
      ...(title ? { title: { contains: title } } : {}),
      ...(status === "aktiv" ? { active: true } : status === "inaktiv" ? { active: false } : {}),
      ...(rhythm ? { executionRhythm: rhythm } : {}),
      ...(area ? { taskArea: area } : {}),
    },
    include: { client: true, category: true },
    orderBy: [{ client: { clientNumber: "asc" } }, { title: "asc" }],
  })).filter((task) => !month || parseExecutionMonths(task.executionMonths).includes(month));
  const areas = [...new Set(tasks.map((task) => task.taskArea).filter((value): value is string => Boolean(value)))].sort((a,b)=>a.localeCompare(b,"de"));

  return <div>
    <AdministrationBreadcrumbs section="fachliche-grundlagen" current="Mandantenspezifische Aufgaben"/>
    <AdministrationTabs user={user} active="fachliche-grundlagen"/>
    <header>
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Mandantenübergreifende Qualitätskontrolle</p>
      <h1 className="mt-2 text-3xl font-bold">Mandantenspezifische Aufgaben</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Aufgaben werden hier gesucht und kontrolliert. Neuanlage und Bearbeitung bleiben bewusst im Kontext des jeweiligen Mandanten.</p>
    </header>
    <form className="mt-6 grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Mandant"><input className="input" name="mandant" defaultValue={client} placeholder="Nummer oder Name"/></Field>
      <Field label="Aufgabenname"><input className="input" name="aufgabe" defaultValue={title}/></Field>
      <Select label="Status" name="status" value={status} options={["aktiv","inaktiv"]} labels={["Aktiv","Inaktiv"]}/>
      <Select label="Rhythmus" name="rhythmus" value={rhythm} options={[...EXECUTION_RHYTHMS]}/>
      <Select label="Ausführungsmonat" name="monat" value={month?String(month):""} options={MONTHS.map((entry)=>String(entry.value))} labels={MONTHS.map((entry)=>entry.label)}/>
      <Select label="Aufgabenbereich" name="bereich" value={area} options={areas}/>
      <div className="flex items-end gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/verwaltung/mandantenspezifische-aufgaben">Zurücksetzen</Link></div>
    </form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
      <table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Aufgabe","Kategorie","Bereich","Rhythmus","Ausführungsmonate","Verantwortlicher","Status","Letzte Änderung","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{tasks.map((task)=><tr className="border-t" key={task.id}>
          <td className="p-3 font-semibold">{task.client.clientNumber} · {task.client.name}</td><td className="p-3">{task.title}</td><td className="p-3">{task.category.name}</td><td className="p-3">{task.taskArea??"–"}</td>
          <td className="p-3">{task.executionRhythm??task.taskType}</td><td className="p-3">{task.executionRhythm?formatExecutionPlanning(task.executionRhythm,task.executionMonths):task.executionMonth?MONTHS.find((entry)=>entry.value===task.executionMonth)?.label??String(task.executionMonth):"–"}</td>
          <td className="p-3">{task.processor??"–"}</td><td className="p-3">{task.active?"Aktiv":"Inaktiv"}</td><td className="p-3">{formatDate(task.updatedAt)}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/mandanten/${task.clientId}/zusatzaufgaben/${task.id}`}>Beim Mandanten öffnen</Link></td>
        </tr>)}{!tasks.length&&<tr><td className="p-10 text-center text-[var(--color-text-muted)]" colSpan={10}>Keine mandantenspezifischen Aufgaben zu den gewählten Filtern gefunden.</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>;}
function Select({label,name,value,options,labels}:{label:string;name:string;value:string;options:string[];labels?:string[]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map((option,index)=><option key={option} value={option}>{labels?.[index]??option}</option>)}</select></Field>;}
