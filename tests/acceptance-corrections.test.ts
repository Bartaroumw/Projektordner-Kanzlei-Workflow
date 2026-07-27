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
  it("sichtbare Dashboardüberschrift verwendet das zentrale Grün",()=>expect(read("app/page.tsx")).not.toContain("text-blue-700\">Operative Steuerung"));
});
