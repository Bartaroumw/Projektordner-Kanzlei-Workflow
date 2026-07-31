import { LoginForm } from "./login-form";

export default async function LoginPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params=await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
    <section className="w-full max-w-md rounded-xl border border-[var(--color-primary)] bg-white p-6 shadow-lg sm:p-8">
      <div className="flex items-center gap-4">
        <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-dark)] text-base font-bold tracking-wide text-white">OC</div>
        <h1 className="text-3xl font-semibold text-[var(--color-primary-dark)]">Ordo Caroli</h1>
      </div>
      {params.abgemeldet&&<p className="mt-5 rounded bg-green-50 p-3 text-sm text-green-800">Sie wurden sicher abgemeldet.</p>}
      <LoginForm key={params.abgemeldet?"abgemeldet":"anmelden"} next={params.weiter??"/"}/>
    </section>
  </main>;
}
