import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const processing = readFileSync(join(root, "app/components/task-processing-form.tsx"), "utf8");
const transfer = readFileSync(join(root, "app/components/task-transfer-form.tsx"), "utf8");
const shell = readFileSync(join(root, "app/components/app-shell.tsx"), "utf8");
const monthly = readFileSync(join(root, "app/monatschecklisten/[id]/page.tsx"), "utf8");

describe("Kompakte Workflow-Bedienung", () => {
  it("zeigt die Begründung nur bei Nicht zutreffend und verlangt sie", () => {
    expect(processing).toContain('status === "Nicht zutreffend"');
    expect(processing).toContain("Begründung für „Nicht zutreffend“");
    expect(processing).toContain("required");
  });

  it("öffnet die Übertragung standardmäßig geschlossen", () => {
    expect(transfer).toContain("<details");
    expect(transfer).not.toContain("<details open");
    expect(transfer).toContain("Aufgabe übertragen");
    expect(transfer).toContain("Abbrechen");
    expect(transfer).toContain("disabled={pending}");
  });

  it("verwendet die fachlichen Modulbezeichnungen", () => {
    expect(shell).toContain('label:"Rechnungswesen"');
    expect(shell).toContain('label:"FiBu ↔ Lohn"');
    expect(shell).not.toContain('label:"Monatschecklisten"');
  });

  it("bietet die kontrollierte Übernahme fehlender Standardaufgaben", () => {
    expect(monthly).toContain("Fehlende Standardaufgaben übernehmen");
  });
});
