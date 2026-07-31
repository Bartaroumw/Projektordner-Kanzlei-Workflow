import Link from "next/link";

export function ModuleCard({
  title,
  description,
  href,
  count,
  action = "Öffnen",
  disabledNote,
}: {
  title: string;
  description: string;
  href?: string;
  count?: number;
  action?: string;
  disabledNote?: string;
}) {
  return (
    <article className="flex min-h-44 flex-col rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-primary-dark)]">{title}</h2>
        {typeof count === "number" && <span className="rounded-full bg-[var(--color-primary-light)] px-2.5 py-1 text-xs font-bold">{count}</span>}
      </div>
      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
      {href
        ? <Link className="button-secondary mt-4 self-start" href={href}>{action}</Link>
        : disabledNote && <p className="mt-4 text-xs font-semibold text-[var(--color-text-muted)]">{disabledNote}</p>}
    </article>
  );
}
