import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function StandardTasksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const params = await searchParams;
  const search = one(params.suche).trim();
  const checklistType = one(params.art);
  const category = one(params.kategorie);
  const legalForm = one(params.rechtsform);
  const profitMethod = one(params.gewinn);
  const rhythm = one(params.rhythmus);
  const mandatory = one(params.pflicht);
  const active = one(params.status);
  const sort = one(params.sortierung) || "sortierung";
  const orderBy = sort === "aufgaben-id" ? { taskId: "asc" as const } : sort === "bezeichnung" ? { title: "asc" as const } : { sortOrder: "asc" as const };

  const [tasks, categories] = await Promise.all([
    prisma.standardTask.findMany({
      where: {
        AND: [
          search ? { OR: [{ taskId: { contains: search } }, { title: { contains: search } }] } : {},
          checklistType ? { checklistType } : {},
          category ? { category: { name: category } } : {},
          legalForm ? { legalFormGroups: { contains: legalForm } } : {},
          profitMethod ? { profitDeterminationMethods: { contains: profitMethod } } : {},
          rhythm ? { rhythm } : {},
          mandatory === "ja" ? { mandatory: true } : mandatory === "nein" ? { mandatory: false } : {},
          active === "aktiv" ? { active: true } : active === "inaktiv" ? { active: false } : {},
        ],
      },
      include: { category: true },
      orderBy,
    }),
    prisma.taskCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Zentraler Aufgabenbestand</p><h1 className="text-3xl font-bold tracking-tight">Standardaufgaben</h1><p className="mt-2 text-slate-600">Fachliche Aufgaben verwalten und kontrolliert aus Excel übernehmen.</p></div>
        <div className="flex flex-wrap gap-2"><Link className="button-secondary" href="/standardaufgaben/kategorien">Kategorien</Link><Link className="button-secondary" href="/standardaufgaben/import">Excel-Import</Link><Link className="button-primary" href="/standardaufgaben/neu">Standardaufgabe anlegen</Link></div>
      </header>
      <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Filter name="suche" label="Suche"><input className="input" name="suche" defaultValue={search} placeholder="Aufgaben-ID oder Bezeichnung" /></Filter>
          <Select name="art" label="Checklistenart" value={checklistType} options={["Monat","Jahresabschluss"]} />
          <Select name="kategorie" label="Kategorie" value={category} options={categories.map((item) => item.name)} />
          <Select name="rechtsform" label="Rechtsformgruppe" value={legalForm} options={["Alle","Einzelunternehmen","Personengesellschaft","Kapitalgesellschaft"]} />
          <Select name="gewinn" label="Gewinnermittlungsart" value={profitMethod} options={["Alle","Einnahmenüberschussrechnung","Bilanzierung"]} />
          <Select name="rhythmus" label="Rhythmus" value={rhythm} options={["Monatlich","Quartalsweise","Bestimmter Monat","Jährlich"]} />
          <Select name="pflicht" label="Pflichtaufgabe" value={mandatory} options={["ja","nein"]} labels={["Ja","Nein"]} />
          <Select name="status" label="Status" value={active} options={["aktiv","inaktiv"]} labels={["Aktiv","Inaktiv"]} />
          <Select name="sortierung" label="Sortierung" value={sort} options={["sortierung","aufgaben-id","bezeichnung"]} labels={["Sortierreihenfolge","Aufgaben-ID","Bezeichnung"]} />
        </div>
        <div className="mt-3 flex gap-3"><button className="button-primary" type="submit">Anwenden</button><Link className="button-secondary" href="/standardaufgaben">Zurücksetzen</Link></div>
      </form>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto">
        <table className="w-full min-w-[1450px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>{["Aufgaben-ID","Checklistenart","Kategorie","Aufgabenbezeichnung","Rechtsformgruppe","Gewinnermittlungsart","Rhythmus","Pflicht","Status","Version","Aktion"].map((heading) => <th key={heading} className="border-b border-slate-200 px-3 py-3">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id} className="hover:bg-slate-50">
            <td className="whitespace-nowrap px-3 py-3 font-semibold">{task.taskId}</td><td className="px-3 py-3">{task.checklistType}</td><td className="px-3 py-3">{task.category.name}</td><td className="px-3 py-3">{task.title}</td><td className="px-3 py-3">{task.legalFormGroups}</td><td className="px-3 py-3">{task.profitDeterminationMethods}</td><td className="px-3 py-3">{task.rhythm}</td><td className="px-3 py-3">{task.mandatory ? "Ja" : "Nein"}</td><td className="px-3 py-3">{task.active ? "Aktiv" : "Inaktiv"}</td><td className="px-3 py-3">{task.professionalVersion}</td><td className="px-3 py-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/standardaufgaben/${task.id}`}>Öffnen</Link></td>
          </tr>)}{tasks.length === 0 && <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-500">Keine Standardaufgaben zu den gewählten Kriterien gefunden.</td></tr>}</tbody>
        </table>
      </div></div>
    </div>
  );
}

function Filter({ label, children }: { name: string; label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>; }
function Select({ name, label, value, options, labels }: { name: string; label: string; value: string; options: string[]; labels?: string[] }) { return <Filter name={name} label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map((option,index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></Filter>; }
