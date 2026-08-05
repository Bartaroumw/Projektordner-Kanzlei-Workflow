import Link from "next/link";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitKnowledgeValues } from "@/lib/knowledge-platform-catalog";

export default async function LearningPathsPage() {
  const user = await requireUser();
  const paths = await prisma.knowledgeLearningPath.findMany({
    where: { status: "Aktiv" },
    include: {
      items: {
        include: { knowledgeContent: { include: { progress: { where: { userId: user.id } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return <div><OrdoCampusHeader active="/ordo-campus/lernpfade" title="Lernpfade" description="Frei zugängliche, sinnvoll geordnete Inhaltslisten für Einarbeitung und Weiterbildung."/><div className="grid gap-5 md:grid-cols-2">{paths.map((path) => { const read = path.items.filter((item) => item.knowledgeContent.progress[0]?.readAt).length; return <Link href={`/ordo-campus/lernpfade/${path.id}`} className="rounded-xl border border-[var(--color-border)] bg-white p-6 hover:border-[var(--color-primary)]" key={path.id}><h2 className="text-xl font-bold">{path.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{path.shortDescription}</p><p className="mt-4 text-sm font-semibold text-[var(--color-primary-dark)]">{read} von {path.items.length} Inhalten als gelesen markiert</p><div className="mt-3 flex flex-wrap gap-1">{splitKnowledgeValues(path.targetAudiences).map((role) => <span className="rounded bg-slate-100 px-2 py-1 text-xs" key={role}>{roleLabel(role)}</span>)}</div></Link>; })}</div></div>;
}
const roleLabel = (role: string) => ({ BEARBEITER: "Bearbeiter", PRUEFER: "Prüfer", KANZLEILEITUNG: "Kanzleileitung", LOHNSACHBEARBEITER: "Lohnsachbearbeiter", ALLE: "Alle internen Benutzer" }[role] ?? role);
