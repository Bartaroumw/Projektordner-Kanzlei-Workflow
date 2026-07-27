import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrdoCampus } from "@/lib/permissions";
import { CAMPUS_LINK_TYPES,CAMPUS_STATUSES } from "@/lib/ordo-campus-service";
import { formatDateTime } from "@/lib/format";
import { ToastMessage } from "@/app/components/toast-message";
import { createCampusLinkAction,saveCampusKnowledgeAction,updateCampusAttachmentAction,updateCampusLinkAction,uploadCampusAttachmentAction } from "./actions";
import { CampusTabs } from "./campus-tabs";
import { CAMPUS_ATTACHMENT_ACCEPT,CAMPUS_ATTACHMENT_MAX_BYTES,formatCampusFileSize } from "@/lib/ordo-campus-attachment-service";
import { UploadSubmitButton } from "./upload-submit-button";

const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]??"":value??"";
export default async function CampusPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const user=await requireUser(),id=Number((await params).id),query=await searchParams;
  if(!Number.isInteger(id))notFound();
  if(!canManageOrdoCampus(user))redirect(`/standardaufgaben/${id}`);
  const task=await prisma.standardTask.findUnique({where:{id},include:{campusKnowledge:{include:{links:{orderBy:[{sortOrder:"asc"},{title:"asc"}]},history:{orderBy:{occurredAt:"desc"},take:100}}},campusAttachments:{include:{uploadedBy:true,archivedBy:true},orderBy:[{status:"asc"},{sortOrder:"asc"},{displayName:"asc"}]}}});
  if(!task)notFound();
  const knowledge=task.campusKnowledge;
  const values={
    status:knowledge?.status??"Entwurf",shortDescription:knowledge?.shortDescription??"",objective:knowledge?.objective??"",
    processingGuidance:knowledge?.processingGuidance??"",firmStandard:knowledge?.firmStandard??"",
    reviewerGuidance:knowledge?.reviewerGuidance??"",typicalErrors:knowledge?.typicalErrors??"",internalHints:knowledge?.internalHints??"",
  };
  const form=(visible:React.ReactNode,fields:(keyof typeof values)[])=><form action={saveCampusKnowledgeAction.bind(null,id)} className="grid gap-5 rounded-lg border bg-white p-6">
    {(Object.keys(values) as (keyof typeof values)[]).filter(key=>!fields.includes(key)).map(key=><input key={key} type="hidden" name={key} value={values[key]}/>)}
    {visible}<button className="button-primary w-fit">Wissen speichern</button>
  </form>;
  return <div><Link className="text-sm font-semibold text-[var(--color-primary-dark)] hover:underline" href={`/standardaufgaben/${id}`}>← Zur Standardaufgabe</Link>
    <ToastMessage message={one(query.fehler)||(one(query.erfolg)==="wissen"?"Ordo-Campus-Wissen wurde gespeichert.":one(query.erfolg)==="link"?"Der Wissenslink wurde gespeichert.":one(query.erfolg)==="anhang"?"Der Anhang wurde gespeichert.":"")} type={one(query.fehler)?"error":"success"}/>
    <header className="my-6"><p className="text-sm font-semibold uppercase text-[var(--color-primary)]">Ordo Campus · {task.taskId}</p><h1 className="mt-2 text-3xl font-bold">{task.title}</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">Zentrale Wissensquelle dieser Standardaufgabe. Änderungen sind sofort in bestehenden Checklisten sichtbar.</p></header>
    <CampusTabs panels={{
      uebersicht:form(<><Field label="Wissensstatus"><select className="input" name="status" defaultValue={values.status}>{CAMPUS_STATUSES.map(status=><option key={status}>{status}</option>)}</select></Field><Field label="Kurzbeschreibung"><textarea className="input min-h-24" name="shortDescription" defaultValue={values.shortDescription}/></Field><Field label="Ziel der Aufgabe"><textarea className="input min-h-32" name="objective" defaultValue={values.objective}/></Field><Field label="Interne Hinweise"><textarea className="input min-h-24" name="internalHints" defaultValue={values.internalHints}/></Field></>,["status","shortDescription","objective","internalHints"]),
      bearbeitung:form(<Field label="Bearbeitungshinweise"><textarea className="input min-h-80" name="processingGuidance" defaultValue={values.processingGuidance}/><span className="mt-2 block text-xs font-normal text-[var(--color-text-muted)]">Absätze, Listen, Nummerierungen, **Fettschrift** und Weblinks werden in der Leseansicht verständlich formatiert.</span></Field>,["processingGuidance"]),
      kanzleistandard:form(<div className="rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] p-4"><Field label="Verbindlicher Kanzleistandard"><textarea className="input min-h-96 bg-white" name="firmStandard" defaultValue={values.firmStandard}/></Field><p className="mt-2 text-xs">Ausschließlich verbindliche interne Arbeitsstandards dokumentieren.</p></div>,["firmStandard"]),
      pruefung:form(<><Field label="Hinweise für die fachliche Prüfung"><textarea className="input min-h-56" name="reviewerGuidance" defaultValue={values.reviewerGuidance}/></Field><Field label="Typische Fehler (ein Eintrag pro Zeile)"><textarea className="input min-h-48" name="typicalErrors" defaultValue={values.typicalErrors}/></Field></>,["reviewerGuidance","typicalErrors"]),
      links:<Links taskId={id} knowledge={knowledge}/>,
      anhaenge:<Attachments taskId={id} knowledgeExists={Boolean(knowledge)} attachments={task.campusAttachments}/>,
      verlauf:<History knowledge={knowledge}/>,
    }}/>
  </div>;
}

