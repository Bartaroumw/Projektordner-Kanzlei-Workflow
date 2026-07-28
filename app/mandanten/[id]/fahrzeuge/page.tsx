import { redirect } from "next/navigation";
export default async function ClientVehiclesRedirect({params}:{params:Promise<{id:string}>}){redirect(`/fibu-lohn/fahrzeuge?mandant=${(await params).id}`)}
