import Link from "next/link";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus,canManageStandardTasks } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { EXECUTION_RHYTHMS, MONTHS, formatExecutionPlanning, parseExecutionMonths } from "@/lib/task-execution-planning";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function StandardTasksPage({ searchParams }: { searchParams: SearchParams }) {
  const user=await requireUser();
  if(!canManageStandardTasks(user)&&!canManageOrdoCampus(user))redirect("/zugriff-verweigert?bereich=Standardaufgaben");
  const params = await searchParams;
  const search = one(params.suche).trim();
  const checklistType = one(params.art);
  const category = one(params.kategorie);
  const legalForm = one(params.rechtsform);
  const profitMethod = one(params.gewinn);
  const rhythm = one(params.rhythmus);
  const executionMonth = Number(one(params.ausfuehrungsmonat)) || 0;
  const mandatory = one(params.pflicht);
  const active = one(params.status);
  const campus = one(params.campus);
  const sort = one(params.sortierung) || "sortierung";
  const orderBy = sort === "aufgaben-id" ? { taskId: "asc" as const } : sort === "bezeichnung" ? { title: "asc" as const } : { sortOrder: "asc" as const };

  const [databaseTasks, categories] = await Promise.all([
    prisma.standardTask.findMany({
      where: {
        AND: [
          search ? { OR: [
            { taskId: { contains: search } }, { title: { contains: search } },
            { knowledgeContentLinks: { some: { knowledgeContent: { OR:[
              {shortDescription:{contains:search}},{workingGuidance:{contains:search}},{firmStandard:{contains:search}},
              {reviewerGuidance:{contains:search}},{typicalErrors:{contains:search}},
              {links:{some:{OR:[{title:{contains:search}},{description:{contains:search}}]}}},
            ] } } } },
          ] } : {},
          checklistType ? { checklistType } : {},
          category ? { category: { name: category } } : {},
          legalForm ? { legalFormGroups: { contains: legalForm } } : {},
          profitMethod ? { profitDeterminationMethods: { contains: profitMethod } } : {},
          rhythm ? { rhythm } : {},
          mandatory === "ja" ? { mandatory: true } : mandatory === "nein" ? { mandatory: false } : {},
          active === "aktiv" ? { active: true } : active === "inaktiv" ? { active: false } : {},
          campus === "mit-wissen" ? { knowledgeContentLinks: { some: {} } } :
          campus === "ohne-wissen" ? { knowledgeContentLinks: { none: {} } } :
          ["Aktiv","Entwurf","Archiviert"].includes(campus) ? { knowledgeContentLinks: { some: { knowledgeContent: { status: campus } } } } :
          campus === "mit-datev" ? { knowledgeContentLinks: { some: { knowledgeContent: { links: { some: { active: true, linkType: { startsWith: "DATEV" } } } } } } } :
          campus === "ohne-datev" ? { knowledgeContentLinks: { none: { knowledgeContent: { links: { some: { active: true, linkType: { startsWith: "DATEV" } } } } } } } : {},
        ],
      },
      include: { category: true, knowledgeContentLinks: { include: { knowledgeContent: { select: { status: true } } } } },
      orderBy,
    }),
    prisma.taskCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const tasks = executionMonth ? databaseTasks.filter((task) => parseExecutionMonths(task.executionMonths).includes(executionMonth)) : databaseTasks;

  return (
    <div>
      <AdministrationBreadcrumbs section="fachliche-grundlagen" current="Standardaufgaben"/>
      <AdministrationTabs user={user} active="fachliche-grundlagen"/>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Fachliche Grundlagen</p><h1 className="text-3xl font-bold tracking-tight">Standardaufgaben</h1><p className="mt-2 text-slate-600">Fachliche Aufgaben verwalten und kontrolliert aus Excel übernehmen.</p></div>
        {canManageStandardTasks(user)&&<div className="flex flex-wrap gap-2"><Link className="button-secondary" href="/standardaufgaben/kategorien">Kategorien</Link><Link className="button-secondary" href="/standardaufgaben/import">Excel-Import</Link><Link className="button-primary" href="/standardaufgaben/neu">Standardaufgabe anlegen</Link></div>}
      </header>
      <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter name="suche" label="Suche"><input className="input" name="suche" defaultValue={search} placeholder="Aufgabe, Wissen oder Link" /></Filter>
          <Select name="art" label="Checklistenart" value={checklistType} options={["Monat","Jahresabschluss","Beide"]} />
          <Select name="kategorie" label="Kategorie" value={category} options={categories.map((item) => item.name)} />
          <Select name="rechtsform" label="Rechtsformgruppe" value={legalForm} options={["Alle","Einzelunternehmen","Personengesellschaft","Kapitalgesellschaft"]} />
          <Select name="gewinn" label="Gewinnermittlungsart" value={profitMethod} options={["Alle","Einnahmenüberschussrechnung","Bilanzierung"]} />
          <Select name="rhythmus" label="Rhythmus" value={rhythm} options={[...EXECUTION_RHYTHMS]} />
          <Select name="ausfuehrungsmonat" label="Ausführung im Monat" value={executionMonth ? String(executionMonth) : ""} options={MONTHS.map((month) => String(month.value))} labels={MONTHS.map((month) => month.label)} />
          <Select name="pflicht" label="Pflichtaufgabe" value={mandatory} options={["ja","nein"]} labels={["Ja","Nein"]} />
          <Select name="status" label="Status" value={active} options={["aktiv","inaktiv"]} labels={["Aktiv","Inaktiv"]} />
          <Select name="campus" label="Ordo Campus" value={campus} options={["mit-wissen","ohne-wissen","Aktiv","Entwurf","Archiviert","mit-datev","ohne-datev"]} labels={["Nur mit Wissen","Nur ohne Wissen","Nur aktive Inhalte","Nur Entwürfe","Nur archivierte Inhalte","Mit DATEV-Link","Ohne DATEV-Link"]} />
          <Select name="sortierung" label="Sortierung" value={sort} options={["sortierung","aufgaben-id","bezeichnung"]} labels={["Sortierreihenfolge","Aufgaben-ID","Bezeichnung"]} />
        </div>
        <div className="mt-3 flex gap-3"><button className="button-primary" type="submit">Anwenden</button><Link className="button-secondary" href="/standardaufgaben">Zurücksetzen</Link></div>
      </form>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto">
        <table className="w-full min-w-[1450px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>{["Aufgaben-ID","Checklistenart","Kategorie","Aufgabenbezeichnung","Rechtsformgruppe","Gewinnermittlungsart","Rhythmus","Pflicht","Status","Campus","Version","Aktion"].map((heading) => <th key={heading} className="border-b border-slate-200 px-3 py-3">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-3 py-3 font-semibold">{task.taskId}</td><td className="px-3 py-3">{task.checklistType}</td><td className="px-3 py-3">{task.category.name}</td><td className="px-3 py-3">{task.title}</td><td className="px-3 py-3">{task.legalFormGroups}</td><td className="px-3 py-3">{task.profitDeterminationMethods}</td><td className="px-3 py-3">{task.checklistType==="Jahresabschluss"?"Jährlich":formatExecutionPlanning(task.rhythm,task.executionMonths)}</td><td className="px-3 py-3">{task.mandatory ? "Ja" : "Nein"}</td><td className="px-3 py-3">{task.active ? "Aktiv" : "Inaktiv"}</td><td className="px-3 py-3"><CampusStatus count={task.knowledgeContentLinks.length} active={task.knowledgeContentLinks.filter(link=>link.knowledgeContent.status==="Aktiv").length}/></td><td className="px-3 py-3">{task.professionalVersion}</td><td className="px-3 py-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/standardaufgaben/${task.id}`}>Öffnen</Link></td>
          </tr>)}{tasks.length === 0 && <tr><td colSpan={12} className="px-4 py-12 text-center text-slate-500">Keine Standardaufgaben zu den gewählten Kriterien gefunden.</td></tr>}</tbody>
        </table>
      </div></div>
    </div>
  );
}

function Filter({ label, children }: { name: string; label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>; }
function Select({ name, label, value, options, labels }: { name: string; label: string; value: string; options: string[]; labels?: string[] }) { return <Filter name={name} label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map((option,index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></Filter>; }
function CampusStatus({count,active}:{count:number;active:number}) {
  return <span className={`whitespace-nowrap text-xs font-semibold ${active?"text-[var(--color-primary-dark)]":"text-[var(--color-text-muted)]"}`}><span aria-hidden="true">{active?"●":"○"}</span> {count?`${active} aktiv · ${count} gesamt`:"Kein Wissen"}</span>;
}
