import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const panel = readFileSync(join(root, "app/components/ordo-campus-panel.tsx"), "utf8");
const monthly = readFileSync(join(root, "app/monatschecklisten/[id]/page.tsx"), "utf8");
const annual = readFileSync(join(root, "app/jahresabschluesse/[id]/page.tsx"), "utf8");
const standardTasks = readFileSync(join(root, "app/standardaufgaben/page.tsx"), "utf8");

describe("Ordo-Campus-Bedienoberfläche", () => {
  it("lädt Wissen erst beim Öffnen des Seitenpanels", () => {
    expect(panel).toContain("fetch(`/api/ordo-campus/${kind}/${taskId}`");
    expect(panel).toContain("if (!open) return");
  });

  it("integriert denselben Wissenszugang in Monats- und Jahresabschlussaufgaben", () => {
    expect(monthly).toContain('<OrdoCampusPanel kind="monat"');
    expect(annual).toContain('<OrdoCampusPanel kind="jahresabschluss"');
  });

  it("zeigt die Wissensbereiche in der verbindlichen Reihenfolge", () => {
    const labels = ["Kurzbeschreibung", "Ziel der Aufgabe", "Verbindlicher Kanzleistandard", "Bearbeitungshinweise", "Hinweise für die fachliche Prüfung", "Häufige Fehler", "DATEV- und Fachlinks", "Interne Hinweise"];
    let position = -1;
    for (const label of labels) {
      const next = panel.indexOf(label);
      expect(next).toBeGreaterThan(position);
      position = next;
    }
  });

  it("öffnet externe Wissenslinks sicher in einem neuen Tab", () => {
    expect(panel).toContain('target="_blank"');
    expect(panel).toContain('rel="noopener noreferrer"');
  });

  it("bietet Info-Popover und interne Unterlagen ohne Pfadangabe",()=>{
    expect(panel).toContain("Was ist Ordo Campus?");
    expect(panel).toContain("Ordo Campus unterstützt Sie direkt bei der Bearbeitung");
    expect(panel).toContain("Interne Unterlagen");
    expect(panel).not.toContain("storageKey");
  });

  it("bietet Campus-Status und Wissensfilter in der Standardaufgabenübersicht", () => {
    expect(standardTasks).toContain('"Campus"');
    expect(standardTasks).toContain('"mit-wissen"');
    expect(standardTasks).toContain('"ohne-datev"');
  });
});
