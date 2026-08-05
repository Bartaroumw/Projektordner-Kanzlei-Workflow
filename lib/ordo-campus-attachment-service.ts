import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/permissions";
import { canManageOrdoCampus } from "@/lib/permissions";
import { OrdoCampusError } from "@/lib/ordo-campus-service";

export const CAMPUS_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const CAMPUS_ATTACHMENT_STORAGE_ROOT = process.env.ORDO_CAMPUS_STORAGE_DIR
  ? resolve(process.env.ORDO_CAMPUS_STORAGE_DIR)
  : resolve(process.cwd(), process.env.NODE_ENV === "test" ? "tmp/ordo-campus-test" : "storage/ordo-campus");
export const CAMPUS_ATTACHMENT_ACCEPT = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg";

const allowedTypes: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
};

export type CampusUploadInput = {
  displayName: string;
  description: string;
  sortOrder: number;
  originalFileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

function authorize(user: AuthUser) {
  if (!user.active || !canManageOrdoCampus(user)) {
    throw new OrdoCampusError("Sie besitzen keine Berechtigung, Ordo-Campus-Anhänge zu verwalten.", "NOT_ALLOWED");
  }
}

export function safeOriginalFileName(value: string) {
  const onlyName = basename(value.replaceAll("\\", "/"));
  const sanitized = onlyName
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return sanitized || "datei";
}

function validateFile(input: CampusUploadInput) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new OrdoCampusError("Der Anzeigename ist erforderlich.", "INVALID_INPUT");
  if (displayName.length > 300) throw new OrdoCampusError("Der Anzeigename ist zu lang.", "INVALID_INPUT");
  if (input.bytes.byteLength === 0) throw new OrdoCampusError("Die ausgewählte Datei ist leer.", "INVALID_INPUT");
  if (input.bytes.byteLength > CAMPUS_ATTACHMENT_MAX_BYTES) {
    throw new OrdoCampusError("Die Datei überschreitet die maximal erlaubte Größe von 15 MB.", "INVALID_INPUT");
  }
  const originalFileName = safeOriginalFileName(input.originalFileName);
  const extension = extname(originalFileName).toLocaleLowerCase("de-DE");
  const mimeTypes = allowedTypes[extension];
  if (!mimeTypes) throw new OrdoCampusError("Dieser Dateityp ist nicht zulässig.", "INVALID_INPUT");
  if (!mimeTypes.includes(input.mimeType.toLocaleLowerCase("de-DE"))) {
    throw new OrdoCampusError("Dateiendung und Dateityp stimmen nicht überein.", "INVALID_INPUT");
  }
  if (!matchesSignature(extension, input.bytes)) {
    throw new OrdoCampusError("Der Dateiinhalt entspricht nicht dem angegebenen Dateityp.", "INVALID_INPUT");
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 999_999) {
    throw new OrdoCampusError("Die Sortierreihenfolge ist ungültig.", "INVALID_INPUT");
  }
  return {
    displayName,
    description: input.description.trim().slice(0, 2_000) || null,
    originalFileName,
    extension,
    mimeType: mimeTypes[0],
  };
}

function matchesSignature(extension: string, bytes: Uint8Array) {
  if (extension === ".pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === ".png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === ".jpg" || extension === ".jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === ".docx" || extension === ".xlsx") return startsWith(bytes, [0x50, 0x4b]);
  return false;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function storagePath(storageKey: string) {
  const target = resolve(CAMPUS_ATTACHMENT_STORAGE_ROOT, storageKey);
  if (!target.startsWith(`${CAMPUS_ATTACHMENT_STORAGE_ROOT}${sep}`)) {
    throw new OrdoCampusError("Der Anhangspfad ist ungültig.", "INVALID_INPUT");
  }
  return target;
}

export async function uploadCampusAttachment(standardTaskId: number, input: CampusUploadInput, user: AuthUser) {
  authorize(user);
  const validated = validateFile(input);
  const knowledge = await prisma.standardTaskKnowledge.findUnique({ where: { standardTaskId } });
  if (!knowledge) throw new OrdoCampusError("Bitte speichern Sie zuerst den Wissensbereich.", "NOT_FOUND");

  await mkdir(CAMPUS_ATTACHMENT_STORAGE_ROOT, { recursive: true });
  const storedFileName = `${randomUUID()}${validated.extension}`;
  const storageKey = storedFileName;
  const target = storagePath(storageKey);
  try {
    await writeFile(target, input.bytes, { flag: "wx" });
  } catch {
    throw new OrdoCampusError("Die Datei konnte nicht gespeichert werden.", "INVALID_INPUT");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.standardTaskKnowledgeAttachment.create({ data: {
        standardTaskId,
        displayName: validated.displayName,
        originalFileName: validated.originalFileName,
        storedFileName,
        storageKey,
        fileExtension: validated.extension.slice(1).toUpperCase(),
        mimeType: validated.mimeType,
        fileSizeBytes: input.bytes.byteLength,
        description: validated.description,
        sortOrder: input.sortOrder,
        uploadedByUserId: user.id,
      } });
      await tx.standardTaskKnowledgeHistory.create({ data: {
        knowledgeId: knowledge.id,
        standardTaskId,
        actorUserId: user.id,
        actorNameSnapshot: user.fullName,
        changedArea: "Anhänge",
        description: `Anhang „${attachment.displayName}“ hochgeladen.`,
      } });
      return attachment;
    });
  } catch {
    await unlink(target).catch(() => undefined);
    throw new OrdoCampusError("Die Datei konnte nicht gespeichert werden.", "INVALID_INPUT");
  }
}

