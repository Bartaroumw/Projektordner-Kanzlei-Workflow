import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildClientAccountingStatus, contiguousThrough, monthStatusCode } from "../lib/accounting-status-service.ts";
import { validatePayrollPositionInput } from "../lib/payroll-reconciliation-service.ts";

const task = { status: "Erledigt", mandatorySnapshot: true, reviewStatus: "In Ordnung", processingNote: null };
const checklist = (month:number,status="Abgeschlossen") => ({
  id:month,calendarYear:2026,month,periodLabel:`Monat ${month}`,processingStatus:status,updatedAt:new Date(),
  tasks:[task],payrollReconciliation:null,
});

describe("Rechnungswesen-Statusübersicht",()=>{
  it("meldet eine echte Lücke trotz später abgeschlossener Checkliste",()=>{
    const result=buildClientAccountingStatus([checklist(1),checklist(3)],3);
    expect(result.overallThrough).toBe(1);
    expect(result.firstGapMonth).toBe(2);
    expect(result.monthCodes.slice(0,3)).toEqual(["A","–","A"]);
  });
  it("berechnet lückenlose Bearbeitung nur vom Januar an",()=>{
    expect(contiguousThrough([checklist(1),checklist(2,"In Bearbeitung"),checklist(3)],entry=>entry.processingStatus==="Abgeschlossen")).toBe(1);
  });
  it("bildet verständliche Monatscodes",()=>{
    expect(monthStatusCode(checklist(1,"Nachbearbeitung"))).toBe("N");
    expect(monthStatusCode(checklist(1,"In Prüfung"))).toBe("P");
    expect(monthStatusCode(undefined)).toBe("–");
  });
});

describe("FiBu-Lohn-Mehrfachpositionen",()=>{
  it("erlaubt Sammelpositionen nur bei freigegebenen Themen",()=>{
    expect(()=>validatePayrollPositionInput("FAHRZEUGE",{positionType:"Sammelposition",title:"Sammlung",caseCount:2})).toThrow(/keine Sammelpositionen/i);
  });
  it("verlangt bei Sammelpositionen mindestens zwei Fälle",()=>{
    expect(()=>validatePayrollPositionInput("REISEKOSTEN",{positionType:"Sammelposition",title:"Sammlung",caseCount:1})).toThrow(/Anzahl/i);
  });
  it("kennzeichnet unvollständige Pflichtangaben als Entwurf",()=>{
    const result=validatePayrollPositionInput("REISEKOSTEN",{positionType:"Einzelposition",title:"Reise",caseCount:1,summary:"Test"},["Arbeitnehmer"]);
    expect(result.status).toBe("Entwurf");
    expect(result.missing).toEqual(["Arbeitnehmer"]);
  });
  it("verlangt für Geschenk-Sammelpositionen eine Empfängerliste",()=>{
    const result=validatePayrollPositionInput("GESCHENKE_NICHTARBEITNEHMER",{positionType:"Sammelposition",title:"Geschenke",caseCount:3,summary:"Künstliche Sammlung"});
    expect(result.requiredListType).toBe("Empfängerliste");
    expect(result.status).toBe("Entwurf");
  });
  it("speichert vollständige Einzelpositionen als vollständig",()=>{
    const result=validatePayrollPositionInput("REISEKOSTEN",{positionType:"Einzelposition",title:"Reise",caseCount:1,summary:"Künstliche Reise",details:{Arbeitnehmer:"Person A"}},["Arbeitnehmer"]);
    expect(result.status).toBe("Vollständig");
  });
});

describe("Bedienkorrekturen",()=>{
  it("verwendet in der Checkliste den Prüfer-Snapshot statt des angemeldeten Benutzers",()=>{
    const source=readFileSync("app/monatschecklisten/[id]/page.tsx","utf8");
    expect(source).toContain('reviewer={checklist.reviewerSnapshot??""}');
    expect(source).toContain("reviewerUserId={checklist.reviewerUserId}");
  });
  it("zeigt nur die fachlichen Themenentscheidungen",()=>{
    const source=readFileSync("app/fibu-lohn/[id]/reconciliation-item-form.tsx","utf8");
    expect(source).toContain("Kein relevanter Sachverhalt");
    expect(source).toContain("Sachverhalt vorhanden");
    expect(source).not.toContain("<option>Vollständig an Lohn übergeben</option>");
  });
  it("gruppiert die Hauptnavigation nach Rechnungswesen und FiBu-Lohn",()=>{
    const source=readFileSync("app/components/app-shell.tsx","utf8");
    expect(source).toContain('label:"Rechnungswesen"');
    expect(source).toContain('label:"FiBu ↔ Lohn"');
  });
});
