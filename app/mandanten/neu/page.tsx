import { createClientAction } from "@/app/mandanten/actions";
import { ClientForm } from "@/app/mandanten/client-form";

export default function NewClientPage() {
  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Mandanten</p>
        <h1 className="text-3xl font-bold tracking-tight">Mandant anlegen</h1>
        <p className="mt-2 text-slate-600">Pflichtfelder sind mit einem Stern gekennzeichnet.</p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <ClientForm action={createClientAction} cancelHref="/mandanten" />
      </section>
    </div>
  );
}
