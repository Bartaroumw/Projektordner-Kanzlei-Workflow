import { notFound } from "next/navigation";
import { updateAnnualProfileAction } from "@/app/mandanten/actions";
import { AnnualProfileForm } from "@/app/mandanten/annual-profile-form";
import { prisma } from "@/lib/prisma";

export default async function EditAnnualProfilePage({
  params,
}: {
  params: Promise<{ id: string; profileId: string }>;
}) {
  const values = await params;
  const clientId = Number(values.id);
  const profileId = Number(values.profileId);
  const profile = Number.isInteger(clientId) && Number.isInteger(profileId)
    ? await prisma.annualProfile.findFirst({
        where: { id: profileId, clientId },
        include: { client: true },
      })
    : null;
  if (!profile) notFound();
  const action = updateAnnualProfileAction.bind(null, profile.id, profile.clientId);
  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">{profile.client.clientNumber} · {profile.client.name}</p>
        <h1 className="text-3xl font-bold tracking-tight">Jahresprofil {profile.calendarYear} bearbeiten</h1>
        <p className="mt-2 text-slate-600">Änderungen gelten nur für dieses Kalenderjahr.</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <AnnualProfileForm action={action} profile={profile} cancelHref={`/mandanten/${profile.clientId}`} />
      </section>
    </div>
  );
}
