import Link from "next/link";
import { redirect } from "next/navigation";
import { AdministrationBreadcrumbs, AdministrationTabs } from "@/app/components/administration-navigation";
import { ToastMessage } from "@/app/components/toast-message";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { PAYROLL_COLLECTION_TOPICS, parseConfiguredList } from "@/lib/payroll-reconciliation-service";
import { canManagePayrollTopics } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string,string|string[]|undefined>>;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";

export default async function PayrollTopicsPage({searchParams}:{searchParams:SearchParams}){
  const user=await requireUser();
  if(!canManagePayrollTopics(user))redirect("/zugriff-verweigert?bereich=Rechnungswesen–Lohn-Themen");
  const query=await searchParams;
  const search=one(query.suche).trim();
  const status=one(query.status);
  const campus=one(query.campus);
  const vehicle=one(query.fahrzeug);
  const collection=one(query.sammel);
  const databaseTopics=await prisma.payrollReconciliationTopic.findMany({
    where:{
      ...(search?{OR:[{key:{contains:search}},{title:{contains:search}},{shortDescription:{contains:search}},{reviewQuestion:{contains:search}}]}:{}),
      ...(status?{status}:{}),
      ...(campus==="mit"?{campusStandardTask:{is:{campusKnowledge:{isNot:null}}}}:campus==="ohne"?{OR:[{campusStandardTaskId:null},{campusStandardTask:{is:{campusKnowledge:{is:null}}}}]}:{}),
      ...(vehicle==="ja"?{vehicleRelated:true}:vehicle==="nein"?{vehicleRelated:false}:{}),
    },
    include:{campusStandardTask:{select:{id:true,title:true,campusKnowledge:{select:{status:true}}}}},
    orderBy:[{sortOrder:"asc"},{title:"asc"}],
  });
  const topics=databaseTopics.filter((topic)=>collection==="ja"?PAYROLL_COLLECTION_TOPICS.has(topic.key):collection==="nein"?!PAYROLL_COLLECTION_TOPICS.has(topic.key):true);
  return <div>
    <AdministrationBreadcrumbs section="fachliche-grundlagen" current="Rechnungswesen–Lohn-Themen"/>
    <AdministrationTabs user={user} active="fachliche-grundlagen"/>
    <ToastMessage message={one(query.erfolg)?"Der Themenkatalog wurde gespeichert.":undefined}/>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Fachliche Grundlagen</p><h1 className="mt-2 text-3xl font-bold">Rechnungswesen–Lohn-Themen</h1><p className="mt-2 text-[var(--color-text-muted)]">Änderungen gelten nur für künftig erzeugte Themen-Snapshots.</p></div><Link className="button-primary" href="/fibu-lohn/themen/neu">Thema anlegen</Link></header>
    <form className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Suche"><input className="input" name="suche" defaultValue={search} placeholder="Thema, Kurzbeschreibung oder Prüffrage"/></Field>
      <Select label="Status" name="status" value={status} options={["Aktiv","Archiviert"]}/>
      <Select label="Ordo Campus" name="campus" value={campus} options={["mit","ohne"]} labels={["Mit Wissen","Ohne Wissen"]}/>
      <Select label="Fahrzeugbezug" name="fahrzeug" value={vehicle} options={["ja","nein"]} labels={["Ja","Nein"]}/>
      <Select label="Sammelerfassung" name="sammel" value={collection} options={["ja","nein"]} labels={["Zulässig","Nicht zulässig"]}/>
      <div className="flex items-end gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href="/fibu-lohn/themen">Zurücksetzen</Link></div>
    </form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
      <table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Reihenfolge","Thema","Kurzbeschreibung","Status","Campus","Fahrzeugbezug","Sammelerfassung","Pflichtangaben","Letzte Änderung","Aktion"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{topics.map((topic)=><tr className="border-t align-top" key={topic.id}>
          <td className="p-3 font-semibold">{topic.sortOrder}</td><td className="p-3"><strong>{topic.title}</strong><p className="mt-1 text-xs text-[var(--color-text-muted)]">{topic.reviewQuestion}</p></td><td className="p-3">{topic.shortDescription??"–"}</td>
          <td className="p-3 font-semibold">{topic.status}</td><td className="p-3">{topic.campusStandardTask?.campusKnowledge?.status??"Nicht hinterlegt"}</td><td className="p-3">{topic.vehicleRelated?"Ja":"Nein"}</td><td className="p-3">{PAYROLL_COLLECTION_TOPICS.has(topic.key)?"Zulässig":"Nicht zulässig"}</td>
          <td className="p-3">{parseConfiguredList(topic.requiredStandardFields).join(" · ")||"Keine"}</td><td className="p-3">{formatDate(topic.updatedAt)}</td><td className="p-3"><Link className="font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/fibu-lohn/themen/${topic.id}/bearbeiten`}>Thema bearbeiten</Link></td>
        </tr>)}{!topics.length&&<tr><td className="p-10 text-center text-[var(--color-text-muted)]" colSpan={10}>Keine Rechnungswesen–Lohn-Themen zu den gewählten Filtern gefunden.</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold"><span className="mb-1 block">{label}</span>{children}</label>;}
function Select({label,name,value,options,labels}:{label:string;name:string;value:string;options:string[];labels?:string[]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map((option,index)=><option value={option} key={option}>{labels?.[index]??option}</option>)}</select></Field>;}
