import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { splitRoleDisplay } from "../lib/user-role-display.ts";

const shell=readFileSync("app/components/app-shell.tsx","utf8");
const clients=readFileSync("app/mandanten/page.tsx","utf8");
const workspace=readFileSync("app/mandanten/[id]/page.tsx","utf8");
const checklistTools=readFileSync("app/components/checklist-workspace-tools.tsx","utf8");
const monthly=readFileSync("app/monatschecklisten/[id]/page.tsx","utf8");
const annual=readFileSync("app/jahresabschluesse/[id]/page.tsx","utf8");

describe("Mandantenarbeitsbereich",()=>{
  it("öffnet den normalen Mandantenzeilenklick im Arbeitsbereich und behält direkte Fachaktionen",()=>{
    expect(clients).toContain('const href=`/mandanten/${client.id}`');
    expect(clients).toContain('Aktuelle Monatscheckliste öffnen');
    expect(clients).toContain('/monatschecklisten/${current.id}');
  });
  it("zeigt den Mandanten als zentralen Kontext mit Statuskarten und rollenabhängigen Reitern",()=>{
    expect(workspace).toContain("Mandantenarbeitsbereich");
    expect(workspace).toContain("Lückenlos abgeschlossen bis");
    expect(workspace).toContain("Stammdaten und Qualität");
    expect(workspace).toContain('visible:professional&&client.payrollPreparedByFirm');
    expect(workspace).toContain('{client.payrollPreparedByFirm&&<section id="fahrzeuge"');
    expect(workspace).toContain("canManageCustomTasks(user)");
  });
  it("zeigt Zuständigkeiten, Jahresprofil und Lohnqualität ohne neues Stammdatenfeld",()=>{
    expect(workspace).toContain('label="Mandantengruppe" value="Nicht hinterlegt"');
    expect(workspace).toContain('label="Lohnsachbearbeiter"');
    expect(workspace).toContain("Jahresprofil fehlt");
  });
});

describe("Checklisten-Navigation",()=>{
  it("trennt ausführlichen Seitenkopf und kompakte Sticky-Leiste",()=>{
    expect(monthly).toContain('id="checklist-full-header"');
    expect(annual).toContain('id="checklist-full-header"');
    expect(monthly).not.toContain('id="workflow" tabIndex={-1} className="sticky');
    expect(checklistTools).toContain('aria-label="Kompakte Checklistenleiste"');
    expect(checklistTools).toContain('document.getElementById("checklist-full-header")');
    expect(checklistTools).toContain("setCompactVisible(!entry.isIntersecting)");
    expect(checklistTools).toContain("Mehr");
  });
  it("bietet zyklische Fehlernavigation mit Fokus und visueller Hervorhebung",()=>{
    expect(checklistTools).toContain("(index + 1) % errorTasks.length");
    expect(checklistTools).toContain("Zur nächsten fehlerhaften Aufgabe");
    expect(checklistTools).toContain("aria-invalid='true'");
    expect(checklistTools).toContain("checklist-task-highlight");
  });
  it("enthält alle geforderten Navigatorfilter und verändert beim Sprung keine Daten",()=>{
    for(const label of ["Alle","Offen","In Bearbeitung","Erledigt","Nicht zutreffend","Übertragen","Ungespeichert","Fehlerhaft","Rückfrage","Beanstandet / Nachbearbeitung"]){
      expect(checklistTools).toContain(label);
    }
    expect(checklistTools).toContain("scrollIntoView");
    expect(checklistTools).toContain('aria-current={visibleTaskId===task.id?"location":undefined}');
  });
});

describe("Einklappbare Hauptnavigation",()=>{
  it("speichert den Zustand lokal und gibt dem Inhalt die frei werdende Breite",()=>{
    expect(shell).toContain("ordo-navigation-collapsed");
    expect(shell).toContain('navigationCollapsed ? "md:w-20" : "md:w-64"');
    expect(shell).toContain("min-w-0 flex-1");
  });
  it("behält zugängliche Namen, Tooltips, aktive Route und rollenabhängige Module",()=>{
    expect(shell).toContain("aria-current");
    expect(shell).toContain("aria-label={entry.label}");
    expect(shell).toContain("title={navigationCollapsed ? entry.label : undefined}");
    expect(shell).toContain("hasAdministrationAccess");
    expect(shell).toContain("payrollOnly");
  });
  it("trennt den Markenblock vollständig von der Ein- und Ausklappsteuerung",()=>{
    expect(shell).toContain("Ordo Caroli – CONCILIUM");
    expect(shell).toContain(">Ordo Caroli</span>");
    expect(shell).toContain(">CONCILIUM</span>");
    expect(shell).not.toContain("Rechnungswesen-Workflow");
    expect(shell).not.toContain("für Concilium");
    expect(shell).toContain('aria-label={navigationCollapsed ? "Hauptnavigation ausklappen" : "Hauptnavigation einklappen"}');
    expect(shell).toContain('title={navigationCollapsed ? "Navigation ausklappen" : "Navigation einklappen"}');
    expect(shell).toContain('right-0 top-[2.625rem] hidden h-8 w-8 -translate-y-1/2');
    expect(shell).toContain('NavigationIcon name={entry.icon}');
    expect(shell).toContain('strokeWidth:2');
    expect(shell).toContain('viewBox:"0 0 24 24"');
    expect(shell).not.toContain('icon:"⌂"');
    expect(shell).toContain('navigationCollapsed ? "md:justify-center" : ""');
  });
  it("zentriert CONCILIUM nur in der Textspalte und fixiert die Pfeilachse am Logo",()=>{
    expect(shell).toContain('min-w-0 text-center');
    expect(shell).toContain('top-[2.625rem]');
    expect(shell).toContain('h-11 w-11');
  });
  it("verwendet getrennte, einheitliche Symbole für Rechnungswesen, Campus und Austausch",()=>{
    expect(shell).toContain('if(name==="accounting")');
    expect(shell).toContain('if(name==="payroll")');
    expect(shell).toContain('if(name==="campus")');
    expect(shell.match(/if\(name==="accounting"\)[\s\S]*?return <svg \{\.\.\.common\}>([\s\S]*?)<\/svg>/)?.[1]).not.toBe(shell.match(/if\(name==="campus"\)[\s\S]*?return <svg \{\.\.\.common\}>([\s\S]*?)<\/svg>/)?.[1]);
  });
  it("hält Navigation und persönlichen Benutzerbereich unabhängig erreichbar",()=>{
    expect(shell).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(shell).toContain('mt-auto shrink-0 border-t');
    expect(shell).toContain('href="/profil"');
    expect(shell).toContain('title={navigationCollapsed?"Profileinstellungen öffnen":undefined}');
  });
  it("trennt geordnete Hauptrollen dedupliziert von Zusatzberechtigungen",()=>{
    expect(splitRoleDisplay(["ORDO_CAMPUS_VERWALTEN","MITARBEITER","PRUEFER","LOHNSACHBEARBEITER","MITARBEITER"])).toEqual({
      main:["Prüfer","Bearbeiter","Lohnsachbearbeiter"],
      additional:["Ordo Campus verwalten"],
    });
    expect(shell).toContain('roleDisplay.main.join(" · ")');
    expect(shell).not.toContain('roleDisplay.additional.join');
  });
});
