export const OPERATIONAL_PAGE_SIZE = 100;

export function normalizedPage(value: string | string[] | undefined, total: number, pageSize = OPERATIONAL_PAGE_SIZE) {
  const raw = Array.isArray(value) ? value[0] : value;
  const requested = Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  return Math.min(requested, Math.max(1, Math.ceil(total / pageSize)));
}

export function pageBounds(page: number, total: number, pageSize = OPERATIONAL_PAGE_SIZE) {
  if (total === 0) return { from: 0, to: 0, pages: 1 };
  return {
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    pages: Math.ceil(total / pageSize),
  };
}

export function pageSlice<T>(items: T[], page: number, pageSize = OPERATIONAL_PAGE_SIZE) {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

export function paginationHref(
  basePath: string,
  params: Record<string, string | string[] | undefined>,
  targetPage: number,
  pageParam = "seite",
) {
  const hashIndex = basePath.indexOf("#");
  const path = hashIndex === -1 ? basePath : basePath.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : basePath.slice(hashIndex);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === pageParam || value === undefined) continue;
    const actual = Array.isArray(value) ? value[0] ?? "" : value;
    if (actual) query.set(key, actual);
  }
  if (targetPage > 1) query.set(pageParam, String(targetPage));
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}${hash}` : `${path}${hash}`;
}
