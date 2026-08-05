import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { ActiveFilterChips } from "@/app/components/active-filter-chips";
import { PayrollModuleTabs } from "@/app/components/module-tabs";
import { requireUser } from "@/lib/auth";
import { berlinCalendarMonth, isOlderThanSixMonths } from "@/lib/dashboard-responsibility";
import { formatDateTime } from "@/lib/format";
import { payrollReconciliationSummary } from "@/lib/payroll-reconciliation-service";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
type Reconciliation=Prisma.PayrollReconciliationGetPayload<{include:{client:true;items:{include:{documents:{select:{status:true}};questions:{select:{status:true}}}}}}>;

export default async function PayrollDashboard({searchParams}:{searchParams:SearchParams}){
  const user=await requireUser();const params=await searchParams;
  const view=["offen","abgeschlossen","alle"].includes(one(params.ansicht))?one(params.ansicht):"offen";
  const year=one(params.jahr),month=one(params.monat),status=one(params.status),search=one(params.suche).trim();
  const payrollRole=hasRole(user,"LOHNSACHBEARBEITER"),officeWide=hasRole(user,"KANZLEILEITUNG");
  const responsibility:Prisma.PayrollReconciliationWhereInput=officeWide?{}:payrollRole?{payrollUserId:user.id}:{OR:[{processorUserId:user.id},{reviewerUserId:user.id}]};
  const historical=view!=="offen";
  const candidates=await prisma.payrollReconciliation.findMany({where:{
    ...responsibility,
    ...(view==="abgeschlossen"?{payrollStatus:"Erledigt"}:view==="offen"?{payrollStatus:{not:"Storniert"}}:{}),
    ...(historical&&year?{payrollYear:Number(year)}:{}),...(historical&&month?{payrollMonth:Number(month)}:{}),
    ...(status?{payrollStatus:status}:{}),...(search?{client:{OR:[{clientNumber:{contains:search}},{name:{contains:search}}]}}:{}),
  },include:{client:true,items:{include:{documents:{select:{status:true}},questions:{select:{status:true}}}}},take:201});
  const isOpen=(item:Reconciliation)=>{const summary=payrollReconciliationSummary(item.items);return item.payrollStatus!=="Erledigt"||summary.openQuestions>0||summary.openFollowUps>0||summary.fullyTransferred>summary.processed};
  const filtered=candidates.filter(item=>view==="offen"?isOpen(item):view==="abgeschlossen"?!isOpen(item):true);
  const reconciliations=filtered.sort(compareReconciliations).slice(0,200);
  const reference=berlinCalendarMonth();
  const older=view==="offen"?reconciliations.filter(item=>isOlderThanSixMonths(item.payrollYear,item.payrollMonth,reference.year,reference.month)):[];
  const current=view==="offen"?reconciliations.filter(item=>!older.includes(item)):reconciliations;
  const counts=Object.fromEntries(["Neu","Gesehen","Rückfrage offen","Erledigt"].map(value=>[value,reconciliations.filter(item=>item.payrollStatus===value).length]));
  const openQuestions=await prisma.payrollReconciliationQuestion.findMany({where:payrollRole?{OR:[{senderUserId:user.id},{recipientUserId:user.id}],status:{not:"Erledigt durch Lohn"}}:{recipientUserId:user.id,status:"Offen beim Rechnungswesen"},include:{reconciliation:{include:{client:true}},reconciliationItem:true,sender:true,recipient:true},orderBy:{createdAt:"asc"},take:100});
  const advanced=[year,month,status].filter(Boolean).length;
  return <div>
    <PayrollModuleTabs active={one(params.rueckfragen)==="1"?"rueckfragen":"abstimmungen"} user={user}/>
    <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">FiBu-Lohn-Abstimmung</p><h1 className="mt-2 text-3xl font-bold">{payrollRole?"Meine FiBu-Lohn-Abstimmungen":"FiBu-Lohn-Arbeitsliste"}</h1><p className="mt-2 text-[var(--color-text-muted)]">Offene Abstimmungen aller Abrechnungsmonate, zuerst mit offenen Rückfragen und danach nach dem ältesten Lohnmonat.</p></header>
    <ViewTabs active={view}/>
    <form className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm"><input type="hidden" name="ansicht" value={view}/><div className="flex flex-wrap items-end gap-3"><Field label="Mandantensuche"><input className="input min-w-64" name="suche" defaultValue={search} placeholder="Nummer oder Name"/></Field><Field label="Lohnstatus"><select className="input min-w-48" name="status" defaultValue={status}><option value="">Alle</option>{["Neu","Gesehen","Rückfrage offen","Erledigt"].map(value=><option key={value}>{value}</option>)}</select></Field><button className="button-primary">Anwenden</button><Link className="button-secondary" href={`/fibu-lohn?ansicht=${view}`}>Zurücksetzen</Link></div>{historical&&<details className="mt-3 border-t pt-3" open={advanced>1}><summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)]">Weitere Filter{advanced?` · ${advanced}`:""}</summary><div className="mt-3 flex flex-wrap gap-3"><Field label="Lohnabrechnungsjahr"><input className="input" name="jahr" type="number" min="2000" max="2100" defaultValue={year}/></Field><Field label="Lohnabrechnungsmonat"><select className="input" name="monat" defaultValue={month}><option value="">Alle</option>{Array.from({length:12},(_,index)=><option value={index+1} key={index+1}>{monthLabel(2026,index+1).replace(" 2026","")}</option>)}</select></Field></div></details>}</form>
    <ActiveFilterChips basePath="/fibu-lohn" params={params} filters={[{key:"suche",label:`Suche: ${search}`},{key:"status",label:`Lohnstatus: ${status}`},{key:"jahr",label:`Jahr: ${year}`},{key:"monat",label:`Monat: ${month}`}]}/>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(counts).map(([label,value])=><article className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm" key={label}><p className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-4xl font-bold text-[var(--color-primary-dark)]">{value}</p></article>)}</section>
    <p className="mb-3 mt-6 text-sm text-[var(--color-text-muted)]">{reconciliations.length}{candidates.length>200?"+":""} Abstimmungen · Anzeige auf 200 begrenzt</p>
    <ReconciliationTable title={view==="offen"?"Aktuelle offene Abstimmungen":view==="abgeschlossen"?"Abgeschlossene Abstimmungen":"Alle Abstimmungen"} items={current}/>
    {view==="offen"&&<div className="mt-8"><ReconciliationTable title="Ältere offene Vorgänge" items={older} note="Lohnabrechnungsmonat liegt mehr als sechs Monate vor dem aktuellen Kalendermonat."/></div>}
    <section id="rueckfragen" className="mt-8"><h2 className="mb-3 text-xl font-bold">Offene Rückfragen · {openQuestions.length}</h2><div className="space-y-3">{openQuestions.map(question=><Link className="block rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm hover:bg-[var(--color-primary-light)]" href={`/fibu-lohn/${question.reconciliationId}#thema-${question.reconciliationItemId}`} key={question.id}><div className="flex flex-wrap justify-between gap-2"><strong>{question.reconciliation.client.clientNumber} · {question.reconciliation.client.name}</strong><span className="text-sm">{question.status}</span></div><p className="mt-2 text-sm"><strong>{question.reconciliationItem.topicTitleSnapshot}:</strong> {question.message}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{question.sender.fullName} · {formatDateTime(question.createdAt)}</p></Link>)}{!openQuestions.length&&<p className="rounded border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-text-muted)]">Derzeit bestehen keine offenen Lohnrückfragen.</p>}</div></section>
  </div>;
}

