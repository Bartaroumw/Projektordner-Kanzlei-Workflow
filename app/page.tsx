import Link from "next/link";
import { getDashboardData, type DashboardFilters, type DashboardPeriod } from "@/lib/dashboard-service";
import { formatDate } from "@/lib/format";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { requireUser } from "@/lib/auth";
import { canManageClients, hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { annualProgress } from "@/lib/annual-checklist-service";
import { annualDashboardResponsibility, berlinCalendarMonth, defaultDashboardMonth, nextCalendarMonth, previousCalendarMonth } from "@/lib/dashboard-responsibility";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const user=await requireUser();
  const canManageStandards=hasRole(user,"KANZLEILEITUNG","STANDARDAUFGABEN_VERWALTEN");
  const params = await searchParams;
  const defaultMonth = defaultDashboardMonth();
  const requestedYear = Number(one(params.jahr));
  const requestedMonth = Number(one(params.monat));
  const filters: DashboardFilters = {
    year: requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : defaultMonth.year,
    month: requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : defaultMonth.month,
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
  const annualResponsibility=(item:typeof annualAll[number])=>annualDashboardResponsibility(item.status,user.id,item);
  const annualProcessing=annualAll.filter(item=>annualResponsibility(item)==="BEARBEITUNG_AKTIV");
  const annualReviews=annualAll.filter(item=>annualResponsibility(item)==="PRUEFUNG_AKTIV");
  const annualReleases=annualAll.filter(item=>annualResponsibility(item)==="FREIGABE_AKTIV");
  const monthName = monthLabel(filters.year,filters.month);
  const currentMonth = berlinCalendarMonth();
  const currentPrevious = previousCalendarMonth(currentMonth.year,currentMonth.month);
  const previous = previousCalendarMonth(filters.year,filters.month);
  const next = nextCalendarMonth(filters.year,filters.month);
  const processors = unique(data.clients.map((client) => client.processor));
  const reviewers = unique(data.clients.map((client) => client.reviewer));
  const managementNames = unique(data.clients.map((client) => client.managementName));
  const metrics = [
    ["Meine Bearbeitung", data.myProcessing.length],
    ["Meine Prüfung", data.myReviews.length],
    ["Offene Rückfragen", data.myQuestions.length],
    ["Überfällige Altmonate", data.overduePersonal.length],
  ] as const;

  return <div id="dashboard">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Operative Steuerung</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard Rechnungswesen</h1><p className="mt-2 text-[var(--color-text-muted)]">Ausgewählter Bearbeitungsmonat: <strong>{monthName}</strong></p></div>
      <div className="flex flex-wrap gap-2">{canManageClients(user)&&<><Link className="button-primary" href="/monatschecklisten/neu">Checkliste anlegen</Link><Link className="button-secondary" href="/mandanten/neu">Mandant anlegen</Link></>}{canManageStandards&&<><Link className="button-secondary" href="/standardaufgaben">Standardaufgaben</Link><Link className="button-secondary" href="/standardaufgaben/import">Excel-Import</Link></>}{canManageClients(user)&&<Link className="button-secondary" href="/monatschecklisten">Rechnungswesenaufgaben</Link>}</div>
    </header>

    <nav aria-label="Monatsnavigation" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-primary-light)] p-3">
      <Link className="button-secondary" href={monthHref(params,previous)}>← Vorheriger Monat</Link>
      <Link className="button-secondary" href={monthHref(params,next)}>Nächster Monat →</Link>
      <Link className="button-secondary" href={monthHref(params,currentMonth)}>Aktueller Monat</Link>
      <Link className="button-secondary" href={monthHref(params,currentPrevious)}>Vormonat</Link>
      <span className="ml-auto rounded bg-white px-4 py-2 text-sm font-bold text-[var(--color-primary-dark)]" aria-current="date">{monthName}</span>
    </nav>

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
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="alt" value="1" defaultChecked={filters.onlyOldOpen}/> Nur nicht abgeschlossene Vormonate</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pflicht" value="1" defaultChecked={filters.onlyOpenMandatory}/> Nur offene Pflichtaufgaben</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pruefpunkte" value="1" defaultChecked={filters.onlyOpenReviewPoints}/> Nur offene Prüfpunkte</label>
        <button className="button-primary">Filter anwenden</button><Link className="button-secondary" href="/">Filter zurücksetzen</Link>
      </div>
      {hasRole(user,"KANZLEILEITUNG")&&<label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="kanzleiweit" value="1" defaultChecked={filters.officeWide}/> Kanzleiweite Ansicht</label>}
    </form>

    <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Mein Arbeitsstand für {monthName}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value])=><article className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm" key={label}><p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-4xl font-bold tabular-nums text-[var(--color-primary-dark)]">{value}</p></article>)}</div></section>

    <section className="mt-9"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Meine Bearbeitung · {user.fullName}</h2><div className="mt-4 space-y-8"><PeriodSection title="Rechnungswesenaufgaben" periods={data.myProcessing} allHref="/monatschecklisten?arbeitsart=bearbeitung"/><AnnualSection title="Jahresabschlussaufgaben" items={annualProcessing} kind="processing"/>{data.waitingForReview.length>0&&<PeriodSection title="Wartet auf Prüfung" periods={data.waitingForReview}/>}</div></section>
    <section className="mt-10"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Offene Rückfragen</h2><div className="mt-4 space-y-8"><PeriodSection title="Von mir zu beantworten" periods={data.myQuestions} allHref="/monatschecklisten?pruefpunkte=1"/>{data.waitingQuestions.length>0&&<PeriodSection title="Wartet auf Antwort" periods={data.waitingQuestions}/>}</div></section>
    <section className="mt-10"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Meine Prüfung</h2><div className="mt-4 space-y-8"><PeriodSection title="Rechnungswesenprüfungen" periods={data.myReviews} allHref="/monatschecklisten?arbeitsart=pruefung"/><AnnualSection title="Jahresabschlussprüfungen" items={annualReviews} kind="review"/>{data.waitingForRework.length>0&&<PeriodSection title="Wartet auf Nachbearbeitung" periods={data.waitingForRework}/>}</div></section>
    {annualReleases.length>0&&<section className="mt-10"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Meine Freigaben</h2><div className="mt-4"><AnnualSection title="Jahresabschlüsse zur Freigabe" items={annualReleases} kind="release"/></div></section>}
    <section className="mt-10"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Überfällige Altmonate</h2><p className="mb-4 mt-1 text-sm text-[var(--color-text-muted)]">Nicht abgeschlossene eigene Vorgänge vor {monthName}, getrennt von der aktuellen Monatsansicht.</p><PeriodSection title="Frühere offene Rechnungswesenaufgaben" periods={data.overduePersonal}/></section>
    {filters.officeWide&&<section className="mt-10 space-y-7"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Kanzleiweite Steuerung</h2><PeriodSection title="Zur Bearbeitung" periods={data.work}/><PeriodSection title="Zur Prüfung" periods={data.review}/><PeriodSection title="Offene Prüfpunkte" periods={data.reviewPoints}/><PeriodSection title="Zuletzt geändert" periods={data.recent}/></section>}

    <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Fehlende Monatschecklisten</h2><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandantennummer","Mandantenname","Bearbeiter","Prüfer","Kanzleileitung","Nächster Monat","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{data.missing.map((client)=><tr className="border-t border-[var(--color-border)]" key={client.id}><td className="p-3 font-semibold">{client.clientNumber}</td><td className="p-3">{client.name}</td><td className="p-3">{client.processor??"–"}</td><td className="p-3">{client.reviewer??"–"}</td><td className="p-3">{client.managementName??"–"}</td><td className="p-3">{monthName}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/monatschecklisten/neu?clientId=${client.id}&year=${filters.year}&month=${filters.month}`}>Monatscheckliste anlegen</Link></td></tr>)}{data.missing.length===0&&<tr><td colSpan={7} className="p-8 text-center text-slate-500">Für die Auswahl fehlt keine nächste Monatscheckliste.</td></tr>}</tbody></table></div></section>

    <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Datenqualitätshinweise</h2><div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{data.quality.length?<ul className="space-y-2">{data.quality.map((item)=><li key={item.key}><Link className="text-sm font-semibold text-amber-800 hover:underline" href={item.href}>{item.text}</Link></li>)}</ul>:<p className="text-sm text-slate-500">Keine Datenqualitätshinweise für die aktuelle Auswahl.</p>}</div></section>
  </div>;
}

function PeriodSection({title,periods,allHref}:{title:string;periods:DashboardPeriod[];allHref?:string}){const lower=title.toLocaleLowerCase("de-DE");const empty=lower.includes("prüfung")||lower.includes("prüfungen")?"Ihnen sind derzeit keine Rechnungswesenaufgaben zur Prüfung zugeordnet.":lower.includes("rückfragen")?"Für Sie bestehen derzeit keine offenen Rückfragen.":lower.includes("frühere")?"Keine überfälligen eigenen Vorgänge aus früheren Monaten.":"Ihnen sind derzeit keine offenen Rechnungswesenaufgaben zur Bearbeitung zugeordnet.";return <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">{title} · {periods.length}</h3>{allHref&&<Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={allHref}>Alle anzeigen</Link>}</div><PeriodTable periods={periods.slice(0,10)} empty={empty}/></section>}
function periodTarget(period:DashboardPeriod){const issue=period.tasks.find(task=>task.id&&(task.reviewIssueStatus==="Offen"||["Rückfrage","Beanstandung"].includes(task.reviewStatus)));if(issue?.id)return `/monatschecklisten/${period.id}?pruefpunkte=1#aufgabe-${issue.id}`;if(["Zur Prüfung","In Prüfung"].includes(period.processingStatus))return `/monatschecklisten/${period.id}#workflow`;const mandatory=period.tasks.find(task=>task.id&&task.mandatorySnapshot&&!["Erledigt","Nicht zutreffend","In Folgemonat übertragen"].includes(task.status));return `/monatschecklisten/${period.id}?pflicht=ja#${mandatory?.id?`aufgabe-${mandatory.id}`:"aufgaben"}`}
function PeriodTable({periods,empty="Keine Monatschecklisten in dieser Arbeitsliste."}:{periods:DashboardPeriod[];empty?:string}){return <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Checkliste","Nächster Schritt","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Letzte Änderung"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{periods.map((period)=>{const href=periodTarget(period);const hasTransfer=period.tasks.some(task=>task.sourceTaskId);const priority=period.summary.openReviewPoints>0?"Hoch":period.processingStatus==="Zur Prüfung"?"Prüfung":period.progress.mandatoryOpen>0?"Pflichtaufgaben":hasTransfer?"Übertrag":"Normal";const next=period.summary.openReviewPoints>0?"Prüfpunkt beantworten":period.processingStatus==="Zur Prüfung"?"Prüfung beginnen":period.processingStatus==="In Prüfung"?"Prüfung fortsetzen":"Bearbeitung fortsetzen";return <ClickableTableRow href={href} className="border-t border-[var(--color-border)]" key={period.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{priority}</td><td className="p-3"><Link href={href} className="font-semibold text-[var(--color-primary-dark)]">{period.client.clientNumber} · {period.client.name}</Link></td><td className="p-3">{period.periodLabel}</td><td className="p-3">{next}</td><td className="p-3"><StatusBadge value={period.processingStatus}/></td><td className="p-3">{period.progress.completed}/{period.progress.total} · {period.progress.percent} %</td><td className="p-3">{period.progress.mandatoryOpen}</td><td className="p-3">{period.summary.openReviewPoints}</td><td className="p-3">{formatDate(period.updatedAt)}</td></ClickableTableRow>})}{periods.length===0&&<tr><td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">{empty}</td></tr>}</tbody></table></div>}
function StatusBadge({value}:{value:string}){const colors:Record<string,string>={"Offen":"bg-slate-100 text-[var(--color-text)]","In Bearbeitung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Zur Prüfung":"bg-amber-100 text-amber-950","In Prüfung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Nachbearbeitung":"bg-orange-100 text-orange-950","Abgeschlossen":"bg-emerald-100 text-emerald-900"};return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${colors[value]??"bg-slate-100"}`}>{value}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map(([option,labelText])=><option key={option} value={option}>{labelText}</option>)}</select></Field>}
function unique(values:(string|null)[]){return [...new Set(values.filter(Boolean) as string[])].sort()}
function monthLabel(year:number,month:number){return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"Europe/Berlin"}).format(new Date(Date.UTC(year,month-1,15)))}
function monthHref(params:Record<string,string|string[]|undefined>,target:{year:number;month:number}){const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(key==="jahr"||key==="monat"||value===undefined)continue;const actual=Array.isArray(value)?value[0]:value;if(actual)query.set(key,actual)}query.set("jahr",String(target.year));query.set("monat",String(target.month));return `/?${query.toString()}`}
function AnnualSection({title,items,kind}:{title:string;kind:"processing"|"review"|"release";items:Array<{id:number;fiscalYear:number;status:string;updatedAt:Date;client:{clientNumber:string;name:string};tasks:Array<{status:string;mandatorySnapshot:boolean;reviewStatus:string}>}>}){return <section><div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-semibold">{title} · {items.length}</h3><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/jahresabschluesse?arbeitsart=${kind}`}>Alle anzeigen</Link></div><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Wirtschaftsjahr","Status","Nächster Schritt","Fortschritt","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{items.slice(0,10).map(item=>{const p=annualProgress(item.tasks);const href=`/jahresabschluesse/${item.id}#${kind==="release"?"freigabe":"workflow"}`;return <ClickableTableRow href={href} className="border-t" key={item.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{kind==="release"?"Hoch":kind==="review"?"Prüfung":"Bearbeitung"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={href}>{item.client.clientNumber} · {item.client.name}</Link></td><td className="p-3">{item.fiscalYear}</td><td className="p-3">{item.status}</td><td className="p-3">{kind==="release"?"Freigabe entscheiden":kind==="review"?"Prüfung fortsetzen":"Bearbeitung fortsetzen"}</td><td className="p-3">{p.percent} %</td><td className="p-3">{formatDate(item.updatedAt)}</td></ClickableTableRow>})}{!items.length&&<tr><td colSpan={7} className="p-8 text-center text-[var(--color-text-muted)]">Derzeit keine offenen Fälle.</td></tr>}</tbody></table></div></section>}
