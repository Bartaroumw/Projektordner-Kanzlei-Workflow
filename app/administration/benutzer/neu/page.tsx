import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireRole } from "@/lib/auth";
import { createUserAction } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUser() {
  const user = await requireRole("ADMINISTRATOR");
  return <>
    <AdministrationBreadcrumbs section="benutzer-rechte" current="Benutzer anlegen"/>
    <AdministrationTabs user={user} active="benutzer-rechte"/>
    <h1 className="text-3xl font-semibold">Benutzer anlegen</h1>
    <p className="mt-2 text-sm">Das temporäre Passwort muss beim ersten Login geändert werden.</p>
    <UserForm action={createUserAction}/>
  </>;
}
