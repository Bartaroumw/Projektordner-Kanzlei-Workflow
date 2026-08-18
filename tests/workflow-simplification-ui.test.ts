import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {validatePayrollPositionDraft,validatePayrollTopicDraft} from "@/lib/payroll-batch";
import {validateReviewDraft} from "@/lib/review-batch";

const source=(path:string)=>readFileSync(path,"utf8");

describe("Sammelspeicherung und vereinfachte Statusführung",()=>{
  it("stellt für Lohnthemen und Prüfentscheidungen zentrale, konfliktgeschützte Arbeitsleisten bereit",()=>{
    const payroll=source("app/components/payroll-batch-provider.tsx");
    const review=source("app/components/review-batch-provider.tsx");
    expect(payroll).toContain("Alle Änderungen speichern");
    expect(payroll).toContain("Alle Änderungen verwerfen");
    expect(payroll).toContain("Zur nächsten fehlerhaften Eingabe");
    expect(payroll).toContain("CONFLICT");
    expect(review).toContain("Prüfungen speichern");
    expect(review).toContain("Zur nächsten fehlerhaften Prüfung");
    expect(review).toContain("beforeunload");
  });

  it("validiert einzelne fehlerhafte Entwürfe, ohne andere Entwürfe zu verwerfen",()=>{
    expect(validateReviewDraft({reviewStatus:"Beanstandung",reviewNote:""})).toContain("Prüfnotiz");
    expect(validateReviewDraft({reviewStatus:"In Ordnung",reviewNote:""})).toBeNull();
    expect(validatePayrollTopicDraft({decision:"Sachverhalt vorhanden",note:"",details:{},documentToFollow:true,followUpReason:"",expectedFollowUpAt:"",missingDocumentType:""})).toContain("Nachreichung");
    expect(validatePayrollPositionDraft({itemId:1,positionId:null,positionType:"Sammelposition",title:"Künstliche Sammlung",caseCount:1,totalAmount:"",period:"",summary:"",people:"",details:{},requiredListType:"",requiredListDocumentName:""})).toContain("mindestens zwei");
  });

  it("lässt Upload, Archivierung, Rückfragen, Übergabe und Lohnabschluss als getrennte Aktionen bestehen",()=>{
    const detail=source("app/fibu-lohn/[id]/page.tsx");
    const actions=source("app/fibu-lohn/actions.ts");
    expect(detail).toContain("PayrollUploadForm");
    expect(source("app/fibu-lohn/[id]/reconciliation-item-form.tsx")).toContain('/api/fibu-lohn/belege');
    expect(detail).toContain("archivePayrollDocumentAction");
    expect(detail).toContain("createPayrollQuestionAction");
    expect(detail).toContain("submitPayrollAction");
    expect(detail).toContain("completePayrollAction");
    expect(actions).not.toContain("markSeenAction");
  });

  it("entfernt die manuellen Startschritte aus den regulären Arbeitsseiten",()=>{
    const pages=[source("app/monatschecklisten/[id]/page.tsx"),source("app/jahresabschluesse/[id]/page.tsx"),source("app/fibu-lohn/[id]/page.tsx")].join("\n");
    expect(pages).not.toContain("Bearbeitung beginnen");
    expect(pages).not.toContain("Prüfung beginnen");
    expect(pages).not.toContain(">Gesehen<");
    expect(pages).toContain("automatisch mit der ersten erfolgreich gespeicherten");
  });
});

describe("Mandantenanlage und Aufgabensteuerung",()=>{
  it("bietet das direkte Jahresprofil standardmäßig an und entfernt das manuelle Lohnende",()=>{
    const form=source("app/mandanten/client-form.tsx");
    expect(form).toContain("useState(!client)");
    expect(form).toContain("Jahresprofil direkt anlegen");
    expect(form).toContain("Mandant und Jahresprofil werden gemeinsam gespeichert");
    expect(form).not.toContain('name="payrollServiceEnd"');
    expect(form).toContain("Beginn der Lohnbetreuung");
  });

  it("trennt Einsatzbereich und Ausführungsrhythmus und blendet letzteren für reine Jahresabschlussaufgaben aus",()=>{
    const form=source("app/standardaufgaben/task-form.tsx");
    const planning=source("app/standardaufgaben/execution-planning-fields.tsx");
    expect(form).toContain('label="Einsatzbereich"');
    expect(form).toContain("Laufendes Rechnungswesen");
    expect(planning).toContain("Ausführungsrhythmus");
    expect(planning).toContain("!annualOnly&&");
    expect(planning).toContain("einmal je Jahresabschluss");
  });

  it("verwendet eine ausschließlich additive Migration 19",()=>{
    const sql=source("prisma/migrations/20260818120000_workflow_simplification/migration.sql");
    expect(sql).toContain('ALTER TABLE "ChecklistTask" ADD COLUMN "transferStatus"');
    expect(sql).toContain('ALTER TABLE "PayrollReconciliation" ADD COLUMN "firstViewedAt"');
    expect(sql).not.toMatch(/DROP TABLE|DELETE FROM/);
  });
});
