"use client";

import { useState } from "react";
import type { ImportPreview } from "@/lib/task-import";

type ImportResult = {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  createdCategoryCount: number;
};

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmCategories, setConfirmCategories] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function checkFile() {
    if (!file) {
      setError("Bitte wählen Sie zuerst eine .xlsx-Datei aus.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setPreview(null);
    setPreviewId(null);
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/standardaufgaben/import/pruefen", { method: "POST", body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPreview(body.preview);
      setPreviewId(body.previewId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Datei konnte nicht geprüft werden.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!previewId) {
      setError("Vor dem Import ist eine fehlerfreie Vorschau erforderlich.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/standardaufgaben/import/bestaetigen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewId,
          confirmed: true,
          confirmNewCategories: confirmCategories,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResult(body.history);
      setPreview(null);
      setPreviewId(null);
      setFile(null);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Der Import ist fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">1. Datei auswählen und prüfen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Die Auswahl startet noch keinen Import. Zulässig sind ausschließlich .xlsx-Dateien bis 5 MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="input max-w-xl"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setPreviewId(null);
              setResult(null);
            }}
            type="file"
          />
          <button className="button-primary" disabled={loading} onClick={checkFile} type="button">
            {loading ? "Bitte warten …" : "Datei prüfen"}
          </button>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</div>}
      {result && <Result result={result} />}
      {preview && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">2. Importvorschau</h2>
          <p className="mt-1 text-sm text-slate-600">Geprüfte Datei: {preview.originalFileName}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Count label="Neue Aufgaben" value={preview.counts.new} />
            <Count label="Zu aktualisieren" value={preview.counts.update} />
            <Count label="Unverändert" value={preview.counts.unchanged} />
            <Count label="Zu deaktivieren" value={preview.counts.deactivate} />
          </div>

          {preview.newCategories.length > 0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-950">Neue Kategorien</h3>
              <p className="mt-1 text-sm text-amber-900">{preview.newCategories.join(", ")}</p>
              <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-950">
                <input checked={confirmCategories} onChange={(event) => setConfirmCategories(event.target.checked)} type="checkbox" />
                Diese neuen Kategorien ausdrücklich anlegen.
              </label>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <PreviewList title="Warnungen" items={preview.warnings} tone="warning" />
          )}
          {preview.errors.length > 0 && (
            <div className="mt-5">
              <h3 className="font-semibold text-red-900">Fehlerhafte Zeilen</h3>
              <div className="mt-2 overflow-x-auto rounded-lg border border-red-200">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-red-50"><tr><th className="p-3">Excel-Zeile</th><th className="p-3">Aufgaben-ID</th><th className="p-3">Spalte</th><th className="p-3">Fehler</th></tr></thead>
                  <tbody>{preview.errors.map((item, index) => <tr className="border-t border-red-100" key={`${item.row}-${item.column}-${index}`}><td className="p-3">{item.row || "–"}</td><td className="p-3">{item.taskId || "–"}</td><td className="p-3">{item.column}</td><td className="p-3">{item.message}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5">
            <button
              className="button-primary"
              disabled={loading || preview.errors.length > 0 || (preview.newCategories.length > 0 && !confirmCategories)}
              onClick={confirmImport}
              type="button"
            >
              Import ausdrücklich bestätigen
            </button>
            {preview.errors.length > 0 && <p className="mt-2 text-sm text-red-700">Der Import ist erst nach Korrektur aller Fehler möglich.</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 p-4"><div className="text-sm text-slate-600">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}

function PreviewList({ title, items, tone }: { title: string; items: string[]; tone: "warning" }) {
  return <div className={`mt-5 rounded-lg border p-4 ${tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-950" : ""}`}><h3 className="font-semibold">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function Result({ result }: { result: ImportResult }) {
  return <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">Import erfolgreich: {result.createdCount} neu, {result.updatedCount} aktualisiert, {result.unchangedCount} unverändert, {result.deactivatedCount} deaktiviert und {result.createdCategoryCount} Kategorien angelegt.</div>;
}
