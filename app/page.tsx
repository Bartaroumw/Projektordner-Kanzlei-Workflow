import Link from "next/link";
import { getDashboardData, type DashboardFilters, type DashboardPeriod } from "@/lib/dashboard-service";
import { formatDate } from "@/lib/format";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { requireUser } from "@/lib/auth";
import { canManageClients, hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { annualProgress } from "@/lib/annual-checklist-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const user=await requireUser();
  const canManageStandards=hasRole(user,"KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
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
    userId:user.id,
    officeWide:one(params.kanzleiweit)==="1"&&hasRole(user,"KANZLEILEITUNG"),
  };
  const data = await getDashboardData(filters);
  const annualAll=await prisma.annualChecklist.findMany({where:{status:{not:"Freigegeben"}},include:{client:true,tasks:true},orderBy:{updatedAt:"asc"}});
  const annualProcessing=annualAll.filter(item=>item.processorUserId===user.id&&["Offen","In Vorbereitung","Nachbearbeitung"].includes(item.status));
  const annualReviews=annualAll.filter(item=>item.reviewerUserId===user.id&&["Zur Prüfung","In Prüfung","Fachlich abgeschlossen"].includes(item.status));
  const annualReleases=annualAll.filter(item=>item.managementUserId===user.id&&item.status==="Zur Freigabe");
  const monthName = new Intl.DateTimeFormat("de-DE", { month: "long", timeZone: "Europe/Berlin" }).format(new Date(Date.UTC(2026, filters.month - 1, 1)));
  const processors = unique(data.clients.map((client) => client.processor));
  const reviewers = unique(data.clients.map((client) => client.reviewer));
  const managementNames = unique(data.clients.map((client) => client.managementName));
  const metrics = [
    ["Rechnungswesen-Checklisten", data.metrics.total],
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
      <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Operative Steuerung</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard Rechnungswesen</h1><p className="mt-2 text-[var(--color-text-muted)]">Ausgewählte Auswertung: <strong>{monthName} {filters.year}</strong></p></div>
      <div className="flex flex-wrap gap-2">{canManageClients(user)&&<><Link className="button-primary" href="/monatschecklisten/neu">Checkliste anlegen</Link><Link className="button-secondary" href="/mandanten/neu">Mandant anlegen</Link></>}{canManageStandards&&<><Link className="button-secondary" href="/standardaufgaben">Standardaufgaben</Link><Link className="button-secondary" href="/standardaufgaben/import">Excel-Import</Link></>}{canManageClients(user)&&<Link className="button-secondary" href="/monatschecklisten">Rechnungswesenaufgaben</Link>}</div>
    </header>

    <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Kalenderjahr"><input className="input" name="jahr" type="number" min="2000" max="2100" defaultValue={filters.year}/></Field>
        <Select label="Monat" name="monat" value={String(filters.month)} options={Array.from({length:12},(_,i)=>[String(i+1),new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,i,1))])}/>
        <Select label="Mandant" name="mandant" value={filters.clientId ? String(filters.clientId) : ""} options={data.clients.map((client)=>[String(client.id),`${client.clientNumber} ${client.name}`])}/>
        <Field label="Suche"><input className="input" name="suche" defaultValue={filters.search} placeholder="Mandantennummer oder Name"/></Field>
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
      {hasRole(user,"KANZLEILEITUNG")&&<label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="kanzleiweit" value="1" defaultChecked={filters.officeWide}/> Kanzleiweite Ansicht</label>}
    </form>

    <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Kennzahlen für {monthName} {filters.year}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label,value])=><article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></article>)}</div></section>

    <section className="mt-8"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Mein Arbeitsbereich · {user.fullName}</h2><div className="mt-4 space-y-8"><PeriodSection title="Meine Bearbeitungen" periods={data.myProcessing} allHref="/monatschecklisten?arbeitsart=bearbeitung"/><PeriodSection title="Meine Prüfungen" periods={data.myReviews} allHref="/monatschecklisten?arbeitsart=pruefung"/><PeriodSection title="Meine offenen Rückfragen" periods={data.myQuestions} allHref="/monatschecklisten?pruefpunkte=1"/></div></section>
    <section className="mt-9"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Jahresabschlussaufgaben</h2><div className="mt-4 space-y-8"><AnnualSection title="Meine Jahresabschlussbearbeitungen" items={annualProcessing} kind="processing"/><AnnualSection title="Meine Jahresabschlussprüfungen" items={annualReviews} kind="review"/><AnnualSection title="Meine Freigaben" items={annualReleases} kind="release"/></div></section>

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

