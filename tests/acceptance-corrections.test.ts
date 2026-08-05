import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {clientSchema} from "@/lib/validation";

const read=(path:string)=>readFileSync(path,"utf8");
const clientInput=()=>({clientNumber:"TEST",name:"Künstlicher Mandant",processor:null,reviewer:null,managementName:null,processorUserId:1,reviewerUserId:1,managementUserId:1,vatFilingPeriod:"Monatlich" as const,active:true,internalNote:null});

describe("gezielte Bedien- und Berechtigungskorrektur",()=>{
  it("erlaubt alle drei Funktionszuordnungen personengleich ohne Ausnahmefeld",()=>expect(clientSchema.safeParse(clientInput()).success).toBe(true));
  it("enthält keinen Ausnahmedialog und keine alte Zusatzberechtigung",()=>{
    expect(read("app/mandanten/client-form.tsx")).not.toContain("Funktionstrennung ausnahmsweise");
    expect(read("lib/permissions.ts")).not.toContain("FUNKTIONSTRENNUNG_AUFHEBEN");
  });
  it("Mandantenübersicht bietet ein zugängliches Aktionsmenü und Stammdatenlink",()=>{
    const menu=read("app/mandanten/client-actions-menu.tsx"),page=read("app/mandanten/page.tsx");
    expect(menu).toContain("Aktionen für Mandant");
    expect(menu).toContain('event.key==="Escape"');
    expect(menu).toContain("stopPropagation");
    expect(page).toContain("Stammdaten bearbeiten");
  });
  it("Dashboard verwendet breite Arbeitslisten mit direkten Arbeitszielen",()=>{
    const page=read("app/page.tsx");
    expect(page).toContain("Meine Bearbeitung");
    expect(page).toContain("Meine Prüfung");
    expect(page).toContain("Alle anzeigen");
    expect(page).toContain("#aufgabe-");
    expect(page).toContain("#workflow");
    expect(page).not.toContain("2xl:grid-cols-3");
  });
  it("verwendet Dashboard einheitlich in Navigation, Überschrift und Browser-Titel",()=>{
    const page=read("app/page.tsx"),shell=read("app/components/app-shell.tsx");
    expect(shell).toContain('label:"Dashboard",href:"/"');
    expect(page).toContain('title: "Dashboard · Ordo Caroli"');
    expect(page).toContain('>Dashboard</h1>');
    expect(page).not.toContain("Dashboard Rechnungswesen");
  });
  it("trennt operative Listen in Offen, Abgeschlossen und Alle",()=>{
    for(const path of ["app/monatschecklisten/page.tsx","app/jahresabschluesse/page.tsx","app/fibu-lohn/page.tsx"]){
      const page=read(path);
      expect(page).toContain('[["offen","Offen"],["abgeschlossen","Abgeschlossen"],["alle","Alle"]]');
      expect(page).toContain("Ältere offene Vorgänge");
    }
  });
  it("zählt aktuelle und ältere Vorgänge gemeinsam in den Dashboardkennzahlen",()=>{
    const page=read("app/page.tsx");
    expect(page).toContain("monthlyProcessing.current.length+monthlyProcessing.older.length");
    expect(page).toContain("monthlyReviews.current.length+monthlyReviews.older.length");
    expect(page).toContain("payrollByAge.current.length+payrollByAge.older.length");
  });
  it("zeigt aktive Filter einzeln entfernbar an",()=>{
    const chips=read("app/components/active-filter-chips.tsx");
    expect(chips).toContain('aria-label="Aktive Filter"');
    expect(chips).toContain("filter.label} ×");
    expect(chips).toContain("key===keyToRemove");
  });
  it("hält den Mandantenkopf fachlich offen und entfernt den alten Untertitel",()=>{
    const list=read("app/mandanten/page.tsx"),workspace=read("app/mandanten/[id]/page.tsx");
    expect(list).not.toContain("Aktuelle Monatscheckliste direkt öffnen oder den nächsten Monat anlegen");
    expect(workspace).toContain("{client.clientNumber} · {client.name}");
    expect(workspace).toContain(">Mandantenarbeitsbereich</p>");
  });
  it("sichtbare Dashboardüberschrift verwendet das zentrale Grün",()=>expect(read("app/page.tsx")).not.toContain("text-blue-700\">Operative Steuerung"));
});