function Attachments({taskId,knowledgeExists,attachments}:{taskId:number;knowledgeExists:boolean;attachments:Array<{id:number;displayName:string;originalFileName:string;fileExtension:string;mimeType:string;fileSizeBytes:number;description:string|null;status:string;sortOrder:number;uploadedAt:Date;uploadedBy:{fullName:string};archivedAt:Date|null;archivedBy:{fullName:string}|null}>}){
  return <section>
    <h2 className="text-xl font-semibold">Interne Anhänge</h2>
    <div className="mt-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-light)] p-4 text-sm">
      <p className="font-semibold">Erlaubt sind PDF, DOCX, XLSX, PNG und JPG bis maximal {CAMPUS_ATTACHMENT_MAX_BYTES/1024/1024} MB.</p>
      <p className="mt-1">DATEV-Dokumente sollen grundsätzlich verlinkt und nicht lokal gespeichert werden. Nehmen Sie keine echten Mandanten- oder Personendaten in zentrale Campus-Anhänge auf.</p>
    </div>
    {!knowledgeExists&&<p className="mt-4 rounded border bg-white p-4">Bitte speichern Sie zuerst den Wissensbereich im Reiter „Übersicht“.</p>}
    {knowledgeExists&&<form action={uploadCampusAttachmentAction.bind(null,taskId)} className="mt-4 grid gap-3 rounded border bg-white p-4 md:grid-cols-2">
      <Field label="Datei"><input className="input" type="file" name="file" accept={CAMPUS_ATTACHMENT_ACCEPT} required/></Field>
      <Field label="Anzeigename"><input className="input" name="displayName" maxLength={300} required/></Field>
      <Field label="Beschreibung"><textarea className="input min-h-24" name="description"/></Field>
      <Field label="Sortierreihenfolge"><input className="input" type="number" min="0" max="999999" name="sortOrder" defaultValue="0"/></Field>
      <UploadSubmitButton/>
    </form>}
    <div className="mt-5 space-y-3">{attachments.map(attachment=><form action={updateCampusAttachmentAction.bind(null,taskId,attachment.id)} className={`grid gap-3 rounded border p-4 md:grid-cols-2 xl:grid-cols-5 ${attachment.status==="Archiviert"?"bg-[var(--color-background)] text-[var(--color-text-muted)]":"bg-white"}`} key={attachment.id}>
      <Field label="Anzeigename"><input className="input" name="displayName" defaultValue={attachment.displayName} required/></Field>
      <Field label="Beschreibung"><input className="input" name="description" defaultValue={attachment.description??""}/></Field>
      <Field label="Sortierung"><input className="input" type="number" min="0" max="999999" name="sortOrder" defaultValue={attachment.sortOrder}/></Field>
      <div className="text-sm"><div className="font-semibold">{attachment.fileExtension} · {formatCampusFileSize(attachment.fileSizeBytes)}</div><div className="mt-1">Hochgeladen von {attachment.uploadedBy.fullName}</div><div>{attachment.status}</div></div>
      <div className="flex flex-wrap items-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={attachment.status==="Aktiv"}/> Aktiv</label><a className="button-secondary" href={`/api/ordo-campus/attachments/${attachment.id}/download?pflege=1`}>Herunterladen</a><button className="button-secondary">Speichern</button></div>
    </form>)}{attachments.length===0&&<p className="rounded border bg-white p-5 text-sm">Noch keine Anhänge vorhanden.</p>}</div>
  </section>;
}

