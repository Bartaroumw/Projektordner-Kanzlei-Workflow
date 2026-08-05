import { describe, expect, it } from "vitest";import{readFileSync}from"node:fs";import{resolve}from"node:path";
const read=(file:string)=>readFileSync(resolve(file),"utf8");
describe("Ordo Campus 2.0 Oberfläche",()=>{
  it("stellt sieben lesende Campus-Bereiche bereit",()=>{const tabs=read("app/components/ordo-campus-tabs.tsx");for(const label of ["Start","Wissensgebiete","Lernpfade","Kanzleistandards","Neu und aktualisiert","Zuletzt angesehen","Suche"])expect(tabs).toContain(label)});
  it("trennt Campus-Leseansicht und Wissensmanagement",()=>{expect(read("app/ordo-campus/page.tsx")).not.toContain("Wissensinhalt speichern");expect(read("app/verwaltung/wissensmanagement/wissen/knowledge-form.tsx")).toContain("Wissensinhalt speichern")});
  it("zeigt mehrere Inhalte und den Hauptinhalt im Aufgabenpanel",()=>{const panel=read("app/components/ordo-campus-panel.tsx");expect(panel).toContain("contents.map");expect(panel).toContain("Hauptinhalt");expect(panel).toContain("Vollständig öffnen")});
  it("rendert nur sichere selbst erzeugte Formatierung",()=>{const rich=read("app/components/knowledge-rich-text.tsx");expect(rich).not.toContain("dangerouslySetInnerHTML");expect(rich).toContain('rel="noopener noreferrer"')});
  it("erläutert die freiwillige Lesemarkierung ohne Schulungsnachweis",()=>{const controls=read("app/ordo-campus/wissen/[id]/knowledge-progress-controls.tsx");expect(controls).toContain("kein Schulungsnachweis");expect(controls).toContain("Markierung als gelesen entfernen")});
  it("stellt Wissensmanagement nur über die Zusatzberechtigung bereit",()=>{const navigation=read("lib/administration-navigation.ts");expect(navigation).toContain("if (canManageOrdoCampus(user)) sections.push(\"wissensmanagement\")")});
  it("erhält Verknüpfungsart, Reihenfolge und Kurzhinweis in der Pflege",()=>{const form=read("app/verwaltung/wissensmanagement/wissen/knowledge-form.tsx");expect(form).toContain("Verknüpfungsart");expect(form).toContain("Reihenfolge");expect(form).toContain("Aufgabenbezogener Kurzhinweis")});
  it("ordnet Lernpfade über ausdrücklich pflegbare Reihenfolgen",()=>{const form=read("app/verwaltung/wissensmanagement/lernpfade/learning-path-form.tsx");const actions=read("app/verwaltung/wissensmanagement/actions.ts");expect(form).toContain("contentOrder_");expect(actions).toContain("requestedOrder")});
});
