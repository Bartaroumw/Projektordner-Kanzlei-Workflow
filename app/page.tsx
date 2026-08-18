import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { ActiveFilterChips } from "@/app/components/active-filter-chips";
import { annualProgress } from "@/lib/annual-checklist-service";
import { requireUser } from "@/lib/auth";
import {
  annualDashboardResponsibility,
  berlinCalendarMonth,
  splitByOperationalAge,
} from "@/lib/dashboard-responsibility";
import { getDashboardData, type DashboardFilters, type DashboardPeriod } from "@/lib/dashboard-service";
import { formatDate } from "@/lib/format";
import { canManageClients, hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard · Ordo Caroli" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function Dashboard({searchParams}:{searchParams:SearchParams}) {
  const user=await requireUser();
  if(hasRole(user,"LOHNSACHBEARBEITER")&&!hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN"))redirect("/fibu-lohn");
  const params=await searchParams;
  const reference=berlinCalendarMonth();
  const filters:DashboardFilters={
    year:reference.year,
    month:reference.month,
    search:one(params.suche),
    processor:one(params.bearbeiter),
    reviewer:one(params.pruefer),
    management:one(params.kanzleileitung),
    status:one(params.status),
    onlyOldOpen:one(params.alt)==="1",
    onlyOpenMandatory:one(params.pflicht)==="1",
    onlyOpenReviewPoints:one(params.pruefpunkte)==="1",
    userId:user.id,
    officeWide:one(params.kanzleiweit)==="1"&&hasRole(user,"KANZLEILEITUNG"),
  };
  const data=await getDashboardData(filters);
  const [payrollQuestions,annualAll]=await Promise.all([
    prisma.payrollReconciliationQuestion.findMany({
      where:{recipientUserId:user.id,status:"Offen beim Rechnungswesen"},
      include:{sender:true,reconciliation:{include:{client:true}},reconciliationItem:true},
      orderBy:{createdAt:"asc"},
    }),
    prisma.annualChecklist.findMany({where:{status:{not:"Freigegeben"}},include:{client:true,tasks:true},orderBy:[{fiscalYear:"asc"},{updatedAt:"asc"}]}),
  ]);

  const monthlyProcessing=splitByOperationalAge(data.myProcessing,periodOf,reference);
  const monthlyReviews=splitByOperationalAge(data.myReviews,periodOf,reference);
  const monthlyQuestions=splitByOperationalAge(data.myQuestions,periodOf,reference);
  const waitingQuestions=splitByOperationalAge(data.waitingQuestions,periodOf,reference);
  const waitingForReview=splitByOperationalAge(data.waitingForReview,periodOf,reference);
  const waitingForRework=splitByOperationalAge(data.waitingForRework,periodOf,reference);
  const annualResponsibility=(item:typeof annualAll[number])=>annualDashboardResponsibility(item.status,user.id,item);
  const annualProcessing=splitAnnual(annualAll.filter(item=>annualResponsibility(item)==="BEARBEITUNG_AKTIV"),reference);
  const annualReviews=splitAnnual(annualAll.filter(item=>annualResponsibility(item)==="PRUEFUNG_AKTIV"),reference);
  const annualReleases=splitAnnual(annualAll.filter(item=>annualResponsibility(item)==="FREIGABE_AKTIV"),reference);
  const payrollByAge=splitByOperationalAge(payrollQuestions,question=>({year:question.reconciliation.accountingYear,month:question.reconciliation.accountingMonth}),reference);
  const olderMonthly=uniquePeriods([
    ...monthlyProcessing.older,...monthlyReviews.older,...monthlyQuestions.older,
    ...waitingQuestions.older,...waitingForReview.older,...waitingForRework.older,
  ]);
  const olderCount=olderMonthly.length+annualProcessing.older.length+annualReviews.older.length+annualReleases.older.length+payrollByAge.older.length;
  const processors=unique(data.clients.map(client=>client.processor));
  const reviewers=unique(data.clients.map(client=>client.reviewer));
  const managementNames=unique(data.clients.map(client=>client.managementName));
  const activeFilterCount=[filters.search,filters.processor,filters.reviewer,filters.management,filters.status,filters.onlyOldOpen,filters.onlyOpenMandatory,filters.onlyOpenReviewPoints,filters.officeWide].filter(Boolean).length;

  return <div id="dashboard">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Operative Steuerung</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1><p className="mt-2 text-[var(--color-text-muted)]">Alle offenen Vorgänge nach Ihrer aktuell verantwortlichen Aufgabe.</p></div>
      <div className="flex flex-wrap gap-2">{canManageClients(user)&&<><Link className="button-primary" href="/monatschecklisten/neu">Checkliste anlegen</Link><Link className="button-secondary" href="/mandanten/neu">Mandant anlegen</Link></>}<Link className="button-secondary" href="/monatschecklisten">Rechnungswesenaufgaben</Link></div>
    </header>

    <form className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Suche"><input className="input min-w-64" name="suche" defaultValue={filters.search} placeholder="Mandantennummer oder Name"/></Field>
        <Select label="Status" name="status" value={filters.status??""} options={["Offen","In Bearbeitung","Zur Prüfung","In Prüfung","Nachbearbeitung"].map(value=>[value,value])}/>
        <button className="button-primary">Anwenden</button><Link className="button-secondary" href="/">Zurücksetzen</Link>
        {activeFilterCount>0&&<span className="rounded-full bg-[var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-dark)]">{activeFilterCount} aktive Filter</span>}
      </div>
      <details className="mt-3 border-t border-[var(--color-border)] pt-3" open={activeFilterCount>2}>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)]">Weitere Filter</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select label="Bearbeiter" name="bearbeiter" value={filters.processor??""} options={processors.map(value=>[value,value])}/>
          <Select label="Prüfer" name="pruefer" value={filters.reviewer??""} options={reviewers.map(value=>[value,value])}/>
          <Select label="Kanzleileitung" name="kanzleileitung" value={filters.management??""} options={managementNames.map(value=>[value,value])}/>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
          <Check name="alt" checked={filters.onlyOldOpen}>Nur ältere offene Vorgänge</Check>
          <Check name="pflicht" checked={filters.onlyOpenMandatory}>Nur offene Pflichtaufgaben</Check>
          <Check name="pruefpunkte" checked={filters.onlyOpenReviewPoints}>Nur offene Prüfpunkte</Check>
          {hasRole(user,"KANZLEILEITUNG")&&<Check name="kanzleiweit" checked={filters.officeWide}>Kanzleiweite Ansicht</Check>}
        </div>
      </details>
    </form>
    <ActiveFilterChips basePath="/" params={params} filters={[
      {key:"suche",label:`Suche: ${filters.search}`},{key:"status",label:`Status: ${filters.status}`},{key:"bearbeiter",label:`Bearbeiter: ${filters.processor}`},{key:"pruefer",label:`Prüfer: ${filters.reviewer}`},{key:"kanzleileitung",label:`Kanzleileitung: ${filters.management}`},{key:"alt",label:"Nur ältere offene Vorgänge",active:filters.onlyOldOpen},{key:"pflicht",label:"Nur offene Pflichtaufgaben",active:filters.onlyOpenMandatory},{key:"pruefpunkte",label:"Nur offene Prüfpunkte",active:filters.onlyOpenReviewPoints},{key:"kanzleiweit",label:"Kanzleiweite Ansicht",active:filters.officeWide},
    ]}/>

    <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Mein Arbeitsstand</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Meine Bearbeitung",monthlyProcessing.current.length+monthlyProcessing.older.length+annualProcessing.current.length+annualProcessing.older.length],
      ["Meine Prüfung",monthlyReviews.current.length+monthlyReviews.older.length+annualReviews.current.length+annualReviews.older.length],
      ["Offene Rückfragen",monthlyQuestions.current.length+monthlyQuestions.older.length+payrollByAge.current.length+payrollByAge.older.length],
      ["Ältere offene Vorgänge",olderCount],
    ].map(([label,value])=><article className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm" key={label}><p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-4xl font-bold tabular-nums text-[var(--color-primary-dark)]">{value}</p></article>)}</div></section>

    <WorkSection title={`Meine Bearbeitung · ${user.fullName}`}>
      <PeriodSection title="Rechnungswesenaufgaben" periods={monthlyProcessing.current} allHref="/monatschecklisten?ansicht=offen&arbeitsart=bearbeitung"/>
      <AnnualSection title="Jahresabschlussaufgaben" items={annualProcessing.current} kind="processing"/>
      {waitingForReview.current.length>0&&<PeriodSection title="Wartet auf Prüfung" periods={waitingForReview.current}/>}
    </WorkSection>
    <WorkSection title="Offene Rückfragen">
      <PeriodSection title="Von mir zu beantworten" periods={monthlyQuestions.current} allHref="/monatschecklisten?ansicht=offen&pruefpunkte=1"/>
      {waitingQuestions.current.length>0&&<PeriodSection title="Wartet auf Antwort" periods={waitingQuestions.current}/>}
      <PayrollQuestionSection questions={payrollByAge.current}/>
    </WorkSection>
    <WorkSection title="Meine Prüfung">
      <PeriodSection title="Rechnungswesenprüfungen" periods={monthlyReviews.current} allHref="/monatschecklisten?ansicht=offen&arbeitsart=pruefung"/>
      <AnnualSection title="Jahresabschlussprüfungen" items={annualReviews.current} kind="review"/>
      {waitingForRework.current.length>0&&<PeriodSection title="Wartet auf Nachbearbeitung" periods={waitingForRework.current}/>}
    </WorkSection>
    {annualReleases.current.length>0&&<WorkSection title="Meine Freigaben"><AnnualSection title="Jahresabschlüsse zur Freigabe" items={annualReleases.current} kind="release"/></WorkSection>}

    <section className="mt-10 rounded-xl border-2 border-amber-300 bg-amber-50/40 p-4 sm:p-5">
      <h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">Ältere offene Vorgänge · {olderCount}</h2>
      <p className="mb-5 mt-1 text-sm text-[var(--color-text-muted)]">Offene Vorgänge, deren Arbeitsmonat mehr als sechs Monate vor dem aktuellen Kalendermonat liegt. Diese Einträge erscheinen nicht erneut in den oberen Arbeitslisten.</p>
      <div className="space-y-8"><PeriodSection title="Rechnungswesenaufgaben" periods={olderMonthly} allHref="/monatschecklisten?ansicht=offen&alt=1"/>{annualProcessing.older.length>0&&<AnnualSection title="Jahresabschlussbearbeitung" items={annualProcessing.older} kind="processing"/>}{annualReviews.older.length>0&&<AnnualSection title="Jahresabschlussprüfungen" items={annualReviews.older} kind="review"/>}{annualReleases.older.length>0&&<AnnualSection title="Jahresabschlussfreigaben" items={annualReleases.older} kind="release"/>}<PayrollQuestionSection questions={payrollByAge.older}/></div>
    </section>

    {filters.officeWide&&<WorkSection title="Kanzleiweite Steuerung"><PeriodSection title="Zur Bearbeitung" periods={splitByOperationalAge(data.work,periodOf,reference).current}/><PeriodSection title="Zur Prüfung" periods={splitByOperationalAge(data.review,periodOf,reference).current}/></WorkSection>}

    <details className="mt-10 rounded-lg border border-[var(--color-border)] bg-white p-4">
      <summary className="cursor-pointer text-lg font-semibold text-[var(--color-primary-dark)]">Datenqualität und fehlende aktuelle Checklisten</summary>
      <div className="mt-5 grid gap-6 xl:grid-cols-2"><section><h3 className="mb-3 font-semibold">Fehlende Checklisten · {data.missing.length}</h3><ul className="space-y-2">{data.missing.map(client=><li key={client.id}><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/monatschecklisten/neu?clientId=${client.id}&year=${reference.year}&month=${reference.month}`}>{client.clientNumber} · {client.name}</Link></li>)}{!data.missing.length&&<li className="text-sm text-[var(--color-text-muted)]">Keine fehlenden aktuellen Checklisten.</li>}</ul></section><section><h3 className="mb-3 font-semibold">Datenqualität · {data.quality.length}</h3><ul className="space-y-2">{data.quality.slice(0,30).map(item=><li key={item.key}><Link className="text-sm font-semibold text-amber-800 hover:underline" href={item.href}>{item.text}</Link></li>)}{!data.quality.length&&<li className="text-sm text-[var(--color-text-muted)]">Keine Hinweise.</li>}</ul></section></div>
    </details>
  </div>;
}

function WorkSection({title,children}:{title:string;children:React.ReactNode}){return <section className="mt-10"><h2 className="text-2xl font-bold text-[var(--color-primary-dark)]">{title}</h2><div className="mt-4 space-y-8">{children}</div></section>}
function PeriodSection({title,periods,allHref}:{title:string;periods:DashboardPeriod[];allHref?:string}){return <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">{title} · {periods.length}</h3>{allHref&&<Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={allHref}>Alle anzeigen</Link>}</div><PeriodTable periods={periods.slice(0,10)}/></section>}
function PeriodTable({periods}:{periods:DashboardPeriod[]}){return <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Checkliste","Nächster Schritt","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Letzte Änderung"].map(heading=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{periods.map(period=>{const href=periodTarget(period);const priority=period.summary.openReviewPoints>0?"Hoch":period.processingStatus.includes("Prüfung")?"Prüfung":period.progress.mandatoryOpen>0?"Pflichtaufgaben":"Normal";return <ClickableTableRow href={href} className="border-t border-[var(--color-border)]" key={period.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{priority}</td><td className="p-3"><Link href={href} className="font-semibold text-[var(--color-primary-dark)]">{period.client.clientNumber} · {period.client.name}</Link></td><td className="p-3">{period.periodLabel}</td><td className="p-3">{nextStep(period)}</td><td className="p-3"><StatusBadge value={period.processingStatus}/></td><td className="p-3">{period.progress.completed}/{period.progress.total} · {period.progress.percent} %</td><td className="p-3">{period.progress.mandatoryOpen}</td><td className="p-3">{period.summary.openReviewPoints}</td><td className="p-3">{formatDate(period.updatedAt)}</td></ClickableTableRow>})}{!periods.length&&<tr><td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">Derzeit keine offenen Vorgänge.</td></tr>}</tbody></table></div>}
function PayrollQuestionSection({questions}:{questions:Array<{id:number;reconciliationId:number;reconciliationItemId:number;message:string;sender:{fullName:string};reconciliationItem:{topicTitleSnapshot:string};reconciliation:{accountingYear:number;accountingMonth:number;payrollYear:number;payrollMonth:number;client:{clientNumber:string;name:string}}}>}){return <section><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Rechnungswesen–Lohn-Rückfragen · {questions.length}</h3><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href="/fibu-lohn#rueckfragen">Alle Rechnungswesen–Lohn-Abstimmungen</Link></div><div className="space-y-3">{questions.slice(0,10).map(question=><Link className="block rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm hover:bg-[var(--color-primary-light)]" href={`/fibu-lohn/${question.reconciliationId}#thema-${question.reconciliationItemId}`} key={question.id}><div className="flex flex-wrap justify-between gap-2"><strong>{question.reconciliation.client.clientNumber} · {question.reconciliation.client.name}</strong><span className="text-sm">Rechnungswesen {monthLabel(question.reconciliation.accountingYear,question.reconciliation.accountingMonth)} · Lohn {monthLabel(question.reconciliation.payrollYear,question.reconciliation.payrollMonth)}</span></div><p className="mt-2 text-sm"><strong>{question.reconciliationItem.topicTitleSnapshot}:</strong> {question.message}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{question.sender.fullName} · direkt beantworten</p></Link>)}{!questions.length&&<p className="rounded border border-[var(--color-border)] bg-white p-5 text-sm text-[var(--color-text-muted)]">Derzeit bestehen keine offenen Rechnungswesen–Lohn-Rückfragen.</p>}</div></section>}
function AnnualSection({title,items,kind}:{title:string;kind:"processing"|"review"|"release";items:Array<{id:number;fiscalYear:number;status:string;updatedAt:Date;client:{clientNumber:string;name:string};tasks:Array<{status:string;mandatorySnapshot:boolean;reviewStatus:string}>}>}){return <section><div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-semibold">{title} · {items.length}</h3><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/jahresabschluesse?ansicht=offen&arbeitsart=${kind}`}>Alle anzeigen</Link></div><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Priorität","Mandant","Wirtschaftsjahr","Status","Nächster Schritt","Fortschritt","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{items.slice(0,10).map(item=>{const progress=annualProgress(item.tasks);const href=`/jahresabschluesse/${item.id}#${kind==="release"?"freigabe":"workflow"}`;return <ClickableTableRow href={href} className="border-t" key={item.id}><td className="p-3 font-semibold text-[var(--color-warning)]">{kind==="release"?"Hoch":kind==="review"?"Prüfung":"Bearbeitung"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={href}>{item.client.clientNumber} · {item.client.name}</Link></td><td className="p-3">{item.fiscalYear}</td><td className="p-3">{item.status}</td><td className="p-3">{kind==="release"?"Freigabe entscheiden":kind==="review"?"Prüfung fortsetzen":"Bearbeitung fortsetzen"}</td><td className="p-3">{progress.percent} %</td><td className="p-3">{formatDate(item.updatedAt)}</td></ClickableTableRow>})}{!items.length&&<tr><td colSpan={7} className="p-8 text-center text-[var(--color-text-muted)]">Derzeit keine offenen Vorgänge.</td></tr>}</tbody></table></div></section>}
function StatusBadge({value}:{value:string}){const colors:Record<string,string>={"Offen":"bg-slate-100","In Bearbeitung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Zur Prüfung":"bg-amber-100 text-amber-950","In Prüfung":"bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]","Nachbearbeitung":"bg-orange-100 text-orange-950"};return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${colors[value]??"bg-slate-100"}`}>{value}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input min-w-48" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map(([option,labelText])=><option key={option} value={option}>{labelText}</option>)}</select></Field>}
function Check({name,checked,children}:{name:string;checked:boolean|undefined;children:React.ReactNode}){return <label className="flex items-center gap-2"><input type="checkbox" name={name} value="1" defaultChecked={checked}/>{children}</label>}
function periodOf(period:DashboardPeriod){return {year:period.calendarYear,month:period.month}}
function periodTarget(period:DashboardPeriod){const issue=period.tasks.find(task=>task.id&&task.reviewIssueStatus==="Offen");if(issue?.id)return `/monatschecklisten/${period.id}?pruefpunkte=1#aufgabe-${issue.id}`;if(["Zur Prüfung","In Prüfung"].includes(period.processingStatus))return `/monatschecklisten/${period.id}#workflow`;const mandatory=period.tasks.find(task=>task.id&&task.mandatorySnapshot&&!['Erledigt','Nicht zutreffend','In Folgemonat übertragen'].includes(task.status));return `/monatschecklisten/${period.id}?pflicht=ja#${mandatory?.id?`aufgabe-${mandatory.id}`:"aufgaben"}`}
function nextStep(period:DashboardPeriod){if(period.summary.openReviewPoints>0)return "Prüfpunkt beantworten";if(period.processingStatus==="Zur Prüfung")return "Prüfentscheidungen erfassen";if(period.processingStatus==="In Prüfung")return "Prüfung fortsetzen";return "Bearbeitung fortsetzen"}
function unique(values:(string|null)[]){return [...new Set(values.filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,"de-DE"))}
function uniquePeriods(periods:DashboardPeriod[]){return [...new Map(periods.map(period=>[period.id,period])).values()].sort((a,b)=>a.calendarYear-b.calendarYear||a.month-b.month||a.client.clientNumber.localeCompare(b.client.clientNumber,"de-DE"))}
function splitAnnual<T extends {fiscalYear:number}>(items:T[],reference:{year:number;month:number}){return splitByOperationalAge(items,item=>({year:item.fiscalYear,month:12}),reference)}
function monthLabel(year:number,month:number){return new Intl.DateTimeFormat("de-DE",{month:"short",year:"numeric",timeZone:"Europe/Berlin"}).format(new Date(Date.UTC(year,month-1,15)))}
