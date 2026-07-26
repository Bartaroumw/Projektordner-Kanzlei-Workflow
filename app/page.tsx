const kennzahlen = [
  { label: "Offene Perioden", value: "0", accent: "border-l-slate-500" },
  { label: "In Bearbeitung", value: "0", accent: "border-l-blue-600" },
  { label: "Zur Prüfung", value: "0", accent: "border-l-amber-500" },
  { label: "Abgeschlossen", value: "0", accent: "border-l-emerald-600" },
];

const spalten = [
  "Mandant",
  "Periode",
  "Bearbeiter",
  "Prüfer",
  "Bearbeitungsstatus",
  "Prüfstatus",
  "Fortschritt",
];

export default function Home() {
  return (
    <div id="dashboard">
          <header className="mb-7">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
              Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Kanzlei Workflow
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Digitale Checklisten für das Rechnungswesen
            </p>
          </header>

          <section
            aria-label="Einrichtungsstatus"
            className="mb-7 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-950"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white"
            >
              ✓
            </span>
            <div>
              <p className="font-semibold">
                Technische Grundlage erfolgreich eingerichtet
              </p>
              <p className="mt-0.5 text-sm text-emerald-800">
                Die Anwendung ist für die schrittweise Erweiterung vorbereitet.
              </p>
            </div>
          </section>

          <section aria-labelledby="ueberblick">
            <h2 id="ueberblick" className="mb-3 text-lg font-semibold">
              Überblick
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kennzahlen.map((kennzahl) => (
                <article
                  key={kennzahl.label}
                  className={`rounded-lg border border-slate-200 border-l-4 ${kennzahl.accent} bg-white p-5 shadow-sm`}
                >
                  <p className="text-sm font-medium text-slate-600">
                    {kennzahl.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">
                    {kennzahl.value}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="perioden" className="mt-8">
            <div className="mb-3">
              <h2 id="perioden" className="text-lg font-semibold">
                Aktuelle Perioden
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Hier werden später die Monats- und Jahresabschlusschecklisten
                angezeigt.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      {spalten.map((spalte) => (
                        <th
                          key={spalte}
                          scope="col"
                          className="border-b border-slate-200 px-4 py-3"
                        >
                          {spalte}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={spalten.length}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        Noch keine Perioden vorhanden.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
    </div>
  );
}
