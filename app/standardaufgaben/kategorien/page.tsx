import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createCategoryAction, updateCategoryAction } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = await prisma.taskCategory.findMany({
    include: { _count: { select: { standardTasks: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const error = one(params.fehler);
  const success = one(params.erfolg);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
            Zentrale Struktur
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Kategorien</h1>
          <p className="mt-2 text-slate-600">
            Kategorien ordnen den zentralen Bestand der Standardaufgaben.
          </p>
        </div>
        <Link className="button-secondary" href="/standardaufgaben">Zurück zur Übersicht</Link>
      </header>

      {success && <Message tone="success">Die Kategorie wurde erfolgreich gespeichert.</Message>}
      {error && (
        <Message tone="error">
          {error === "Doppelt"
            ? "Dieser Kategoriename ist bereits vorhanden."
            : "Die Kategorie konnte nicht gespeichert werden. Bitte prüfen Sie die Angaben."}
        </Message>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Kategorie anlegen</h2>
        <form action={createCategoryAction} className="grid gap-4 lg:grid-cols-[1fr_2fr_10rem_auto] lg:items-end">
          <Field label="Name">
            <input className="input" name="name" required maxLength={100} />
          </Field>
          <Field label="Beschreibung (optional)">
            <input className="input" name="description" maxLength={500} />
          </Field>
          <Field label="Sortierreihenfolge">
            <input className="input" name="sortOrder" type="number" min="0" defaultValue="100" required />
          </Field>
          <button className="button-primary" type="submit">Anlegen</button>
        </form>
      </section>

      <div className="space-y-3">
        {categories.map((category) => (
          <form
            action={updateCategoryAction.bind(null, category.id)}
            className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_2fr_9rem_8rem_7rem_auto] lg:items-end"
            key={category.id}
          >
            <Field label="Name">
              <input className="input" name="name" defaultValue={category.name} required maxLength={100} />
            </Field>
            <Field label="Beschreibung">
              <input className="input" name="description" defaultValue={category.description ?? ""} maxLength={500} />
            </Field>
            <Field label="Sortierung">
              <input className="input" name="sortOrder" type="number" min="0" defaultValue={category.sortOrder} required />
            </Field>
            <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700">
              <input name="active" type="checkbox" defaultChecked={category.active} /> Aktiv
            </label>
            <div className="text-sm text-slate-600">
              <span className="block text-xs font-semibold">Aufgaben</span>
              {category._count.standardTasks}
            </div>
            <button className="button-secondary" type="submit">Speichern</button>
          </form>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>;
}

function Message({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div className={`mb-5 rounded-lg border p-4 text-sm ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      {children}
    </div>
  );
}
