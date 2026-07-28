import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { updateVehicleAction } from "@/app/fibu-lohn/actions";
import { VehicleForm } from "../../vehicle-form";
import { ToastMessage } from "@/app/components/toast-message";

export default async function EditVehiclePage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{fehler?:string}>}){
  const user=await requireUser();const id=Number((await params).id);const vehicle=Number.isInteger(id)?await prisma.clientVehicle.findUnique({where:{id},include:{client:true}}):null;if(!vehicle)notFound();
  if(!(hasRole(user,"KANZLEILEITUNG")||vehicle.client.processorUserId===user.id&&hasRole(user,"MITARBEITER","PRUEFER")))redirect("/zugriff-verweigert?bereich=Fahrzeugänderung");
  return <div className="max-w-5xl"><ToastMessage message={(await searchParams).fehler} type="error"/><header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">{vehicle.client.clientNumber} · {vehicle.client.name}</p><h1 className="mt-2 text-3xl font-bold">Fahrzeugänderung erfassen</h1></header><section className="rounded-lg border border-[var(--color-border)] bg-white p-6"><VehicleForm action={updateVehicleAction.bind(null,vehicle.id)} vehicle={vehicle}/></section></div>;
}
