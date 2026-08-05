import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AccountingModuleTabs } from "@/app/components/module-tabs";
import { ActiveFilterChips } from "@/app/components/active-filter-chips";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { ServerPagination } from "@/app/components/server-pagination";
import { requireRole } from "@/lib/auth";
import { berlinCalendarMonth, isOlderThanSixMonths } from "@/lib/dashboard-responsibility";
import { formatDate } from "@/lib/format";
import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";
import { hasRole } from "@/lib/permissions";
import { normalizedPage, OPERATIONAL_PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
const PAGE_SIZE=OPERATIONAL_PAGE_SIZE;

export default async function MonthlyChecklists({searchParams}:{searchParams:SearchParams}){
  const user=await requireRole("MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN");
  const params=await searchParams;
  const view=["offen","abgeschlossen","alle"].includes(one(params.ansicht))?one(params.ansicht):"offen";
  const workType=one(params.arbeitsart);
  const year=one(params.jahr),month=one(params.monat),search=one(params.suche),processor=one(params.bearbeiter),reviewer=one(params.pruefer),management=one(params.kanzleileitung),status=one(params.status),oldOnly=one(params.alt)==="1",latestOnly=one(params.neueste)==="1";
  const reference=berlinCalendarMonth();
  const olderWhere=olderAccountingPeriodWhere(reference.year,reference.month);
  const assignment:Prisma.AccountingPeriodWhereInput=workType==="bearbeitung"?{processorUserId:user.id}:workType==="pruefung"?{reviewerUserId:user.id}:!hasRole(user,"KANZLEILEITUNG")?{OR:[{processorUserId:user.id},{reviewerUserId:user.id},{managementUserId:user.id}]}:{};
  const state:Prisma.AccountingPeriodWhereInput=view==="offen"?{processingStatus:{not:"Abgeschlossen"}}:view==="abgeschlossen"?{processingStatus:"Abgeschlossen"}:{};
  const responsibilityState:Prisma.AccountingPeriodWhereInput=workType==="bearbeitung"?{processingStatus:{in:["Offen","In Bearbeitung","Nachbearbeitung"]}}:workType==="pruefung"?{processingStatus:{in:["Zur Prüfung","In Prüfung"]}}:{};
  const historical=view!=="offen";
  let where:Prisma.AccountingPeriodWhereInput={
    AND:[assignment,state,responsibilityState,oldOnly?olderWhere:{}],checklistType:"Monat",
    calendarYear:historical&&year?Number(year):undefined,
    month:historical&&month?Number(month):undefined,
    processingStatus:status&&!(view==="offen"&&status==="Abgeschlossen")?status:state.processingStatus,
    processorSnapshot:processor||undefined,reviewerSnapshot:reviewer||undefined,managementNameSnapshot:management||undefined,
    client:search?{OR:[{clientNumber:{contains:search}},{name:{contains:search}}]}:undefined,
  };
  if(latestOnly){
    const candidates=await prisma.accountingPeriod.findMany({where,select:{id:true,clientId:true,calendarYear:true,month:true,createdAt:true},orderBy:[{calendarYear:"desc"},{month:"desc"},{createdAt:"desc"}]});
    where={AND:[where,{id:{in:latestChecklistPerClient(candidates).map(entry=>entry.id)}}]};
  }
  const total=await prisma.accountingPeriod.count({where});
  const page=normalizedPage(params.seite,total,PAGE_SIZE);
  const [checklists,clients,olderTotal]=await Promise.all([
    prisma.accountingPeriod.findMany({where,include:{client:true,tasks:{select:{status:true,mandatorySnapshot:true,reviewStatus:true,processingNote:true}}},orderBy:view==="offen"?[{calendarYear:"asc"},{month:"asc"},{client:{clientNumber:"asc"}}]:[{calendarYear:"desc"},{month:"desc"},{client:{clientNumber:"asc"}}],skip:(page-1)*PAGE_SIZE,take:PAGE_SIZE}),
    prisma.client.findMany({select:{processor:true,reviewer:true,managementName:true}}),
    view==="offen"?prisma.accountingPeriod.count({where:{AND:[where,olderWhere]}}):Promise.resolve(0),
  ]);
  const isOlder=(entry:typeof checklists[number])=>entry.processingStatus!=="Abgeschlossen"&&isOlderThanSixMonths(entry.calendarYear,entry.month,reference.year,reference.month);
  const visible=checklists;
  const current=visible.filter(entry=>!isOlder(entry));
  const older=visible.filter(isOlder);
  const values=(field:"processor"|"reviewer"|"managementName")=>[...new Set(clients.map(c=>c[field]).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,"de-DE"));
  const activeAdvanced=[year,month,processor,reviewer,management,status,oldOnly,latestOnly].filter(Boolean).length;
  return <div><AccountingModuleTabs active="laufend"/>
    <header className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-[var(--color-primary)]">Laufendes Rechnungswesen</p><h1 className="mt-2 text-3xl font-bold">Rechnungswesenaufgaben</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">Offene Aufgaben werden periodenübergreifend nach Verantwortung angezeigt.</p></div><Link className="button-primary" href="/monatschecklisten/neu">Neue Checkliste</Link></header>
    <ViewTabs base="/monatschecklisten" active={view}/>
    <form className="mb-5 rounded border border-[var(--color-border)] bg-white p-4">
      <input type="hidden" name="ansicht" value={view}/>{workType&&<input type="hidden" name="arbeitsart" value={workType}/>}<div className="flex flex-wrap items-end gap-3"><Field label="Suche"><input className="input min-w-64" name="suche" defaultValue={search} placeholder="Nummer oder Name"/></Field><Select label="Status" name="status" value={status} options={(view==="offen"?["Offen","In Bearbeitung","Zur Prüfung","In Prüfung","Nachbearbeitung"]:["Abgeschlossen"]).map(v=>[v,v])}/><button className="button-primary">Anwenden</button><Link className="button-secondary" href={`/monatschecklisten?ansicht=${view}`}>Zurücksetzen</Link>{workType&&<span className="rounded-full bg-[var(--color-primary-light)] px-3 py-2 text-xs font-semibold text-[var(--color-primary-dark)]">{workType==="pruefung"?"Meine Prüfung":"Meine Bearbeitung"}</span>}</div>
      <details className="mt-3 border-t border-[var(--color-border)] pt-3" open={activeAdvanced>0}><summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)]">Weitere Filter{activeAdvanced?` · ${activeAdvanced}`:""}</summary><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{historical&&<><Field label="Jahr"><input className="input" name="jahr" type="number" defaultValue={year}/></Field><Select label="Monat" name="monat" value={month} options={Array.from({length:12},(_,i)=>[String(i+1),monthName(i+1)])}/></>}<Select label="Bearbeiter" name="bearbeiter" value={processor} options={values("processor").map(v=>[v,v])}/><Select label="Prüfer" name="pruefer" value={reviewer} options={values("reviewer").map(v=>[v,v])}/><Select label="Kanzleileitung" name="kanzleileitung" value={management} options={values("managementName").map(v=>[v,v])}/></div><div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">{view==="offen"&&<label className="flex items-center gap-2"><input type="checkbox" name="alt" value="1" defaultChecked={oldOnly}/>Nur ältere offene Vorgänge</label>}<label className="flex items-center gap-2"><input type="checkbox" name="neueste" value="1" defaultChecked={latestOnly}/>Nur neueste Checkliste je Mandant</label></div></details>
    </form>
    <ActiveFilterChips basePath="/monatschecklisten" params={params} filters={[
      {key:"suche",label:`Suche: ${search}`},{key:"status",label:`Status: ${status}`},{key:"bearbeiter",label:`Bearbeiter: ${processor}`},{key:"pruefer",label:`Prüfer: ${reviewer}`},{key:"kanzleileitung",label:`Kanzleileitung: ${management}`},{key:"jahr",label:`Jahr: ${year}`},{key:"monat",label:`Monat: ${month}`},{key:"alt",label:"Nur ältere offene Vorgänge",active:oldOnly},{key:"neueste",label:"Nur neueste je Mandant",active:latestOnly},{key:"arbeitsart",label:workType==="pruefung"?"Meine Prüfung":"Meine Bearbeitung",active:Boolean(workType)},
    ]}/>
    {view==="offen"?
      <><ChecklistSection title="Aktuelle offene Vorgänge" entries={current} total={total-olderTotal}/><div className="mt-8"><ChecklistSection title="Ältere offene Vorgänge" entries={older} total={olderTotal} note="Mehr als sechs Monate vor dem aktuellen Kalendermonat."/></div></>:
      <ChecklistSection title={view==="abgeschlossen"?"Abgeschlossene Vorgänge":"Alle Vorgänge"} entries={visible} total={total}/>
    }
    <ServerPagination basePath="/monatschecklisten" params={params} page={page} total={total} pageSize={PAGE_SIZE}/>
  </div>;
}

