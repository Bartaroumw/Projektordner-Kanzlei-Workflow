import { execFileSync } from "node:child_process";
import {
  assertSystemIntegrationPaths,
  assertSystemIntegrationReady,
  systemIntegrationEnvironment,
} from "./system-integration-environment.mjs";

assertSystemIntegrationPaths();
assertSystemIntegrationReady();

execFileSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-typescript-paths.mjs",
    "--experimental-transform-types",
    "scripts/diagnose-system-integration.ts",
  ],
  {
    cwd: process.cwd(),
    env: systemIntegrationEnvironment({ NODE_ENV: "test" }),
    stdio: "inherit",
  },
);
