import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AccessDenied({searchParams}:{searchParams:Promise<{bereich?:string}>}){
  await requireUser();const area=(await searchParams).bereich??"Inhalt";
  return <section className="mx-auto max-w-2xl rounded-lg border border-amber-300 bg-white p-7 shadow-sm" role="alert">
    <h1 className="text-2xl font-semibold">Zugriff nicht möglich</h1>
    <p className="mt-3">Sie sind für den Bereich „{area}“ nicht als Bearbeiter, Prüfer oder Kanzleileitung zugeordnet.</p>
    <p className="mt-2 text-sm text-[var(--color-text-muted)]">Es wurden keine Daten geändert oder offengelegt.</p>
    <div className="mt-5 flex gap-3"><Link className="button-primary" href="/">Zum Dashboard</Link><Link className="button-secondary" href="/mandanten">Zur Mandantenübersicht</Link></div>
  </section>
}
