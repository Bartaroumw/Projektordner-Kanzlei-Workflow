import { notFound } from "next/navigation";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetPasswordAction, updateUserAction } from "../actions";
import { UserForm } from "../user-form";

export default async function UserDetail({params}:{params:Promise<{id:string}>}) {
  const currentUser = await requireRole("ADMINISTRATOR");
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { roles: true, _count: { select: { processorClients: true, reviewerClients: true, managementClients: true, processorPeriods: true, reviewerPeriods: true } } },
  });
  if (!user) notFound();
  const assignments = user._count.processorClients + user._count.reviewerClients + user._count.managementClients;
  return <>
    <AdministrationBreadcrumbs section="benutzer-rechte" current={user.fullName}/>
    <AdministrationTabs user={currentUser} active="benutzer-rechte"/>
    <h1 className="text-3xl font-semibold">{user.fullName}</h1>
    {assignments > 0 && <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">Hinweis: Dieser Benutzer ist noch {assignments} aktiven oder historischen Mandatsrollen zugeordnet. Eine Deaktivierung verteilt diese Rollen nicht automatisch um.</p>}
    <UserForm action={updateUserAction.bind(null,user.id)} user={user}/>
    <section className="mt-7 max-w-3xl rounded-lg border border-amber-300 bg-white p-6">
      <h2 className="text-xl font-semibold">Passwort zurücksetzen</h2>
      <p className="mt-1 text-sm">Alle Sitzungen werden beendet; beim nächsten Login ist eine Passwortänderung erforderlich.</p>
      <form action={resetPasswordAction.bind(null,user.id)} className="mt-4 grid gap-3 md:grid-cols-2">
        <input className="input" name="password" type="password" minLength={12} placeholder="Temporäres Passwort" required/>
        <input className="input" name="confirmation" type="password" minLength={12} placeholder="Passwort wiederholen" required/>
        <input className="input md:col-span-2" name="reason" placeholder="Begründung" required/>
        <button className="button-secondary">Passwort zurücksetzen</button>
      </form>
    </section>
  </>;
}
