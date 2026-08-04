import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sameTaskDraft, validateTaskDraft, type ChecklistTaskDraft } from "../lib/checklist-batch.ts";

const baseline: ChecklistTaskDraft = {
  status: "Offen",
  processingNote: "",
  notApplicableReason: "",
  carryProcessingNote: false,
};

describe("Dirty-State der Sammelspeicherung", () => {
  it("erkennt eine unveränderte Aufgabe nicht als geändert", () => {
    expect(sameTaskDraft(baseline, {...baseline})).toBe(true);
  });
  it("erkennt eine Statusänderung", () => {
    expect(sameTaskDraft(baseline, {...baseline,status:"In Bearbeitung"})).toBe(false);
  });
  it("erkennt eine Notizänderung", () => {
    expect(sameTaskDraft(baseline, {...baseline,processingNote:"Künstliche Notiz"})).toBe(false);
  });
  it("erkennt die Änderung des Übernahmeflags", () => {
    expect(sameTaskDraft(baseline, {...baseline,carryProcessingNote:true})).toBe(false);
  });
  it("entfernt den Dirty-State bei Rückkehr zum gespeicherten Wert", () => {
    const changed={...baseline,status:"Erledigt"};
    expect(sameTaskDraft(baseline,changed)).toBe(false);
    expect(sameTaskDraft(baseline,{...changed,status:"Offen"})).toBe(true);
  });
});

describe("Validierung der Sammelspeicherung", () => {
  it("verlangt bei Nicht zutreffend eine Begründung", () => {
    expect(validateTaskDraft({...baseline,status:"Nicht zutreffend"})).toMatch(/Begründung/);
  });
  it("akzeptiert Nicht zutreffend mit Begründung", () => {
    expect(validateTaskDraft({...baseline,status:"Nicht zutreffend",notApplicableReason:"Künstliche nachvollziehbare Begründung"})).toBeNull();
  });
  it("verlangt für die Folgeperiodenübernahme eine Notiz", () => {
    expect(validateTaskDraft({...baseline,carryProcessingNote:true})).toMatch(/Bearbeitungsnotiz/);
  });
  it("akzeptiert das Übernahmeflag mit Notiz", () => {
    expect(validateTaskDraft({...baseline,carryProcessingNote:true,processingNote:"Künstlicher Folgehinweis"})).toBeNull();
  });
});

describe("Bedien- und Serverschnittstelle", () => {
  const provider=readFileSync("app/components/checklist-batch-provider.tsx","utf8");
  const tools=readFileSync("app/components/checklist-workspace-tools.tsx","utf8");
  const taskForm=readFileSync("app/components/task-processing-form.tsx","utf8");
  const monthlyActions=readFileSync("app/monatschecklisten/actions.ts","utf8");
  const annualActions=readFileSync("app/jahresabschluesse/actions.ts","utf8");

  it("entfernt den Einzel-Speicherbutton und bietet lokales Verwerfen", () => {
    expect(taskForm).not.toContain("Bearbeitung speichern");
    expect(taskForm).toContain("Änderungen dieser Aufgabe verwerfen");
  });
  it("zählt geänderte Aufgaben statt einzelner Felder", () => {
    expect(provider).toContain("dirtyEntries.length");
    expect(tools).toContain("Speichern (${batch.dirtyCount})");
  });
  it("setzt erfolgreiche Antworten als neuen Ausgangszustand", () => {
    expect(provider).toContain("baseline, current: baseline");
  });
  it("unterstützt Teil-Erfolg und den Sprung zur fehlerhaften Aufgabe", () => {
    expect(provider).toContain("Aufgaben wurden gespeichert");
    expect(tools).toContain("Zur nächsten fehlerhaften Aufgabe");
    expect(tools).toContain("von {errorTasks.length}");
    expect(provider).toContain(".filter((taskId) => localErrors.has(taskId) || !results.get(taskId)?.ok)");
  });
  it("bietet bestätigtes Gesamtverwerfen", () => {
    expect(provider).toContain("Alle Änderungen verwerfen?");
    expect(provider).toContain("Änderungen verwerfen");
  });
  it("warnt beim Browser-Verlassen und bei internen Links", () => {
    expect(provider).toContain('window.addEventListener("beforeunload"');
    expect(provider).toContain("Ungespeicherte Änderungen");
    expect(provider).toContain("Ohne Speichern verlassen");
  });
  it("blockiert Workflowaktionen mit offenen Eingaben", () => {
    expect(provider).toContain('form.dataset.workflowAction === "true"');
    expect(provider).toContain("Vor dieser Aktion müssen");
    expect(readFileSync("app/components/task-transfer-form.tsx","utf8")).toContain('data-workflow-action="true"');
  });
  it("verwendet Strg+S und zugängliche Statusmeldungen", () => {
    expect(provider).toContain("event.ctrlKey || event.metaKey");
    expect(tools).toContain('aria-live="polite"');
    expect(tools).toContain('aria-label="Kompakte Checklistenleiste"');
  });
  it("speichert Rechnungswesenaufgaben sequenziell und prüft die Checklistenzugehörigkeit", () => {
    expect(monthlyActions).toContain("saveChecklistTaskChangesAction");
    expect(monthlyActions).toContain("for (const change of ordered)");
    expect(monthlyActions).toContain("assignment.periodId!==periodId");
  });
  it("speichert Jahresabschlussaufgaben über dieselbe Ergebnisstruktur", () => {
    expect(annualActions).toContain("saveAnnualTaskChangesAction");
    expect(annualActions).toContain("ChecklistBatchSaveResult");
    expect(annualActions).toContain("assignment.annualChecklistId!==checklistId");
  });
  it("erkennt konkurrierende Änderungen über updatedAt", () => {
    expect(readFileSync("lib/monthly-checklist-service.ts","utf8")).toContain("task.updatedAt.toISOString() !== input.expectedUpdatedAt");
    expect(readFileSync("lib/annual-checklist-service.ts","utf8")).toContain("task.updatedAt.toISOString()!==input.expectedUpdatedAt");
  });
  it("hält die Sticky-Leiste bei kleinen Breiten umbruchfähig", () => {
    expect(tools).toContain("flex flex-wrap");
    expect(tools).toContain("sticky top-0");
  });
});
