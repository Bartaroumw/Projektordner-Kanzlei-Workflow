import { LoginForm } from "./login-form";

export default async function LoginPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params=await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
    <section className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-white p-8 shadow-lg">
      <div className="text-sm font-bold text-[var(--color-primary)]">OC</div>
      <h1 className="mt-2 text-3xl font-semibold">Ordo Caroli</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Lokale Anmeldung · Rechnungswesen-Workflow</p>
      {params.abgemeldet&&<p className="mt-5 rounded bg-green-50 p-3 text-sm text-green-800">Sie wurden sicher abgemeldet.</p>}
      <LoginForm key={params.abgemeldet?"abgemeldet":"anmelden"} next={params.weiter??"/"}/>
    </section>
  </main>;
}
