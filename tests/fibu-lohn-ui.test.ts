import { readFile } from "node:fs/promises";
import { describe,expect,it } from "vitest";
import { payrollReconciliationSummary } from "@/lib/payroll-reconciliation-service";

const source=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

describe("FiBu-Lohn-Benutzeroberflächen",()=>{
  it("fasst Themen, Belege, Nachreichungen und Rückfragen einheitlich zusammen",()=>{
    const summary=payrollReconciliationSummary([
      {status:"Kein Sachverhalt",matterPresent:"Nein",payrollProcessingStatus:"Offen",documentToFollow:false,documents:[],questions:[]},
      {status:"Vollständig an Lohn übergeben",matterPresent:"Ja",payrollProcessingStatus:"Verarbeitet",documentToFollow:true,documents:[{status:"Aktiv"},{status:"Archiviert"}],questions:[{status:"Offen beim Rechnungswesen"}]},
    ]);
    expect(summary).toEqual({total:2,reviewed:2,matters:1,fullyTransferred:1,documents:1,openQuestions:1,openFollowUps:1,processed:1});
  });

  it("zeigt in der Monatscheckliste den strukturierten Abstimmungseinstieg",async()=>{
    const page=await source("app/monatschecklisten/[id]/page.tsx");
    expect(page).toContain("Gesamtstatus Rechnungswesen");
    expect(page).toContain("Abstimmung öffnen");
    expect(page).toContain("Offene Rechnungswesen–Lohn-Rückfragen");
  });

  it("stellt alle sechs fachlichen Themenformulare bereit",async()=>{
    const form=await source("app/fibu-lohn/[id]/reconciliation-item-form.tsx");
    for(const topic of ["ARBEITNEHMER_VORTEILE","REISEKOSTEN","FAHRZEUGE","SCHEINSELBSTAENDIGKEIT","GESCHENKE_NICHTARBEITNEHMER","KSK"])expect(form).toContain(topic);
    expect(form).toContain("Ordo Caroli trifft keine rechtliche Einstufung");
  });

  it("verlangt die bewusste Gesamtübergabe und zeigt getrennte Status",async()=>{
    const page=await source("app/fibu-lohn/[id]/page.tsx");
    expect(page).toContain("Verbindliche Gesamtübergabe");
    expect(page).toContain("name=\"confirmed\"");
    expect(page).toContain("Rechnungswesenstatus");
    expect(page).toContain("Lohnstatus");
  });

  it("hält Belegupload und Download serverseitig geschützt",async()=>{
    const upload=await source("app/api/fibu-lohn/belege/route.ts");
    const download=await source("app/api/fibu-lohn/belege/[documentId]/download/route.ts");
    expect(upload).toContain("currentUser");
    expect(upload).toContain("uploadPayrollDocument");
    expect(download).toContain("readPayrollDocument");
  });

  it("bietet eine periodenübergreifende Lohn-Arbeitsliste mit kompakten Filtern",async()=>{
    const page=await source("app/fibu-lohn/page.tsx");
    expect(page).toContain("Meine Rechnungswesen–Lohn-Abstimmungen");
    expect(page).toContain("Lohnabrechnungsmonat");
    expect(page).toContain("Lohnstatus");
    expect(page).toContain("Offene Abstimmungen aller Abrechnungsmonate");
    expect(page).toContain("Ältere offene Vorgänge");
    expect(page).toContain('[["offen","Offen"],["abgeschlossen","Abgeschlossen"],["alle","Alle"]]');
  });

  it("verknüpft Rückfragen direkt mit der Themenkarte",async()=>{
    const dashboard=await source("app/page.tsx");
    const payroll=await source("app/fibu-lohn/page.tsx");
    expect(dashboard).toContain("Rechnungswesen–Lohn-Rückfragen");
    expect(dashboard).toContain("#thema-${question.reconciliationItemId}");
    expect(payroll).toContain("#thema-${question.reconciliationItemId}");
  });

  it("stellt Fahrzeugliste, Detail, Änderung und Abstimmungsverknüpfung bereit",async()=>{
    const list=await source("app/fibu-lohn/fahrzeuge/page.tsx");
    const detail=await source("app/fibu-lohn/fahrzeuge/[id]/page.tsx");
    const form=await source("app/fibu-lohn/fahrzeuge/vehicle-form.tsx");
    expect(list).toContain("Dauerhafter Fahrzeugbestand");
    expect(detail).toContain("Zugehörige Monatsabstimmung öffnen");
    expect(form).toContain("Nutzerwechsel");
    expect(form).toContain("1-%-Regelung");
  });

  it("blendet Rechnungswesenmodule für reine Lohnrollen aus",async()=>{
    const shell=await source("app/components/app-shell.tsx");
    const dashboard=await source("app/page.tsx");
    expect(shell).toContain("payrollOnly");
    expect(shell).toContain("Rechnungswesen ↔ Lohn");
    expect(dashboard).toContain("redirect(\"/fibu-lohn\")");
  });

  it("prüft jede schreibende FiBu-Lohn-Aktion erneut serverseitig",async()=>{
    const actions=await source("app/fibu-lohn/actions.ts");
    expect((actions.match(/await requireUser\(\)/g)??[]).length).toBeGreaterThanOrEqual(10);
    expect(actions).toContain("updatePayrollReconciliationItem");
    expect(actions).toContain("completePayrollReconciliation");
  });

  it("dokumentiert kontrollierte Ergänzungen und Nachreichungen nach der Übergabe",async()=>{
    const service=await source("lib/payroll-reconciliation-service.ts");
    const detail=await source("app/fibu-lohn/[id]/page.tsx");
    expect(service).toContain("addPayrollReconciliationSupplement");
    expect(service).toContain("Nachträgliche Ergänzung erfasst");
    expect(service).toContain("completePayrollDocumentFollowUp");
    expect(detail).toContain("Nachträgliche Ergänzung erfassen");
    expect(detail).toContain("Nachreichung als abgeschlossen dokumentieren");
  });

  it("öffnet Ordo Campus mit dem themenspezifischen Wissensverweis",async()=>{
    const detail=await source("app/fibu-lohn/[id]/page.tsx");
    const route=await source("app/api/ordo-campus/[kind]/[taskId]/route.ts");
    expect(detail).toContain('kind="fibu-lohn"');
    expect(detail).toContain("taskId={item.id}");
    expect(route).toContain('kind === "fibu-lohn"');
    expect(route).toContain("campusStandardTaskId");
  });
});