function PeriodSection({title,periods,allHref}:{title:string;periods:DashboardPeriod[];allHref?:string}){const empty=title==="Meine Bearbeitungen"?"Ihnen sind derzeit keine offenen Monatschecklisten zur Bearbeitung zugeordnet.":title==="Meine Prüfungen"?"Ihnen sind derzeit keine Monatschecklisten zur Prüfung zugeordnet.":title==="Meine offenen Rückfragen"?"Für Sie bestehen derzeit keine offenen Rückfragen.":"Keine Monatschecklisten in dieser Arbeitsliste.";return <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">{title} · {periods.length}</h3>{allHref&&<Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={allHref}>Alle anzeigen</Link>}</div><PeriodTable periods={periods.slice(0,10)} empty={empty}/></section>}
function periodTarget(period:DashboardPeriod){const issue=period.tasks.find(task=>task.id&&["Rückfrage","Beanstandung"].includes(task.reviewStatus));if(issue?.id)return `/monatschecklisten/${period.id}?pruefpunkte=1#aufgabe-${issue.id}`;if(["Zur Prüfung","In Prüfung"].includes(period.processingStatus))return `/monatschecklisten/${period.id}#workflow`;const mandatory=period.tasks.find(task=>task.id&&task.mandatorySnapshot&&!["Erledigt","Nicht zutreffend","In Folgemonat übertragen"].includes(task.status));return `/monatschecklisten/${period.id}?pflicht=ja#${mandatory?.id?`aufgabe-${mandatory.id}`:"aufgaben"}`}
function PeriodTable({periods,empty="Keine Monatschecklisten in dieser Arbeitsliste."}:{periods:DashboardPeriod[];empty?:string}){return <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Checkliste","Nächster Schritt","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Letzte Änderung"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{periods.map((period)=>{const href=periodTarget(period);const priority=period.summary.openReviewPoints>0?"Hoch":period.processingStatus==="Zur Prüfung"?"Prüfung":period.progress.mandatoryOpen>0?"Pflichtaufgaben":"Normal";const next=period.summary.openReviewPoints>0?"Prüfpunkt beantworten":period.processingStatus==="Zur Prüfung"?"Prüfung beginnen":period.processingStatus==="In Prüfung"?"Prüfung fortsetzen":"Bearbeitung fortsetzen";return <ClickableTableRow href={href} className="border-t border-[var(--color-border)]" key={period.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{priority}</td><td className="p-3"><Link href={href} className="font-semibold text-[var(--color-primary-dark)]">{period.client.clientNumber} · {period.client.name}</Link></td><td className="p-3">{period.periodLabel}</td><td className="p-3">{next}</td><td className="p-3"><StatusBadge value={period.processingStatus}/></td><td className="p-3">{period.progress.completed}/{period.progress.total} · {period.progress.percent} %</td><td className="p-3">{period.progress.mandatoryOpen}</td><td className="p-3">{period.summary.openReviewPoints}</td><td className="p-3">{formatDate(period.updatedAt)}</td></ClickableTableRow>})}{periods.length===0&&<tr><td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">{empty}</td></tr>}</tbody></table></div>}
function StatusBadge({value}:{value:string}){const colors:Record<string,string>={"Offen":"bg-slate-100 text-[var(--color-text)]","In Bearbeitung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Zur Prüfung":"bg-amber-100 text-amber-950","In Prüfung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Nachbearbeitung":"bg-orange-100 text-orange-950","Abgeschlossen":"bg-emerald-100 text-emerald-900"};return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${colors[value]??"bg-slate-100"}`}>{value}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map(([option,labelText])=><option key={option} value={option}>{labelText}</option>)}</select></Field>}
function unique(values:(string|null)[]){return [...new Set(values.filter(Boolean) as string[])].sort()}
function AnnualSection({title,items,kind}:{title:string;kind:"processing"|"review"|"release";items:Array<{id:number;fiscalYear:number;status:string;updatedAt:Date;client:{clientNumber:string;name:string};tasks:Array<{status:string;mandatorySnapshot:boolean;reviewStatus:string}>}>}){return <section><div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-semibold">{title} · {items.length}</h3><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/jahresabschluesse?arbeitsart=${kind}`}>Alle anzeigen</Link></div><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Wirtschaftsjahr","Status","Nächster Schritt","Fortschritt","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{items.slice(0,10).map(item=>{const p=annualProgress(item.tasks);const href=`/jahresabschluesse/${item.id}#${kind==="release"?"freigabe":"workflow"}`;return <ClickableTableRow href={href} className="border-t" key={item.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{kind==="release"?"Hoch":kind==="review"?"Prüfung":"Bearbeitung"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={href}>{item.client.clientNumber} · {item.client.name}</Link></td><td className="p-3">{item.fiscalYear}</td><td className="p-3">{item.status}</td><td className="p-3">{kind==="release"?"Freigabe entscheiden":kind==="review"?"Prüfung fortsetzen":"Bearbeitung fortsetzen"}</td><td className="p-3">{p.percent} %</td><td className="p-3">{formatDate(item.updatedAt)}</td></ClickableTableRow>})}{!items.length&&<tr><td colSpan={7} className="p-8 text-center text-[var(--color-text-muted)]">Derzeit keine offenen Fälle.</td></tr>}</tbody></table></div></section>}
