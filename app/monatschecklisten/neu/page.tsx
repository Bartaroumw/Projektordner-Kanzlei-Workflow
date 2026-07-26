import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { previewMonthlyPeriod } from "@/lib/monthly-checklist-service";
import { confirmPeriodAction } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function NewMonthlyPeriodPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const clients = await prisma.client.findMany({ where: { active: true }, orderBy: { clientNumber: "asc" } });
  const clientId = Number(one(params.clientId)) || clients[0]?.id;
  const year = Number(one(params.year)) || 2026;
  const month = Number(one(params.month)) || 1;
  const requested = one(params.vorschau) === "1";
  let preview: Awaited<ReturnType<typeof previewMonthlyPeriod>> | null = null;
  let error = one(params.fehler);
  let existing = Number(one(params.vorhanden)) || undefined;
  if (requested && clientId && !error) {
    try { preview = await previewMonthlyPeriod(clientId, year, month); }
    catch (caught) {
      error = caught instanceof Error ? caught.message : "Die Vorschau konnte nicht erstellt werden.";
      if (typeof caught === "object" && caught && "existingPeriodId" in caught) {
        const candidate = Number(caught.existingPeriodId);
        if (Number.isInteger(candidate)) existing = candidate;
      }
    }
  }
  return <div>
    <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/monatschecklisten">← Zur Übersicht</Link></div>
    <h1 className="text-3xl font-bold">Monatscheckliste erzeugen</h1>
    <p className="mt-2 text-slate-600">Auswahl prüfen, Vorschau kontrollieren und anschließend ausdrücklich erzeugen.</p>
    {error&&<div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}{existing&&<> <Link className="font-semibold underline" href={`/monatschecklisten/${existing}`}>Vorhandene Periode öffnen</Link></>}</div>}
    <form className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="vorschau" value="1" />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold">Mandant<select className="input mt-1" name="clientId" defaultValue={clientId}>{clients.map((c)=><option value={c.id} key={c.id}>{c.clientNumber} – {c.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Kalenderjahr<input className="input mt-1" name="year" type="number" min="2000" max="2100" defaultValue={year} /></label>
        <label className="text-sm font-semibold">Monat beziehungsweise Abschlussmonat<select className="input mt-1" name="month" defaultValue={month}>{Array.from({length:12},(_,i)=><option value={i+1} key={i+1}>{new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,i,1))}</option>)}</select></label>
      </div>
      <button className="button-primary mt-4" type="submit">Vorschau anzeigen</button>
    </form>
    {preview&&<section className="mt-6 rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Vorschau: {preview.label}</h2>
      <p className="mt-1 text-sm text-slate-600">{preview.client.clientNumber} – {preview.client.name}; Jahresprofil {year} ist vorhanden.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><Count label="Standardaufgaben" value={preview.standardTasks.length}/><Count label="Mandantenspezifische Aufgaben" value={preview.customTasks.length}/><Count label="Aufgaben gesamt" value={preview.standardTasks.length+preview.customTasks.length}/></div>
      <div className="mt-4"><span className="text-sm font-semibold">Kategorien:</span> <span className="text-sm">{preview.categories.join(", ") || "Keine"}</span></div>
      {preview.standardTasks.length+preview.customTasks.length===0&&<p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">Hinweis: Nach den aktuellen Regeln werden keine Aufgaben eingesteuert.</p>}
      <form action={confirmPeriodAction} className="mt-5"><input type="hidden" name="clientId" value={clientId}/><input type="hidden" name="year" value={year}/><input type="hidden" name="month" value={month}/><button className="button-primary">Checkliste ausdrücklich erzeugen</button></form>
    </section>}
  </div>;
}
function Count({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-slate-50 p-4"><div className="text-sm text-slate-600">{label}</div><div className="text-2xl font-bold">{value}</div></div>}
