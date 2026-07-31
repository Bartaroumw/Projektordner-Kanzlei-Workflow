import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrdoCampus, hasRole } from "@/lib/permissions";
import { formatDate } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function OrdoCampusPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (!hasRole(user, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "MANDANTEN_VERWALTEN")) {
    redirect("/zugriff-verweigert?bereich=Ordo%20Campus");
  }
  const query = await searchParams;
  const search = one(query.suche).trim();
  const status = one(query.status);
  const canEdit = canManageOrdoCampus(user);
  const knowledge = await prisma.standardTaskKnowledge.findMany({
    where: {
      ...(!canEdit ? { status: "Aktiv" } : status ? { status } : {}),
      ...(search ? {
        OR: [
          { standardTask: { taskId: { contains: search } } },
          { standardTask: { title: { contains: search } } },
          { shortDescription: { contains: search } },
          { firmStandard: { contains: search } },
          { links: { some: { OR: [{ title: { contains: search } }, { description: { contains: search } }] } } },
        ],
      } : {}),
    },
    include: {
      standardTask: { include: { category: true, campusAttachments: { where: { status: "Aktiv" }, select: { id: true } } } },
      links: { where: { active: true }, select: { id: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return <div>
    <header className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Wissen im Arbeitsablauf</p>
      <h1 className="mt-2 text-3xl font-bold">Ordo Campus</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">Kanzleistandards und Fachwissen bleiben mit der führenden Standardaufgabe verbunden und stehen in den Checklisten direkt zur Verfügung.</p>
    </header>
    <nav aria-label="Bereiche Ordo Campus" className="mb-6 overflow-x-auto border-b border-[var(--color-border)]"><div className="flex min-w-max gap-1">
      <Link aria-current="page" className="border-b-2 border-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-dark)]" href="/ordo-campus">Wissensübersicht</Link>
      {canEdit && <Link className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]" href="/standardaufgaben?campus=ohne-wissen">Inhalte ohne Wissen</Link>}
      {canEdit && <Link className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]" href="/standardaufgaben?campus=mit-wissen">Inhalte pflegen</Link>}
    </div></nav>
    <form className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_auto] md:items-end">
      <label className="text-xs font-semibold">Suche<input className="input mt-1" name="suche" defaultValue={search} placeholder="Aufgabe, Kurzbeschreibung, Kanzleistandard oder Link"/></label>
      {canEdit
        ? <label className="text-xs font-semibold">Wissensstatus<select className="input mt-1" name="status" defaultValue={status}><option value="">Alle</option><option>Aktiv</option><option>Entwurf</option><option>Archiviert</option></select></label>
        : <input type="hidden" name="status" value="Aktiv"/>}
      <div className="flex gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/ordo-campus">Zurücksetzen</Link></div>
    </form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
      <table className="w-full min-w-[950px] text-left text-sm">
        <thead className="bg-[var(--color-primary-light)]"><tr>{["Aufgabe","Kategorie","Bereich","Status","Links","Anhänge","Geändert","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{knowledge.map((entry)=><tr className="border-t" key={entry.id}>
          <td className="p-3"><strong>{entry.standardTask.taskId}</strong><div>{entry.standardTask.title}</div><p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{entry.shortDescription??"Keine Kurzbeschreibung"}</p></td>
          <td className="p-3">{entry.standardTask.category.name}</td><td className="p-3">{entry.standardTask.checklistType}</td>
          <td className="p-3 font-semibold">{entry.status}</td><td className="p-3">{entry.links.length}</td><td className="p-3">{entry.standardTask.campusAttachments.length}</td><td className="p-3">{formatDate(entry.updatedAt)}</td>
          <td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={canEdit?`/standardaufgaben/${entry.standardTaskId}/campus`:`/standardaufgaben/${entry.standardTaskId}`}>{canEdit?"Wissen pflegen":"Öffnen"}</Link></td>
        </tr>)}{!knowledge.length&&<tr><td className="p-10 text-center text-[var(--color-text-muted)]" colSpan={8}>Für diese Auswahl sind keine sichtbaren Ordo-Campus-Inhalte vorhanden.</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}