function compareReconciliations(a:Reconciliation,b:Reconciliation){const aSummary=payrollReconciliationSummary(a.items),bSummary=payrollReconciliationSummary(b.items);return Number(bSummary.openQuestions>0)-Number(aSummary.openQuestions>0)||a.payrollYear-b.payrollYear||a.payrollMonth-b.payrollMonth||(a.transferredAt?.getTime()??a.createdAt.getTime())-(b.transferredAt?.getTime()??b.createdAt.getTime())||a.client.clientNumber.localeCompare(b.client.clientNumber,"de-DE")}
function ReconciliationTable({title,items,note}:{title:string;items:Reconciliation[];note?:string}){return <section><h2 className="text-xl font-bold text-[var(--color-primary-dark)]">{title} · {items.length}</h2>{note&&<p className="mb-3 mt-1 text-sm text-[var(--color-text-muted)]">{note}</p>}<div className={`${note?"":"mt-3"} overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white`}><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Rechnungswesenmonat","Lohnabrechnungsmonat","Sachverhalte","Belege","Nachreichungen","Rückfragen","Eingang","Rechnungswesenstatus","Lohnstatus"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{items.map(item=>{const summary=payrollReconciliationSummary(item.items);const href=`/fibu-lohn/${item.id}`;return <ClickableTableRow href={href} className="border-t" key={item.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={href}>{item.client.clientNumber} · {item.client.name}</Link></td><td className="p-3">{monthLabel(item.accountingYear,item.accountingMonth)}</td><td className="p-3">{monthLabel(item.payrollYear,item.payrollMonth)}</td><td className="p-3">{summary.matters}</td><td className="p-3">{summary.documents}</td><td className="p-3">{summary.openFollowUps}</td><td className="p-3 font-semibold">{summary.openQuestions}</td><td className="p-3">{item.transferredAt?formatDateTime(item.transferredAt):"Noch nicht übergeben"}</td><td className="p-3">{item.accountingStatus}</td><td className="p-3 font-semibold">{item.payrollStatus}</td></ClickableTableRow>})}{!items.length&&<tr><td colSpan={10} className="p-10 text-center text-[var(--color-text-muted)]">Keine FiBu-Lohn-Abstimmungen für diese Auswahl.</td></tr>}</tbody></table></div></section>}
function ViewTabs({active}:{active:string}){return <nav aria-label="Bearbeitungsstatus" className="mb-4 flex gap-2">{[["offen","Offen"],["abgeschlossen","Abgeschlossen"],["alle","Alle"]].map(([value,label])=><Link aria-current={active===value?"page":undefined} className={active===value?"button-primary":"button-secondary"} href={`/fibu-lohn?ansicht=${value}`} key={value}>{label}</Link>)}</nav>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
function monthLabel(year:number,month:number){return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"Europe/Berlin"}).format(new Date(Date.UTC(year,month-1,15)))}
