import Link from "next/link";
import type { AuthUser } from "@/lib/permissions";

export function AccountingModuleTabs({ active }: { active: "laufend" | "abschluss" | "status" }) {
  const entries = [
    ["laufend", "Laufendes Rechnungswesen", "/monatschecklisten"],
    ["abschluss", "Jahresabschluss", "/jahresabschluesse"],
    ["status", "Statusübersicht", "/rechnungswesen/status"],
  ] as const;
  return (
    <nav aria-label="Bereiche Rechnungswesen" className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
      {entries.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={active === key ? "button-primary" : "button-secondary"}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function PayrollModuleTabs({ active, user }: { active: "abstimmungen" | "rueckfragen" | "fahrzeuge"; user: AuthUser }) {
  const payrollOnly = user.roles.includes("LOHNSACHBEARBEITER") &&
    !user.roles.some((role) => ["MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "MANDANTEN_VERWALTEN"].includes(role));
  const entries = [
    ["abstimmungen", payrollOnly ? "Meine Abstimmungen" : "Abstimmungen", "/fibu-lohn"],
    ["rueckfragen", "Offene Lohnrückfragen", "/fibu-lohn?rueckfragen=1#rueckfragen"],
    ["fahrzeuge", "Fahrzeuge", "/fibu-lohn/fahrzeuge"],
  ] as const;
  return (
    <nav aria-label="Bereiche FiBu und Lohn" className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
      {entries.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={active === key ? "button-primary" : "button-secondary"}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
