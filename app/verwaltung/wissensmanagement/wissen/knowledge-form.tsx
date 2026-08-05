import { KNOWLEDGE_CONTENT_TYPES, KNOWLEDGE_LINK_TYPES, KNOWLEDGE_TARGET_AUDIENCES } from "@/lib/knowledge-platform-catalog";
import { saveKnowledgeContentAction } from "../actions";

type ApplicationLink = { linkType: string; sortOrder: number; mainContent: boolean; contextHint?: string | null };
type Data = {
  id?: number;
  key?: string;
  title?: string;
  shortDescription?: string | null;
  objective?: string | null;
  mainContent?: string | null;
  workingGuidance?: string | null;
  firmStandard?: string | null;
  typicalErrors?: string | null;
  reviewerGuidance?: string | null;
  internalHints?: string | null;
  status?: string;
  contentTypes?: string;
  targetAudiences?: string;
  responsibleUserId?: number | null;
  nextReviewDate?: Date | null;
  areas?: { knowledgeAreaId: number; primaryArea: boolean }[];
  taskLinks?: (ApplicationLink & { standardTaskId: number })[];
  payrollTopicLinks?: (ApplicationLink & { payrollReconciliationTopicId: number })[];
  tags?: { knowledgeTag: { title: string } }[];
};

type ApplicationItem = { id: number; label: string; detail: string };

export function KnowledgeForm({ content, areas, users, tasks, topics }: { content?: Data; areas: { id: number; title: string; parentId: number | null }[]; users: { id: number; fullName: string }[]; tasks: { id: number; taskId: string; title: string; checklistType: string }[]; topics: { id: number; key: string; title: string }[] }) {
  const types = content?.contentTypes?.split("|") ?? ["Fachwissen"];
  const audiences = content?.targetAudiences?.split("|") ?? ["ALLE"];
  const areaIds = new Set(content?.areas?.map((item) => item.knowledgeAreaId));
  const taskLinks = new Map(content?.taskLinks?.map((link) => [link.standardTaskId, link]));
  const topicLinks = new Map(content?.payrollTopicLinks?.map((link) => [link.payrollReconciliationTopicId, link]));

  return <form action={saveKnowledgeContentAction} className="space-y-6">
    <input type="hidden" name="id" value={content?.id ?? ""}/>
    <section className="grid gap-4 rounded-xl border bg-white p-6 md:grid-cols-2">
      <Input name="key" label="Stabiler Schlüssel" value={content?.key}/><Input name="title" label="Titel" value={content?.title}/><Text name="shortDescription" label="Kurzbeschreibung" value={content?.shortDescription}/><Text name="objective" label="Ziel / fachlicher Zweck" value={content?.objective}/><Select name="status" label="Status" value={content?.status ?? "Entwurf"} options={["Entwurf", "Aktiv", "Archiviert"]}/><Select name="responsibleUserId" label="Verantwortliche Person" value={content?.responsibleUserId ? String(content.responsibleUserId) : ""} options={users.map((user) => String(user.id))} labels={users.map((user) => user.fullName)} empty="Nicht zugeordnet"/><Input name="nextReviewDate" label="Nächstes Prüfdatum" value={content?.nextReviewDate?.toISOString().slice(0, 10)} type="date"/><Input name="tags" label="Schlagwörter (kommagetrennt)" value={content?.tags?.map((tag) => tag.knowledgeTag.title).join(", ")}/>
    </section>
    <section className="grid gap-4 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">Inhalte</h2><Text name="mainContent" label="Fachwissen / Hauptinhalt" value={content?.mainContent} rows={8}/><Text name="workingGuidance" label="Arbeitsanleitung" value={content?.workingGuidance} rows={8}/><Text name="firmStandard" label="Verbindlicher Kanzleistandard" value={content?.firmStandard} rows={7}/><Text name="typicalErrors" label="Typische Fehler" value={content?.typicalErrors} rows={6}/><Text name="reviewerGuidance" label="Prüferhinweise (geschützt)" value={content?.reviewerGuidance} rows={6}/><Text name="internalHints" label="Interne Hinweise" value={content?.internalHints} rows={5}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="majorUpdate" value="1"/>Diese Änderung ausdrücklich als wesentlich kennzeichnen</label>
    </section>
    <section className="grid gap-6 rounded-xl border bg-white p-6 md:grid-cols-2"><CheckGroup title="Inhaltstypen" name="contentTypes" values={KNOWLEDGE_CONTENT_TYPES} selected={new Set(types)}/><CheckGroup title="Zielgruppen (Empfehlung)" name="targetAudiences" values={KNOWLEDGE_TARGET_AUDIENCES} selected={new Set(audiences)}/></section>
    <section className="rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">Wissensgebiete</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Mindestens ein Gebiet und genau ein primäres Gebiet auswählen.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{areas.map((area) => <div className="rounded bg-[var(--color-background)] p-3" key={area.id}><label className="flex gap-2 text-sm"><input type="checkbox" name="areaIds" value={area.id} defaultChecked={areaIds.has(area.id)}/><span>{area.parentId ? "↳ " : ""}{area.title}</span></label><label className="ml-6 mt-2 flex gap-2 text-xs"><input type="radio" name="primaryAreaId" value={area.id} defaultChecked={content?.areas?.some((item) => item.knowledgeAreaId === area.id && item.primaryArea)}/><span>Primäres Gebiet</span></label></div>)}</div></section>
    <ApplicationLinks title="Standard- und Jahresabschlussaufgaben" prefix="task" items={tasks.map((task) => ({ id: task.id, label: `${task.taskId} · ${task.title}`, detail: task.checklistType }))} links={taskLinks}/>
    <ApplicationLinks title="Rechnungswesen ↔ Lohn-Themen" prefix="topic" items={topics.map((topic) => ({ id: topic.id, label: topic.title, detail: topic.key }))} links={topicLinks}/>
    <div className="sticky bottom-3 flex justify-end rounded-xl border bg-white/95 p-4 shadow-lg"><button className="button-primary">Wissensinhalt speichern</button></div>
  </form>;
}

