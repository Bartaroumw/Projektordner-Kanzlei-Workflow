import { notFound } from "next/navigation";
import { createAnnualProfileAction } from "@/app/mandanten/actions";
import { AnnualProfileForm } from "@/app/mandanten/annual-profile-form";
import { prisma } from "@/lib/prisma";

export default async function NewAnnualProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const client = Number.isInteger(id)
    ? await prisma.client.findUnique({
        where: { id },
        include: { annualProfiles: { orderBy: { calendarYear: "desc" }, take: 1 } },
      })
    : null;
  if (!client) notFound();
  const latest = client.annualProfiles[0];
  const suggestion = latest
    ? { ...latest, id: undefined, calendarYear: latest.calendarYear + 1 }
    : { calendarYear: new Date().getFullYear() };
  const action = createAnnualProfileAction.bind(null, client.id);

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">{client.clientNumber} · {client.name}</p>
        <h1 className="text-3xl font-bold tracking-tight">Jahresprofil hinzufügen</h1>
        <p className="mt-2 text-slate-600">Es wird ein neues, eigenständiges Profil angelegt. Frühere Kalenderjahre bleiben unverändert.</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <AnnualProfileForm action={action} profile={suggestion} copiedFromYear={latest?.calendarYear} cancelHref={`/mandanten/${client.id}`} />
      </section>
    </div>
  );
}
