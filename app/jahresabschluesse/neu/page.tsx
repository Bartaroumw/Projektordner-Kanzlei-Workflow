import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageClients, canViewClient } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ToastMessage } from "@/app/components/toast-message";
import { createAnnualChecklistAction } from "../actions";

const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]??"":v??"";
export default async function NewAnnual({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requireUser();if(!canManageClients(user))redirect("/zugriff-verweigert?bereich=Jahresabschluss");
 const query=await searchParams,clients=(await prisma.client.findMany({where:{active:true},include:{annualProfiles:true},orderBy:{clientNumber:"asc"}})).filter(client=>canViewClient(user,client));
 const selected=Number(one(query.clientId))||clients[0]?.id,year=Number(one(query.fiscalYear))||new Date().getFullYear()-1;
 return <div className="max-w-3xl"><ToastMessage type="error" message={one(query.fehler)}/><p className="text-sm font-semibold uppercase text-[var(--color-primary)]">Neue Abschlussbearbeitung</p><h1 className="mt-2 text-3xl font-bold">Jahresabschlusscheckliste anlegen</h1><p className="mt-2 text-sm text-slate-600">Die Rollen und passenden Jahresabschlussaufgaben werden nach Bestätigung als Snapshot gespeichert. Offene Monatschecklisten verhindern die Anlage nicht und werden im Detail sichtbar.</p><form action={createAnnualChecklistAction} className="mt-6 grid gap-4 rounded-lg border bg-white p-5"><label className="text-sm font-semibold">Mandant<select className="input mt-1" name="clientId" defaultValue={selected}>{clients.map(c=><option key={c.id} value={c.id}>{c.clientNumber} · {c.name}</option>)}</select></label><label className="text-sm font-semibold">Wirtschaftsjahr<input className="input mt-1" name="fiscalYear" type="number" min="2000" max="2100" defaultValue={year}/></label><div className="rounded bg-[var(--color-primary-light)] p-3 text-sm">Die Anlage erfolgt erst mit ausdrücklicher Bestätigung. Ein Jahresprofil und vollständige aktive Rollen sind erforderlich.</div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" required/> Anlage ausdrücklich bestätigen</label><button className="button-primary">Jahresabschlusscheckliste anlegen</button></form></div>
}