function Links({taskId,knowledge}:{taskId:number;knowledge:Awaited<ReturnType<typeof prisma.standardTaskKnowledge.findFirst>> & {links?:Array<{id:number;title:string;url:string;linkType:string;description:string|null;sortOrder:number;active:boolean}>}|null}){
  return <section><h2 className="text-xl font-semibold">Wissenslinks</h2><div className="mt-3 space-y-3">{knowledge?.links?.map(link=><form action={updateCampusLinkAction.bind(null,taskId,link.id)} className="grid gap-3 rounded border bg-white p-4 md:grid-cols-2 xl:grid-cols-6" key={link.id}><Field label="Titel"><input className="input" name="title" defaultValue={link.title} required/></Field><Field label="URL"><input className="input" name="url" defaultValue={link.url} required/></Field><Field label="Linktyp"><select className="input" name="linkType" defaultValue={link.linkType}>{CAMPUS_LINK_TYPES.map(type=><option key={type}>{type}</option>)}</select></Field><Field label="Beschreibung"><input className="input" name="description" defaultValue={link.description??""}/></Field><Field label="Reihenfolge"><input className="input" type="number" min="0" name="sortOrder" defaultValue={link.sortOrder}/></Field><div className="flex items-end gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={link.active}/> Aktiv</label><button className="button-secondary">Speichern</button></div></form>)}{!knowledge?.links?.length&&<p className="rounded border bg-white p-5 text-sm">Noch keine Wissenslinks vorhanden.</p>}</div>
    {knowledge&&<form action={createCampusLinkAction.bind(null,taskId)} className="mt-4 grid gap-3 rounded border border-dashed bg-white p-4 md:grid-cols-2 xl:grid-cols-6"><Field label="Titel"><input className="input" name="title" required/></Field><Field label="URL"><input className="input" name="url" placeholder="https://… oder /interne-seite" required/></Field><Field label="Linktyp"><select className="input" name="linkType">{CAMPUS_LINK_TYPES.map(type=><option key={type}>{type}</option>)}</select></Field><Field label="Beschreibung"><input className="input" name="description"/></Field><Field label="Reihenfolge"><input className="input" type="number" min="0" name="sortOrder" defaultValue="0"/></Field><button className="button-primary self-end">Link ergänzen</button></form>}
  </section>;
}

function History({knowledge}:{knowledge:{history?:Array<{id:number;occurredAt:Date;actorNameSnapshot:string;changedArea:string;description:string}>}|null}){
  return <section><h2 className="text-xl font-semibold">Änderungsverlauf</h2><div className="mt-3 overflow-x-auto rounded border bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[var(--color-primary-light)]"><tr>{["Zeitpunkt","Benutzer","Geänderter Bereich","Beschreibung"].map(value=><th className="p-3" key={value}>{value}</th>)}</tr></thead><tbody>{knowledge?.history?.map(entry=><tr className="border-t" key={entry.id}><td className="p-3">{formatDateTime(entry.occurredAt)}</td><td className="p-3">{entry.actorNameSnapshot}</td><td className="p-3 font-semibold">{entry.changedArea}</td><td className="p-3">{entry.description}</td></tr>)}{!knowledge?.history?.length&&<tr><td className="p-8 text-center" colSpan={4}>Noch keine Änderungen protokolliert.</td></tr>}</tbody></table></div></section>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-sm font-semibold"><span className="mb-1 block">{label}</span>{children}</label>}
