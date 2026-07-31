import Link from "next/link";
import {
  ADMINISTRATION_SECTION_LABELS,
  administrationHref,
  administrationSectionsFor,
  type AdministrationSection,
} from "@/lib/administration-navigation";
import type { AuthUser } from "@/lib/permissions";

export function AdministrationTabs({ user, active }: { user: AuthUser; active: AdministrationSection }) {
  const sections = administrationSectionsFor(user);
  return (
    <nav aria-label="Bereiche der Verwaltung" className="mb-6 overflow-x-auto border-b border-[var(--color-border)]">
      <div className="flex min-w-max gap-1">
        {sections.map((section) => (
          <Link
            aria-current={active === section ? "page" : undefined}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              active === section
                ? "border-[var(--color-primary)] text-[var(--color-primary-dark)]"
                : "border-transparent text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
            }`}
            href={administrationHref(section)}
            key={section}
          >
            {ADMINISTRATION_SECTION_LABELS[section]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
export function AdministrationBreadcrumbs({
  section,
  current,
}: {
  section: AdministrationSection;
  current?: string;
}) {
  return (
    <nav aria-label="Brotkrümelnavigation" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href="/verwaltung">Verwaltung</Link>
      <span aria-hidden>›</span>
      <Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={administrationHref(section)}>
        {ADMINISTRATION_SECTION_LABELS[section]}
      </Link>
      {current && <><span aria-hidden>›</span><span aria-current="page">{current}</span></>}
    </nav>
  );
}
