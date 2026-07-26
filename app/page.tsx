import Link from "next/link";
import { getDashboardData, type DashboardFilters, type DashboardPeriod } from "@/lib/dashboard-service";
import { formatDate } from "@/lib/format";
import { ClickableTableRow } from "@/app/components/clickable-table-row";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const berlinNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const filters: DashboardFilters = {
    year: Number(one(params.jahr)) || berlinNow.getFullYear(),
    month: Number(one(params.monat)) || berlinNow.getMonth() + 1,
    clientId: Number(one(params.mandant)) || undefined,
    search: one(params.suche),
    processor: one(params.bearbeiter),
    reviewer: one(params.pruefer),
    management: one(params.kanzleileitung),
    status: one(params.status),
    onlyOldOpen: one(params.alt) === "1",
    onlyOpenMandatory: one(params.pflicht) === "1",
    onlyOpenReviewPoints: one(params.pruefpunkte) === "1",
    workViewName: one(params.arbeitsansicht),
  };
  const data = await getDashboardData(filters);
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "Europe/Berlin" }).format(new Date(Date.UTC(2026, filters.month - 1, 1)));
  const processors = unique(data.clients.map((client) => client.processor));
  const reviewers = unique(data.clients.map((client) => client.reviewer));
  const managementNames = unique(data.clients.map((client) => client.managementName));
  const people = unique(data.clients.flatMap((client) => [client.processor, client.reviewer]));
  const metrics = [
    ["Gesamtzahl Monatschecklisten", data.metrics.total],
    ["Offen", data.metrics.open],
    ["In Bearbeitung", data.metrics.processing],
    ["Zur Prüfung", data.metrics.readyForReview],
    ["In Prüfung", data.metrics.inReview],
    ["Nachbearbeitung", data.metrics.rework],
    ["Abgeschlossen", data.metrics.completed],
    ["Offene Pflichtaufgaben", data.metrics.openMandatory],
    ["Offene Prüfpunkte", data.metrics.openReviewPoints],
    ["Alte offene Checklisten", data.metrics.oldOpen],
  ] as const;

  return <div id="dashboard">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Operative Steuerung</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard Rechnungswesen</h1><p className="mt-2 text-slate-600">Ausgewählte Auswertung: <strong>{monthName} {filters.year}</strong></p></div>
      <div className="flex flex-wrap gap-2"><Link className="button-primary" href="/monatschecklisten/neu">Checkliste anlegen</Link><Link className="button-secondary" href="/mandanten/neu">Mandant anlegen</Link><Link className="button-secondary" href="/standardaufgaben">Standardaufgaben</Link><Link className="button-secondary" href="/standardaufgaben/import">Excel-Import</Link><Link className="button-secondary" href="/monatschecklisten">Monatschecklisten</Link></div>
    </header>

    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Kalenderjahr"><input className="input" name="jahr" type="number" min="2000" max="2100" defaultValue={filters.year}/></Field>
        <Select label="Monat" name="monat" value={String(filters.month)} options={Array.from({length:12},(_,i)=>[String(i+1),new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,i,1))])}/>
        <Select label="Mandant" name="mandant" value={filters.clientId ? String(filters.clientId) : ""} options={data.clients.map((client)=>[String(client.id),`${client.clientNumber} ${client.name}`])}/>
        <Field label="Suche"><input className="input" name="suche" defaultValue={filters.search} placeholder="Mandantennummer oder Name"/></Field>
        <Select label="Arbeitsansicht für" name="arbeitsansicht" value={filters.workViewName ?? ""} options={people.map(value=>[value,value])}/>
        <Select label="Bearbeiter" name="bearbeiter" value={filters.processor ?? ""} options={processors.map((value)=>[value,value])}/>
        <Select label="Prüfer" name="pruefer" value={filters.reviewer ?? ""} options={reviewers.map((value)=>[value,value])}/>
        <Select label="Kanzleileitung" name="kanzleileitung" value={filters.management ?? ""} options={managementNames.map((value)=>[value,value])}/>
        <Select label="Checklistenstatus" name="status" value={filters.status ?? ""} options={["Offen","In Bearbeitung","Zur Prüfung","In Prüfung","Nachbearbeitung","Abgeschlossen"].map((value)=>[value,value])}/>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="alt" value="1" defaultChecked={filters.onlyOldOpen}/> Nur alte offene Checklisten</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pflicht" value="1" defaultChecked={filters.onlyOpenMandatory}/> Nur offene Pflichtaufgaben</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pruefpunkte" value="1" defaultChecked={filters.onlyOpenReviewPoints}/> Nur offene Prüfpunkte</label>
        <button className="button-primary">Filter anwenden</button><Link className="button-secondary" href="/">Filter zurücksetzen</Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">„Arbeitsansicht für“ ist nur ein Filter und keine Anmeldung oder technische Identitätsprüfung.</p>
    </form>

    <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Kennzahlen für {monthName} {filters.year}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label,value])=><article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></article>)}</div></section>

    {filters.workViewName && <section className="mt-7"><h2 className="text-xl font-semibold">Arbeitsansicht für {filters.workViewName}</h2><div className="mt-3 grid gap-6 2xl:grid-cols-2"><PeriodSection title="Meine Bearbeitungen" periods={data.myProcessing}/><PeriodSection title="Meine Prüfungen" periods={data.myReviews}/></div></section>}

    <section className="mt-7 space-y-7">
      <PeriodSection title="Zur Bearbeitung" periods={data.work}/>
      <PeriodSection title="Zur Prüfung" periods={data.review}/>
      <PeriodSection title="Offene Prüfpunkte" periods={data.reviewPoints}/>
      <PeriodSection title="Alte offene Monatschecklisten" periods={data.oldOpen}/>
      <PeriodSection title="Zuletzt geändert" periods={data.recent}/>
    </section>

    <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Fehlende Monatschecklisten</h2><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandantennummer","Mandantenname","Bearbeiter","Prüfer","Kanzleileitung","Nächster Monat","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{data.missing.map((client)=><tr className="border-t border-[var(--color-border)]" key={client.id}><td className="p-3 font-semibold">{client.clientNumber}</td><td className="p-3">{client.name}</td><td className="p-3">{client.processor??"–"}</td><td className="p-3">{client.reviewer??"–"}</td><td className="p-3">{client.managementName??"–"}</td><td className="p-3">{monthName} {filters.year}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/monatschecklisten/neu?clientId=${client.id}&year=${filters.year}&month=${filters.month}`}>Monatscheckliste anlegen</Link></td></tr>)}{data.missing.length===0&&<tr><td colSpan={7} className="p-8 text-center text-slate-500">Für die Auswahl fehlt keine nächste Monatscheckliste.</td></tr>}</tbody></table></div></section>

    <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Datenqualitätshinweise</h2><div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{data.quality.length?<ul className="space-y-2">{data.quality.map((item)=><li key={item.key}><Link className="text-sm font-semibold text-amber-800 hover:underline" href={item.href}>{item.text}</Link></li>)}</ul>:<p className="text-sm text-slate-500">Keine Datenqualitätshinweise für die aktuelle Auswahl.</p>}</div></section>
  </div>;
}

function PeriodSection({title,periods}:{title:string;periods:DashboardPeriod[]}){return <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><span className="text-sm text-slate-500">{periods.length} Einträge</span></div><PeriodTable periods={periods}/></section>}
function PeriodTable({periods}:{periods:DashboardPeriod[]}){return <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1450px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandantennummer","Mandantenname","Monatscheckliste","Kanzleileitung","Bearbeiter","Prüfer","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Letzte Änderung"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{periods.map((period)=><ClickableTableRow href={`/monatschecklisten/${period.id}`} className="border-t border-[var(--color-border)]" key={period.id}><td className="p-3 font-semibold"><Link href={`/monatschecklisten/${period.id}`} className="text-[var(--color-primary-dark)]">{period.client.clientNumber}</Link></td><td className="p-3">{period.client.name}</td><td className="p-3">{period.periodLabel}</td><td className="p-3">{period.managementNameSnapshot??"–"}</td><td className="p-3">{period.processorSnapshot??"–"}</td><td className="p-3">{period.reviewerSnapshot??"–"}</td><td className="p-3"><StatusBadge value={period.processingStatus}/></td><td className="p-3">{period.progress.completed}/{period.progress.total} · {period.progress.percent} %</td><td className="p-3">{period.progress.mandatoryOpen}</td><td className="p-3">{period.summary.openReviewPoints}</td><td className="p-3">{formatDate(period.updatedAt)}</td></ClickableTableRow>)}{periods.length===0&&<tr><td colSpan={11} className="p-8 text-center text-slate-500">Keine Monatschecklisten in dieser Arbeitsliste.</td></tr>}</tbody></table></div>}
function StatusBadge({value}:{value:string}){const colors:Record<string,string>={"Offen":"bg-slate-100 text-slate-800","In Bearbeitung":"bg-blue-100 text-blue-900","Zur Prüfung":"bg-amber-100 text-amber-950","In Prüfung":"bg-indigo-100 text-indigo-900","Nachbearbeitung":"bg-orange-100 text-orange-950","Abgeschlossen":"bg-emerald-100 text-emerald-900"};return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${colors[value]??"bg-slate-100"}`}>{value}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map(([option,labelText])=><option key={option} value={option}>{labelText}</option>)}</select></Field>}
function unique(values:(string|null)[]){return [...new Set(values.filter(Boolean) as string[])].sort()}
