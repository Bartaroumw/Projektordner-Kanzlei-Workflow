import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizedPage, pageBounds, paginationHref, pageSlice } from "@/lib/pagination";

const root=process.cwd();
const source=(path:string)=>readFileSync(join(root,path),"utf8");

describe("Periodenübergreifende Mengenbegrenzungen",()=>{
  it("macht mehr als 100 Monatsvorgänge über lückenlose Seiten erreichbar",()=>{
    const items=Array.from({length:237},(_,index)=>index+1);
    const reached=[1,2,3].flatMap(page=>pageSlice(items,page));
    expect(reached).toEqual(items);
    expect(pageBounds(3,items.length)).toEqual({from:201,to:237,pages:3});
  });

  it("macht mehr als 200 Jahresabschluss- und FiBu-Lohn-Vorgänge vollständig erreichbar",()=>{
    const items=Array.from({length:451},(_,index)=>({id:index+1}));
    const reached=Array.from({length:5},(_,index)=>pageSlice(items,index+1)).flat();
    expect(reached.map(item=>item.id)).toEqual(items.map(item=>item.id));
    expect(new Set(reached.map(item=>item.id)).size).toBe(451);
  });

  it("erhält Suche, Filter, getrennte Seitenschlüssel und Sprungmarken",()=>{
    const params={ansicht:"offen",suche:"Paginierter Mandant",status:"In Bearbeitung",seite:"2"};
    expect(paginationHref("/monatschecklisten",params,3)).toBe("/monatschecklisten?ansicht=offen&suche=Paginierter+Mandant&status=In+Bearbeitung&seite=3");
    expect(paginationHref("/fibu-lohn#rueckfragen",{...params,rueckfragenseite:"1"},2,"rueckfragenseite")).toBe("/fibu-lohn?ansicht=offen&suche=Paginierter+Mandant&status=In+Bearbeitung&seite=2&rueckfragenseite=2#rueckfragen");
  });

  it("begrenzt ungültige Seitennummern auf eine tatsächlich vorhandene Seite",()=>{
    expect(normalizedPage("999",237)).toBe(3);
    expect(normalizedPage("-4",237)).toBe(1);
    expect(normalizedPage(undefined,0)).toBe(1);
  });

  it("verwendet in allen drei operativen Listen Gesamtzahl und serverseitige Pagination",()=>{
    for(const path of ["app/monatschecklisten/page.tsx","app/jahresabschluesse/page.tsx"]){
      const page=source(path);
      expect(page).toContain(".count({where}");
      expect(page).toContain("skip:(page-1)*");
      expect(page).toContain("<ServerPagination");
    }
    const payroll=source("app/fibu-lohn/page.tsx");
    expect(payroll).toContain("const total=filtered.length");
    expect(payroll).toContain("pageSlice(filtered,page)");
    expect(payroll).toContain("<ServerPagination");
    expect(payroll).not.toContain("Anzeige auf 200 begrenzt");
  });

  it("berechnet Dashboarddaten ohne feste Obergrenzen und verlinkt vollständige Listen",()=>{
    const service=source("lib/dashboard-service.ts"),dashboard=source("app/page.tsx");
    expect(service).not.toMatch(/take:\s*(1000|5000)/);
    expect(dashboard).not.toMatch(/take:\s*(100|200)/);
    expect(dashboard).toContain('/monatschecklisten?ansicht=offen&alt=1');
    expect(dashboard).toContain("monthlyProcessing.current.length+monthlyProcessing.older.length");
    expect(dashboard).toContain("annualProcessing.current.length+annualProcessing.older.length");
  });
});
