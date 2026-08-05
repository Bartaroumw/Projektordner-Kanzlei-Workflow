import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { OrdoCampusHeader } from "@/app/components/ordo-campus-tabs";
import { KnowledgeCard } from "@/app/components/knowledge-card";
import { requireUser } from "@/lib/auth";
import { canManageOrdoCampus, canReadCampusReviewerGuidance } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { KNOWLEDGE_CONTENT_TYPES, KNOWLEDGE_NEW_DAYS, KNOWLEDGE_TARGET_AUDIENCES, knowledgeNewSince } from "@/lib/knowledge-platform-catalog";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
export default async function KnowledgeSearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(); const query = await searchParams; const q = one(query.q).trim(); const area = Number(one(query.gebiet)) || 0; const type = one(query.typ); const audience = one(query.zielgruppe); const read = one(query.gelesen); const datev = one(query.datev) === "1"; const aid = one(query.arbeitshilfe) === "1"; const fresh = one(query.neu) === "1"; const status = canManageOrdoCampus(user) ? one(query.status) : "Aktiv";
  const textOr: Prisma.KnowledgeContentWhereInput[] = q ? [
    { title: { contains: q } }, { shortDescription: { contains: q } }, { objective: { contains: q } }, { mainContent: { contains: q } }, { workingGuidance: { contains: q } }, { firmStandard: { contains: q } }, { typicalErrors: { contains: q } }, { internalHints: { contains: q } },
    ...(canReadCampusReviewerGuidance(user) ? [{ reviewerGuidance: { contains: q } } satisfies Prisma.KnowledgeContentWhereInput] : []),
    { areas: { some: { knowledgeArea: { OR: [{ title: { contains: q } }, { shortDescription: { contains: q } }] } } } },
    { tags: { some: { knowledgeTag: { title: { contains: q } } } } },
    { links: { some: { OR: [{ title: { contains: q } }, { description: { contains: q } }] } } },
    { attachments: { some: { displayName: { contains: q } } } },
    { taskLinks: { some: { standardTask: { title: { contains: q } } } } },
    { payrollTopicLinks: { some: { payrollReconciliationTopic: { title: { contains: q } } } } },
  ] : [];
  const since = knowledgeNewSince();
  const conditions: Prisma.KnowledgeContentWhereInput[] = [
    status ? { status } : {}, q ? { OR: textOr } : {}, area ? { areas: { some: { knowledgeAreaId: area } } } : {}, type ? { contentTypes: { contains: type } } : {}, audience ? { targetAudiences: { contains: audience } } : {}, datev ? { links: { some: { active: true, linkType: { startsWith: "DATEV" } } } } : {}, aid ? { OR: [{ contentTypes: { contains: "Arbeitshilfe" } }, { attachments: { some: { status: "Aktiv" } } }] } : {}, fresh ? { OR: [{ publishedAt: { gte: since } }, { majorUpdatedAt: { gte: since } }] } : {}, read === "ja" ? { progress: { some: { userId: user.id, readAt: { not: null } } } } : read === "nein" ? { progress: { none: { userId: user.id, readAt: { not: null } } } } : {},
  ];
  const contents = await prisma.knowledgeContent.findMany({ where: { AND: conditions }, include: { areas: { include: { knowledgeArea: true } }, progress: { where: { userId: user.id } } }, orderBy: [{ title: "asc" }], take: 500 });
  const areas = await prisma.knowledgeArea.findMany({ where: { status: "Aktiv" }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return <div><OrdoCampusHeader active="/ordo-campus/suche" title="Wissen durchsuchen" description="Volltextsuche über eigenständige Wissensinhalte und ihre Anwendungsorte."/><form className="rounded-xl border border-[var(--color-border)] bg-white p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Field label="Suchbegriff"><input className="input" name="q" defaultValue={q}/></Field><Field label="Wissensgebiet"><select className="input" name="gebiet" defaultValue={area || ""}><option value="">Alle</option>{areas.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field><Field label="Inhaltstyp"><select className="input" name="typ" defaultValue={type}><option value="">Alle</option>{KNOWLEDGE_CONTENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Zielgruppe"><select className="input" name="zielgruppe" defaultValue={audience}><option value="">Alle</option>{KNOWLEDGE_TARGET_AUDIENCES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Lesemarkierung"><select className="input" name="gelesen" defaultValue={read}><option value="">Alle</option><option value="ja">Gelesen</option><option value="nein">Ungelesen</option></select></Field>{canManageOrdoCampus(user) && <Field label="Status"><select className="input" name="status" defaultValue={status}><option value="">Alle</option><option>Aktiv</option><option>Entwurf</option><option>Archiviert</option></select></Field>}</div><div className="mt-4 flex flex-wrap gap-4 text-sm"><Check name="datev" label="Mit DATEV-Link" checked={datev}/><Check name="arbeitshilfe" label="Mit Arbeitshilfe" checked={aid}/><Check name="neu" label={`Neu/aktualisiert (${KNOWLEDGE_NEW_DAYS} Tage)`} checked={fresh}/></div><div className="mt-5 flex gap-2"><button className="button-primary">Suchen</button><Link className="button-secondary" href="/ordo-campus/suche">Zurücksetzen</Link></div></form><p className="my-5 text-sm font-semibold">{contents.length} Treffer</p><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contents.map((content) => <KnowledgeCard content={content} key={content.id}/>)}</div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-semibold">{label}{children}</label>; }
function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-2"><input type="checkbox" name={name} value="1" defaultChecked={checked}/>{label}</label>; }
