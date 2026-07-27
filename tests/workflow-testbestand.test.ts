import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reset = readFileSync("scripts/reset-workflow-test.mjs", "utf8");
const seed = readFileSync("prisma/workflow-test-seed.ts", "utf8");

describe("Geschützter Workflow-Testbestand", () => {
  it("setzt ausschließlich die fest definierte Workflow-Testdatenbank zurück", () => {
    expect(reset).toContain('resolve(prismaDirectory, "workflow-test.db")');
    expect(reset).toContain("databasePath !== allowedDatabase");
    expect(reset).toContain("SCHUTZABBRUCH");
    expect(reset).not.toContain('resolve(prismaDirectory, "dev.db")');
  });

  it("schützt bekannte Entwicklungs-, Abnahme-, Pilot- und Produktionsnamen", () => {
    for (const name of ["dev.db", "acceptance.db", "pilot.db", "production.db"]) expect(reset).toContain(name);
  });

  it("erzeugt alle definierten künstlichen Benutzer und Mandanten", () => {
    for (const username of ["anna.bearbeiter", "peter.pruefer", "maria.kombiniert", "klaus.leitung", "admin.test", "campus.verantwortlich"]) {
      expect(seed).toContain(username);
    }
    for (let number=90001;number<=90012;number++) expect(seed).toContain(String(number));
  });

  it("berechnet Vormonat, Vorvormonat und Jahreswechsel dynamisch", () => {
    expect(seed).toContain("addMonths(current, -1)");
    expect(seed).toContain("addMonths(current, -2)");
    expect(seed).not.toMatch(/calendarYear:\s*2026/);
  });

  it("enthält vielfältige Aufgabenrhythmen, Bedingungen und Campus-Beispiele", () => {
    for (const taskId of ["WF-BANK-001", "WF-QUARTAL", "WF-HALBJAHR", "WF-CUSTOM", "WF-JANUAR", "WF-DEZEMBER", "WF-JA-RUECK", "WF-JA-EUER"]) {
      expect(seed).toContain(taskId);
    }
    for (const rhythm of ["Monatlich", "Vierteljährlich", "Halbjährlich", "Benutzerdefinierte Monate", "Jährlich"]) {
      expect(seed).toContain(`rhythm:"${rhythm}"`);
    }
    expect(seed).toContain('"DATEV Hilfe"');
    expect(seed).toContain('status:"Entwurf"');
    expect(seed).toContain("standardTaskKnowledgeHistory.create");
  });
});
