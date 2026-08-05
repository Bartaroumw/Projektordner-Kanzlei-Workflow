import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";

if (!process.argv.includes("--confirm-dev")) {
  throw new Error("SCHUTZABBRUCH: Für das lokale Vollbackup ist der bewusste Parameter --confirm-dev erforderlich.");
}

const projectRoot = resolve(".");
const envPath = resolve(projectRoot, ".env");
const parseEnvironment = () => {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*["']?([^"'#]*)["']?\s*$/);
    return match ? [[match[1], match[2].trim()]] : [];
  }));
};
const environment = parseEnvironment();
if ((environment.DATABASE_URL ?? "file:./dev.db") !== "file:./dev.db") {
  throw new Error("SCHUTZABBRUCH: Das lokale Vollbackup ist ausschließlich für prisma/dev.db freigegeben.");
}

const databasePath = resolve(projectRoot, "prisma", "dev.db");
const storagePaths = [
  resolve(projectRoot, environment.ORDO_CAMPUS_STORAGE_DIR ?? "storage/ordo-campus"),
  resolve(projectRoot, environment.FIBU_LOHN_STORAGE_DIR ?? "storage/fibu-lohn"),
  resolve(projectRoot, environment.PROFILE_IMAGE_STORAGE_DIR ?? "storage/profile-images"),
];
for (const path of [databasePath, ...storagePaths]) {
  if (!path.toLocaleLowerCase("de-DE").startsWith(`${projectRoot.toLocaleLowerCase("de-DE")}${sep}`)) {
    throw new Error(`SCHUTZABBRUCH: Der Sicherungspfad liegt außerhalb des Projektordners: ${path}`);
  }
}
if (!existsSync(databasePath)) throw new Error("prisma/dev.db wurde nicht gefunden.");

const timestamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "medium" })
  .format(new Date()).replaceAll(":", "-").replace(" ", "_");
const backupRoot = resolve(projectRoot, "backups", `${timestamp}_full_local_backup`);
if (existsSync(backupRoot)) throw new Error(`SCHUTZABBRUCH: Der Sicherungsordner existiert bereits: ${backupRoot}`);
mkdirSync(backupRoot, { recursive: true });

const databaseTarget = resolve(backupRoot, "prisma", "dev.db");
mkdirSync(resolve(backupRoot, "prisma"), { recursive: true });
copyFileSync(databasePath, databaseTarget);
for (const source of storagePaths) {
  const target = resolve(backupRoot, "storage", basename(source));
  if (existsSync(source)) cpSync(source, target, { recursive: true, errorOnExist: true });
  else mkdirSync(target, { recursive: true });
}
if (existsSync(envPath)) copyFileSync(envPath, resolve(backupRoot, ".env"));

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const files = [];
const visit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (entry.isFile()) files.push({ path: relative(backupRoot, path).replaceAll("\\", "/"), bytes: statSync(path).size, sha256: hash(path) });
  }
};
visit(backupRoot);
const manifest = {
  createdAt: new Date().toISOString(),
  environment: "Lokale Entwicklung",
  database: "prisma/dev.db",
  storage: ["storage/ordo-campus", "storage/fibu-lohn", "storage/profile-images"],
  files,
};
writeFileSync(resolve(backupRoot, "manifest.sha256.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });

if (hash(databaseTarget) !== hash(databasePath)) throw new Error("Die gesicherte Datenbank ist nicht bytegenau.");
console.log(JSON.stringify({ backupRoot, databaseSha256: hash(databaseTarget), files: files.length, databaseWasByteExact: true }, null, 2));
