import Link from "next/link";
import { OPERATIONAL_PAGE_SIZE, pageBounds, paginationHref } from "@/lib/pagination";

export function ServerPagination({
  basePath,
  params,
  page,
  total,
  pageSize = OPERATIONAL_PAGE_SIZE,
  itemLabel = "Vorgängen",
  pageParam = "seite",
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  total: number;
  pageSize?: number;
  itemLabel?: string;
  pageParam?: string;
}) {
  const { from, to, pages } = pageBounds(page, total, pageSize);
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
    <p className="font-semibold text-[var(--color-text-muted)]">Angezeigt: {from}–{to} von {total} {itemLabel}</p>
    {pages > 1 && <nav aria-label="Seitennavigation" className="flex flex-wrap items-center gap-2">
      {page > 1 && <Link className="button-secondary" href={paginationHref(basePath, params, page - 1, pageParam)}>← Vorherige Seite</Link>}
      <span className="px-2 font-semibold">Seite {page} von {pages}</span>
      {page < pages && <Link className="button-secondary" href={paginationHref(basePath, params, page + 1, pageParam)}>Nächste Seite →</Link>}
    </nav>}
  </div>;
}
