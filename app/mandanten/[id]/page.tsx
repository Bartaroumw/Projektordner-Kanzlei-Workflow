import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, textOrDash } from "@/lib/format";

const messages: Record<string, string> = {
  angelegt: "Der Mandant wurde erfolgreich angelegt.",
  gespeichert: "Die Stammdaten wurden erfolgreich gespeichert.",
  "jahresprofil-angelegt": "Das Jahresprofil wurde erfolgreich angelegt.",
  "jahresprofil-gespeichert": "Das Jahresprofil wurde erfolgreich gespeichert.",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erfolg?: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const client = await prisma.client.findUnique({
    where: { id },
    include: { annualProfiles: { orderBy: { calendarYear: "desc" } } },
  });
  if (!client) notFound();
  const success = messages[(await searchParams).erfolg ?? ""];

  return (
    <div>
      <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/mandanten">← Zur Mandantenübersicht</Link></div>
      {success && <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{success}</div>}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Mandant {client.clientNumber}</p>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2"><Link className="button-secondary" href={`/mandanten/${client.id}/zusatzaufgaben`}>Mandantenspezifische Aufgaben</Link><Link className="button-secondary" href={`/mandanten/${client.id}/bearbeiten`}>Stammdaten bearbeiten</Link></div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Stammdaten</h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Data label="Bearbeiter" value={textOrDash(client.processor)} />
          <Data label="Prüfer" value={textOrDash(client.reviewer)} />
          <Data label="Team" value={textOrDash(client.team)} />
          <Data label="Turnus" value={client.cadence} capitalize />
          <Data label="Status" value={client.active ? "Aktiv" : "Inaktiv"} />
          <Data label="Erstellt am" value={formatDate(client.createdAt)} />
          <Data label="Geändert am" value={formatDate(client.updatedAt)} />
        </dl>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interner Hinweis</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{textOrDash(client.internalNote)}</p>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Jahresprofile</h2>
            <p className="mt-1 text-sm text-slate-600">Das Kalenderjahr entspricht dem Wirtschaftsjahr.</p>
          </div>
          <Link className="button-primary" href={`/mandanten/${client.id}/jahresprofile/neu`}>Jahresprofil hinzufügen</Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {["Kalenderjahr", "Rechtsformgruppe", "Gewinnermittlungsart", "Geändert am", "Aktion"].map((value) => <th key={value} className="border-b border-slate-200 px-4 py-3">{value}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.annualProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-semibold">{profile.calendarYear}</td>
                  <td className="px-4 py-3">{profile.legalFormGroup}</td>
                  <td className="px-4 py-3">{profile.profitDeterminationMethod}</td>
                  <td className="px-4 py-3">{formatDate(profile.updatedAt)}</td>
                  <td className="px-4 py-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/mandanten/${client.id}/jahresprofile/${profile.id}/bearbeiten`}>Bearbeiten</Link></td>
                </tr>
              ))}
              {client.annualProfiles.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Noch kein Jahresprofil vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Data({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd></div>;
}
