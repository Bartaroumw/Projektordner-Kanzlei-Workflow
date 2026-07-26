import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, textOrDash } from "@/lib/format";

export default async function TaskDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erfolg?: string }> }) {
  const id = Number((await params).id);
  const task = Number.isInteger(id) ? await prisma.standardTask.findUnique({ where: { id }, include: { category: true } }) : null;
  if (!task) notFound();
  const success = (await searchParams).erfolg;
  return <div>
    <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/standardaufgaben">← Zur Übersicht</Link></div>
    {success && <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Die Standardaufgabe wurde erfolgreich {success === "angelegt" ? "angelegt" : "gespeichert"}.</div>}
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">{task.taskId}</p><h1 className="text-3xl font-bold">{task.title}</h1></div><Link className="button-secondary" href={`/standardaufgaben/${task.id}/bearbeiten`}>Bearbeiten</Link></header>
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Data label="Status" value={task.active ? "Aktiv" : "Inaktiv"} /><Data label="Checklistenart" value={task.checklistType} /><Data label="Kategorie" value={task.category.name} /><Data label="Unterkategorie" value={textOrDash(task.subcategory)} /><Data label="Rhythmus" value={task.rhythm} /><Data label="Ausführungsmonat" value={task.executionMonth?.toString() ?? "–"} /><Data label="Pflichtaufgabe" value={task.mandatory ? "Ja" : "Nein"} /><Data label="Version" value={task.professionalVersion} /><Data label="Rechtsformgruppen" value={task.legalFormGroups} /><Data label="Gewinnermittlungsarten" value={task.profitDeterminationMethods} /><Data label="Sortierreihenfolge" value={task.sortOrder.toString()} /><Data label="Geändert am" value={formatDate(task.updatedAt)} />
    </dl></section>
    <section className="mt-6 grid gap-5 lg:grid-cols-2"><TextCard title="Arbeitsanweisung" value={task.workInstruction} /><TextCard title="Prüfanweisung" value={task.reviewInstruction} /></section>
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Merkmalsbedingungen</h2><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Data label="Kasse" value={task.cashCondition} /><Data label="Lohn" value={task.payrollCondition} /><Data label="Anlagevermögen" value={task.fixedAssetsCondition} /><Data label="Debitoren/Kreditoren" value={task.receivablesPayablesCondition} /><Data label="Darlehen" value={task.loansCondition} /><Data label="Umsatzsteuerpflicht" value={task.vatCondition} /><Data label="Dauerfristverlängerung" value={task.permanentExtensionCondition} /></dl></section>
    <section className="mt-6 grid gap-5 lg:grid-cols-2"><TextCard title="Wissensschlüssel" value={task.knowledgeKey} /><TextCard title="Interne Bemerkung" value={task.internalNote} /></section>
  </div>;
}
function Data({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>; }
function TextCard({ title, value }: { title: string; value: string | null }) { return <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-slate-700">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm">{textOrDash(value)}</p></article>; }
