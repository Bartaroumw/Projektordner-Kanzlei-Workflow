"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CampusLink = { id: number; title: string; url: string; linkType: string; description: string | null };
type CampusAttachment = { id:number; displayName:string; fileExtension:string; fileSizeBytes:number; description:string|null };
type CampusKnowledge = {
  standardTaskId: number;
  status: string;
  shortDescription: string | null;
  objective: string | null;
  firmStandard: string | null;
  processingGuidance: string | null;
  reviewerGuidance: string | null;
  typicalErrors: string | null;
  internalHints: string | null;
  links: CampusLink[];
  attachments: CampusAttachment[];
};

export function OrdoCampusPanel({
  kind,
  taskId,
  activeKnowledge,
}: {
  kind: "monat" | "jahresabschluss";
  taskId: number;
  activeKnowledge: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ knowledge: CampusKnowledge | null; canEdit: boolean; editHref?: string | null } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    fetch(`/api/ordo-campus/${kind}/${taskId}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Ordo Campus konnte nicht geladen werden.");
        return body;
      })
      .then((body) => current && setData(body))
      .catch((reason) => current && setError(reason instanceof Error ? reason.message : "Ordo Campus konnte nicht geladen werden."))
      .finally(() => current && setLoading(false));
    closeRef.current?.focus();
    return () => { current = false; };
  }, [kind, open, taskId]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function closePanel() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return <>
    <span className="mt-2 inline-flex flex-wrap items-center gap-2"><button
      ref={triggerRef}
      type="button"
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold ${
        activeKnowledge
          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] hover:bg-white"
          : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-muted)] opacity-75 hover:opacity-100"
      }`}
      onClick={() => {
        setLoading(true);
        setError("");
        setData(null);
        setOpen(true);
      }}
      aria-haspopup="dialog"
      title={activeKnowledge ? "Anleitung und Kanzleistandard verfügbar" : "Für diese Aufgabe ist noch kein Ordo-Campus-Wissen hinterlegt."}
    >
      <span aria-hidden="true">📘</span>
      <span>Ordo Campus</span>
      <span className="text-xs font-normal">{activeKnowledge ? "Verfügbar" : "Nicht hinterlegt"}</span>
    </button><details className="relative">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--color-border)] bg-white font-semibold text-[var(--color-primary-dark)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-focus)]" aria-label="Was ist Ordo Campus?">ⓘ</summary>
      <div className="absolute left-0 z-20 mt-2 w-[min(22rem,80vw)] rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm font-normal leading-6 shadow-lg">
        <strong className="block text-[var(--color-primary-dark)]">Ordo Campus</strong>
        Ordo Campus unterstützt Sie direkt bei der Bearbeitung mit Arbeitsanleitungen, verbindlichen Kanzleistandards, Prüferhinweisen und weiterführenden Fachinformationen. DATEV-Inhalte werden ausschließlich über externe Links geöffnet.
      </div>
    </details></span>
    {open && <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 cursor-default bg-black/20" type="button" aria-label="Ordo Campus schließen" onClick={closePanel}/>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`campus-title-${taskId}`}
        className="absolute inset-y-2 right-2 w-[calc(100%-1rem)] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:w-[min(92vw,44rem)] xl:w-[44vw] xl:max-w-[52rem]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">Ordo Campus</p><h2 id={`campus-title-${taskId}`} className="mt-1 text-2xl font-bold">Anleitung und Kanzleistandard</h2></div>
          <button ref={closeRef} type="button" className="button-secondary" onClick={closePanel} aria-label="Ordo Campus schließen">Schließen</button>
        </header>
        <div className="space-y-7 p-5 pb-10">
          {loading && <p role="status" className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-4">Ordo Campus wird geladen …</p>}
          {error && <p role="alert" className="rounded border border-[var(--color-error)] bg-white p-4 text-[var(--color-error)]">{error}</p>}
          {!loading && !error && data?.knowledge && <CampusContents knowledge={data.knowledge} kind={kind} taskId={taskId}/>}
          {!loading && !error && data && !data.knowledge && <div className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-5">
            <p>Für diese Aufgabe ist derzeit noch kein Ordo-Campus-Eintrag vorhanden.</p>
            {data.canEdit && data.editHref && <Link className="button-secondary mt-4 inline-flex" href={data.editHref}>Ordo Campus bearbeiten</Link>}
          </div>}
          {!loading && !error && data?.canEdit && data.knowledge && <Link className="button-primary inline-flex" href={`/standardaufgaben/${data.knowledge.standardTaskId}/campus`}>Ordo Campus bearbeiten</Link>}
        </div>
      </aside>
    </div>}
  </>;
}

