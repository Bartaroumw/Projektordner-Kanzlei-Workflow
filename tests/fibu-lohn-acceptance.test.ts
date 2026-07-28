import { readFile } from "node:fs/promises";
import { describe,expect,it } from "vitest";
import { nextPayrollMonth } from "@/lib/payroll-reconciliation-service";

const source=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

describe("FiBu-Lohn-Abnahmeinfrastruktur",()=>{
  it("setzt ausschließlich die ausdrücklich freigegebene Abnahmedatenbank und ihre tmp-Speicher zurück",async()=>{
    const reset=await source("scripts/reset-fibu-lohn-acceptance.mjs");
    expect(reset).toContain('fibu-lohn-acceptance.db');
    expect(reset).toContain('fibu-lohn-acceptance-storage');
    expect(reset).toContain('fibu-lohn-acceptance-campus');
    for(const forbidden of ["dev.db","workflow-test.db","pilot.db","production.db"])expect(reset).toContain(forbidden);
    expect(reset).toContain("SCHUTZABBRUCH");
    expect(reset).not.toContain("prisma migrate deploy");
  });

  it("erzeugt den Abnahmebestand dynamisch und reproduzierbar mit allen Rollen und Mandanten",async()=>{
    const seed=await source("prisma/fibu-lohn-acceptance-seed.ts");
    expect(seed).toContain('timeZone:"Europe/Berlin"');
    expect(seed).toContain("offsetMonth(-2)");
    expect(seed).toContain("offsetMonth(-1)");
    expect(seed).toContain("offsetMonth(1)");
    for(const username of ["anna.rechnungswesen","peter.pruefer","laura.lohn","leon.lohn","klaus.leitung","admin.test","campus.verantwortlich"])expect(seed).toContain(username);
    for(let number=92001;number<=92008;number++)expect(seed).toContain(String(number));
  });

  it("prüft Zuständigkeitssnapshots, sechs Themen, offene Nachreichungen und Negativmandanten",async()=>{
    const seed=await source("prisma/fibu-lohn-acceptance-seed.ts");
    const diagnostic=await source("scripts/diagnose-fibu-lohn-acceptance.ts");
    expect(seed).toContain("historicalReconciliation92007");
    expect(seed).toContain("payrollUserId:leon.id");
    expect(diagnostic).toContain("items.length!==6");
    expect(seed).toContain("documentToFollow:true");
    expect(seed).toContain("92006 darf keine FiBu-Lohn-Abstimmung besitzen");
  });

  it("erkennt die geforderten Daten- und Dateikonsistenzfehler ohne automatische Löschung",async()=>{
    const diagnostic=await source("scripts/diagnose-fibu-lohn-acceptance.ts");
    for(const check of [
      "duplicateReconciliations","orphanItems","orphanQuestions","questionsWithWrongRecipient",
      "orphanVehicles","orphanVehicleChanges","foreignVehicleChanges","orphanDocuments",
      "completedWithOpenQuestion","completedWithOpenFollowUp","completedWithUnprocessedMatter",
      "invalidClientPeriods","invalidVehiclePeriods","payrollRoleOverlaps","missingFiles","filesWithoutDatabaseRecord",
    ])expect(diagnostic).toContain(check);
    expect(diagnostic).not.toContain("deleteMany");
    expect(diagnostic).not.toContain("unlink");
  });

  it("sichert und restauriert Datenbank und FiBu-Lohn-Speicher gemeinsam mit SHA-256-Prüfung",async()=>{
    const backup=await source("scripts/verify-fibu-lohn-backup.mjs");
    expect(backup).toContain("sha256");
    expect(backup).toContain("fibu-lohn-acceptance-backup");
    expect(backup).toContain("checksums");
    expect(backup).toContain("diagnose-fibu-lohn-acceptance.ts");
  });

  it("erzeugt einen getrennten Performancebestand mit begrenzten Ergebnislisten",async()=>{
    const generator=await source("scripts/seed-fibu-lohn-performance.ts");
    const dashboard=await source("app/fibu-lohn/page.tsx");
    const vehicles=await source("app/fibu-lohn/fahrzeuge/page.tsx");
    expect(generator).toContain("length:500");
    expect(generator).toContain("slice(0,300)");
    expect(generator).toContain("length:12");
    expect(generator).toContain("take:100");
    expect(dashboard).toContain("take:100");
    expect(vehicles).toContain("take:200");
  });

  it("behandelt den Jahreswechsel für den vorgeschlagenen Lohnmonat korrekt",()=>{
    expect(nextPayrollMonth(2026,11)).toEqual({year:2026,month:12});
    expect(nextPayrollMonth(2026,12)).toEqual({year:2027,month:1});
  });

  it("dokumentiert den bewusst optionalen Performance-Smoke-Test konkret",async()=>{
    const performanceTest=await source("tests/performance-smoke.test.ts");
    expect(performanceTest).toContain('RUN_PERFORMANCE_SMOKE === "1"');
    expect(performanceTest).toContain("describe.skip");
  });
});
