import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { textOrDash, formatDate } from "@/lib/format";
import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";
import { ClickableTableRow } from "@/app/components/clickable-table-row";
import { requireRole } from "@/lib/auth";
import { canManageClients, hasRole } from "@/lib/permissions";
import { canManageCustomTasks } from "@/lib/permissions";
import { ClientActionsMenu, type ClientMenuAction } from "@/app/mandanten/client-actions-menu";
import { ActiveFilterChips } from "@/app/components/active-filter-chips";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const user=await requireRole("MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN");
  const params = await searchParams;
  const search = one(params.suche).trim();
  const status = one(params.status);
  const processor = one(params.bearbeiter);
  const reviewer = one(params.pruefer);
  const management = one(params.kanzleileitung);
  const sorting = one(params.sortierung) || "nummer-auf";
  const clients = await prisma.client.findMany({
    where: {
      AND: [
        !hasRole(user,"KANZLEILEITUNG") ? {OR:[{processorUserId:user.id},{reviewerUserId:user.id},{managementUserId:user.id}]} : {},
        search ? { OR: [{ clientNumber: { contains: search } }, { name: { contains: search } }] } : {},
        status === "aktiv" ? { active: true } : status === "inaktiv" ? { active: false } : {},
        processor ? { processor } : {},
        reviewer ? { reviewer } : {},
        management ? { managementName: management } : {},
      ],
    },
    include: {
      periods: {
        where: { processingStatus: { not: "Abgeschlossen" }, checklistType: "Monat" },
        include: { tasks: { select: { status: true, mandatorySnapshot: true, reviewStatus: true, processingNote: true } } },
        orderBy: [{ calendarYear: "desc" }, { month: "desc" }],
      },
      annualProfiles:{orderBy:{calendarYear:"desc"}},
      annualChecklists:{select:{id:true,fiscalYear:true}},
    },
    orderBy: { clientNumber: "asc" },
  });
  const sortedClients = sortClients(clients, sorting);
  const optionRows = await prisma.client.findMany({ select: { processor: true, reviewer: true, managementName: true } });
  const options = (key: "processor" | "reviewer" | "managementName") => [...new Set(optionRows.map((row) => row[key]).filter(Boolean) as string[])].sort();
  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Zentraler Einstieg</p><h1 className="text-3xl font-bold">Mandanten</h1></div>{canManageClients(user)&&<Link className="button-primary" href="/mandanten/neu">Mandant anlegen</Link>}</header>
    <form className="mb-5 rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3">
      <Field label="Suche"><input className="input min-w-64" name="suche" defaultValue={search} placeholder="Nummer oder Name"/></Field>
      <Select name="status" label="Status" value={status} options={[["aktiv","Aktiv"],["inaktiv","Inaktiv"]]}/>
      <button className="button-primary">Anwenden</button><Link className="button-secondary" href="/mandanten">Zurücksetzen</Link>
    </div><details className="mt-3 border-t border-[var(--color-border)] pt-3" open={Boolean(processor||reviewer||management||sorting!=="nummer-auf")}><summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary-dark)]">Weitere Filter und Sortierung</summary><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Select name="bearbeiter" label="Bearbeiter" value={processor} options={options("processor").map(v=>[v,v])}/>
      <Select name="pruefer" label="Prüfer" value={reviewer} options={options("reviewer").map(v=>[v,v])}/>
      <Select name="kanzleileitung" label="Kanzleileitung" value={management} options={options("managementName").map(v=>[v,v])}/>
      <Select name="sortierung" label="Sortierung" value={sorting} options={[["nummer-auf","Mandantennummer aufsteigend"],["nummer-ab","Mandantennummer absteigend"],["name-auf","Name A–Z"],["name-ab","Name Z–A"]]}/>
    </div></details></form>
    <ActiveFilterChips basePath="/mandanten" params={params} filters={[{key:"suche",label:`Suche: ${search}`},{key:"status",label:`Status: ${status}`},{key:"bearbeiter",label:`Bearbeiter: ${processor}`},{key:"pruefer",label:`Prüfer: ${reviewer}`},{key:"kanzleileitung",label:`Kanzleileitung: ${management}`},{key:"sortierung",label:`Sortierung: ${sorting}`,active:sorting!=="nummer-auf"}]}/>
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white shadow-sm"><table className="w-full min-w-[1550px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Mandant","Bearbeiter","Prüfer","Kanzleileitung","USt-Zeitraum","Aktuelle Monatscheckliste","Status","Fortschritt","Offene Pflicht","Offene Prüfpunkte","Letzte Änderung","Aktionen"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>
      {sortedClients.map(client=>{const current=client.periods[0];const progress=current?calculateProgress(current.tasks):null;const summary=current?workflowSummary(current.tasks):null;const href=`/mandanten/${client.id}`;
        const actions:ClientMenuAction[]=[];
        if(canManageClients(user))actions.push({label:"Stammdaten bearbeiten",href:`/mandanten/${client.id}/bearbeiten`});
        actions.push({label:"Mandantendetails öffnen",href:`/mandanten/${client.id}`});
        if(current)actions.push({label:"Aktuelle Monatscheckliste öffnen",href:`/monatschecklisten/${current.id}`});
        actions.push({label:"Rechnungswesenaufgaben anzeigen",href:`/monatschecklisten?mandant=${client.id}`},{label:"Jahresabschlussaufgaben anzeigen",href:`/jahresabschluesse?mandant=${client.id}`});
        if(client.annualProfiles[0]&&canManageClients(user))actions.push({label:"Jahresprofil bearbeiten",href:`/mandanten/${client.id}/jahresprofile/${client.annualProfiles[0].id}/bearbeiten`});
        if(canManageCustomTasks(user))actions.push({label:"Mandantenspezifische Aufgaben",href:`/mandanten/${client.id}/zusatzaufgaben`});
        if(!current&&client.active&&canManageClients(user))actions.push({label:"Neue Monatscheckliste anlegen",href:`/monatschecklisten/neu?clientId=${client.id}`});
        const annualProfile=client.annualProfiles.find(profile=>!client.annualChecklists.some(checklist=>checklist.fiscalYear===profile.calendarYear));
        if(annualProfile&&canManageClients(user))actions.push({label:"Jahresabschlusscheckliste anlegen",href:`/jahresabschluesse/neu?clientId=${client.id}&fiscalYear=${annualProfile.calendarYear}`});
        return <ClickableTableRow href={href} className="border-t border-[var(--color-border)]" key={client.id}><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={href}>{client.clientNumber} · {client.name}</Link></td><td className="p-3">{textOrDash(client.processor)}</td><td className="p-3">{textOrDash(client.reviewer)}</td><td className="p-3">{textOrDash(client.managementName)}</td><td className="p-3">{client.vatFilingPeriod}</td><td className="p-3">{current?.periodLabel??"Keine aktive Checkliste"}</td><td className="p-3">{current?.processingStatus??(client.active?"Bereit":"Inaktiv")}</td><td className="p-3">{progress?`${progress.completed}/${progress.total} · ${progress.percent} %`:"–"}</td><td className="p-3">{progress?.mandatoryOpen??"–"}</td><td className="p-3">{summary?.openReviewPoints??"–"}</td><td className="p-3">{current?formatDate(current.updatedAt):formatDate(client.updatedAt)}</td><td className="p-3"><ClientActionsMenu clientNumber={client.clientNumber} actions={actions}/></td></ClickableTableRow>})}
      {!clients.length&&<tr><td colSpan={12} className="p-12 text-center text-[var(--color-text-muted)]">Keine Mandanten gefunden.</td></tr>}
    </tbody></table></div>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({name,label,value,options}:{name:string;label:string;value:string;options:string[][]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Alle</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>}

export function sortClients<T extends {clientNumber:string;name:string}>(clients:T[],sorting:string) {
  const natural=new Intl.Collator("de-DE",{numeric:true,sensitivity:"base"});
  return [...clients].sort((a,b)=>{
    const byNumber=natural.compare(a.clientNumber||"\uffff",b.clientNumber||"\uffff")||natural.compare(a.name,b.name);
    const byName=natural.compare(a.name,b.name)||byNumber;
    if(sorting==="nummer-ab")return -byNumber;
    if(sorting==="name-auf")return byName;
    if(sorting==="name-ab")return -byName;
    return byNumber;
  });
}
