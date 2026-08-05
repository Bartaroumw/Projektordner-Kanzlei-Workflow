import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, textOrDash } from "@/lib/format";
import { calculateProgress, nextMonth, workflowSummary } from "@/lib/monthly-checklist-service";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { ToastMessage } from "@/app/components/toast-message";
import { requireUser } from "@/lib/auth";
import { canViewClient } from "@/lib/permissions";
import { annualProgress } from "@/lib/annual-checklist-service";
import { buildClientAccountingStatus, monthShort } from "@/lib/accounting-status-service";
import { canManageClients, canManageCustomTasks, hasRole } from "@/lib/permissions";

const messages: Record<string, string> = {
  angelegt: "Der Mandant wurde erfolgreich angelegt.",
  gespeichert: "Die Stammdaten wurden erfolgreich gespeichert.",
  "jahresprofil-angelegt": "Das Jahresprofil wurde erfolgreich angelegt.",
  "jahresprofil-gespeichert": "Das Jahresprofil wurde erfolgreich gespeichert.",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erfolg?: string }>;
}) {
  const user=await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      annualProfiles: { orderBy: { calendarYear: "desc" } },
      periods: {
        where: { checklistType: "Monat" },
        include: {
          tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true, processingNote: true, reviewIssueStatus: true } },
          payrollReconciliation: { select: { id: true, questions: { select: { status: true } } } },
        },
        orderBy: [{ calendarYear: "desc" }, { month: "desc" }],
      },
      annualChecklists: {
        include: { tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true } } },
        orderBy: { fiscalYear: "desc" },
      },
      payrollUser:{select:{fullName:true,active:true}},
      vehicles:{orderBy:[{status:"asc"},{description:"asc"}]},
      payrollReconciliations:{include:{questions:{select:{status:true}}},orderBy:[{accountingYear:"desc"},{accountingMonth:"desc"}]},
    },
  });
  if (!client) notFound();
  if(!canViewClient(user,client))redirect("/zugriff-verweigert?bereich=Mandant");
  const success = messages[(await searchParams).erfolg ?? ""];
  const latest = client.periods[0];
  const activeChecklist=client.periods.find(period=>period.processingStatus!=="Abgeschlossen");
  const next = latest ? nextMonth(latest.calendarYear, latest.month) : null;
  const actionLabel = next ? `Checkliste für ${new Intl.DateTimeFormat("de-DE",{month:"long"}).format(new Date(2026,next.month-1,1))} ${next.year} anlegen` : "Erste Monatscheckliste anlegen";
  const actionHref = next ? `/monatschecklisten/neu?clientId=${client.id}&year=${next.year}&month=${next.month}` : `/monatschecklisten/neu?clientId=${client.id}`;
  const latestProfile=client.annualProfiles[0];
  const statusYear=latest?.calendarYear??new Date().getFullYear();
  const status=buildClientAccountingStatus(client.periods.filter(period=>period.calendarYear===statusYear));
  const latestAnnual=client.annualChecklists[0];
  const latestPayroll=client.payrollReconciliations[0];
  const openPayrollQuestions=client.payrollReconciliations.reduce((count,reconciliation)=>count+reconciliation.questions.filter(question=>!question.status.startsWith("Erledigt")).length,0);
  const oldOpenPayroll=client.payrollReconciliations.filter(reconciliation=>reconciliation.id!==latestPayroll?.id&&reconciliation.accountingStatus!=="Vollständig übergeben").length;
  const professional=hasRole(user,"MITARBEITER","PRUEFER","KANZLEILEITUNG");
  const tabs=[
    {label:"Mandant",href:"#uebersicht",visible:true},
    {label:"Laufendes Rechnungswesen",href:"#rechnungswesen",visible:professional},
    {label:"Jahresabschluss",href:"#jahresabschluss",visible:professional},
    {label:"FiBu ↔ Lohn",href:"#fibu-lohn",visible:professional&&client.payrollPreparedByFirm},
    {label:"Fahrzeuge",href:"#fahrzeuge",visible:professional&&client.payrollPreparedByFirm},
    {label:"Mandantenspezifische Aufgaben",href:`/mandanten/${client.id}/zusatzaufgaben`,visible:canManageCustomTasks(user)},
    {label:"Historie",href:"#historie",visible:professional},
  ].filter(tab=>tab.visible);

  return (
    <div>
      <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/mandanten">← Mandanten</Link></div>
      <ToastMessage message={success} />
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-700">Mandantenarbeitsbereich</p>
          <h1 className="text-3xl font-bold tracking-tight">{client.clientNumber} · {client.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">{canManageCustomTasks(user)&&<Link className="button-secondary" href={`/mandanten/${client.id}/zusatzaufgaben`}>Mandantenspezifische Aufgaben</Link>}{canManageClients(user)&&<Link className="button-primary" href={`/mandanten/${client.id}/bearbeiten`}>Mandant bearbeiten</Link>}</div>
      </header>

      <nav aria-label="Mandantenarbeitsbereich" className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white p-1 shadow-sm">{tabs.map(tab=><Link key={tab.label} href={tab.href} className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-light)]">{tab.label}</Link>)}</nav>

      <section id="uebersicht" className="scroll-mt-20 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Mandantenarbeitsbereich</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${client.active?"bg-green-100 text-green-900":"bg-slate-200 text-slate-700"}`}>{client.active?"Aktiv":"Inaktiv"}</span></div>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Data label="Mandantennummer" value={client.clientNumber} />
          <Data label="Mandantengruppe" value="Nicht hinterlegt" />
          <Data label="Rechtsform" value={latestProfile?.legalFormGroup??"Jahresprofil fehlt"} />
          <Data label="Gewinnermittlungsart" value={latestProfile?.profitDeterminationMethod??"Jahresprofil fehlt"} />
          <Data label="Bearbeiter" value={textOrDash(client.processor)} />
          <Data label="Prüfer" value={textOrDash(client.reviewer)} />
          <Data label="Zuständige Kanzleileitung" value={textOrDash(client.managementName)} />
          <Data label="USt-Voranmeldungszeitraum" value={client.vatFilingPeriod} />
          <Data label="Lohnabrechnung durch Kanzlei" value={client.payrollPreparedByFirm?"Ja":"Nein"} />
          <Data label="Lohnsachbearbeiter" value={client.payrollUser?.fullName??"Nicht zugeordnet"} />
          <Data label="Status" value={client.active ? "Aktiv" : "Inaktiv"} />
          <Data label="Erstellt am" value={formatDate(client.createdAt)} />
          <Data label="Geändert am" value={formatDate(client.updatedAt)} />
        </dl>
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interner Hinweis</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{textOrDash(client.internalNote)}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-4" aria-label="Mandantenstatus">
        <WorkspaceCard title="Rechnungswesen" action="Laufendes Rechnungswesen öffnen" href="#rechnungswesen" rows={[
          ["Lückenlos abgeschlossen bis",monthShort(status.overallThrough)],
          ["Bearbeitung abgeschlossen bis",monthShort(status.processingThrough)],
          ["Prüfung abgeschlossen bis",monthShort(status.reviewThrough)],
          ["Aktueller Zeitraum",status.active?.periodLabel??"Kein offener Zeitraum"],
          ["Status",status.active?.processingStatus??"–"],
          ["Offene Prüfpunkte",String(status.openReviewPoints)],
        ]}/>
        <WorkspaceCard title="Jahresabschluss" action={latestAnnual?"Jahresabschluss öffnen":"Jahresabschluss anlegen"} href={latestAnnual?`/jahresabschluesse/${latestAnnual.id}`:latestProfile?`/jahresabschluesse/neu?clientId=${client.id}&fiscalYear=${latestProfile.calendarYear}`:"#qualitaet"} rows={[
          ["Wirtschaftsjahr",latestAnnual?String(latestAnnual.fiscalYear):"Nicht angelegt"],
          ["Status",latestAnnual?.status??"–"],
          ["Bearbeiter",latestAnnual?.processorNameSnapshot??textOrDash(client.processor)],
          ["Prüfer",latestAnnual?.reviewerNameSnapshot??textOrDash(client.reviewer)],
          ["Freigabe",latestAnnual?.status==="Freigegeben"?"Freigegeben":"Noch nicht freigegeben"],
        ]}/>
        {client.payrollPreparedByFirm&&<WorkspaceCard title="FiBu ↔ Lohn" action="FiBu ↔ Lohn öffnen" href="#fibu-lohn" rows={[
          ["Lohnsachbearbeiter",client.payrollUser?.fullName??"Nicht zugeordnet"],
          ["Letzte Abstimmung",latestPayroll?`${String(latestPayroll.accountingMonth).padStart(2,"0")}/${latestPayroll.accountingYear}`:"Noch keine"],
          ["Offene Rückfragen",String(openPayrollQuestions)],
          ["Offene ältere Abstimmungen",String(oldOpenPayroll)],
        ]}/>}
        <WorkspaceCard title="Stammdaten und Qualität" action="Jahresprofile prüfen" href="#qualitaet" rows={[
          ["Rollenzuordnungen",client.processor&&client.reviewer&&client.managementName?"Vollständig":"Unvollständig"],
          ["Jahresprofil",latestProfile?String(latestProfile.calendarYear):"Fehlt"],
          ["Lohnsachbearbeiter",!client.payrollPreparedByFirm?"Nicht erforderlich":client.payrollUser?.active?"Aktiv zugeordnet":"Fehlt oder inaktiv"],
          ["Monatslücken",status.firstGapMonth?`Ab ${monthShort(status.firstGapMonth)}`:"Keine erkannt"],
        ]}/>
      </section>

      {client.payrollPreparedByFirm&&<section id="fahrzeuge" className="mt-7 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Fahrzeuge</h2><p className="mt-1 text-sm text-slate-600">Dauerhafter Fahrzeugbestand für die FiBu-Lohn-Abstimmung.</p></div><div className="flex gap-2"><Link className="button-secondary" href={`/fibu-lohn/fahrzeuge?mandant=${client.id}`}>Alle Fahrzeuge</Link><Link className="button-primary" href={`/fibu-lohn/fahrzeuge/neu?clientId=${client.id}`}>Neues Fahrzeug</Link></div></div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Kennzeichen","Fahrzeug","Nutzer","Eigentum / Leasing","Versteuerung","Status"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{client.vehicles.map(vehicle=><ClickableTableRow href={`/fibu-lohn/fahrzeuge/${vehicle.id}`} className="border-t" key={vehicle.id}><td className="p-3">{vehicle.licensePlate??"–"}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={`/fibu-lohn/fahrzeuge/${vehicle.id}`}>{vehicle.description}</Link></td><td className="p-3">{vehicle.userName}</td><td className="p-3">{vehicle.ownershipType}</td><td className="p-3">{vehicle.onePercentRule?"1-%-Regelung":vehicle.logbook?"Fahrtenbuch":"–"}</td><td className="p-3">{vehicle.status}</td></ClickableTableRow>)}{!client.vehicles.length&&<tr><td colSpan={6} className="p-8 text-center text-[var(--color-text-muted)]">Für diesen Mandanten sind noch keine Fahrzeuge hinterlegt.</td></tr>}</tbody></table></div>
      </section>}

      <section id="jahresabschluss" className="mt-7 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Jahresabschlussaufgaben</h2><p className="mt-1 text-sm text-slate-600">Stichtagsbezogene Abschlussbearbeitung mit zusätzlicher Kanzleileitungsfreigabe.</p></div>{client.annualProfiles[0]&&!client.annualChecklists.some(item=>item.fiscalYear===client.annualProfiles[0].calendarYear)&&<Link className="button-primary" href={`/jahresabschluesse/neu?clientId=${client.id}&fiscalYear=${client.annualProfiles[0].calendarYear}`}>Jahresabschlusscheckliste für {client.annualProfiles[0].calendarYear} anlegen</Link>}</div>
        <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Wirtschaftsjahr","Status","Fortschritt","Offene Pflicht","Bearbeiter","Prüfer","Kanzleileitung","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{client.annualChecklists.map(item=>{const progress=annualProgress(item.tasks);return <ClickableTableRow href={`/jahresabschluesse/${item.id}`} className="border-t" key={item.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={`/jahresabschluesse/${item.id}`}>{item.fiscalYear}</Link></td><td className="p-3">{item.status}</td><td className="p-3">{progress.completed}/{progress.total} · {progress.percent} %</td><td className="p-3">{progress.mandatoryOpen}</td><td className="p-3">{item.processorNameSnapshot}</td><td className="p-3">{item.reviewerNameSnapshot}</td><td className="p-3">{item.managementNameSnapshot}</td><td className="p-3">{formatDate(item.updatedAt)}</td></ClickableTableRow>})}{!client.annualChecklists.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-500">Noch keine Jahresabschlusscheckliste vorhanden.</td></tr>}</tbody></table></div>
      </section>

      <section id="rechnungswesen" className="mt-7 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Rechnungswesenaufgaben</h2><p className="mt-1 text-sm text-slate-600">Lückenlose monatliche Bearbeitungsfolge.</p></div>{(!latest||latest.processingStatus==="Abgeschlossen")&&<Link className="button-primary" href={actionHref}>{actionLabel}</Link>}</div>
        {!activeChecklist&&<p className="mb-3 rounded border border-[var(--color-border)] bg-white p-4 text-sm">Für diesen Mandanten ist derzeit keine Monatscheckliste aktiv. Als Nächstes kann „{actionLabel}“ verwendet werden.</p>}
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Monat","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Bearbeiter","Prüfer","Kanzleileitung","Letzte Änderung"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>
          {client.periods.map(period=>{const progress=calculateProgress(period.tasks);const summary=workflowSummary(period.tasks);return <ClickableTableRow href={`/monatschecklisten/${period.id}`} className="border-t border-[var(--color-border)]" key={period.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)]" href={`/monatschecklisten/${period.id}`}>{period.periodLabel}</Link></td><td className="p-3">{period.processingStatus}</td><td className="p-3">{progress.completed}/{progress.total} · {progress.percent} %</td><td className="p-3">{progress.mandatoryOpen}</td><td className="p-3">{summary.openReviewPoints}</td><td className="p-3">{textOrDash(period.processorSnapshot)}</td><td className="p-3">{textOrDash(period.reviewerSnapshot)}</td><td className="p-3">{textOrDash(period.managementNameSnapshot)}</td><td className="p-3">{formatDate(period.updatedAt)}</td></ClickableTableRow>})}
          {!client.periods.length&&<tr><td colSpan={9} className="p-10 text-center text-slate-500">Noch keine Monatscheckliste vorhanden.</td></tr>}
        </tbody></table></div>
      </section>

      {client.payrollPreparedByFirm&&<section id="fibu-lohn" className="mt-7 scroll-mt-20"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">FiBu ↔ Lohn</h2><p className="mt-1 text-sm text-slate-600">Abstimmungen bleiben getrennt vom Rechnungswesenstatus.</p></div><Link className="button-primary" href={`/fibu-lohn?mandant=${client.id}`}>FiBu-Lohn-Abstimmungen öffnen</Link></div><div className="rounded-lg border bg-white p-4 text-sm"><b>Zuständig:</b> {client.payrollUser?.fullName??"Nicht zugeordnet"} · <b>Abstimmungen:</b> {client.payrollReconciliations.length} · <b>Offene Rückfragen:</b> {openPayrollQuestions}</div></section>}

      <section id="qualitaet" className="mt-7 scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Jahresprofile</h2>
            <p className="mt-1 text-sm text-slate-600">Das Kalenderjahr entspricht dem Wirtschaftsjahr.</p>
          </div>
          <Link className="button-primary" href={`/mandanten/${client.id}/jahresprofile/neu`}>Jahresprofil hinzufügen</Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {["Kalenderjahr", "Rechtsformgruppe", "Gewinnermittlungsart", "Geändert am", "Aktion"].map((value) => <th key={value} className="border-b border-slate-200 px-4 py-3">{value}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.annualProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-semibold">{profile.calendarYear}</td>
                  <td className="px-4 py-3">{profile.legalFormGroup}</td>
                  <td className="px-4 py-3">{profile.profitDeterminationMethod}</td>
                  <td className="px-4 py-3">{formatDate(profile.updatedAt)}</td>
                  <td className="px-4 py-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/mandanten/${client.id}/jahresprofile/${profile.id}/bearbeiten`}>Bearbeiten</Link></td>
                </tr>
              ))}
              {client.annualProfiles.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Noch kein Jahresprofil vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section id="historie" className="mt-7 scroll-mt-20"><h2 className="text-lg font-semibold">Historie und Datenstand</h2><div className="mt-3 rounded-lg border bg-white p-4 text-sm"><p>Mandant angelegt am {formatDate(client.createdAt)}, zuletzt geändert am {formatDate(client.updatedAt)}.</p><p className="mt-2">Fachliche Checklisten- und Abstimmungsverläufe bleiben unverändert in den jeweiligen Vorgängen einsehbar.</p></div></section>
    </div>
  );
}

function Data({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd></div>;
}

function WorkspaceCard({title,rows,action,href}:{title:string;rows:string[][];action:string;href:string}){
  return <article className="flex min-h-64 flex-col rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold text-[var(--color-primary-dark)]">{title}</h2><dl className="mt-3 space-y-2 text-sm">{rows.map(([label,value])=><div key={label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-600">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl><Link className="button-secondary mt-auto pt-3" href={href}>{action}</Link></article>;
}