function CampusContents({ knowledge,kind,taskId }: { knowledge: CampusKnowledge;kind:"monat"|"jahresabschluss";taskId:number }) {
  return <>
    <CampusSection title="Kurzbeschreibung" value={knowledge.shortDescription}/>
    <CampusSection title="Ziel der Aufgabe" value={knowledge.objective}/>
    {knowledge.firmStandard && <section className="rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary-light)] p-5">
      <h3 className="text-lg font-bold text-[var(--color-primary-dark)]">Verbindlicher Kanzleistandard</h3>
      <div className="mt-3"><RichText value={knowledge.firmStandard}/></div>
    </section>}
    <CampusSection title="Bearbeitungshinweise" value={knowledge.processingGuidance}/>
    <CampusSection title="Hinweise für die fachliche Prüfung" value={knowledge.reviewerGuidance}/>
    {knowledge.typicalErrors && <section>
      <h3 className="text-lg font-semibold">Häufige Fehler</h3>
      <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-[var(--color-text-muted)]"><RichText value={knowledge.typicalErrors}/></div>
    </section>}
    {knowledge.links.length > 0 && <section>
      <h3 className="text-lg font-semibold">DATEV- und Fachlinks</h3>
      <ul className="mt-3 space-y-2">{knowledge.links.map((link) => <li key={link.id}>
        <a className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]" href={link.url} target="_blank" rel="noopener noreferrer">
          <span className="font-semibold text-[var(--color-primary-dark)]">{linkIcon(link.linkType)} {link.title} <span className="sr-only">(öffnet in neuem Tab)</span><span aria-hidden="true">↗</span></span>
          <span className="mt-1 block text-xs font-semibold uppercase text-[var(--color-text-muted)]">{link.linkType}</span>
          {link.description && <span className="mt-1 block text-sm">{link.description}</span>}
        </a>
      </li>)}</ul>
    </section>}
    {knowledge.attachments.length > 0 && <section>
      <h3 className="text-lg font-semibold">Interne Unterlagen</h3>
      <ul className="mt-3 space-y-2">{knowledge.attachments.map(attachment=><li className="rounded-lg border border-[var(--color-border)] p-4" key={attachment.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{attachment.displayName}</div><div className="mt-1 text-xs font-semibold uppercase text-[var(--color-text-muted)]">{attachment.fileExtension} · {formatFileSize(attachment.fileSizeBytes)}</div>{attachment.description&&<p className="mt-2 text-sm">{attachment.description}</p>}</div>
        <a className="button-secondary" href={`/api/ordo-campus/attachments/${attachment.id}/download?kind=${kind}&taskId=${taskId}`}>Herunterladen</a></div>
      </li>)}</ul>
    </section>}
    <CampusSection title="Interne Hinweise" value={knowledge.internalHints}/>
  </>;
}

function formatFileSize(bytes:number){
  if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} KB`;
  return `${new Intl.NumberFormat("de-DE",{maximumFractionDigits:1}).format(bytes/1024/1024)} MB`;
}

function CampusSection({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return <section><h3 className="text-lg font-semibold">{title}</h3><div className="mt-2"><RichText value={value}/></div></section>;
}

function RichText({ value }: { value: string }) {
  const blocks = value.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <div className="space-y-3 leading-7">{blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const unordered = lines.every((line) => /^[-*]\s+/.test(line));
    const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));
    if (unordered) return <ul className="list-disc space-y-1 pl-6" key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inlineContent(line.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
    if (ordered) return <ol className="list-decimal space-y-1 pl-6" key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inlineContent(line.replace(/^\d+[.)]\s+/, ""))}</li>)}</ol>;
    return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br/>}{inlineContent(line)}</span>)}</p>;
  })}</div>;
}

function inlineContent(value: string) {
  return value.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) return <a className="font-semibold text-[var(--color-primary-dark)] underline" href={part} target="_blank" rel="noopener noreferrer" key={index}>{part}</a>;
    return <span key={index}>{part}</span>;
  });
}

function linkIcon(type: string) {
  if (type.startsWith("DATEV Hilfe") || type === "DATEV Info-Dokument") return "📄";
  if (type === "DATEV Lernplattform" || type === "DATEV Lernvideo") return "🎓";
  if (type === "Gesetz" || type === "Verwaltungsanweisung") return "⚖";
  return "🌐";
}
