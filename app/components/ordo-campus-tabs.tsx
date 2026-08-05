import Link from "next/link";

const tabs = [
  ["Start", "/ordo-campus"],
  ["Wissensgebiete", "/ordo-campus/wissensgebiete"],
  ["Lernpfade", "/ordo-campus/lernpfade"],
  ["Kanzleistandards", "/ordo-campus/kanzleistandards"],
  ["Neu und aktualisiert", "/ordo-campus/neu"],
  ["Zuletzt angesehen", "/ordo-campus/zuletzt"],
  ["Suche", "/ordo-campus/suche"],
] as const;

export function OrdoCampusTabs({ active }: { active: string }) {
  return <nav aria-label="Bereiche Ordo Campus" className="mb-7 overflow-x-auto border-b border-[var(--color-border)]"><div className="flex min-w-max gap-1">
    {tabs.map(([label, href]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active === href ? "border-[var(--color-primary)] text-[var(--color-primary-dark)]" : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}>{label}</Link>)}
  </div></nav>;
}

export function OrdoCampusHeader({ active, title = "Ordo Campus", description = "Wissen, Kanzleistandards und Weiterbildung" }: { active: string; title?: string; description?: string }) {
  return <><header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Ordo Campus</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{description}</p></header><OrdoCampusTabs active={active}/></>;
}
