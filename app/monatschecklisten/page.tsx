import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";
import { formatDate } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function MonthlyChecklistOverview({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = one(params.suche).trim();
  const year = Number(one(params.jahr)) || undefined;
  const month = Number(one(params.monat)) || undefined;
  const clientId = Number(one(params.mandant)) || undefined;
  const processor = one(params.bearbeiter);
  const reviewer = one(params.pruefer);
  const team = one(params.team);
  const status = one(params.status);
  const cadence = one(params.turnus);
  const openPointsOnly = one(params.pruefpunkte) === "1";
  const oldOpenOnly = one(params.alt) === "1";
  const [periods, clients] = await Promise.all([
    prisma.accountingPeriod.findMany({
      where: {
        calendarYear: year,
        month,
        clientId,
        processingStatus: status || undefined,
        client: {
          processor: processor || undefined,
          reviewer: reviewer || undefined,
          team: team || undefined,
          cadence: cadence || undefined,
          OR: search ? [{ clientNumber: { contains: search } }, { name: { contains: search } }] : undefined,
        },
      },
      include: { client: true, tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true, processingNote: true } } },
      orderBy: [{ calendarYear: "desc" }, { month: "desc" }, { client: { clientNumber: "asc" } }],
    }),
    prisma.client.findMany({ where: { active: true }, orderBy: { clientNumber: "asc" } }),
  ]);
  const nowBerlin = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const visiblePeriods = periods.filter((period) => {
    const summary = workflowSummary(period.tasks);
    const oldOpen = period.processingStatus !== "Abgeschlossen" &&
      (period.calendarYear < nowBerlin.getFullYear() || (period.calendarYear === nowBerlin.getFullYear() && period.month < nowBerlin.getMonth() + 1));
    return (!openPointsOnly || summary.openReviewPoints > 0) && (!oldOpenOnly || oldOpen);
  });
  const unique = (field: "processor" | "reviewer" | "team") => [...new Set(clients.map((client) => client[field]).filter(Boolean) as string[])].sort();

  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Konkrete Bearbeitung</p><h1 className="text-3xl font-bold tracking-tight">Monatschecklisten</h1><p className="mt-2 text-slate-600">Buchhaltungsperioden mit unveränderlichen Aufgaben-Snapshots.</p></div>
      <Link className="button-primary" href="/monatschecklisten/neu">Periode erzeugen</Link>
    </header>
    <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Suche"><input className="input" name="suche" defaultValue={search} placeholder="Mandantennummer oder Name" /></Field>
        <Field label="Kalenderjahr"><input className="input" type="number" name="jahr" defaultValue={year} /></Field>
        <Select name="monat" label="Monat" value={month ? String(month) : ""} options={Array.from({length:12},(_,i)=>[String(i+1), new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,i,1))])} />
        <Select name="mandant" label="Mandant" value={clientId ? String(clientId) : ""} options={clients.map((client)=>[String(client.id),`${client.clientNumber} ${client.name}`])} />
        <Select name="bearbeiter" label="Bearbeiter" value={processor} options={unique("processor").map((v)=>[v,v])} />
        <Select name="pruefer" label="Prüfer" value={reviewer} options={unique("reviewer").map((v)=>[v,v])} />
        <Select name="team" label="Team" value={team} options={unique("team").map((v)=>[v,v])} />
        <Select name="status" label="Bearbeitungs- und Prüfphase" value={status} options={["Offen","In Bearbeitung","Zur Prüfung","In Prüfung","Nachbearbeitung","Abgeschlossen"].map((v)=>[v,v])} />
        <Select name="turnus" label="Turnus" value={cadence} options={[["monatlich","Monatlich"],["vierteljährlich","Vierteljährlich"]]} />
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pruefpunkte" value="1" defaultChecked={openPointsOnly}/> Nur offene Prüfpunkte</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="alt" value="1" defaultChecked={oldOpenOnly}/> Alte offene Perioden</label>
      </div>
      <div className="mt-3 flex gap-3"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/monatschecklisten">Zurücksetzen</Link></div>
    </form>
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1700px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Mandantennummer","Mandantenname","Periode","Bearbeiter","Prüfer","Periodenstatus","Offene Pflicht","Offene Prüfpunkte","Fortschritt","Übergabe","Letzte Prüfung","Letzte Änderung","Aktion"].map((h)=><th className="border-b border-slate-200 px-3 py-3" key={h}>{h}</th>)}</tr></thead>
      <tbody>{visiblePeriods.map((period)=>{const progress=calculateProgress(period.tasks);const summary=workflowSummary(period.tasks);return <tr className="border-t border-slate-100" key={period.id}><td className="px-3 py-3 font-semibold">{period.client.clientNumber}</td><td className="px-3 py-3">{period.client.name}</td><td className="px-3 py-3">{period.periodLabel}</td><td className="px-3 py-3">{period.processorSnapshot ?? period.client.processor ?? "–"}</td><td className="px-3 py-3">{period.reviewerSnapshot ?? period.client.reviewer ?? "–"}</td><td className="px-3 py-3">{period.processingStatus}</td><td className="px-3 py-3">{progress.mandatoryOpen}</td><td className="px-3 py-3">{summary.openReviewPoints}</td><td className="px-3 py-3">{progress.percent} %</td><td className="px-3 py-3">{period.submittedForReviewAt?formatDate(period.submittedForReviewAt):"–"}</td><td className="px-3 py-3">{period.lastReviewAt?formatDate(period.lastReviewAt):"–"}</td><td className="px-3 py-3">{formatDate(period.updatedAt)}</td><td className="px-3 py-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/monatschecklisten/${period.id}`}>Öffnen</Link></td></tr>})}{visiblePeriods.length===0&&<tr><td className="px-4 py-12 text-center text-slate-500" colSpan={13}>Keine Monatschecklisten zu den gewählten Kriterien gefunden.</td></tr>}</tbody></table>
    </div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>}
