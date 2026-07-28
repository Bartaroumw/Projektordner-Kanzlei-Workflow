import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canHandlePayrollReconciliation,
  canProcessPayrollReconciliation,
  canReviewPayrollReconciliation,
  canViewPayrollReconciliation,
} from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import { parseConfiguredList, payrollReconciliationSummary } from "@/lib/payroll-reconciliation-service";
import { OrdoCampusPanel } from "@/app/components/ordo-campus-panel";
import { ToastMessage } from "@/app/components/toast-message";
import {
  addPayrollSupplementAction,
  answerPayrollQuestionAction,
  archivePayrollDocumentAction,
  completePayrollAction,
  completePayrollFollowUpAction,
  completePayrollQuestionAction,
  createPayrollQuestionAction,
  markProcessedAction,
  markSeenAction,
  submitPayrollAction,
} from "@/app/fibu-lohn/actions";
import { PayrollUploadForm, ReconciliationItemForm } from "./reconciliation-item-form";
import type { Prisma } from "@prisma/client";

const successMessages:Record<string,string>={
  uebergeben:"Die FiBu-Lohn-Abstimmung wurde vollständig an Lohn übergeben.",
  gesehen:"Die Abstimmung wurde als gesehen markiert.",
  verarbeitet:"Der Sachverhalt wurde als verarbeitet markiert.",
  erledigt:"Die Lohnbearbeitung wurde abgeschlossen.",
  rueckfrage:"Die Rückfrage wurde an das Rechnungswesen gesendet.",
  beantwortet:"Die Rückfrage wurde beantwortet. Die Monatscheckliste bleibt geschlossen.",
  "rueckfrage-erledigt":"Die Rückfrage wurde durch Lohn erledigt.",
  ergänzt:"Die nachträgliche Ergänzung wurde nachvollziehbar gespeichert.",
  "nachreichung-erledigt":"Die Nachreichung wurde als abgeschlossen dokumentiert.",
  "beleg-archiviert":"Der Beleg wurde archiviert.",
  fahrzeug:"Das Fahrzeug wurde gespeichert und mit der Abstimmung verknüpft.",
};
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";

