import { prisma } from "../lib/prisma.ts";
import { uploadCampusAttachment } from "../lib/ordo-campus-attachment-service.ts";
import { uploadPayrollDocument } from "../lib/payroll-document-service.ts";
import type { AuthUser } from "../lib/permissions.ts";
import { provisionKnowledgePlatformFromLegacy } from "../lib/knowledge-platform-migration.ts";

const REQUIRED_DATABASE_URL = "file:./system-integration.db";
if (process.env.DATABASE_URL !== REQUIRED_DATABASE_URL) {
  throw new Error(`SCHUTZABBRUCH: Der Systemintegrationsseed ist nur für ${REQUIRED_DATABASE_URL} freigegeben.`);
}
if (!process.env.ORDO_CAMPUS_STORAGE_DIR?.replaceAll("\\", "/").endsWith("/tmp/system-integration-storage/ordo-campus")) {
  throw new Error("SCHUTZABBRUCH: Der Systemintegrationsseed benötigt den freigegebenen Campus-Speicher.");
}
if (!process.env.FIBU_LOHN_STORAGE_DIR?.replaceAll("\\", "/").endsWith("/tmp/system-integration-storage/fibu-lohn")) {
  throw new Error("SCHUTZABBRUCH: Der Systemintegrationsseed benötigt den freigegebenen FiBu-Lohn-Speicher.");
}

async function authUser(username: string): Promise<AuthUser> {
  const user = await prisma.user.findUniqueOrThrow({ where: { username }, include: { roles: true } });
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    roles: user.roles.map((role) => role.role) as AuthUser["roles"],
  };
}

const klara = await authUser("klara.leitung");
const anna = await authUser("anna.rechnungswesen");
const bankTask = await prisma.standardTask.findUniqueOrThrow({ where: { taskId: "MON-BANK-001" } });
const minimalPdf = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0x20, 0x4f, 0x72, 0x64, 0x6f,
]);

await uploadCampusAttachment(
  bankTask.id,
  {
    displayName: "Künstlicher Abstimmungsnachweis",
    description: "Ausschließlich künstlicher Campus-Anhang für die Systemintegration.",
    sortOrder: 10,
    originalFileName: "kuenstlicher-campus-nachweis.pdf",
    mimeType: "application/pdf",
    bytes: minimalPdf,
  },
  klara,
);
await provisionKnowledgePlatformFromLegacy(prisma, klara.id);

const payrollItem = await prisma.payrollReconciliationItem.findFirstOrThrow({
  where: { reconciliation: { client: { clientNumber: "91002" } } },
  orderBy: { id: "asc" },
});
await uploadPayrollDocument(
  payrollItem.id,
  {
    displayName: "Künstlicher FiBu-Lohn-Beleg",
    documentType: "Künstlicher Integrationsnachweis",
    description: "Ausschließlich künstlicher Beleg für die Systemintegration.",
    originalFileName: "kuenstlicher-fibu-lohn-beleg.pdf",
    mimeType: "application/pdf",
    bytes: minimalPdf,
  },
  anna,
);

const counts = {
  users: await prisma.user.count(),
  clients: await prisma.client.count(),
  monthlyChecklists: await prisma.accountingPeriod.count(),
  annualChecklists: await prisma.annualChecklist.count(),
  standardTasks: await prisma.standardTask.count(),
  campusKnowledge: await prisma.standardTaskKnowledge.count(),
  knowledgeContents: await prisma.knowledgeContent.count(),
  knowledgeAreas: await prisma.knowledgeArea.count(),
  campusAttachments: await prisma.standardTaskKnowledgeAttachment.count(),
  payrollReconciliations: await prisma.payrollReconciliation.count(),
  payrollDocuments: await prisma.payrollDocumentReference.count(),
  vehicles: await prisma.clientVehicle.count(),
};
console.log(JSON.stringify({ environment: "Systemintegration", counts }, null, 2));
await prisma.$disconnect();
