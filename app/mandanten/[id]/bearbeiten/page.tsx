import { notFound } from "next/navigation";
import { updateClientAction } from "@/app/mandanten/actions";
import { ClientForm } from "@/app/mandanten/client-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  const client = Number.isInteger(id) ? await prisma.client.findUnique({ where: { id } }) : null;
  if (!client) notFound();
  const users=await prisma.user.findMany({where:{active:true},include:{roles:true},orderBy:{fullName:"asc"}});
  const action = updateClientAction.bind(null, client.id);
  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Mandant {client.clientNumber}</p>
        <h1 className="text-3xl font-bold tracking-tight">Stammdaten bearbeiten</h1>
        <p className="mt-2 text-slate-600">Zum historischen Erhalt wird ein Mandant nicht gelöscht, sondern bei Bedarf auf inaktiv gesetzt.</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <ClientForm action={action} client={client} cancelHref={`/mandanten/${client.id}`} users={users}/>
      </section>
    </div>
  );
}
