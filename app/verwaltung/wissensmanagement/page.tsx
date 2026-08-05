import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { KNOWLEDGE_CONTENT_TYPES, KNOWLEDGE_TARGET_AUDIENCES } from "@/lib/knowledge-platform-catalog";
import { normalizedPage, pageBounds, paginationHref } from "@/lib/pagination";
import { canManageOrdoCampus } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const PAGE_SIZE = 100;

export default async function KnowledgeManagementPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  if (!canManageOrdoCampus(user)) redirect("/zugriff-verweigert?bereich=Wissensmanagement");

  const query = await searchParams;
  const status = one(query.status);
  const search = one(query.suche).trim();
  const areaId = Number(one(query.gebiet)) || 0;
  const contentType = one(query.typ);
  const targetAudience = one(query.zielgruppe);
  const links = one(query.verknuepfung);
  const responsible = one(query.verantwortung);
  const review = one(query.pruefung);
  const attachments = one(query.anhaenge);
  const datev = one(query.datev);

  const conditions: Prisma.KnowledgeContentWhereInput[] = [
    status ? { status } : {},
    search ? { OR: [{ title: { contains: search } }, { key: { contains: search } }, { shortDescription: { contains: search } }] } : {},
    areaId ? { areas: { some: { knowledgeAreaId: areaId } } } : {},
    contentType ? { contentTypes: { contains: contentType } } : {},
    targetAudience ? { targetAudiences: { contains: targetAudience } } : {},
    links === "ohne" ? { AND: [{ taskLinks: { none: {} } }, { payrollTopicLinks: { none: {} } }, { learningPathItems: { none: {} } }] } : {},
    responsible === "ohne" ? { responsibleUserId: null } : {},
    review === "faellig" ? { nextReviewDate: { lte: new Date() } } : {},
    attachments === "mit" ? { attachments: { some: { status: "Aktiv" } } } : {},
    datev === "mit" ? { links: { some: { active: true, linkType: { startsWith: "DATEV" } } } } : {},
  ];
  const where: Prisma.KnowledgeContentWhereInput = { AND: conditions };
  const total = await prisma.knowledgeContent.count({ where });
  const page = normalizedPage(query.seite, total, PAGE_SIZE);
  const bounds = pageBounds(page, total, PAGE_SIZE);
  const [contents, areas] = await Promise.all([
    prisma.knowledgeContent.findMany({
      where,
      include: {
        areas: { where: { primaryArea: true }, include: { knowledgeArea: true } },
        responsibleUser: true,
        _count: { select: { taskLinks: true, payrollTopicLinks: true, learningPathItems: true, attachments: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.knowledgeArea.findMany({ where: { status: "Aktiv" }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
  ]);

  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase text-[var(--color-primary)]">Verwaltung · Wissensmanagement</p><h1 className="mt-2 text-3xl font-bold">Wissensinhalte</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">Eigenständige Inhalte und ihre Anwendungsorte zentral pflegen.</p></div>
      <div className="flex flex-wrap gap-2"><Link className="button-secondary" href="/verwaltung?bereich=wissensmanagement">Übersicht</Link><Link className="button-primary" href="/verwaltung/wissensmanagement/wissen/neu">Wissensinhalt anlegen</Link></div>
    </header>
    <form className="rounded-lg border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]"><Field label="Suche"><input className="input" name="suche" defaultValue={search}/></Field><Field label="Status"><select className="input" name="status" defaultValue={status}><option value="">Alle</option><option>Entwurf</option><option>Aktiv</option><option>Archiviert</option></select></Field><button className="button-primary self-end">Anwenden</button></div>
      <details className="mt-4" open={Boolean(areaId || contentType || targetAudience || links || responsible || review || attachments || datev)}><summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)]">Weitere Filter</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Wissensgebiet"><select className="input" name="gebiet" defaultValue={areaId || ""}><option value="">Alle</option>{areas.map((area) => <option value={area.id} key={area.id}>{area.parentId ? "↳ " : ""}{area.title}</option>)}</select></Field>
        <Field label="Inhaltstyp"><select className="input" name="typ" defaultValue={contentType}><option value="">Alle</option>{KNOWLEDGE_CONTENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Zielgruppe"><select className="input" name="zielgruppe" defaultValue={targetAudience}><option value="">Alle</option>{KNOWLEDGE_TARGET_AUDIENCES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Verknüpfungen"><select className="input" name="verknuepfung" defaultValue={links}><option value="">Alle</option><option value="ohne">Ohne Verknüpfung</option></select></Field>
        <Field label="Verantwortung"><select className="input" name="verantwortung" defaultValue={responsible}><option value="">Alle</option><option value="ohne">Ohne Verantwortlichen</option></select></Field>
        <Field label="Prüfdatum"><select className="input" name="pruefung" defaultValue={review}><option value="">Alle</option><option value="faellig">Prüfung fällig</option></select></Field>
        <Field label="Anhänge"><select className="input" name="anhaenge" defaultValue={attachments}><option value="">Alle</option><option value="mit">Mit aktivem Anhang</option></select></Field>
        <Field label="DATEV-Link"><select className="input" name="datev" defaultValue={datev}><option value="">Alle</option><option value="mit">Mit aktivem DATEV-Link</option></select></Field>
      </div><div className="mt-3"><Link className="button-secondary" href="/verwaltung/wissensmanagement">Filter zurücksetzen</Link></div></details>
    </form>
    <div className="mt-5 overflow-x-auto rounded-lg border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Titel", "Status", "Primäres Gebiet", "Typen / Zielgruppen", "Verantwortlich", "Verknüpfungen", "Lernpfade", "Nächste Prüfung", "Aktion"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{contents.map((content) => <tr className="border-t" key={content.id}><td className="p-3"><strong>{content.title}</strong><span className="block text-xs text-[var(--color-text-muted)]">{content.key} · geändert {formatDate(content.updatedAt)}</span></td><td className="p-3 font-semibold">{content.status}</td><td className="p-3">{content.areas[0]?.knowledgeArea.title ?? "–"}</td><td className="p-3 text-xs">{content.contentTypes}<br/>{content.targetAudiences}</td><td className="p-3">{content.responsibleUser?.fullName ?? "–"}</td><td className="p-3">{content._count.taskLinks} Aufgaben · {content._count.payrollTopicLinks} Themen</td><td className="p-3">{content._count.learningPathItems}</td><td className="p-3">{content.nextReviewDate ? formatDate(content.nextReviewDate) : "–"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/verwaltung/wissensmanagement/wissen/${content.id}`}>Bearbeiten</Link></td></tr>)}</tbody></table></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p>{total ? `${bounds.from}–${bounds.to} von ${total} Inhalten` : "Keine Inhalte gefunden"}</p><div className="flex gap-2">{page > 1 && <Link className="button-secondary" href={paginationHref("/verwaltung/wissensmanagement", query, page - 1)}>Zurück</Link>}<span className="self-center">Seite {page} von {bounds.pages}</span>{page < bounds.pages && <Link className="button-secondary" href={paginationHref("/verwaltung/wissensmanagement", query, page + 1)}>Weiter</Link>}</div></div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-semibold">{label}{children}</label>;
}
