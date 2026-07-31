import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { formatDate } from "@/lib/format";
import { PayrollModuleTabs } from "@/app/components/module-tabs";

const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
export default async function VehicleListPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireUser();const params=await searchParams;
  const status=one(params.status)||"Aktiv",clientId=Number(one(params.mandant))||undefined,userName=one(params.nutzer),method=one(params.methode);
  const officeWide=hasRole(user,"KANZLEILEITUNG");
  const clientAccess=officeWide?{}:{OR:[{processorUserId:user.id},{reviewerUserId:user.id},{managementUserId:user.id},{payrollUserId:user.id}]};
  const clients=await prisma.client.findMany({where:clientAccess,select:{id:true,clientNumber:true,name:true},orderBy:{clientNumber:"asc"}});
  const vehicles=await prisma.clientVehicle.findMany({where:{
    clientId:{in:clients.map(client=>client.id)},...(clientId?{clientId}:{}),...(status==="Alle"?{}:{status}),
    ...(userName?{userName:{contains:userName}}:{}),
    ...(method==="Ein-Prozent"?{onePercentRule:true}:method==="Fahrtenbuch"?{logbook:true}:{}),
  },include:{client:true,changes:{orderBy:{createdAt:"desc"},take:1}},orderBy:[{status:"asc"},{client:{clientNumber:"asc"}},{description:"asc"}],take:200});
  return <div><PayrollModuleTabs active="fahrzeuge" user={user}/><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">FiBu-Lohn-Abstimmung</p><h1 className="mt-2 text-3xl font-bold">Fahrzeuge</h1><p className="mt-2 text-[var(--color-text-muted)]">Dauerhafter Fahrzeugbestand mit nachvollziehbaren Änderungen.</p></div>{hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG")&&<Link className="button-primary" href="/fibu-lohn/fahrzeuge/neu">Neues Fahrzeug</Link>}</header>
    <form className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 md:grid-cols-2 xl:grid-cols-5"><Field label="Mandant"><select className="input" name="mandant" defaultValue={clientId??""}><option value="">Alle</option>{clients.map(client=><option value={client.id} key={client.id}>{client.clientNumber} · {client.name}</option>)}</select></Field><Field label="Status"><select className="input" name="status" defaultValue={status}><option>Aktiv</option><option>Beendet</option><option>Alle</option></select></Field><Field label="Nutzer"><input className="input" name="nutzer" defaultValue={userName}/></Field><Field label="Versteuerungsmethode"><select className="input" name="methode" defaultValue={method}><option value="">Alle</option><option value="Ein-Prozent">1-%-Regelung</option><option>Fahrtenbuch</option></select></Field><div className="flex items-end gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/fibu-lohn/fahrzeuge">Zurücksetzen</Link></div></form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Kennzeichen","Fahrzeug","Nutzer","Eigentum / Leasing","Versteuerung","Gültig seit","Status","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{vehicles.map(vehicle=>{const href=`/fibu-lohn/fahrzeuge/${vehicle.id}`;return <ClickableTableRow href={href} className="border-t" key={vehicle.id}><td className="p-3">{vehicle.client.clientNumber} · {vehicle.client.name}</td><td className="p-3">{vehicle.licensePlate??"–"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={href}>{vehicle.description}</Link></td><td className="p-3">{vehicle.userName}</td><td className="p-3">{vehicle.ownershipType}</td><td className="p-3">{vehicle.onePercentRule?"1-%-Regelung":vehicle.logbook?"Fahrtenbuch":"Nicht festgelegt"}</td><td className="p-3">{formatDate(vehicle.validFrom)}</td><td className="p-3">{vehicle.status}</td><td className="p-3">{vehicle.changes[0]?formatDate(vehicle.changes[0].createdAt):formatDate(vehicle.updatedAt)}</td></ClickableTableRow>})}{!vehicles.length&&<tr><td className="p-10 text-center text-[var(--color-text-muted)]" colSpan={9}>Für die Auswahl sind keine Fahrzeuge hinterlegt.</td></tr>}</tbody></table></div>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
