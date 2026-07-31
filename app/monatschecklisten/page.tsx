import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";
import { formatDate } from "@/lib/format";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { requireRole } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { AccountingModuleTabs } from "@/app/components/module-tabs";

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
export default async function MonthlyChecklists({searchParams}:{searchParams:SearchParams}){
  const user=await requireRole("MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN");
  const params=await searchParams,year=one(params.jahr),month=one(params.monat),search=one(params.suche),processor=one(params.bearbeiter),reviewer=one(params.pruefer),management=one(params.kanzleileitung),status=one(params.status),oldOnly=one(params.alt)==="1",latestOnly=one(params.neueste)==="1";
  const checklists=await prisma.accountingPeriod.findMany({where:{
    ...(!hasRole(user,"KANZLEILEITUNG")?{OR:[{processorUserId:user.id},{reviewerUserId:user.id},{managementUserId:user.id}]}:{}),
    checklistType:"Monat",calendarYear:year?Number(year):undefined,month:month?Number(month):undefined,processingStatus:status||undefined,
    processorSnapshot:processor||undefined,reviewerSnapshot:reviewer||undefined,managementNameSnapshot:management||undefined,
    client:search?{OR:[{clientNumber:{contains:search}},{name:{contains:search}}]}:undefined,
  },include:{client:true,tasks:{select:{status:true,mandatorySnapshot:true,reviewStatus:true,processingNote:true}}},orderBy:[{calendarYear:"desc"},{month:"desc"},{client:{clientNumber:"asc"}}]});
  const now=new Date(new Date().toLocaleString("en-US",{timeZone:"Europe/Berlin"}));
  const filtered=checklists.filter(entry=>!oldOnly||(entry.processingStatus!=="Abgeschlossen"&&(entry.calendarYear<now.getFullYear()||(entry.calendarYear===now.getFullYear()&&entry.month<now.getMonth()+1))));
  const visible=latestOnly?latestChecklistPerClient(filtered):filtered;
  const clients=await prisma.client.findMany({select:{processor:true,reviewer:true,managementName:true}});
  const values=(field:"processor"|"reviewer"|"managementName")=>[...new Set(clients.map(c=>c[field]).filter(Boolean) as string[])].sort();
  return <div><AccountingModuleTabs active="laufend"/><header className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-[var(--color-primary)]">Laufendes Rechnungswesen</p><h1 className="mt-2 text-3xl font-bold">Rechnungswesenaufgaben</h1></div><Link className="button-primary" href="/monatschecklisten/neu">Neue Checkliste</Link></header>
    <form className="mb-5 rounded border border-[var(--color-border)] bg-white p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7"><Field label="Jahr"><input className="input" name="jahr" type="number" defaultValue={year}/></Field><Select label="Monat" name="monat" value={month} options={Array.from({length:12},(_,i)=>[String(i+1),monthName(i+1)])}/><Field label="Suche"><input className="input" name="suche" defaultValue={search}/></Field><Select label="Bearbeiter" name="bearbeiter" value={processor} options={values("processor").map(v=>[v,v])}/><Select label="Prüfer" name="pruefer" value={reviewer} options={values("reviewer").map(v=>[v,v])}/><Select label="Kanzleileitung" name="kanzleileitung" value={management} options={values("managementName").map(v=>[v,v])}/><Select label="Checklistenstatus" name="status" value={status} options={["Offen","In Bearbeitung","Zur Prüfung","In Prüfung","Nachbearbeitung","Abgeschlossen"].map(v=>[v,v])}/></div><div className="mt-3 flex flex-wrap gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="alt" value="1" defaultChecked={oldOnly}/> Nur nicht abgeschlossene Vormonate</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="neueste" value="1" defaultChecked={latestOnly}/> Nur neueste Checkliste je Mandant</label><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/monatschecklisten">Zurücksetzen</Link></div></form>
    <div className="overflow-x-auto rounded border border-[var(--color-border)] bg-white"><table className="w-full min-w-[1350px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Checkliste","Bearbeiter","Prüfer","Kanzleileitung","Status","Offene Pflicht","Offene Prüfpunkte","Fortschritt","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(entry=>{const progress=calculateProgress(entry.tasks),summary=workflowSummary(entry.tasks);return <ClickableTableRow href={`/monatschecklisten/${entry.id}`} className="border-t" key={entry.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={`/monatschecklisten/${entry.id}`}>{entry.client.clientNumber} · {entry.client.name}</Link></td><td className="p-3">{entry.periodLabel}</td><td className="p-3">{entry.processorSnapshot??"–"}</td><td className="p-3">{entry.reviewerSnapshot??"–"}</td><td className="p-3">{entry.managementNameSnapshot??"–"}</td><td className="p-3">{entry.processingStatus}</td><td className="p-3">{progress.mandatoryOpen}</td><td className="p-3">{summary.openReviewPoints}</td><td className="p-3">{progress.percent} %</td><td className="p-3">{formatDate(entry.updatedAt)}</td></ClickableTableRow>})}{!visible.length&&<tr><td colSpan={10} className="p-12 text-center">Keine Rechnungswesenaufgaben gefunden.</td></tr>}</tbody></table></div>
  </div>;
}
function monthName(month:number){return new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,month-1,1))}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options}:{label:string;name:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Alle</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>}

export function latestChecklistPerClient<T extends {clientId:number;calendarYear:number;month:number;createdAt:Date}>(entries:T[]) {
  const latest=new Map<number,T>();
  for(const entry of entries){
    const current=latest.get(entry.clientId);
    if(!current||entry.calendarYear>current.calendarYear||
      entry.calendarYear===current.calendarYear&&entry.month>current.month||
      entry.calendarYear===current.calendarYear&&entry.month===current.month&&entry.createdAt>current.createdAt)latest.set(entry.clientId,entry);
  }
  return entries.filter(entry=>latest.get(entry.clientId)===entry);
}
