import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { textOrDash } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = single(params.suche).trim();
  const status = single(params.status);
  const processor = single(params.bearbeiter);
  const reviewer = single(params.pruefer);
  const team = single(params.team);

  const where = {
    AND: [
      search
        ? {
            OR: [
              { clientNumber: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : {},
      status === "aktiv" ? { active: true } : status === "inaktiv" ? { active: false } : {},
      processor ? { processor } : {},
      reviewer ? { reviewer } : {},
      team ? { team } : {},
    ],
  };

  const [clients, optionRows] = await Promise.all([
    prisma.client.findMany({ where, orderBy: { clientNumber: "asc" } }),
    prisma.client.findMany({
      select: { processor: true, reviewer: true, team: true },
    }),
  ]);
  const options = (key: "processor" | "reviewer" | "team") =>
    [...new Set(optionRows.map((row) => row[key]).filter(Boolean) as string[])].sort();

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Stammdaten</p>
          <h1 className="text-3xl font-bold tracking-tight">Mandanten</h1>
          <p className="mt-2 text-slate-600">Mandantenstammdaten und kalenderjahrbezogene Profile verwalten.</p>
        </div>
        <Link className="button-primary" href="/mandanten/neu">Mandant anlegen</Link>
      </header>

      <form className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="suche">Suche</label>
            <input className="input" id="suche" name="suche" defaultValue={search} placeholder="Nummer oder Name" />
          </div>
          <FilterSelect name="status" label="Status" value={status} options={[["aktiv", "Aktiv"], ["inaktiv", "Inaktiv"]]} />
          <FilterSelect name="bearbeiter" label="Bearbeiter" value={processor} options={options("processor").map((value) => [value, value])} />
          <FilterSelect name="pruefer" label="Prüfer" value={reviewer} options={options("reviewer").map((value) => [value, value])} />
          <FilterSelect name="team" label="Team" value={team} options={options("team").map((value) => [value, value])} />
        </div>
        <div className="mt-3 flex gap-3">
          <button className="button-primary" type="submit">Anwenden</button>
          <Link className="button-secondary" href="/mandanten">Zurücksetzen</Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {["Mandantennummer", "Mandantenname", "Bearbeiter", "Prüfer", "Team", "Turnus", "Status", "Aktion"].map((heading) => (
                  <th key={heading} className="border-b border-slate-200 px-4 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{client.clientNumber}</td>
                  <td className="px-4 py-3">{client.name}</td>
                  <td className="px-4 py-3">{textOrDash(client.processor)}</td>
                  <td className="px-4 py-3">{textOrDash(client.reviewer)}</td>
                  <td className="px-4 py-3">{textOrDash(client.team)}</td>
                  <td className="px-4 py-3 capitalize">{client.cadence}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${client.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {client.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-blue-700 hover:underline" href={`/mandanten/${client.id}`}>Öffnen</Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">Keine Mandanten zu den gewählten Such- und Filterkriterien gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={value}>
        <option value="">Alle</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}
