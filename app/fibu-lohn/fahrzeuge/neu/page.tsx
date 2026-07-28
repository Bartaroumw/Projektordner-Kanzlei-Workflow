import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { createVehicleAction } from "@/app/fibu-lohn/actions";
import { VehicleForm } from "../vehicle-form";
import { ToastMessage } from "@/app/components/toast-message";

export default async function NewVehiclePage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const user=await requireUser();if(!hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG"))redirect("/zugriff-verweigert?bereich=Fahrzeuganlage");
  const params=await searchParams;const clientId=Number(params.clientId)||undefined,itemId=Number(params.itemId)||undefined;
  const clients=await prisma.client.findMany({where:hasRole(user,"KANZLEILEITUNG")?{}:{processorUserId:user.id},select:{id:true,clientNumber:true,name:true},orderBy:{clientNumber:"asc"}});
  const selected=clientId??clients[0]?.id;if(!selected)redirect("/zugriff-verweigert?bereich=Fahrzeuganlage");
  const action=createVehicleAction.bind(null,clientId??0,itemId);
  return <div className="max-w-5xl"><ToastMessage message={params.fehler} type="error"/><header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Fahrzeugbestand</p><h1 className="mt-2 text-3xl font-bold">Neues Fahrzeug</h1></header><section className="rounded-lg border border-[var(--color-border)] bg-white p-6"><VehicleForm action={action} clients={clientId?undefined:clients} clientId={selected} itemId={itemId} returnTo={params.returnTo}/></section></div>;
}
