import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  calculateProgress,
  CHECKLIST_TASK_STATUSES,
  REVIEW_STATUSES,
  workflowSummary,
} from "@/lib/monthly-checklist-service";
import { formatDateTime } from "@/lib/format";
import {
  completeReworkAction,
  reopenPeriodAction,
  reviewTaskAction,
  transitionPeriodAction,
  updateChecklistTaskAction,
  updatePeriodAction,
} from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function MonthlyPeriodDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const id = Number((await params).id);
  const period = await prisma.accountingPeriod.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: { orderBy: [{ categorySortOrder: "asc" }, { categorySnapshot: "asc" }, { sortOrderSnapshot: "asc" }, { taskIdSnapshot: "asc" }, { titleSnapshot: "asc" }] },
      history: { include: { checklistTask: { select: { taskIdSnapshot: true } } }, orderBy: { occurredAt: "desc" } },
    },
  });
  if (!period) notFound();
  const query = await searchParams;
  const search = one(query.suche).toLocaleLowerCase("de-DE");
  const processingFilter = one(query.bearbeitungsstatus);
  const reviewFilter = one(query.pruefstatus);
  const mandatoryFilter = one(query.pflicht);
  const categoryFilter = one(query.kategorie);
  const originFilter = one(query.herkunft);
  const onlyIssues = one(query.pruefpunkte) === "1";
  const onlyNotes = one(query.notizen) === "1";
  const filteredTasks = period.tasks.filter((task) =>
    (!search || [task.taskIdSnapshot, task.titleSnapshot, task.processingNote, task.reviewNote].some((value) => value?.toLocaleLowerCase("de-DE").includes(search))) &&
    (!processingFilter || task.status === processingFilter) &&
    (!reviewFilter || task.reviewStatus === reviewFilter) &&
    (!mandatoryFilter || task.mandatorySnapshot === (mandatoryFilter === "ja")) &&
    (!categoryFilter || task.categorySnapshot === categoryFilter) &&
    (!originFilter || task.origin === originFilter) &&
    (!onlyIssues || ["Rückfrage", "Beanstandung"].includes(task.reviewStatus)) &&
    (!onlyNotes || Boolean(task.processingNote || task.reviewNote))
  );
  const progress = calculateProgress(period.tasks);
  const summary = workflowSummary(period.tasks);
  const groups = Map.groupBy(filteredTasks, (task) => task.categorySnapshot);
  const categories = [...new Set(period.tasks.map((task) => task.categorySnapshot))];
  const origins = [...new Set(period.tasks.map((task) => task.origin))];
  const error = one(query.fehler);
  const success = one(query.erfolg);
  const sameRoleWarning = Boolean(period.processorSnapshot && period.reviewerSnapshot && period.processorSnapshot === period.reviewerSnapshot);
  const closed = period.processingStatus === "Abgeschlossen";

  return <div>
    <div className="mb-5"><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/monatschecklisten">← Zur Übersicht</Link></div>
    {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
    {success && <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Die Aktion wurde erfolgreich gespeichert.</div>}
    {sameRoleWarning && <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Warnung: Bearbeiter- und Prüferkürzel sind identisch. Die technische Trennung erfolgt erst mit der späteren Benutzerverwaltung.</div>}
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Mandant {period.client.clientNumber}</p><h1 className="mt-2 text-3xl font-bold">{period.client.name} – {period.periodLabel}</h1></div>
      <a className="button-secondary" href="#verlauf">Verlauf öffnen</a>
    </header>

    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Data label="Periodenstatus" value={period.processingStatus}/><Data label="Bearbeiter" value={period.processorSnapshot ?? "–"}/><Data label="Prüfer" value={period.reviewerSnapshot ?? "–"}/><Data label="Fortschritt" value={`${progress.percent} %`}/><Data label="Offene Prüfpunkte" value={String(summary.openReviewPoints)}/><Data label="Beanstandungen" value={String(summary.objections)}/>
        <Data label="Übergabe" value={period.submittedForReviewAt ? formatDateTime(period.submittedForReviewAt) : "–"}/><Data label="Prüfungsbeginn" value={period.reviewStartedAt ? formatDateTime(period.reviewStartedAt) : "–"}/><Data label="Letzte Prüfung" value={period.lastReviewAt ? formatDateTime(period.lastReviewAt) : "–"}/><Data label="Pflichtaufgaben" value={`${progress.mandatoryCompleted} / ${progress.mandatory}`}/><Data label="Offene Pflichtaufgaben" value={String(progress.mandatoryOpen)}/><Data label="Aufgaben" value={`${progress.completed} / ${progress.total}`}/>
      </div>
      <form action={updatePeriodAction.bind(null, period.id)} className="mt-5 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-[1fr_auto] md:items-end">
        <input type="hidden" name="processingStatus" value={period.processingStatus}/>
        <label className="text-sm font-semibold">Allgemeiner Periodenhinweis<input className="input mt-1" name="generalNote" defaultValue={period.generalNote ?? ""} disabled={closed}/></label>
        <button className="button-secondary" disabled={closed}>Hinweis speichern</button>
      </form>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <WorkflowActions periodId={period.id} status={period.processingStatus} processor={period.processorSnapshot ?? ""} reviewer={period.reviewerSnapshot ?? ""} summary={summary}/>
      </div>
    </section>

    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Aufgaben filtern</h2>
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Suche"><input className="input" name="suche" defaultValue={one(query.suche)} placeholder="ID, Aufgabe oder Notiz"/></Field>
        <Select label="Bearbeitungsstatus" name="bearbeitungsstatus" value={processingFilter} options={CHECKLIST_TASK_STATUSES}/>
        <Select label="Prüfstatus" name="pruefstatus" value={reviewFilter} options={REVIEW_STATUSES}/>
        <Select label="Pflichtaufgabe" name="pflicht" value={mandatoryFilter} options={["ja","nein"]} labels={["Ja","Nein"]}/>
        <Select label="Kategorie" name="kategorie" value={categoryFilter} options={categories}/>
        <Select label="Herkunft" name="herkunft" value={originFilter} options={origins}/>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="pruefpunkte" value="1" defaultChecked={onlyIssues}/> Nur offene Prüfpunkte</label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="notizen" value="1" defaultChecked={onlyNotes}/> Nur Aufgaben mit Notiz</label>
        <div className="flex gap-2"><button className="button-primary">Anwenden</button><Link className="button-secondary" href={`/monatschecklisten/${period.id}`}>Zurücksetzen</Link></div>
      </form>
    </section>

    <div className="mt-7 space-y-6">
      {[...groups.entries()].map(([category, tasks]) => <section key={category}>
        <h2 className="mb-3 text-xl font-semibold">{category}</h2>
        <div className="space-y-3">{tasks.map((task) => <article id={`aufgabe-${task.id}`} className={`rounded-lg border bg-white p-4 shadow-sm ${["Rückfrage","Beanstandung"].includes(task.reviewStatus) ? "border-amber-300" : "border-slate-200"}`} key={task.id}>
          <div className="grid gap-3 xl:grid-cols-[9rem_1fr_10rem_10rem_9rem]">
            <div><div className="font-mono text-xs font-semibold text-blue-700">{task.taskIdSnapshot}</div><div className="mt-1 text-xs text-slate-500">{task.origin}</div></div>
            <div><h3 className="font-semibold">{task.titleSnapshot}{task.mandatorySnapshot && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Pflicht</span>}</h3>{task.workInstructionSnapshot && <p className="mt-1 text-sm text-slate-600">{task.workInstructionSnapshot}</p>}</div>
            <Status label="Bearbeitung" value={task.status}/><Status label="Prüfung" value={task.reviewStatus}/><div className="text-xs"><span className="font-semibold text-slate-500">Letzte Änderung</span><div className="mt-1">{formatDateTime(task.updatedAt)}</div></div>
          </div>
          {task.reviewNote && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><span className="font-semibold">Prüfnotiz ({task.reviewerInitials ?? "–"}):</span> {task.reviewNote}</div>}
          {task.processorResponse && <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm"><span className="font-semibold">Antwort ({task.respondedBy ?? "–"}):</span> {task.processorResponse}</div>}
          {!closed && <TaskForms task={task} periodStatus={period.processingStatus} periodId={period.id}/>}
        </article>)}</div>
      </section>)}
      {filteredTasks.length === 0 && <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">Keine Aufgaben zu den gewählten Filtern gefunden.</div>}
    </div>

    {closed && <section className="mt-7 rounded-lg border-2 border-red-300 bg-red-50 p-5">
      <h2 className="text-xl font-semibold text-red-950">Abschluss wieder öffnen</h2><p className="mt-1 text-sm text-red-900">Die Periode wird auf „Nachbearbeitung“ gesetzt. Dieser Vorgang bleibt im Verlauf sichtbar.</p>
      <form action={reopenPeriodAction.bind(null, period.id)} className="mt-4 grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-end">
        <Field label="Handelndes Kürzel"><input className="input" name="actorInitials" required/></Field><Field label="Verpflichtende Begründung"><input className="input" name="reason" required/></Field><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="confirmed" required/> Wiederöffnung ausdrücklich bestätigen</label><button className="button-primary md:col-span-3">Abschluss wieder öffnen</button>
      </form>
    </section>}

    <section id="verlauf" className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-xl font-semibold">Fachlicher Verlauf</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50"><tr>{["Zeitpunkt","Ereignis","Kürzel","Aufgabe","Beschreibung","Vorher","Neu"].map((heading)=><th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{period.history.map((entry)=><tr className="border-t border-slate-100" key={entry.id}><td className="whitespace-nowrap p-3">{formatDateTime(entry.occurredAt)}</td><td className="p-3 font-semibold">{entry.eventType}</td><td className="p-3">{entry.actorInitials ?? "–"}</td><td className="p-3">{entry.checklistTask?.taskIdSnapshot ?? "–"}</td><td className="p-3">{entry.description}</td><td className="p-3">{entry.previousValue ?? "–"}</td><td className="p-3">{entry.newValue ?? "–"}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function WorkflowActions({periodId,status,processor,reviewer,summary}:{periodId:number;status:string;processor:string;reviewer:string;summary:ReturnType<typeof workflowSummary>}){
  const config = status==="Offen"?["BEGIN_PROCESSING","Bearbeitung beginnen",processor]:status==="In Bearbeitung"?["SUBMIT_REVIEW","Zur Prüfung übergeben",processor]:status==="Zur Prüfung"?["BEGIN_REVIEW","Prüfung beginnen",reviewer]:status==="In Prüfung"?(summary.openReviewPoints>0?["RETURN_REWORK","Zur Nachbearbeitung zurückgeben",reviewer]:["COMPLETE_REVIEW","Prüfung abschließen",reviewer]):status==="Nachbearbeitung"?["SUBMIT_REVIEW","Erneut zur Prüfung übergeben",processor]:null;
  if(!config)return <p className="text-sm text-slate-600">Die Periode ist abgeschlossen. Aufgaben sind gesperrt.</p>;
  const [action,label,initials]=config;
  return <div><div className="mb-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6 text-sm"><span>Gesamt: <b>{summary.total}</b></span><span>Erledigt: <b>{summary.done}</b></span><span>Nicht zutreffend: <b>{summary.notApplicable}</b></span><span>Offen freiwillig: <b>{summary.openOptional}</b></span><span>Offen Pflicht: <b>{summary.mandatoryOpen}</b></span><span>Mit Notiz: <b>{summary.withNotes}</b></span></div><form action={transitionPeriodAction.bind(null,periodId,action as Parameters<typeof transitionPeriodAction>[1])} className="flex flex-wrap items-end gap-3"><Field label="Aktuell handelndes Kürzel"><input className="input w-48" name="actorInitials" defaultValue={initials}/></Field><button className="button-primary">{label}</button>{["SUBMIT_REVIEW","COMPLETE_REVIEW"].includes(action)&&<span className="text-xs text-slate-500">Mit Klick wird die Übergabe ausdrücklich bestätigt.</span>}</form></div>;
}

function TaskForms({task,periodStatus,periodId}:{task:Awaited<ReturnType<typeof prisma.checklistTask.findFirstOrThrow>>;periodStatus:string;periodId:number}){
  return <div className="mt-4 grid gap-3 xl:grid-cols-2">
    {["Offen","In Bearbeitung","Nachbearbeitung"].includes(periodStatus)&&<form action={updateChecklistTaskAction.bind(null,task.id,periodId)} className="rounded-md border border-slate-200 p-3"><h4 className="mb-2 text-sm font-semibold">Bearbeitung</h4><div className="grid gap-2 sm:grid-cols-2"><Select label="Bearbeitungsstatus" name="status" value={task.status} options={CHECKLIST_TASK_STATUSES}/><Field label="Bearbeiterkürzel"><input className="input" name="processorInitials" defaultValue={task.processorInitials ?? ""}/></Field><Field label="Bearbeitungsnotiz"><textarea className="input min-h-20" name="processingNote" defaultValue={task.processingNote ?? ""}/></Field><Field label="Begründung „Nicht zutreffend“"><textarea className="input min-h-20" name="notApplicableReason" defaultValue={task.notApplicableReason ?? ""}/></Field></div><button className="button-secondary mt-2">Bearbeitung speichern</button></form>}
    {periodStatus==="In Prüfung"&&<form action={reviewTaskAction.bind(null,task.id,periodId)} className="rounded-md border border-blue-200 bg-blue-50 p-3"><h4 className="mb-2 text-sm font-semibold">Prüfung</h4><div className="grid gap-2 sm:grid-cols-2"><Select label="Prüfstatus" name="reviewStatus" value={task.reviewStatus==="Nicht geprüft"?"In Ordnung":task.reviewStatus} options={REVIEW_STATUSES.filter((value)=>value!=="Nicht geprüft"&&value!=="Erledigt nach Nachbearbeitung")}/><Field label="Prüferkürzel"><input className="input" name="reviewerInitials" defaultValue={task.reviewerInitials ?? ""}/></Field><div className="sm:col-span-2"><Field label="Prüfnotiz"><textarea className="input min-h-20" name="reviewNote" defaultValue={task.reviewNote ?? ""}/></Field></div></div><button className="button-primary mt-2">Prüfung speichern</button></form>}
    {periodStatus==="Nachbearbeitung"&&["Rückfrage","Beanstandung"].includes(task.reviewStatus)&&<form action={completeReworkAction.bind(null,task.id,periodId)} className="rounded-md border border-amber-200 bg-amber-50 p-3"><h4 className="mb-2 text-sm font-semibold">Offenen Prüfpunkt beantworten</h4><div className="grid gap-2 sm:grid-cols-2"><Field label="Antwort des Bearbeiters"><textarea className="input min-h-20" name="processorResponse"/></Field><Field label="Bearbeitungsnotiz"><textarea className="input min-h-20" name="processingNote" defaultValue={task.processingNote ?? ""}/></Field><Field label="Beantwortet von"><input className="input" name="respondedBy" defaultValue={task.processorInitials ?? ""}/></Field></div><button className="button-primary mt-2">Nachbearbeitung erledigt</button></form>}
  </div>;
}
function Data({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>}
function Status({label,value}:{label:string;value:string}){return <div className="text-xs"><span className="font-semibold text-slate-500">{label}</span><div className="mt-1 rounded bg-slate-100 px-2 py-1 font-semibold">{value}</div></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="text-xs font-semibold text-slate-600"><span className="mb-1 block">{label}</span>{children}</label>}
function Select({label,name,value,options,labels}:{label:string;name:string;value:string;options:readonly string[];labels?:string[]}){return <Field label={label}><select className="input" name={name} defaultValue={value}><option value="">Nicht filtern</option>{options.map((option,index)=><option key={option} value={option}>{labels?.[index]??option}</option>)}</select></Field>}