export default async function PayrollReconciliationPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireUser();const id=Number((await params).id);
  const reconciliation=Number.isInteger(id)?await prisma.payrollReconciliation.findUnique({where:{id},include:{
    client:true,accountingPeriod:true,
    items:{include:{
      sourceTopic:{include:{campusStandardTask:{select:{campusKnowledge:{select:{status:true}}}}}},
      documents:{include:{uploadedBy:true,archivedBy:true},orderBy:{uploadedAt:"desc"}},
      questions:{include:{sender:true,recipient:true},orderBy:{createdAt:"desc"}},
      vehicleChanges:{include:{vehicle:true},orderBy:{createdAt:"desc"}},
    },orderBy:[{sortOrderSnapshot:"asc"},{topicKeySnapshot:"asc"}]},
    history:{include:{reconciliationItem:true,vehicle:true},orderBy:{occurredAt:"desc"}},
  }}):null;
  if(!reconciliation)notFound();
  if(!canViewPayrollReconciliation(user,reconciliation))redirect("/zugriff-verweigert?bereich=FiBu-Lohn-Abstimmung");
  const process=canProcessPayrollReconciliation(user,reconciliation);
  const review=canReviewPayrollReconciliation(user,reconciliation);
  const payroll=canHandlePayrollReconciliation(user,reconciliation);
  const summary=payrollReconciliationSummary(reconciliation.items);
  const query=await searchParams;const error=one(query.fehler),success=successMessages[one(query.erfolg)];
  const transferred=reconciliation.accountingStatus==="Vollständig übergeben";
  const prominentItems=payroll?reconciliation.items.filter(item=>item.matterPresent==="Ja"):reconciliation.items;
  const noMatterItems=payroll?reconciliation.items.filter(item=>item.matterPresent==="Nein"):[];
  return <div>
    <ToastMessage message={error||success} type={error?"error":"success"}/>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={payroll?"/fibu-lohn":`/monatschecklisten/${reconciliation.accountingPeriodId}`}>← {payroll?"Zu meinen Abstimmungen":"Zur Monatscheckliste"}</Link>
      <Link className="button-secondary" href={`/mandanten/${reconciliation.clientId}/fahrzeuge`}>Fahrzeuge des Mandanten</Link>
    </div>
    <header className="my-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">FiBu-Lohn-Abstimmung</p>
      <h1 className="mt-2 text-3xl font-bold">{reconciliation.client.clientNumber} · {reconciliation.client.name}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">Rechnungswesen {monthLabel(reconciliation.accountingYear,reconciliation.accountingMonth)} → Lohnabrechnung {monthLabel(reconciliation.payrollYear,reconciliation.payrollMonth)}</p>
    </header>
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Data label="Rechnungswesenbearbeiter" value={reconciliation.processorNameSnapshot??"Nicht zugeordnet"}/>
        <Data label="Rechnungswesenprüfer" value={reconciliation.reviewerNameSnapshot??"Nicht zugeordnet"}/>
        <Data label="Lohnsachbearbeiter" value={reconciliation.payrollUserNameSnapshot}/>
        <Data label="Übergabezeitpunkt" value={reconciliation.transferredAt?formatDateTime(reconciliation.transferredAt):"Noch nicht übergeben"}/>
      </div>
      <div className="mt-5 grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Status label="Rechnungswesenstatus" value={reconciliation.accountingStatus}/>
        <Status label="Lohnstatus" value={reconciliation.payrollStatus}/>
        <Data label="Themen geprüft" value={`${summary.reviewed} von ${summary.total}`}/>
        <Data label="Sachverhalte / Belege" value={`${summary.matters} / ${summary.documents}`}/>
        <Data label="Offene Rückfragen" value={String(summary.openQuestions)}/>
        <Data label="Offene Nachreichungen" value={String(summary.openFollowUps)}/>
      </div>
      {payroll&&reconciliation.payrollStatus==="Neu"&&<form action={markSeenAction.bind(null,reconciliation.id)} className="mt-5"><button className="button-primary">Als gesehen markieren</button></form>}
      {payroll&&reconciliation.payrollStatus!=="Erledigt"&&<form action={completePayrollAction.bind(null,reconciliation.id)} className="mt-5"><button className="button-primary">Gesamte Abstimmung als erledigt markieren</button></form>}
    </section>

    {review&&<section className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-primary-light)] p-4">
      <h2 className="font-semibold">Prüfsicht Rechnungswesen</h2>
      <p className="mt-1 text-sm">Alle sechs Themen, Pflichtangaben, Belege und Nachreichungen sind einsehbar. Lohnstatus und Lohnverarbeitung können hier nicht verändert werden.</p>
    </section>}

    <section className="mt-8">
      <div className="mb-4"><h2 className="text-2xl font-bold">Themen</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Jedes Thema wird einzeln und bewusst geprüft.</p></div>
      <div className="space-y-5">{prominentItems.map(item=><TopicCard key={item.id} item={item} reconciliation={reconciliation} process={process} payroll={payroll} transferred={transferred}/>)}</div>
      {noMatterItems.length>0&&<details suppressHydrationWarning className="mt-5 rounded-lg border border-[var(--color-border)] bg-white p-4"><summary className="cursor-pointer font-semibold">Weitere Themen geprüft – kein Sachverhalt · {noMatterItems.length}</summary><div className="mt-4 space-y-4">{noMatterItems.map(item=><TopicCard key={item.id} item={item} reconciliation={reconciliation} process={process} payroll={payroll} transferred={transferred}/>)}</div></details>}
    </section>

    {process&&!transferred&&<section id="gesamtuebergabe" className="mt-8 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] p-5">
      <h2 className="text-xl font-bold">Verbindliche Gesamtübergabe</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Data label="Themen geprüft" value={`${summary.reviewed} von ${summary.total}`}/><Data label="Sachverhalte" value={String(summary.matters)}/><Data label="Ohne Sachverhalt" value={String(summary.total-summary.matters)}/><Data label="Belege" value={String(summary.documents)}/><Data label="Nachreichungen" value={String(summary.openFollowUps)}/><Data label="Lohnsachbearbeiter" value={reconciliation.payrollUserNameSnapshot}/></dl>
      <form action={submitPayrollAction.bind(null,reconciliation.id)} className="mt-5 space-y-4">
        <label className="flex items-start gap-3 text-sm font-semibold"><input className="mt-1" type="checkbox" name="confirmed" required/> Ich bestätige, dass alle lohnrelevanten Sachverhalte dieses Monats geprüft und die vorhandenen Informationen vollständig für die nächste Lohnabrechnung bereitgestellt wurden.</label>
        <button className="button-primary">Vollständig an Lohn übergeben</button>
      </form>
    </section>}
    <section id="verlauf" className="mt-8"><h2 className="mb-3 text-xl font-bold">Verlauf</h2><div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Zeitpunkt","Bereich","Aktion","Person","Thema / Fahrzeug","Beschreibung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{reconciliation.history.map(entry=><tr className="border-t" key={entry.id}><td className="p-3">{formatDateTime(entry.occurredAt)}</td><td className="p-3">{entry.actorDepartment}</td><td className="p-3 font-semibold">{entry.action}</td><td className="p-3">{entry.actorNameSnapshot}</td><td className="p-3">{entry.reconciliationItem?.topicTitleSnapshot??entry.vehicle?.description??"–"}</td><td className="p-3">{entry.summary}</td></tr>)}</tbody></table></div></section>
  </div>;
}

