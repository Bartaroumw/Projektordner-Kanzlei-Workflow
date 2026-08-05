import Link from "next/link";
import { formatDate } from "@/lib/format";
import { splitKnowledgeValues } from "@/lib/knowledge-platform-catalog";

export type KnowledgeCardData = {
  id: number;
  title: string;
  shortDescription: string | null;
  contentTypes: string;
  publishedAt: Date | null;
  majorUpdatedAt: Date | null;
  areas?: { primaryArea: boolean; knowledgeArea: { title: string } }[];
  progress?: { readAt: Date | null }[];
};

export function KnowledgeCard({ content }: { content: KnowledgeCardData }) {
  const primary = content.areas?.find((area) => area.primaryArea)?.knowledgeArea.title ?? content.areas?.[0]?.knowledgeArea.title;
  return <article className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-[var(--color-primary-light)] px-2 py-1 font-semibold text-[var(--color-primary-dark)]">{primary ?? "Wissen"}</span>{content.progress?.[0]?.readAt && <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">Gelesen</span>}</div>
    <h3 className="mt-3 text-lg font-bold"><Link className="hover:text-[var(--color-primary-dark)] hover:underline" href={`/ordo-campus/wissen/${content.id}`}>{content.title}</Link></h3>
    <p className="mt-2 flex-1 text-sm leading-6 text-[var(--color-text-muted)]">{content.shortDescription ?? "Keine Kurzbeschreibung hinterlegt."}</p>
    <div className="mt-4 flex flex-wrap gap-1">{splitKnowledgeValues(content.contentTypes).map((type) => <span className="rounded bg-slate-100 px-2 py-1 text-xs" key={type}>{type}</span>)}</div>
    {(content.majorUpdatedAt || content.publishedAt) && <p className="mt-4 text-xs text-[var(--color-text-muted)]">Stand {formatDate(content.majorUpdatedAt ?? content.publishedAt!)}</p>}
  </article>;
}
