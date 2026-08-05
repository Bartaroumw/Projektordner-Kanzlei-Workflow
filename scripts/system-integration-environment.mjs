import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";

export const projectRoot = resolve(".");
export const prismaDirectory = resolve(projectRoot, "prisma");
export const tmpDirectory = resolve(projectRoot, "tmp");
export const integrationDatabasePath = resolve(prismaDirectory, "system-integration.db");
export const integrationStorageRoot = resolve(tmpDirectory, "system-integration-storage");
export const integrationCampusStorage = resolve(integrationStorageRoot, "ordo-campus");
export const integrationPayrollStorage = resolve(integrationStorageRoot, "fibu-lohn");
export const integrationProfileImageStorage = resolve(integrationStorageRoot, "profile-images");
export const integrationDatabaseUrl = "file:./system-integration.db";

function samePath(actual, expected) {
  return actual.toLocaleLowerCase("de-DE") === expected.toLocaleLowerCase("de-DE");
}

function isDirectChild(actual, parent) {
  return actual.toLocaleLowerCase("de-DE").startsWith(`${parent.toLocaleLowerCase("de-DE")}${sep}`);
}

export function assertSystemIntegrationPaths(paths = {}) {
  const databasePath = resolve(paths.databasePath ?? integrationDatabasePath);
  const storageRoot = resolve(paths.storageRoot ?? integrationStorageRoot);
  const campusStorage = resolve(paths.campusStorage ?? integrationCampusStorage);
  const payrollStorage = resolve(paths.payrollStorage ?? integrationPayrollStorage);
  const profileImageStorage = resolve(paths.profileImageStorage ?? integrationProfileImageStorage);

  if (!samePath(databasePath, integrationDatabasePath) || !isDirectChild(databasePath, prismaDirectory)) {
    throw new Error("SCHUTZABBRUCH: Es darf ausschließlich prisma/system-integration.db verwendet werden.");
  }
  if (!samePath(storageRoot, integrationStorageRoot) || !isDirectChild(storageRoot, tmpDirectory)) {
    throw new Error("SCHUTZABBRUCH: Es darf ausschließlich tmp/system-integration-storage verwendet werden.");
  }
  if (!samePath(campusStorage, integrationCampusStorage) || !isDirectChild(campusStorage, integrationStorageRoot)) {
    throw new Error("SCHUTZABBRUCH: Der Campus-Speicher ist nicht der freigegebene Integrationspfad.");
  }
  if (!samePath(payrollStorage, integrationPayrollStorage) || !isDirectChild(payrollStorage, integrationStorageRoot)) {
    throw new Error("SCHUTZABBRUCH: Der FiBu-Lohn-Speicher ist nicht der freigegebene Integrationspfad.");
  }
  if (!samePath(profileImageStorage, integrationProfileImageStorage) || !isDirectChild(profileImageStorage, integrationStorageRoot)) {
    throw new Error("SCHUTZABBRUCH: Der Profilbildspeicher ist nicht der freigegebene Integrationspfad.");
  }

  const forbiddenNames = ["dev.db", "test.db", "workflow-test.db", "fibu-lohn-acceptance.db", "pilot.db", "production.db"];
  if (forbiddenNames.some((name) => databasePath.toLocaleLowerCase("de-DE").endsWith(`${sep}${name}`))) {
    throw new Error("SCHUTZABBRUCH: Eine reguläre oder anderweitige Testdatenbank darf nicht verwendet werden.");
  }

  return { databasePath, storageRoot, campusStorage, payrollStorage, profileImageStorage };
}

export function systemIntegrationEnvironment(overrides = {}) {
  assertSystemIntegrationPaths();
  return {
    ...process.env,
    DATABASE_URL: integrationDatabaseUrl,
    ORDO_CAMPUS_STORAGE_DIR: integrationCampusStorage,
    FIBU_LOHN_STORAGE_DIR: integrationPayrollStorage,
    PROFILE_IMAGE_STORAGE_DIR: integrationProfileImageStorage,
    ORDO_ENVIRONMENT_LABEL: "Systemintegration",
    ...overrides,
  };
}

export function assertSystemIntegrationReady() {
  assertSystemIntegrationPaths();
  if (!existsSync(integrationDatabasePath)) {
    throw new Error(
      "Die Systemintegrationsdatenbank fehlt. Bitte zuerst „npm.cmd run testdata:system-integration“ ausführen.",
    );
  }
}
