import Link from "next/link";
import { AccountingModuleTabs } from "@/app/components/module-tabs";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { requireRole } from "@/lib/auth";
import { buildClientAccountingStatus, monthShort } from "@/lib/accounting-status-service";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function AccountingStatusPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireRole("MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "MANDANTEN_VERWALTEN");
  const query = await searchParams;
  const now = berlinNow();
  const year = Number(one(query.jahr)) || now.year;
  const search = one(query.suche).trim().toLocaleLowerCase("de-DE");
  const processor = one(query.bearbeiter);
  const reviewer = one(query.pruefer);
  const management = one(query.kanzleileitung);
  const legalForm = one(query.rechtsform);
  const profit = one(query.gewinn);
  const onlyBehind = one(query.rueckstand) === "1";
  const onlyGaps = one(query.luecken) === "1";
  const onlyIssues = one(query.pruefpunkte) === "1";
  const onlyQuarterlyVat = one(query.ustQuartal) === "1";
  const sort = one(query.sortierung) || "luecke";
  const clients = await prisma.client.findMany({
    where: {
      active: true,
      ...(!hasRole(user, "KANZLEILEITUNG")
        ? { OR: [{ processorUserId: user.id }, { reviewerUserId: user.id }, { managementUserId: user.id }] }
        : {}),
    },
    include: {
      annualProfiles: { where: { calendarYear: year }, take: 1 },
      periods: {
        where: { calendarYear: year, checklistType: "Monat" },
        include: {
          tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true, processingNote: true, reviewIssueStatus: true } },
          payrollReconciliation: { select: { questions: { select: { status: true } } } },
        },
      },
    },
    orderBy: { clientNumber: "asc" },
  });
  const referenceMonth = year < now.year ? 12 : year > now.year ? 1 : now.month;
  const mapped = clients.map((client) => ({
    client,
    profile: client.annualProfiles[0] ?? null,
    status: buildClientAccountingStatus(client.periods, referenceMonth),
  })).filter(({ client, profile, status }) =>
    (!search || `${client.clientNumber} ${client.name}`.toLocaleLowerCase("de-DE").includes(search)) &&
    (!processor || client.processor === processor) &&
    (!reviewer || client.reviewer === reviewer) &&
    (!management || client.managementName === management) &&
    (!legalForm || profile?.legalFormGroup === legalForm) &&
    (!profit || profile?.profitDeterminationMethod === profit) &&
    (!onlyQuarterlyVat || client.vatFilingPeriod === "Vierteljährlich") &&
    (!onlyBehind || status.oldOpenCount > 0) &&
    (!onlyGaps || status.firstGapMonth !== null) &&
    (!onlyIssues || status.openReviewPoints > 0)
  ).sort((a, b) => {
    if (sort === "mandant") return a.client.clientNumber.localeCompare(b.client.clientNumber, "de");
    if (sort === "rueckstand") return b.status.oldOpenCount - a.status.oldOpenCount || a.client.clientNumber.localeCompare(b.client.clientNumber, "de");
    return (a.status.firstGapMonth ?? 13) - (b.status.firstGapMonth ?? 13) || a.client.clientNumber.localeCompare(b.client.clientNumber, "de");
  });
  const options = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "de"));
  return <div>
    <AccountingModuleTabs active="status"/>
    <header className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Rechnungswesen</p>
      <h1 className="mt-2 text-3xl font-bold">Statusübersicht</h1>
      <p className="mt-2 max-w-4xl text-sm text-[var(--color-text-muted)]">Lückenlose Bearbeitung und Prüfung je Mandant. Eine spätere abgeschlossene Checkliste verdeckt eine frühere Lücke nicht.</p>
    </header>
    <form className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
      <Field label="Kalenderjahr"><input className="input" name="jahr" type="number" defaultValue={year}/></Field>
      <Field label="Mandant"><input className="input" name="suche" defaultValue={one(query.suche)} placeholder="Nummer oder Name"/></Field>
      <Select label="Bearbeiter" name="bearbeiter" value={processor} options={options(clients.map((client) => client.processor))}/>
      <Select label="Prüfer" name="pruefer" value={reviewer} options={options(clients.map((client) => client.reviewer))}/>
      <Select label="Kanzleileitung" name="kanzleileitung" value={management} options={options(clients.map((client) => client.managementName))}/>
      <Select label="Rechtsform" name="rechtsform" value={legalForm} options={options(clients.flatMap((client) => client.annualProfiles.map((profile) => profile.legalFormGroup)))}/>
      <Select label="Gewinnermittlung" name="gewinn" value={profit} options={options(clients.flatMap((client) => client.annualProfiles.map((profile) => profile.profitDeterminationMethod)))}/>
      <Field label="Sortierung"><select className="input" name="sortierung" defaultValue={sort}><option value="luecke">Erste Lücke</option><option value="rueckstand">Rückstände</option><option value="mandant">Mandantennummer</option></select></Field>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="rueckstand" value="1" defaultChecked={onlyBehind}/> Nur mit Rückstand</label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="luecken" value="1" defaultChecked={onlyGaps}/> Nur mit Lücken</label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pruefpunkte" value="1" defaultChecked={onlyIssues}/> Nur mit Prüfpunkten</label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="ustQuartal" value="1" defaultChecked={onlyQuarterlyVat}/> USt-Voranmeldung vierteljährlich</label>
      <div className="flex items-end gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/rechnungswesen/status">Zurücksetzen</Link></div>
    </form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
      <table className="w-full min-w-[1500px] text-left text-sm">
        <thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Bearbeitung lückenlos bis","Prüfung lückenlos bis","Gesamt abgeschlossen bis","Erste Lücke","Aktuelle Checkliste","Status","Fortschritt","Alte offene","Prüfpunkte","Lohnrückfragen","Monatsmatrix"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{mapped.map(({ client, status }) => {
          const href = status.active ? `/monatschecklisten/${status.active.id}` : `/mandanten/${client.id}`;
          return <ClickableTableRow href={href} className="border-t align-top" key={client.id}>
            <td className="p-3"><Link href={href} className="font-semibold text-[var(--color-primary-dark)]">{client.clientNumber} · {client.name}</Link><div className="mt-1 text-xs text-[var(--color-text-muted)]">{client.processor ?? "–"} · {client.reviewer ?? "–"} · {client.managementName ?? "–"}</div></td>
            <td className="p-3">{throughLabel(status.processingThrough, year)}</td>
            <td className="p-3">{throughLabel(status.reviewThrough, year)}</td>
            <td className="p-3">{throughLabel(status.overallThrough, year)}</td>
            <td className="p-3 font-semibold">{status.firstGapMonth ? `${monthShort(status.firstGapMonth)} ${year}` : "Keine"}</td>
            <td className="p-3">{status.active?.periodLabel ?? "Keine aktive"}</td>
            <td className="p-3">{status.active?.processingStatus ?? "–"}</td>
            <td className="p-3">{status.activeProgress ? `${status.activeProgress.completed}/${status.activeProgress.total} · ${status.activeProgress.percent} %` : "–"}</td>
            <td className="p-3">{status.oldOpenCount}</td><td className="p-3">{status.openReviewPoints}</td><td className="p-3">{status.openPayrollQuestions}</td>
            <td className="p-3"><div className="grid grid-cols-12 gap-1" aria-label="Monatsstatus Januar bis Dezember">{status.monthCodes.map((code, index) => <span title={`${monthShort(index + 1)}: ${codeLabel(code)}`} className="rounded border border-[var(--color-border)] px-1 py-1 text-center text-xs font-bold" key={index}>{code}</span>)}</div><p className="mt-2 text-[10px] text-[var(--color-text-muted)]">A abgeschlossen · P Prüfung · B Bearbeitung · N Nachbearbeitung · O offen · – fehlt</p></td>
          </ClickableTableRow>;
        })}{!mapped.length && <tr><td colSpan={12} className="p-10 text-center text-[var(--color-text-muted)]">Für diese Auswahl wurden keine Mandanten gefunden.</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}

function berlinNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "numeric", timeZone: "Europe/Berlin" }).formatToParts(new Date());
  return { year: Number(parts.find((part) => part.type === "year")?.value), month: Number(parts.find((part) => part.type === "month")?.value) };
}
function throughLabel(month: number, year: number) { return month ? `${monthShort(month)} ${year}` : "Noch nicht lückenlos"; }
function codeLabel(code: string) { return ({ A: "Abgeschlossen", P: "In Prüfung", B: "In Bearbeitung", N: "Nachbearbeitung", O: "Offen", "–": "Keine Checkliste" } as Record<string, string>)[code] ?? code; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>; }
function Select({ label, name, value, options }: { label: string; name: string; value: string; options: string[] }) { return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Alle</option>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>; }