type Row={id:number;periodLabel:string;processingStatus:string;processorSnapshot:string|null;reviewerSnapshot:string|null;managementNameSnapshot:string|null;updatedAt:Date;client:{clientNumber:string;name:string};tasks:Array<{status:string;mandatorySnapshot:boolean;reviewStatus:string;processingNote:string|null}>};
function ChecklistSection({title,entries,total,note}:{title:string;entries:Row[];total:number;note?:string}){return <section><h2 className="text-xl font-bold text-[var(--color-primary-dark)]">{title} · {total}</h2>{note&&<p className="mb-3 mt-1 text-sm text-[var(--color-text-muted)]">{note}</p>}<div className={`${note?"":"mt-3"} overflow-x-auto rounded border border-[var(--color-border)] bg-white`}><table className="w-full min-w-[1350px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Checkliste","Bearbeiter","Prüfer","Kanzleileitung","Status","Offene Pflicht","Offene Prüfpunkte","Fortschritt","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{entries.map(entry=>{const progress=calculateProgress(entry.tasks),summary=workflowSummary(entry.tasks);return <ClickableTableRow href={`/monatschecklisten/${entry.id}`} className="border-t" key={entry.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={`/monatschecklisten/${entry.id}`}>{entry.client.clientNumber} · {entry.client.name}</Link></td><td className="p-3">{entry.periodLabel}</td><td className="p-3">{entry.processorSnapshot??"–"}</td><td className="p-3">{entry.reviewerSnapshot??"–"}</td><td className="p-3">{entry.managementNameSnapshot??"–"}</td><td className="p-3">{entry.processingStatus}</td><td className="p-3">{progress.mandatoryOpen}</td><td className="p-3">{summary.openReviewPoints}</td><td className="p-3">{progress.percent} %</td><td className="p-3">{formatDate(entry.updatedAt)}</td></ClickableTableRow>})}{!entries.length&&<tr><td colSpan={10} className="p-10 text-center text-[var(--color-text-muted)]">Keine Rechnungswesenaufgaben auf dieser Seite.</td></tr>}</tbody></table></div></section>}
function ViewTabs({base,active}:{base:string;active:string}){return <nav aria-label="Bearbeitungsstatus" className="mb-4 flex gap-2">{[["offen","Offen"],["abgeschlossen","Abgeschlossen"],["alle","Alle"]].map(([value,label])=><Link aria-current={active===value?"page":undefined} className={active===value?"button-primary":"button-secondary"} href={`${base}?ansicht=${value}`} key={value}>{label}</Link>)}</nav>}
function monthName(month:number){return new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,month-1,1))}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input min-w-44" name={name} defaultValue={value}><option value="">Alle</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>}
export function latestChecklistPerClient<T extends {clientId:number;calendarYear:number;month:number;createdAt:Date}>(entries:T[]){const latest=new Map<number,T>();for(const entry of entries){const current=latest.get(entry.clientId);if(!current||entry.calendarYear>current.calendarYear||entry.calendarYear===current.calendarYear&&entry.month>current.month||entry.calendarYear===current.calendarYear&&entry.month===current.month&&entry.createdAt>current.createdAt)latest.set(entry.clientId,entry)}return entries.filter(entry=>latest.get(entry.clientId)===entry)}
function olderAccountingPeriodWhere(year:number,month:number):Prisma.AccountingPeriodWhereInput{const ordinal=year*12+(month-1)-7;const cutoffYear=Math.floor(ordinal/12),cutoffMonth=ordinal%12+1;return {OR:[{calendarYear:{lt:cutoffYear}},{calendarYear:cutoffYear,month:{lte:cutoffMonth}}]}}