export async function updateCampusAttachment(attachmentId: number, input: { displayName: string; description: string; sortOrder: number; active: boolean }, user: AuthUser) {
  authorize(user);
  const attachment = await prisma.standardTaskKnowledgeAttachment.findUnique({ where: { id: attachmentId }, include: { standardTask: { include: { campusKnowledge: true } } } });
  if (!attachment?.standardTask.campusKnowledge) throw new OrdoCampusError("Der Anhang wurde nicht gefunden oder ist nicht mehr verfügbar.", "NOT_FOUND");
  const displayName = input.displayName.trim();
  if (!displayName) throw new OrdoCampusError("Der Anzeigename ist erforderlich.", "INVALID_INPUT");
  const nextStatus = input.active ? "Aktiv" : "Archiviert";
  const statusChanged = attachment.status !== nextStatus;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.standardTaskKnowledgeAttachment.update({ where: { id: attachmentId }, data: {
      displayName: displayName.slice(0, 300),
      description: input.description.trim().slice(0, 2_000) || null,
      sortOrder: Math.max(0, Math.min(999_999, Math.trunc(input.sortOrder))),
      status: nextStatus,
      archivedAt: nextStatus === "Archiviert" ? new Date() : null,
      archivedByUserId: nextStatus === "Archiviert" ? user.id : null,
    } });
    const action = statusChanged
      ? nextStatus === "Archiviert" ? "archiviert" : "wieder aktiviert"
      : attachment.sortOrder !== updated.sortOrder ? "sortiert" : "geändert";
    await tx.standardTaskKnowledgeHistory.create({ data: {
      knowledgeId: attachment.standardTask.campusKnowledge!.id,
      standardTaskId: attachment.standardTaskId,
      actorUserId: user.id,
      actorNameSnapshot: user.fullName,
      changedArea: "Anhänge",
      description: `Anhang „${updated.displayName}“ ${action}.`,
    } });
    return updated;
  });
}

export async function uploadKnowledgeContentAttachment(knowledgeContentId: number, input: CampusUploadInput, user: AuthUser) {
  authorize(user);
  const validated = validateFile(input);
  const content = await prisma.knowledgeContent.findUnique({ where: { id: knowledgeContentId } });
  if (!content) throw new OrdoCampusError("Der Wissensinhalt wurde nicht gefunden.", "NOT_FOUND");
  await mkdir(CAMPUS_ATTACHMENT_STORAGE_ROOT, { recursive: true });
  const storedFileName = `${randomUUID()}${validated.extension}`;
  const target = storagePath(storedFileName);
  try { await writeFile(target, input.bytes, { flag: "wx" }); }
  catch { throw new OrdoCampusError("Die Datei konnte nicht gespeichert werden.", "INVALID_INPUT"); }
  try {
    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.knowledgeContentAttachment.create({ data: { knowledgeContentId, displayName: validated.displayName, originalFileName: validated.originalFileName, storedFileName, storageKey: storedFileName, fileExtension: validated.extension.slice(1).toUpperCase(), mimeType: validated.mimeType, fileSizeBytes: input.bytes.byteLength, description: validated.description, sortOrder: input.sortOrder, uploadedByUserId: user.id } });
      await tx.knowledgeContentHistory.create({ data: { knowledgeContentId, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: "Anhänge", description: `Anhang „${attachment.displayName}“ hochgeladen.` } });
      return attachment;
    });
  } catch { await unlink(target).catch(() => undefined); throw new OrdoCampusError("Die Datei konnte nicht gespeichert werden.", "INVALID_INPUT"); }
}

export async function updateKnowledgeContentAttachment(attachmentId: number, input: { displayName: string; description: string; sortOrder: number; active: boolean }, user: AuthUser) {
  authorize(user);
  const attachment = await prisma.knowledgeContentAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw new OrdoCampusError("Der Anhang wurde nicht gefunden.", "NOT_FOUND");
  const displayName = input.displayName.trim(); if (!displayName) throw new OrdoCampusError("Der Anzeigename ist erforderlich.", "INVALID_INPUT");
  const status = input.active ? "Aktiv" : "Archiviert";
  return prisma.$transaction(async (tx) => {
    const updated = await tx.knowledgeContentAttachment.update({ where: { id: attachmentId }, data: { displayName: displayName.slice(0, 300), description: input.description.trim().slice(0, 2000) || null, sortOrder: Math.max(0, Math.min(999999, Math.trunc(input.sortOrder))), status, archivedAt: status === "Archiviert" ? new Date() : null, archivedByUserId: status === "Archiviert" ? user.id : null } });
    await tx.knowledgeContentHistory.create({ data: { knowledgeContentId: attachment.knowledgeContentId, actorUserId: user.id, actorNameSnapshot: user.fullName, changedArea: "Anhänge", description: `Anhang „${updated.displayName}“ ${status === "Archiviert" ? "archiviert" : "aktualisiert"}.` } });
    return updated;
  });
}

export async function readCampusAttachmentFile(storageKey: string) {
  return readFile(storagePath(storageKey));
}

export function formatCampusFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
}