type LoadedReconciliation=Prisma.PayrollReconciliationGetPayload<{include:{
  items:{include:{
    sourceTopic:{include:{campusStandardTask:{select:{campusKnowledge:{select:{status:true}}}}}};
    documents:{include:{uploadedBy:true;archivedBy:true}};
    questions:{include:{sender:true;recipient:true}};
    vehicleChanges:{include:{vehicle:true}};
  }};
  client:true;
  accountingPeriod:true;
  history:{include:{reconciliationItem:true;vehicle:true}};
}}>;
type LoadedItem=LoadedReconciliation["items"][number];

function TopicCard({item,reconciliation,process,payroll,transferred}:{item:LoadedItem;reconciliation:LoadedReconciliation;process:boolean;payroll:boolean;transferred:boolean}){
  const requiredFields=parseConfiguredList(item.requiredFieldsSnapshot),requiredDocuments=parseConfiguredList(item.requiredDocumentsSnapshot);
  const activeDocuments=item.documents.filter(document=>document.status==="Aktiv");
  const openQuestions=item.questions.filter(question=>question.status!=="Erledigt durch Lohn");
  const campusActive=item.sourceTopic.campusStandardTask?.campusKnowledge?.status==="Aktiv";
  return <article id={`thema-${item.id}`} className="scroll-mt-5 rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{item.topicKeySnapshot}</p><h3 className="mt-1 text-xl font-bold">{item.topicTitleSnapshot}</h3><p className="mt-2 text-sm">{item.reviewQuestionSnapshot}</p>{item.descriptionSnapshot&&<p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.descriptionSnapshot}</p>}</div><div className="grid gap-2 text-right"><Status label="Themenstatus" value={item.status}/><Status label="Lohnverarbeitung" value={item.payrollProcessingStatus}/></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Data label="Sachverhalt" value={item.matterPresent}/><Data label="Belege" value={String(activeDocuments.length)}/><Data label="Offene Rückfragen" value={String(openQuestions.length)}/><Data label="Nachreichung" value={item.documentToFollow?"Offen":"Nein"}/><Data label="Letzte Änderung" value={formatDateTime(item.updatedAt)}/></div>
    <OrdoCampusPanel kind="fibu-lohn" taskId={item.id} activeKnowledge={campusActive}/>
    {item.detailsJson&&item.matterPresent==="Ja"&&<Details value={item.detailsJson}/>}
    {item.note&&<p className="mt-3 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm"><strong>Interne Notiz:</strong> {item.note}</p>}
    {item.documentToFollow&&<div className="mt-3 rounded border border-[var(--color-warning)] bg-amber-50 p-3 text-sm"><p><strong>Unterlage zur Nachreichung offen:</strong> {item.missingDocumentType??"Beleg"} · {item.followUpReason??"ohne Begründung"}{item.expectedFollowUpAt?` · erwartet ${formatDateTime(item.expectedFollowUpAt)}`:""}</p>{process&&transferred&&<form action={completePayrollFollowUpAction.bind(null,item.id)} className="mt-3"><button className="button-secondary">Nachreichung als abgeschlossen dokumentieren</button></form>}</div>}
    <ReconciliationItemForm itemId={item.id} topicKey={item.topicKeySnapshot} status={item.status} note={item.note} detailsJson={item.detailsJson} requiredFields={requiredFields} requiredDocuments={requiredDocuments} followUpAllowed={item.followUpAllowed} documentToFollow={item.documentToFollow} followUpReason={item.followUpReason} expectedFollowUpAt={item.expectedFollowUpAt?.toISOString().slice(0,10)??""} missingDocumentType={item.missingDocumentType} editable={process&&!transferred}/>
    {item.vehicleRelatedSnapshot&&process&&!transferred&&<Link className="button-secondary mt-4" href={`/fibu-lohn/fahrzeuge/neu?clientId=${reconciliation.clientId}&itemId=${item.id}&returnTo=/fibu-lohn/${reconciliation.id}`}>Neues Fahrzeug aus Abstimmung</Link>}
    {item.vehicleChanges.length>0&&<div className="mt-4"><h4 className="font-semibold">Verknüpfte Fahrzeugänderungen</h4><ul className="mt-2 space-y-2">{item.vehicleChanges.map(change=><li className="rounded border p-3 text-sm" key={change.id}><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/fibu-lohn/fahrzeuge/${change.vehicleId}`}>{change.summary}</Link></li>)}</ul></div>}
    <div className="mt-5 border-t border-[var(--color-border)] pt-4"><h4 className="font-semibold">Belege</h4><p className="mt-1 text-xs text-[var(--color-text-muted)]">Die Unterlagen werden ausschließlich intern für die FiBu-Lohn-Abstimmung bereitgestellt.</p>{activeDocuments.length?<ul className="mt-3 space-y-2">{activeDocuments.map(document=><li className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm" key={document.id}><div><strong>{document.displayName}</strong>{reconciliation.transferredAt&&document.uploadedAt>reconciliation.transferredAt&&<span className="ml-2 inline-flex rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-dark)]">Nachträglich ergänzt</span>}<div className="text-xs text-[var(--color-text-muted)]">{document.documentType} · {formatBytes(document.fileSizeBytes)} · {document.uploadedBy.fullName} · {formatDateTime(document.uploadedAt)}</div>{document.description&&<p className="mt-1">{document.description}</p>}</div><div className="flex gap-2"><a className="button-secondary" href={`/api/fibu-lohn/belege/${document.id}/download`}>Herunterladen</a>{process&&<form action={archivePayrollDocumentAction.bind(null,document.id,reconciliation.id,item.id)}><button className="button-secondary">Archivieren</button></form>}</div></li>)}</ul>:<p className="mt-2 text-sm text-[var(--color-text-muted)]">Noch keine Belege bereitgestellt.</p>}{process&&<PayrollUploadForm itemId={item.id}/>}</div>
    <div className="mt-5 border-t border-[var(--color-border)] pt-4"><h4 className="font-semibold">Rückfragen</h4>{item.questions.length?<div className="mt-3 space-y-3">{item.questions.map(question=><div className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm" key={question.id}><p><strong>{question.sender.fullName}:</strong> {question.message}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatDateTime(question.createdAt)} · {question.status}</p>{question.answer&&<p className="mt-3 border-l-4 border-[var(--color-primary)] pl-3"><strong>Antwort {question.recipient.fullName}:</strong> {question.answer}</p>}{process&&question.status==="Offen beim Rechnungswesen"&&<form action={answerPayrollQuestionAction.bind(null,question.id)} className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input" name="answer" placeholder="Antwort eingeben" required/><button className="button-primary">Antworten</button></form>}{payroll&&question.status==="Beantwortet"&&<form action={completePayrollQuestionAction.bind(null,question.id)} className="mt-3"><button className="button-primary">Rückfrage erledigen</button></form>}</div>)}</div>:<p className="mt-2 text-sm text-[var(--color-text-muted)]">Keine Rückfragen vorhanden.</p>}{payroll&&transferred&&<form action={createPayrollQuestionAction.bind(null,item.id)} className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input" name="message" placeholder="Fachliche Rückfrage" required/><button className="button-secondary">Rückfrage stellen</button></form>}</div>
    {process&&transferred&&<details className="mt-4 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-3"><summary className="cursor-pointer font-semibold">Nachträgliche Ergänzung erfassen</summary><form action={addPayrollSupplementAction.bind(null,item.id)} className="mt-3 space-y-3"><label className="label">Ergänzung<textarea className="input mt-1 min-h-24" name="supplement" required minLength={5}/></label><p className="text-xs text-[var(--color-text-muted)]">Die ursprüngliche Übergabe bleibt erhalten. Die Ergänzung wird mit Person und Zeitpunkt im Verlauf dokumentiert.</p><button className="button-secondary">Ergänzung speichern</button></form></details>}
    {payroll&&transferred&&item.matterPresent==="Ja"&&item.payrollProcessingStatus!=="Verarbeitet"&&<form action={markProcessedAction.bind(null,item.id)} className="mt-4"><button className="button-primary">Sachverhalt als verarbeitet markieren</button></form>}
  </article>;
}
function Details({value}:{value:string}){let entries:Array<[string,unknown]>=[];try{entries=Object.entries(JSON.parse(value))}catch{}return entries.length?<dl className="mt-4 grid gap-3 rounded border border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:grid-cols-2">{entries.filter(([,v])=>String(v??"").trim()).map(([key,value])=><Data key={key} label={key} value={String(value)}/>)}</dl>:null}
function Data({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>}
function Status({label,value}:{label:string;value:string}){return <div><span className="block text-xs font-semibold text-[var(--color-text-muted)]">{label}</span><span className="mt-1 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-dark)]">{value}</span></div>}
function monthLabel(year:number,month:number){return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"Europe/Berlin"}).format(new Date(Date.UTC(year,month-1,15)))}
function formatBytes(bytes:number){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${new Intl.NumberFormat("de-DE",{maximumFractionDigits:1}).format(bytes/1024/1024)} MB`}
