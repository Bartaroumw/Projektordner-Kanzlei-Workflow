import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hasRole, type AuthUser } from "@/lib/permissions";

const root = resolve(".");

function runEnvironmentProbe(code: string) {
  return execFileSync(process.execPath, ["--input-type=module", "--eval", code], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

describe("geschützte Systemintegrationsumgebung", () => {
  it("verwendet ausschließlich die freigegebene Integrationsdatenbank und getrennte Speicher", () => {
    const output = runEnvironmentProbe(`
      import {
        assertSystemIntegrationPaths,
        integrationDatabasePath,
        integrationCampusStorage,
        integrationPayrollStorage
      } from "./scripts/system-integration-environment.mjs";
      const paths = assertSystemIntegrationPaths();
      console.log(JSON.stringify({
        database: paths.databasePath === integrationDatabasePath,
        campus: paths.campusStorage === integrationCampusStorage,
        payroll: paths.payrollStorage === integrationPayrollStorage
      }));
    `);
    expect(JSON.parse(output)).toEqual({ database: true, campus: true, payroll: true });
  });

  it("weist dev.db und reguläre Speicherpfade zuverlässig zurück", () => {
    const output = runEnvironmentProbe(`
      import { assertSystemIntegrationPaths } from "./scripts/system-integration-environment.mjs";
      let rejected = 0;
      for (const paths of [
        { databasePath: "./prisma/dev.db" },
        { storageRoot: "./storage" },
        { campusStorage: "./storage/ordo-campus" },
        { payrollStorage: "./storage/fibu-lohn" }
      ]) {
        try { assertSystemIntegrationPaths(paths); } catch { rejected += 1; }
      }
      console.log(rejected);
    `);
    expect(output).toBe("4");
  });

  it("enthält die vollständige unveränderte Migrationskette", () => {
    const migrations = readdirSync(resolve(root, "prisma", "migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(migrations).toHaveLength(16);
    expect(migrations.at(-1)).toBe("20260804080000_reconcile_schema_history_drift");
  });

  it("stellt eindeutige Reset-, Diagnose-, Entwicklungs- und Produktionsbefehle bereit", () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(packageJson.scripts).toMatchObject({
      "testdata:system-integration": "node scripts/reset-system-integration.mjs",
      "testdata:system-integration:diagnose": "node scripts/run-system-integration-diagnose.mjs",
      "dev:integration": "node scripts/run-system-integration.mjs dev",
      "build:integration": "node scripts/run-system-integration.mjs build",
      "start:integration": "node scripts/run-system-integration.mjs start",
    });
  });
});

describe("rollenbasierte Modulgrenzen", () => {
  it("verleiht einer reinen Lohnrolle keinen Rechnungswesenzugriff", () => {
    const payrollUser: AuthUser = {
      id: 1,
      fullName: "Künstliche Lohnperson",
      username: "lohn.test",
      active: true,
      mustChangePassword: false,
      roles: ["LOHNSACHBEARBEITER"],
    };
    expect(hasRole(payrollUser, "MITARBEITER", "PRUEFER", "KANZLEILEITUNG", "MANDANTEN_VERWALTEN")).toBe(false);
  });

  it("schützt die drei fachlichen Übersichten serverseitig", () => {
    for (const file of [
      "app/mandanten/page.tsx",
      "app/monatschecklisten/page.tsx",
      "app/jahresabschluesse/page.tsx",
    ]) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source).toContain(
        'requireRole("MITARBEITER","PRUEFER","KANZLEILEITUNG","MANDANTEN_VERWALTEN")',
      );
    }
  });

  it("leitet unberechtigte Seitenaufrufe verständlich um, statt eine technische Fehlerseite auszulösen", () => {
    const source = readFileSync(resolve(root, "lib", "auth.ts"), "utf8");
    expect(source).toContain('redirect("/zugriff-verweigert?bereich=angeforderter%20Bereich")');
    expect(source).not.toContain('throw new Error("Sie sind für diese Aktion nicht berechtigt.")');
  });
});
