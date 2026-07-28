import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { ToastMessage } from "@/app/components/toast-message";

export default async function VehicleDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{erfolg?:string}>}){
  const user=await requireUser();const id=Number((await params).id);
  const vehicle=Number.isInteger(id)?await prisma.clientVehicle.findUnique({
    where:{id},
    include:{
      client:true,
      changes:{include:{reconciliationItem:{include:{reconciliation:true}},createdBy:true},orderBy:[{effectiveFrom:"desc"},{createdAt:"desc"}]},
      history:{include:{reconciliation:true},orderBy:{occurredAt:"desc"}},
    },
  }):null;
  if(!vehicle)notFound();
  const allowed=hasRole(user,"KANZLEILEITUNG")||[vehicle.client.processorUserId,vehicle.client.reviewerUserId,vehicle.client.managementUserId,vehicle.client.payrollUserId].includes(user.id);
  if(!allowed)redirect("/zugriff-verweigert?bereich=Fahrzeugbestand");
  const editable=(vehicle.client.processorUserId===user.id&&hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG"))||hasRole(user,"KANZLEILEITUNG");
  return <div><ToastMessage message={(await searchParams).erfolg?"Das Fahrzeug wurde gespeichert.":undefined}/><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/fibu-lohn/fahrzeuge?mandant=${vehicle.clientId}`}>← Zur Fahrzeugübersicht</Link><header className="my-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">{vehicle.client.clientNumber} · {vehicle.client.name}</p><h1 className="mt-2 text-3xl font-bold">{vehicle.description}</h1><p className="mt-2 text-[var(--color-text-muted)]">{vehicle.licensePlate??"Ohne Kennzeichen"} · {vehicle.status}</p></div>{editable&&<Link className="button-primary" href={`/fibu-lohn/fahrzeuge/${vehicle.id}/bearbeiten`}>Änderung erfassen</Link>}</header>
    <section className="grid gap-5 rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"><Data label="Referenz" value={vehicle.referenceNumber??"–"}/><Data label="Eigentum / Leasing" value={vehicle.ownershipType}/><Data label="Bruttolistenpreis" value={vehicle.grossListPriceCents?`${new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(vehicle.grossListPriceCents/100)}`:"–"}/><Data label="Vertragsdatum" value={vehicle.contractDate?formatDate(vehicle.contractDate):"–"}/><Data label="Aktueller Nutzer" value={vehicle.userName}/><Data label="Funktion" value={vehicle.userFunction}/><Data label="Gültig seit" value={formatDate(vehicle.validFrom)}/><Data label="Versteuerung" value={[vehicle.onePercentRule&&"1-%-Regelung",vehicle.logbook&&"Fahrtenbuch",vehicle.commuteUse&&"Wohnung–erste Tätigkeitsstätte"].filter(Boolean).join(" · ")||"–"}/><Data label="Rechnungswesenkonto" value={vehicle.accountingAccount??"–"}/><Data label="Grundlage" value={vehicle.accountingBasis??"–"}/><Data label="Dokumentenhinweis" value={vehicle.documentReference??"–"}/><Data label="Vertrag vorhanden" value={vehicle.contractAvailable?"Ja":"Nein"}/></section>
    {vehicle.note&&<section className="mt-5 rounded-lg border border-[var(--color-border)] bg-white p-4"><h2 className="font-semibold">Hinweis</h2><p className="mt-2 whitespace-pre-wrap text-sm">{vehicle.note}</p></section>}
    <section className="mt-8"><h2 className="mb-3 text-xl font-bold">Änderungshistorie</h2><div className="space-y-3">{vehicle.changes.map(change=><article className="rounded-lg border border-[var(--color-border)] bg-white p-4" key={change.id}><div className="flex flex-wrap justify-between gap-2"><strong>{change.changeType}</strong><span className="text-sm">{formatDate(change.effectiveFrom)}</span></div><p className="mt-2 text-sm">{change.summary}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{change.createdBy.fullName} · {formatDateTime(change.createdAt)}</p>{change.reconciliationItem&&<Link className="mt-2 inline-flex text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/fibu-lohn/${change.reconciliationItem.reconciliationId}#thema-${change.reconciliationItemId}`}>Zugehörige Monatsabstimmung öffnen</Link>}</article>)}</div></section>
    {vehicle.history.length>0&&<section className="mt-8"><h2 className="mb-3 text-xl font-bold">Zugehörige Abstimmungen</h2><ul className="space-y-2">{vehicle.history.map(entry=><li key={entry.id}><Link className="block rounded border border-[var(--color-border)] bg-white p-3 text-sm hover:bg-[var(--color-primary-light)]" href={`/fibu-lohn/${entry.reconciliationId}`}>{entry.summary} · {monthLabel(entry.reconciliation.accountingYear,entry.reconciliation.accountingMonth)}</Link></li>)}</ul></section>}
  </div>;
}
function Data({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>}
function monthLabel(year:number,month:number){return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric",timeZone:"Europe/Berlin"}).format(new Date(Date.UTC(year,month-1,15)))}
