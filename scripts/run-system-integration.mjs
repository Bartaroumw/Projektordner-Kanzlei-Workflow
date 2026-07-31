import { spawn } from "node:child_process";
import {
  assertSystemIntegrationPaths,
  assertSystemIntegrationReady,
  systemIntegrationEnvironment,
} from "./system-integration-environment.mjs";

const mode = process.argv[2];
const allowedModes = new Set(["dev", "build", "start"]);
if (!allowedModes.has(mode)) {
  throw new Error("Erlaubte Betriebsarten sind dev, build und start.");
}

assertSystemIntegrationPaths();
assertSystemIntegrationReady();

const nextArguments = ["node_modules/next/dist/bin/next", mode, ...process.argv.slice(3)];
const child = spawn(process.execPath, nextArguments, {
  cwd: process.cwd(),
  env: systemIntegrationEnvironment({ NODE_ENV: mode === "dev" ? "development" : "production" }),
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
