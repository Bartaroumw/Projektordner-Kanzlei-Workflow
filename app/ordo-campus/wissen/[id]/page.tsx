import Link from "next/link";
import { notFound } from "next/navigation";
import { KnowledgeRichText } from "@/app/components/knowledge-rich-text";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeProgressControls } from "./knowledge-progress-controls";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus, canReadCampusReviewerGuidance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { splitKnowledgeValues } from "@/lib/knowledge-platform-catalog";

export default async function KnowledgeContentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const id = Number((await params).id);
  const content = await prisma.knowledgeContent.findUnique({ where: { id }, include: {
    areas: { include: { knowledgeArea: true }, orderBy: [{ primaryArea: "desc" }, { sortOrder: "asc" }] },
    links: { where: canManageOrdoCampus(user) ? {} : { active: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] },
    attachments: { where: canManageOrdoCampus(user) ? {} : { status: "Aktiv" }, orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }] },
    taskLinks: { include: { standardTask: true }, orderBy: [{ mainContent: "desc" }, { sortOrder: "asc" }] },
    payrollTopicLinks: { include: { payrollReconciliationTopic: true }, orderBy: [{ mainContent: "desc" }, { sortOrder: "asc" }] },
    learningPathItems: { include: { learningPath: true }, orderBy: { sortOrder: "asc" } },
    responsibleUser: { select: { fullName: true } }, progress: { where: { userId: user.id } }, tags: { include: { knowledgeTag: true } },
  } });
  if (!content || (content.status !== "Aktiv" && !canManageOrdoCampus(user))) notFound();
  const primary = content.areas.find((area) => area.primaryArea)?.knowledgeArea;
  return <div><OrdoCampusHeader active="" title={content.title} description={content.shortDescription ?? "Eigenständiger Wissensinhalt"}/>
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_19rem]"><main className="space-y-7">
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-6"><div className="flex flex-wrap gap-2">{content.areas.map((area) => <Link key={area.id} href={`/ordo-campus/wissensgebiete/${area.knowledgeAreaId}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${area.primaryArea ? "bg-[var(--color-primary)] text-white" : "bg-slate-100"}`}>{area.knowledgeArea.title}</Link>)}</div><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><Meta label="Inhaltstypen" value={splitKnowledgeValues(content.contentTypes).join(" · ")}/><Meta label="Zielgruppen" value={splitKnowledgeValues(content.targetAudiences).map(roleLabel).join(" · ")}/><Meta label="Veröffentlicht/aktualisiert" value={formatDate(content.majorUpdatedAt ?? content.publishedAt ?? content.updatedAt)}/><Meta label="Verantwortlich" value={content.responsibleUser?.fullName ?? "Nicht zugeordnet"}/></dl></section>
      <TextSection title="Kurz erklärt" value={[content.shortDescription, content.objective].filter(Boolean).join("\n\n")}/>
      {content.firmStandard && <section className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] p-6"><h2 className="text-xl font-bold text-[var(--color-primary-dark)]">Verbindlicher Kanzleistandard</h2><div className="mt-4"><KnowledgeRichText value={content.firmStandard}/></div></section>}
      <TextSection title="Fachwissen" value={content.mainContent}/><TextSection title="Arbeitsanleitung" value={content.workingGuidance}/><TextSection title="Typische Fehler" value={content.typicalErrors}/>
      {canReadCampusReviewerGuidance(user) && <TextSection title="Hinweise für Prüfer" value={content.reviewerGuidance}/>}<TextSection title="Interne Hinweise" value={content.internalHints}/>
      {content.links.length > 0 && <section><h2 className="text-xl font-bold">Links</h2><ul className="mt-3 space-y-2">{content.links.map((link) => <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)]"><strong className="text-[var(--color-primary-dark)]">{link.title} ↗</strong><span className="ml-2 text-xs">{link.linkType}</span>{link.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{link.description}</p>}</a></li>)}</ul></section>}
      {content.attachments.length > 0 && <section><h2 className="text-xl font-bold">Interne Unterlagen</h2><ul className="mt-3 space-y-2">{content.attachments.map((attachment) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4" key={attachment.id}><div><strong>{attachment.displayName}</strong><p className="text-xs text-[var(--color-text-muted)]">{attachment.fileExtension.toUpperCase()} · {formatFileSize(attachment.fileSizeBytes)}</p>{attachment.description && <p className="mt-1 text-sm">{attachment.description}</p>}</div><a className="button-secondary" href={`/api/ordo-campus/attachments/${attachment.id}/download?contentId=${content.id}`}>Herunterladen</a></li>)}</ul></section>}
      <UsedIn content={content}/>
    </main><aside className="space-y-4"><KnowledgeProgressControls contentId={content.id} readAt={content.progress[0]?.readAt?.toISOString() ?? null}/>{content.tags.length > 0 && <div className="rounded-lg border bg-white p-4"><h2 className="font-bold">Schlagwörter</h2><div className="mt-3 flex flex-wrap gap-1">{content.tags.map((tag) => <span className="rounded bg-slate-100 px-2 py-1 text-xs" key={tag.id}>{tag.knowledgeTag.title}</span>)}</div></div>}{canManageOrdoCampus(user) && <Link className="button-primary inline-flex w-full justify-center" href={`/verwaltung/wissensmanagement/wissen/${content.id}`}>In Verwaltung bearbeiten</Link>}<Link className="button-secondary inline-flex w-full justify-center" href={primary ? `/ordo-campus/wissensgebiete/${primary.id}` : "/ordo-campus"}>Zurück zum Campus</Link></aside></div>
  </div>;
}

function TextSection({ title, value }: { title: string; value: string | null }) { if (!value) return null; return <section><h2 className="text-xl font-bold">{title}</h2><div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-6"><KnowledgeRichText value={value}/></div></section>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`; }
function roleLabel(role: string) { return ({ BEARBEITER: "Bearbeiter", PRUEFER: "Prüfer", KANZLEILEITUNG: "Kanzleileitung", LOHNSACHBEARBEITER: "Lohnsachbearbeiter", ALLE: "Alle internen Benutzer" }[role] ?? role); }
function UsedIn({ content }: { content: Awaited<ReturnType<typeof prisma.knowledgeContent.findUniqueOrThrow>> & { taskLinks: { id: number; linkType: string; standardTask: { id: number; taskId: string; title: string; checklistType: string } }[]; payrollTopicLinks: { id: number; linkType: string; payrollReconciliationTopic: { id: number; title: string } }[]; learningPathItems: { id: number; learningPath: { id: number; title: string; status: string } }[] } }) {
  const has = content.taskLinks.length || content.payrollTopicLinks.length || content.learningPathItems.length; if (!has) return null;
  return <section><h2 className="text-xl font-bold">Verwendet in</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{content.taskLinks.map((link) => <Link className="rounded-lg border bg-white p-4 hover:border-[var(--color-primary)]" href={`/standardaufgaben/${link.standardTask.id}`} key={`t-${link.id}`}><span className="text-xs font-semibold">{link.standardTask.checklistType} · {link.linkType}</span><strong className="mt-1 block">{link.standardTask.title}</strong></Link>)}{content.payrollTopicLinks.map((link) => <Link className="rounded-lg border bg-white p-4 hover:border-[var(--color-primary)]" href={`/fibu-lohn/themen/${link.payrollReconciliationTopic.id}`} key={`p-${link.id}`}><span className="text-xs font-semibold">Rechnungswesen ↔ Lohn · {link.linkType}</span><strong className="mt-1 block">{link.payrollReconciliationTopic.title}</strong></Link>)}{content.learningPathItems.filter((item) => item.learningPath.status === "Aktiv").map((item) => <Link className="rounded-lg border bg-white p-4 hover:border-[var(--color-primary)]" href={`/ordo-campus/lernpfade/${item.learningPath.id}`} key={`l-${item.id}`}><span className="text-xs font-semibold">Lernpfad</span><strong className="mt-1 block">{item.learningPath.title}</strong></Link>)}</div></section>;
}
