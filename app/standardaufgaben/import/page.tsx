import Link from "next/link";
import { redirect } from "next/navigation";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireUser } from "@/lib/auth";
import { canManageStandardTasks } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ImportClient } from "./import-client";

export default async function TaskImportPage() {
  const user = await requireUser();
  if (!canManageStandardTasks(user)) redirect("/zugriff-verweigert?bereich=Standardaufgaben-Import");
  const history = await prisma.taskImportHistory.findMany({
    orderBy: { importedAt: "desc" },
    take: 25,
  });

  return (
    <div>
      <AdministrationBreadcrumbs section="daten-import" current="Standardaufgaben-Import"/>
      <AdministrationTabs user={user} active="daten-import"/>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Kontrollierte Übernahme</p>
          <h1 className="text-3xl font-bold tracking-tight">Excel-Import</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Erst prüfen, Vorschau kontrollieren und anschließend ausdrücklich bestätigen. Mandanten und Jahresprofile bleiben unverändert.
          </p>
        </div>
        <Link className="button-secondary" href="/standardaufgaben">Zurück zur Übersicht</Link>
      </header>

      <section className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-primary-light)] p-5">
        <h2 className="font-semibold text-[var(--color-primary-dark)]">Excel-Dateien</h2>
        <p className="mt-1 text-sm text-[var(--color-text)]">Die Mustervorlage enthält Ausfüllhinweise und feste Auswahlfelder. Die Beispieldatei enthält ausschließlich künstliche Aufgaben und wird nicht automatisch importiert.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="button-primary" download href="/downloads/Standardaufgaben-Mustervorlage.xlsx">Excel-Mustervorlage herunterladen</a>
          <a className="button-secondary" download href="/downloads/Standardaufgaben-Kuenstliche-Beispiele.xlsx">Künstliche Beispieldatei herunterladen</a>
        </div>
      </section>

      <ImportClient />

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-semibold">Importhistorie</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50"><tr>{["Zeitpunkt","Dateiname","Version","Neu","Aktualisiert","Unverändert","Deaktiviert","Neue Kategorien","Fehler","Status"].map((heading) => <th className="border-b border-slate-200 px-3 py-3" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{history.map((item) => <tr className="border-t border-slate-100" key={item.id}><td className="whitespace-nowrap px-3 py-3">{formatDateTime(item.importedAt)}</td><td className="px-3 py-3">{item.originalFileName}</td><td className="px-3 py-3">{item.professionalVersion ?? "–"}</td><td className="px-3 py-3">{item.createdCount}</td><td className="px-3 py-3">{item.updatedCount}</td><td className="px-3 py-3">{item.unchangedCount}</td><td className="px-3 py-3">{item.deactivatedCount}</td><td className="px-3 py-3">{item.createdCategoryCount}</td><td className="px-3 py-3">{item.errorRowCount}</td><td className="px-3 py-3">{item.status}</td></tr>)}{history.length === 0 && <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={10}>Noch keine bestätigten Importe vorhanden.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
