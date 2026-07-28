import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManagePayrollTopics } from "@/lib/permissions";
import { parseConfiguredList } from "@/lib/payroll-reconciliation-service";
import { formatDate } from "@/lib/format";
import { ToastMessage } from "@/app/components/toast-message";

export default async function PayrollTopicsPage({searchParams}:{searchParams:Promise<{erfolg?:string}>}){
  const user=await requireUser();if(!canManagePayrollTopics(user))redirect("/zugriff-verweigert?bereich=FiBu-Lohn-Themen");
  const topics=await prisma.payrollReconciliationTopic.findMany({include:{campusStandardTask:{select:{id:true,title:true,campusKnowledge:{select:{status:true}}}}},orderBy:[{sortOrder:"asc"},{title:"asc"}]});
  return <div><ToastMessage message={(await searchParams).erfolg?"Der Themenkatalog wurde gespeichert.":undefined}/><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Konfiguration</p><h1 className="mt-2 text-3xl font-bold">FiBu-Lohn-Themen</h1><p className="mt-2 text-[var(--color-text-muted)]">Änderungen gelten nur für künftig erzeugte Themen-Snapshots.</p></div><Link className="button-primary" href="/fibu-lohn/themen/neu">Thema anlegen</Link></header><div className="space-y-4">{topics.map(topic=><article className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm" key={topic.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--color-primary)]">{topic.key}</p><h2 className="mt-1 text-xl font-bold">{topic.title}</h2><p className="mt-2 text-sm">{topic.reviewQuestion}</p></div><div className="text-right text-sm"><strong>{topic.status}</strong><p>Sortierung {topic.sortOrder}</p></div></div><dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Data label="Pflichtangaben" value={parseConfiguredList(topic.requiredStandardFields).join(" · ")||"Keine"}/><Data label="Belegarten" value={parseConfiguredList(topic.requiredDocumentTypes).join(" · ")||"Keine"}/><Data label="Ordo Campus" value={topic.campusStandardTask?.campusKnowledge?.status??"Nicht hinterlegt"}/><Data label="Gültig ab" value={formatDate(topic.validFrom)}/></dl><Link className="button-secondary mt-4" href={`/fibu-lohn/themen/${topic.id}/bearbeiten`}>Thema bearbeiten</Link></article>)}</div></div>;
}
function Data({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>}
