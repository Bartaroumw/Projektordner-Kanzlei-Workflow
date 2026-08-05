import { KNOWLEDGE_TARGET_AUDIENCES } from "@/lib/knowledge-platform-catalog";
import { saveLearningPathAction } from "../actions";

type Path = {
  id?: number;
  key?: string;
  title?: string;
  shortDescription?: string;
  objective?: string;
  targetAudiences?: string;
  status?: string;
  sortOrder?: number;
  items?: { knowledgeContentId: number; sortOrder: number }[];
};

export function LearningPathForm({ path, contents }: { path?: Path; contents: { id: number; title: string; status: string }[] }) {
  const currentOrder = new Map(path?.items?.map((item) => [item.knowledgeContentId, item.sortOrder]));
  const selected = new Set(currentOrder.keys());
  const audiences = new Set(path?.targetAudiences?.split("|") ?? ["ALLE"]);
  const orderedContents = [...contents].sort((left, right) => {
    const leftOrder = currentOrder.get(left.id);
    const rightOrder = currentOrder.get(right.id);
    if (leftOrder !== undefined || rightOrder !== undefined) return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
    return left.title.localeCompare(right.title, "de");
  });

  return <form action={saveLearningPathAction} className="space-y-5">
    <input type="hidden" name="id" value={path?.id ?? ""}/>
    <section className="grid gap-4 rounded-xl border bg-white p-6 md:grid-cols-2">
      <Field name="key" label="Stabiler Schlüssel" value={path?.key}/><Field name="title" label="Titel" value={path?.title}/><Field name="shortDescription" label="Kurzbeschreibung" value={path?.shortDescription}/><Field name="objective" label="Ziel" value={path?.objective}/><Field name="sortOrder" label="Sortierung" value={String(path?.sortOrder ?? 0)} type="number"/>
      <label className="grid gap-1 text-xs font-semibold">Status<select className="input" name="status" defaultValue={path?.status ?? "Entwurf"}><option>Entwurf</option><option>Aktiv</option><option>Archiviert</option></select></label>
      <fieldset><legend className="text-xs font-semibold">Zielgruppen</legend><div className="mt-2 grid gap-2">{KNOWLEDGE_TARGET_AUDIENCES.map((role) => <label className="flex gap-2 text-sm" key={role}><input type="checkbox" name="targetAudiences" value={role} defaultChecked={audiences.has(role)}/>{role}</label>)}</div></fieldset>
    </section>
    <section className="rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">Geordnete Inhalte</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Inhalte auswählen und ihre fachliche Reihenfolge als Zahl festlegen. Spätere Inhalte bleiben frei zugänglich.</p>
      <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto">{orderedContents.map((content, index) => <div className="grid gap-3 rounded bg-[var(--color-background)] p-3 sm:grid-cols-[1fr_9rem]" key={content.id}><label className="flex gap-3 text-sm"><input type="checkbox" name="contentIds" value={content.id} defaultChecked={selected.has(content.id)}/><span><strong>{content.title}</strong><span className="ml-2 text-xs">{content.status}</span></span></label><Field name={`contentOrder_${content.id}`} label="Reihenfolge" value={String(currentOrder.get(content.id) ?? (index + 1) * 10)} type="number"/></div>)}</div>
    </section>
    <button className="button-primary">Lernpfad speichern</button>
  </form>;
}

function Field({ name, label, value, type = "text" }: { name: string; label: string; value?: string; type?: string }) {
  return <label className="grid gap-1 text-xs font-semibold">{label}<input className="input" name={name} type={type} defaultValue={value ?? ""} required/></label>;
}
