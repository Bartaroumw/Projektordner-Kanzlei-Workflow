import Link from "next/link";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/app/components/user-avatar";

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
const PROFESSIONAL:Record<string,string>={MITARBEITER:"Bearbeiter",PRUEFER:"Prüfer",KANZLEILEITUNG:"Kanzleileitung",LOHNSACHBEARBEITER:"Lohnsachbearbeiter"};
const ADDITIONAL:Record<string,string>={MANDANTEN_VERWALTEN:"Mandanten verwalten",MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN:"Mandantenspezifische Aufgaben verwalten",STANDARDAUFGABEN_VERWALTEN:"Standardaufgaben verwalten",ORDO_CAMPUS_VERWALTEN:"Ordo Campus verwalten",FIBU_LOHN_THEMEN_VERWALTEN:"Rechnungswesen–Lohn-Themen verwalten"};

export default async function UsersPage({searchParams}:{searchParams:SearchParams}){
  const currentUser=await requireRole("ADMINISTRATOR");
  const search=one((await searchParams).suche).trim();
  const users=await prisma.user.findMany({
    where:search?{OR:[{fullName:{contains:search}},{username:{contains:search}},{shortLabel:{contains:search}}]}:{},
    include:{roles:true,profileImage:{select:{id:true}},_count:{select:{processorClients:true,reviewerClients:true,managementClients:true}}},
    orderBy:{fullName:"asc"},
  });
  return <div>
    <AdministrationBreadcrumbs section="benutzer-rechte" current="Benutzer"/>
    <AdministrationTabs user={currentUser} active="benutzer-rechte"/>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Benutzer und Rechte</p><h1 className="mt-2 text-3xl font-bold">Benutzerverwaltung</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">Lokale Konten, fachliche Rollen, technische Rolle und Zusatzberechtigungen.</p></div><Link className="button-primary" href="/administration/benutzer/neu">Benutzer anlegen</Link></header>
    <form className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4"><label className="min-w-64 flex-1 text-xs font-semibold">Suche<input className="input mt-1" name="suche" defaultValue={search} placeholder="Name, Kürzel oder Benutzername"/></label><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/administration/benutzer">Zurücksetzen</Link></form>
    <div className="mt-6 overflow-x-auto rounded border border-[var(--color-border)] bg-white"><table className="w-full min-w-[1500px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Bild","Name","Kürzel","Benutzername","Status","Fachliche Rollen","Technische Rolle","Zusatzberechtigungen","Letzte Änderung","Mandate B/P/L","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{users.map((user)=>{const roles=user.roles.map((entry)=>entry.role);return <tr className="border-t align-top" key={user.id}><td className="p-3"><UserAvatar userId={user.id} fullName={user.fullName} hasImage={Boolean(user.profileImage)} size="sm"/></td><td className="p-3 font-semibold">{user.fullName}</td><td className="p-3">{user.shortLabel??"–"}</td><td className="p-3">{user.username}</td><td className="p-3">{user.active?"Aktiv":"Inaktiv"}</td><td className="p-3">{roles.filter((role)=>PROFESSIONAL[role]).map((role)=>PROFESSIONAL[role]).join(" · ")||"Keine"}</td><td className="p-3">{roles.includes("ADMINISTRATOR")?"Administrator":"Keine"}</td><td className="p-3">{roles.filter((role)=>ADDITIONAL[role]).map((role)=>ADDITIONAL[role]).join(" · ")||"Keine"}</td><td className="p-3">{formatDateTime(user.updatedAt)}</td><td className="p-3">{user._count.processorClients}/{user._count.reviewerClients}/{user._count.managementClients}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/administration/benutzer/${user.id}`}>Öffnen</Link></td></tr>})}
      {!users.length&&<tr><td className="p-10 text-center text-[var(--color-text-muted)]" colSpan={11}>Keine Benutzer zu dieser Suche gefunden.</td></tr>}</tbody>
    </table></div>
  </div>;
}
