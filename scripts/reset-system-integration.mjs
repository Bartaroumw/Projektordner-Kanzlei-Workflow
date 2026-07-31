import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  assertSystemIntegrationPaths,
  integrationCampusStorage,
  integrationDatabasePath,
  integrationPayrollStorage,
  integrationStorageRoot,
  systemIntegrationEnvironment,
} from "./system-integration-environment.mjs";

assertSystemIntegrationPaths();

console.warn(
  "ACHTUNG: Ausschließlich prisma/system-integration.db und tmp/system-integration-storage werden vollständig gelöscht und neu erstellt.",
);

for (const target of [
  integrationDatabasePath,
  `${integrationDatabasePath}-journal`,
  `${integrationDatabasePath}-shm`,
  `${integrationDatabasePath}-wal`,
]) {
  if (existsSync(target)) rmSync(target);
}
if (existsSync(integrationStorageRoot)) rmSync(integrationStorageRoot, { recursive: true });
mkdirSync(integrationCampusStorage, { recursive: true });
mkdirSync(integrationPayrollStorage, { recursive: true });
// Prisma 6.19.3 unter Node 24/Windows scheitert sporadisch beim eigenen
// erstmaligen Anlegen der SQLite-Datei. Eine leere, bereits pfadgeprüfte Datei
// wird von SQLite regulär initialisiert und vermeidet diesen Schema-Engine-Fehler.
writeFileSync(integrationDatabasePath, "", { flag: "wx" });

const environment = systemIntegrationEnvironment({
  NODE_ENV: "development",
  // Auf Windows/Node 24 liefert Prisma 6 sonst sporadisch nur „Schema engine error“
  // direkt nach dem Anlegen einer neuen SQLite-Datei. Die normale Engine-Ausgabe
  // macht denselben Lauf deterministisch und dokumentierbar.
  RUST_LOG: process.env.RUST_LOG ?? "info",
});
const prismaCli = "node_modules/prisma/build/index.js";

execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { env: environment, stdio: "inherit" });
execFileSync(process.execPath, [prismaCli, "generate"], { env: environment, stdio: "inherit" });
execFileSync(process.execPath, ["--experimental-transform-types", "prisma/seed.ts"], {
  env: environment,
  stdio: "inherit",
});
execFileSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-typescript-paths.mjs",
    "--experimental-transform-types",
    "prisma/system-integration-seed.ts",
  ],
  { env: environment, stdio: "inherit" },
);
execFileSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-typescript-paths.mjs",
    "--experimental-transform-types",
    "scripts/diagnose-system-integration.ts",
  ],
  { env: environment, stdio: "inherit" },
);
execFileSync(process.execPath, [prismaCli, "migrate", "status"], { env: environment, stdio: "inherit" });

console.log(`Systemintegrationsdatenbank bereit: ${integrationDatabasePath}`);
console.log(`Campus-Speicher: ${integrationCampusStorage}`);
console.log(`FiBu-Lohn-Speicher: ${integrationPayrollStorage}`);
