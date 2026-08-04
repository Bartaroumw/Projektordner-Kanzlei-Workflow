"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChecklistBatch } from "@/app/components/checklist-batch-provider";

export type ChecklistNavigatorTask = {
  id: number;
  code: string;
  title: string;
  category: string;
  status: string;
  reviewStatus: string;
  hasQuestion: boolean;
  transferred: boolean;
  campusAvailable: boolean;
};

const filters = [
  ["alle", "Alle"],
  ["offen", "Offen"],
  ["in-bearbeitung", "In Bearbeitung"],
  ["erledigt", "Erledigt"],
  ["nicht-zutreffend", "Nicht zutreffend"],
  ["uebertragen", "Übertragen"],
  ["ungespeichert", "Ungespeichert"],
  ["fehlerhaft", "Fehlerhaft"],
  ["rueckfrage", "Rückfrage"],
  ["beanstandet", "Beanstandet / Nachbearbeitung"],
] as const;

export function ChecklistWorkspaceTools({
  label,
  tasks,
  statusDetails,
}: {
  label: string;
  tasks: ChecklistNavigatorTask[];
  statusDetails: Array<[string, string]>;
}) {
  const batch = useChecklistBatch();
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("alle");
  const [visibleTaskId, setVisibleTaskId] = useState<number | null>(tasks[0]?.id ?? null);
  const [errorCursor, setErrorCursor] = useState(0);
  const [compactVisible, setCompactVisible] = useState(false);

  const taskState = useCallback((task: ChecklistNavigatorTask) => {
    const entry = batch.entry(task.id);
    return {
      status: entry?.current.status ?? task.status,
      dirty: Boolean(entry && JSON.stringify(entry.current) !== JSON.stringify(entry.baseline)),
      error: entry?.error,
    };
  }, [batch]);

  const errorTasks = useMemo(() => tasks.filter((task) => Boolean(batch.entry(task.id)?.error)), [batch, tasks]);
  const normalizedErrorCursor=errorTasks.length?errorCursor%errorTasks.length:0;

  const jumpToTask = useCallback((taskId: number, focusError = false) => {
    const target = document.getElementById(`aufgabe-${taskId}`);
    if (!target) return;
    target.querySelectorAll("details").forEach((details) => { details.open = true; });
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("checklist-task-highlight");
    window.setTimeout(() => target.classList.remove("checklist-task-highlight"), 1500);
    window.setTimeout(() => {
      const focusTarget = focusError
        ? target.querySelector<HTMLElement>("[aria-invalid='true'], textarea[name='notApplicableReason'], textarea, select, input")
        : target;
      focusTarget?.focus({ preventScroll: true });
    }, 250);
    setVisibleTaskId(taskId);
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    const header = document.getElementById("checklist-full-header");
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => setCompactVisible(!entry.isIntersecting), { threshold: 0 });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (visible?.target.id.startsWith("aufgabe-")) setVisibleTaskId(Number(visible.target.id.replace("aufgabe-", "")));
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0.05 });
    document.querySelectorAll("[id^='aufgabe-']").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [tasks]);

  const nextError = () => {
    if (!errorTasks.length) return;
    const index = normalizedErrorCursor;
    jumpToTask(errorTasks[index].id, true);
    setErrorCursor((index + 1) % errorTasks.length);
  };
  const openTasks = tasks.filter((task) => !["Erledigt", "Nicht zutreffend", "In Folgemonat übertragen"].includes(taskState(task).status));
  const jumpNextOpen = () => {
    if (!openTasks.length) return;
    const currentIndex = openTasks.findIndex((task) => task.id === visibleTaskId);
    jumpToTask(openTasks[(currentIndex + 1 + openTasks.length) % openTasks.length].id);
  };
  const normalizedSearch = search.trim().toLocaleLowerCase("de-DE");
  const shownTasks = tasks.filter((task) => {
    const state = taskState(task);
    const matchesSearch = !normalizedSearch || `${task.code} ${task.title} ${task.category}`.toLocaleLowerCase("de-DE").includes(normalizedSearch);
    const matchesFilter = filter === "alle" ||
      filter === "offen" && state.status === "Offen" ||
      filter === "in-bearbeitung" && state.status === "In Bearbeitung" ||
      filter === "erledigt" && state.status === "Erledigt" ||
      filter === "nicht-zutreffend" && state.status === "Nicht zutreffend" ||
      filter === "uebertragen" && task.transferred ||
      filter === "ungespeichert" && state.dirty ||
      filter === "fehlerhaft" && Boolean(state.error) ||
      filter === "rueckfrage" && task.hasQuestion ||
      filter === "beanstandet" && ["Beanstandung", "Erledigt nach Nachbearbeitung"].includes(task.reviewStatus);
    return matchesSearch && matchesFilter;
  });
  const categories = [...new Set(tasks.map((task) => task.category))];

  return <>
    {compactVisible&&<aside aria-label="Kompakte Checklistenleiste" className="sticky top-0 z-30 my-4 rounded-lg border border-[var(--color-primary)] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm"><strong>{label}</strong><span className="text-[var(--color-text-muted)]"> · {batch.localCompletedTasks}/{tasks.length} erledigt · {openTasks.length} offen · {errorTasks.length} fehlerhaft · {batch.dirtyCount} ungespeichert</span></p>
        <div className="flex flex-wrap gap-2">
          {errorTasks.length>0&&<button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" onClick={nextError}>Zur nächsten fehlerhaften Aufgabe · Fehler {normalizedErrorCursor+1} von {errorTasks.length}</button>}
          <button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" onClick={jumpNextOpen} disabled={!openTasks.length}>Nächste offene Aufgabe</button>
          <button type="button" className="button-primary !min-h-8 !px-3 !py-1 text-xs" disabled={!batch.dirtyCount||batch.saving} onClick={()=>void batch.saveAll()}>{batch.saving?"Speichert …":batch.dirtyCount?`Speichern (${batch.dirtyCount})`:"Alles gespeichert"}</button>
          <button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" aria-expanded={detailsOpen} onClick={()=>setDetailsOpen(value=>!value)}>Mehr</button>
        </div>
      </div>
      {batch.message&&<p className="mt-1 text-xs text-[var(--color-text-muted)]" role="status" aria-live="polite">{batch.message}</p>}
      {detailsOpen&&<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-2 text-xs">{statusDetails.map(([name,value])=><span key={name}><b>{name}:</b> {value}</span>)}<button type="button" className="font-semibold text-[var(--color-primary-dark)] underline" disabled={!batch.dirtyCount||batch.saving} onClick={batch.requestDiscardAll}>Alle Änderungen verwerfen</button></div>}
    </aside>}

    <button type="button" onClick={()=>setPanelOpen(true)} aria-label="Aufgabenübersicht öffnen" title="Aufgabenübersicht" className="fixed right-0 top-1/2 z-30 rounded-l-lg border border-r-0 border-[var(--color-primary)] bg-[var(--color-primary-dark)] px-2 py-3 text-sm font-semibold text-white shadow-lg [writing-mode:vertical-rl]">Aufgabenübersicht</button>
    {panelOpen&&<div className="fixed inset-0 z-40 bg-black/20" role="presentation" onClick={()=>setPanelOpen(false)}>
      <aside role="dialog" aria-modal="true" aria-labelledby="task-navigator-title" className="absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-2xl sm:max-w-md" onClick={(event)=>event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3"><h2 id="task-navigator-title" className="text-xl font-semibold">Aufgabenübersicht</h2><button type="button" className="button-secondary" onClick={()=>setPanelOpen(false)} aria-label="Aufgabenübersicht schließen">Schließen</button></div>
        <label className="mt-4 block text-sm font-semibold">Aufgabensuche<input className="input mt-1" value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Code, Aufgabe oder Bereich"/></label>
        <label className="mt-3 block text-sm font-semibold">Statusfilter<select className="input mt-1" value={filter} onChange={(event)=>setFilter(event.target.value as typeof filter)}>{filters.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <div className="mt-4 space-y-4">{categories.map((category)=>{const categoryTasks=shownTasks.filter(task=>task.category===category);if(!categoryTasks.length)return null;const allCategory=tasks.filter(task=>task.category===category);const completed=allCategory.filter(task=>["Erledigt","Nicht zutreffend","In Folgemonat übertragen"].includes(taskState(task).status)).length;const errors=allCategory.filter(task=>Boolean(taskState(task).error)).length;return <section key={category}><h3 className="flex items-center justify-between gap-3 border-b pb-2 text-sm font-semibold"><span>{category}</span><span>{completed}/{allCategory.length} · {errors} Fehler</span></h3><ul className="mt-2 space-y-2">{categoryTasks.map(task=>{const state=taskState(task);return <li key={task.id}><button type="button" onClick={()=>jumpToTask(task.id,Boolean(state.error))} aria-current={visibleTaskId===task.id?"location":undefined} className={`w-full rounded border p-3 text-left text-sm ${visibleTaskId===task.id?"border-[var(--color-primary)] bg-[var(--color-primary-light)]":"border-[var(--color-border)] bg-white"}`}><span className="font-mono text-xs">{task.code}</span><span className="mt-1 block font-semibold">{task.title}</span><span className="mt-2 block text-xs text-slate-600">{state.status} · {task.reviewStatus}{state.dirty?" · Ungespeichert":""}{state.error?" · Fehlerhaft":""}{task.hasQuestion?" · Rückfrage":""}{task.transferred?" · Übertrag":""}{task.campusAvailable?" · Campus":""}</span></button></li>})}</ul></section>})}{!shownTasks.length&&<p className="rounded border bg-white p-6 text-center text-sm text-slate-600">Keine Aufgaben entsprechen dem Filter.</p>}</div>
      </aside>
    </div>}
  </>;
}