function Input({ name, label, value, type = "text" }: { name: string; label: string; value?: string | null; type?: string }) {
  return <label className="grid gap-1 text-xs font-semibold">{label}<input className="input" required={["key", "title"].includes(name)} type={type} name={name} defaultValue={value ?? ""}/></label>;
}

function Text({ name, label, value, rows = 3 }: { name: string; label: string; value?: string | null; rows?: number }) {
  return <label className="grid gap-1 text-xs font-semibold md:col-span-2">{label}<textarea className="input min-h-24" rows={rows} name={name} defaultValue={value ?? ""}/></label>;
}

function Select({ name, label, value, options, labels, empty }: { name: string; label: string; value: string; options: readonly string[]; labels?: string[]; empty?: string }) {
  return <label className="grid gap-1 text-xs font-semibold">{label}<select className="input" name={name} defaultValue={value}>{empty && <option value="">{empty}</option>}{options.map((option, index) => <option value={option} key={option}>{labels?.[index] ?? option}</option>)}</select></label>;
}

function CheckGroup({ title, name, values, selected }: { title: string; name: string; values: readonly string[]; selected: Set<string> }) {
  return <fieldset><legend className="font-bold">{title}</legend><div className="mt-3 grid gap-2">{values.map((value) => <label className="flex gap-2 text-sm" key={value}><input type="checkbox" name={name} value={value} defaultChecked={selected.has(value)}/>{value}</label>)}</div></fieldset>;
}

function ApplicationLinks({ title, prefix, items, links }: { title: string; prefix: "task" | "topic"; items: ApplicationItem[]; links: Map<number, ApplicationLink> }) {
  return <section className="rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Mehrfachzuordnung mit Verknüpfungsart, Reihenfolge, Hauptinhalt und kurzem Kontexthinweis.</p><div className="mt-4 max-h-[42rem] space-y-3 overflow-y-auto">{items.map((item, index) => { const link = links.get(item.id); return <fieldset className="rounded bg-[var(--color-background)] p-3" key={item.id}><legend className="sr-only">{item.label}</legend><label className="flex gap-2 text-sm"><input type="checkbox" name={`${prefix}Id`} value={item.id} defaultChecked={Boolean(link)}/><span><strong>{item.label}</strong><span className="block text-xs text-[var(--color-text-muted)]">{item.detail}</span></span></label><div className="ml-6 mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_8rem_auto_2fr]"><Select name={`${prefix}Type_${item.id}`} label="Verknüpfungsart" value={link?.linkType ?? "Ergänzendes Wissen"} options={KNOWLEDGE_LINK_TYPES}/><Input name={`${prefix}Order_${item.id}`} label="Reihenfolge" type="number" value={String(link?.sortOrder ?? index * 10)}/><label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold"><input type="radio" name={`${prefix}PrimaryId`} value={item.id} defaultChecked={link?.mainContent}/>Hauptinhalt</label><Input name={`${prefix}Hint_${item.id}`} label="Aufgabenbezogener Kurzhinweis" value={link?.contextHint}/></div></fieldset>; })}</div></section>;
}
