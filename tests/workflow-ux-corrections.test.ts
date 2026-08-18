import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checklistCompletionMessage, getBlockingWorkflowItems, getInitialReviewStatus } from "../lib/checklist-workflow-rules";
import { sortClients } from "../app/mandanten/page";
import { latestChecklistPerClient } from "../app/monatschecklisten/page";
import { formatRoleDisplay } from "../app/components/app-shell";

const task=(overrides:Partial<{status:string;mandatorySnapshot:boolean;notApplicableReason:string|null;reviewStatus:string;reviewIssueStatus:string|null}>={})=>({
  status:"Erledigt",mandatorySnapshot:true,notApplicableReason:null,reviewStatus:"In Ordnung",reviewIssueStatus:null,...overrides,
});

describe("zentrale Abschlussprüfung",()=>{
  it("startet jede Prüfung defensiv als noch nicht geprüft",()=>expect(getInitialReviewStatus()).toBe("Nicht geprüft"));
  it("blockiert ungeprüfte Aufgaben, Rückfragen und Beanstandungen",()=>{
    const blockers=getBlockingWorkflowItems([
      task({reviewStatus:"Nicht geprüft"}),
      task({reviewStatus:"Rückfrage",reviewIssueStatus:"Offen"}),
      task({reviewStatus:"Beanstandung",reviewIssueStatus:"Offen"}),
    ]);
    expect(blockers.canComplete).toBe(false);
    expect(blockers.unreviewed).toHaveLength(3);
    expect(checklistCompletionMessage([
      task({reviewStatus:"Nicht geprüft"}),
      task({reviewStatus:"Beanstandung",reviewIssueStatus:"Offen"}),
    ])).toContain("offene Beanstandung");
  });
  it("blockiert offene Bearbeitung und fehlende Nicht-zutreffend-Begründung",()=>{
    const blockers=getBlockingWorkflowItems([
      task({status:"Offen",reviewStatus:"Nicht geprüft"}),
      task({status:"Nicht zutreffend",notApplicableReason:"",reviewStatus:"In Ordnung"}),
    ]);
    expect(blockers.openProcessing).toHaveLength(1);
    expect(blockers.missingReasons).toHaveLength(1);
  });
});

describe("Listen und Rollenanzeige",()=>{
  const clients=[{clientNumber:"10",name:"Zulu"},{clientNumber:"2",name:"Alpha"},{clientNumber:"100",name:"Beta"}];
  it("sortiert Mandantennummern natürlich in beide Richtungen",()=>{
    expect(sortClients(clients,"nummer-auf").map(item=>item.clientNumber)).toEqual(["2","10","100"]);
    expect(sortClients(clients,"nummer-ab").map(item=>item.clientNumber)).toEqual(["100","10","2"]);
  });
  it("sortiert Namen A–Z und Z–A",()=>{
    expect(sortClients(clients,"name-auf").map(item=>item.name)).toEqual(["Alpha","Beta","Zulu"]);
    expect(sortClients(clients,"name-ab").map(item=>item.name)).toEqual(["Zulu","Beta","Alpha"]);
  });
  it("ermittelt nach vorherigen Filtern genau den neuesten Treffer je Mandant",()=>{
    const entries=[
      {clientId:1,calendarYear:2026,month:1,createdAt:new Date("2026-01-01")},
      {clientId:1,calendarYear:2026,month:2,createdAt:new Date("2026-02-01")},
      {clientId:2,calendarYear:2025,month:12,createdAt:new Date("2025-12-01")},
    ];
    expect(latestChecklistPerClient(entries).map(item=>`${item.clientId}-${item.month}`)).toEqual(["1-2","2-12"]);
  });
  it("ordnet fachliche Rollen und trennt technische sowie zusätzliche Rechte",()=>{
    const display=formatRoleDisplay(["MITARBEITER","ADMINISTRATOR","PRUEFER","PRUEFER","ORDO_CAMPUS_VERWALTEN","KANZLEILEITUNG"]);
    expect(display.professional).toEqual(["Kanzleileitung","Prüfer","Bearbeiter"]);
    expect(display.technical).toEqual(["Administrator"]);
    expect(display.additional).toEqual(["Ordo Campus verwalten"]);
  });
});

describe("Oberflächenregression",()=>{
  const monthly=readFileSync("app/monatschecklisten/[id]/page.tsx","utf8");
  const annual=readFileSync("app/jahresabschluesse/[id]/page.tsx","utf8");
  const review=readFileSync("app/components/task-review-form.tsx","utf8");
  const processing=readFileSync("app/components/task-processing-form.tsx","utf8");
  it("setzt ungeprüfte Aufgaben in keiner Prüfmaske automatisch in Ordnung",()=>{
    expect(monthly).not.toContain('task.reviewStatus==="Nicht geprüft"?"In Ordnung"');
    expect(annual).not.toContain('task.reviewStatus==="Nicht geprüft"?"In Ordnung"');
    expect(monthly).toContain("TaskReviewForm");
    expect(annual).toContain("TaskReviewForm");
    expect(review).toContain("Bitte ausdrücklich auswählen");
  });
  it("speichert Aufgaben lokal asynchron mit sichtbarem Zustand",()=>{
    const batch=readFileSync("app/components/checklist-batch-provider.tsx","utf8");
    const tools=readFileSync("app/components/checklist-workspace-tools.tsx","utf8");
    expect(processing).toContain("Ungespeicherte Änderungen");
    expect(tools).toContain("Speichert …");
    expect(batch).toContain("beforeunload");
    const checklist=readFileSync("app/monatschecklisten/[id]/page.tsx","utf8");
    expect(checklist).toContain("ChecklistWorkspaceTools");
    expect(tools).toContain("sticky top-0");
    expect(tools).toContain("Aufgabenübersicht");
  });
  it("kennzeichnet Campus und Überträge nicht nur farblich",()=>{
    expect(monthly).toContain("Übertrag aus");
    expect(readFileSync("app/components/ordo-campus-panel.tsx","utf8")).toContain("Nicht hinterlegt");
  });
});
