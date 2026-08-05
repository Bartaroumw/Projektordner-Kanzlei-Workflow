import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { canManageUsers, type AuthUser } from "@/lib/permissions";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image-rules";

export { PROFILE_IMAGE_ACCEPT, PROFILE_IMAGE_MAX_BYTES } from "@/lib/profile-image-rules";
export const PROFILE_IMAGE_STORAGE_ROOT = process.env.PROFILE_IMAGE_STORAGE_DIR
  ? resolve(process.env.PROFILE_IMAGE_STORAGE_DIR)
  : resolve(process.cwd(), process.env.NODE_ENV === "test" ? "tmp/profile-images-test" : "storage/profile-images");

const types = {
  ".jpg": { mimeType: "image/jpeg", format: "jpeg", storedExtension: ".jpg" },
  ".jpeg": { mimeType: "image/jpeg", format: "jpeg", storedExtension: ".jpg" },
  ".png": { mimeType: "image/png", format: "png", storedExtension: ".png" },
  ".webp": { mimeType: "image/webp", format: "webp", storedExtension: ".webp" },
} as const;

export class ProfileImageError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "NOT_ALLOWED" | "NOT_FOUND" | "STORAGE_ERROR") {
    super(message);
  }
}

export type PreparedProfileImage = {
  bytes: Buffer;
  mimeType: string;
  originalFileName: string;
  storedExtension: string;
};

export type ProfileImageInput = {
  bytes: Uint8Array;
  mimeType: string;
  originalFileName: string;
};

function safeOriginalFileName(value: string) {
  return basename(value.replaceAll("\\", "/"))
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240) || "profilbild";
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasSignature(extension: keyof typeof types, bytes: Uint8Array) {
  if (extension === ".jpg" || extension === ".jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === ".png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
}

function authorizeAdministrator(user: AuthUser) {
  if (!user.active || !canManageUsers(user)) {
    throw new ProfileImageError("Sie dürfen Profilbilder nicht verwalten.", "NOT_ALLOWED");
  }
}

function storagePath(storedFileName: string) {
  const target = resolve(PROFILE_IMAGE_STORAGE_ROOT, storedFileName);
  if (!target.startsWith(`${PROFILE_IMAGE_STORAGE_ROOT}${sep}`)) {
    throw new ProfileImageError("Der Profilbildpfad ist ungültig.", "INVALID_INPUT");
  }
  return target;
}

export async function prepareProfileImage(input: ProfileImageInput): Promise<PreparedProfileImage> {
  if (!input.bytes.byteLength) throw new ProfileImageError("Die Profilbilddatei ist leer.", "INVALID_INPUT");
  if (input.bytes.byteLength > PROFILE_IMAGE_MAX_BYTES) {
    throw new ProfileImageError("Das Profilbild darf maximal 5 MB groß sein.", "INVALID_INPUT");
  }
  const originalFileName = safeOriginalFileName(input.originalFileName);
  const extension = extname(originalFileName).toLowerCase() as keyof typeof types;
  const expected = types[extension];
  if (!expected || input.mimeType.toLowerCase() !== expected.mimeType || !hasSignature(extension, input.bytes)) {
    throw new ProfileImageError("Dieses Dateiformat ist nicht zulässig. Verwenden Sie JPG, PNG oder WebP.", "INVALID_INPUT");
  }

  try {
    const image = sharp(input.bytes, { failOn: "error", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== expected.format || !metadata.width || !metadata.height) {
      throw new Error("Ungültige Bildmetadaten");
    }
    const normalized = image.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true });
    const bytes = expected.format === "jpeg"
      ? await normalized.jpeg({ quality: 90 }).toBuffer()
      : expected.format === "png"
        ? await normalized.png().toBuffer()
        : await normalized.webp({ quality: 90 }).toBuffer();
    if (!bytes.byteLength || bytes.byteLength > PROFILE_IMAGE_MAX_BYTES) throw new Error("Ungültige Ausgabedatei");
    return { bytes, mimeType: expected.mimeType, originalFileName, storedExtension: expected.storedExtension };
  } catch {
    throw new ProfileImageError("Die Datei ist kein vollständig lesbares Bild.", "INVALID_INPUT");
  }
}

export async function preparedProfileImageFromFormData(formData: FormData) {
  const value = formData.get("profileImage");
  if (!(value instanceof File) || value.size === 0) return null;
  return prepareProfileImage({
    bytes: new Uint8Array(await value.arrayBuffer()),
    mimeType: value.type,
    originalFileName: value.name,
  });
}

export async function replaceProfileImage(targetUserId: number, image: PreparedProfileImage, actor: AuthUser) {
  authorizeAdministrator(actor);
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!targetUser) throw new ProfileImageError("Der Benutzer wurde nicht gefunden.", "NOT_FOUND");

  await mkdir(PROFILE_IMAGE_STORAGE_ROOT, { recursive: true });
  const storedFileName = `${randomUUID()}${image.storedExtension}`;
  const target = storagePath(storedFileName);
  const existing = await prisma.userProfileImage.findUnique({ where: { userId: targetUserId } });
  const quarantine = existing ? storagePath(`${existing.storedFileName}.${randomUUID()}.pending-delete`) : null;

  try {
    await writeFile(target, image.bytes, { flag: "wx" });
    if (existing && quarantine) await rename(storagePath(existing.storedFileName), quarantine);
  } catch {
    await unlink(target).catch(() => undefined);
    throw new ProfileImageError("Das Profilbild konnte nicht sicher gespeichert werden.", "STORAGE_ERROR");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.userProfileImage.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          storedFileName,
          mimeType: image.mimeType,
          fileSizeBytes: image.bytes.byteLength,
          originalFileName: image.originalFileName,
          uploadedByUserId: actor.id,
        },
        update: {
          storedFileName,
          mimeType: image.mimeType,
          fileSizeBytes: image.bytes.byteLength,
          originalFileName: image.originalFileName,
          uploadedAt: new Date(),
          uploadedByUserId: actor.id,
        },
      });
      await tx.userProfileImageHistory.create({ data: {
        targetUserId,
        actorUserId: actor.id,
        action: existing ? "Profilbild geändert" : "Profilbild hinzugefügt",
      } });
      return record;
    });
    // Nach erfolgreichem Datenbank-Commit darf ein reiner Aufräumfehler die
    // neue, gültige Referenz nicht mehr zurückrollen. Die Diagnose meldet eine
    // gegebenenfalls verbliebene Quarantänedatei als verwaisten Bestand.
    if (quarantine) await unlink(quarantine).catch(() => undefined);
    return result;
  } catch {
    await unlink(target).catch(() => undefined);
    if (existing && quarantine) await rename(quarantine, storagePath(existing.storedFileName)).catch(() => undefined);
    throw new ProfileImageError("Das Profilbild konnte nicht vollständig gespeichert werden.", "STORAGE_ERROR");
  }
}

export async function removeProfileImage(targetUserId: number, actor: AuthUser) {
  authorizeAdministrator(actor);
  const existing = await prisma.userProfileImage.findUnique({ where: { userId: targetUserId } });
  if (!existing) return false;
  const source = storagePath(existing.storedFileName);
  const quarantine = storagePath(`${existing.storedFileName}.${randomUUID()}.pending-delete`);
  try {
    await rename(source, quarantine);
  } catch {
    throw new ProfileImageError("Das vorhandene Profilbild konnte nicht sicher entfernt werden.", "STORAGE_ERROR");
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.userProfileImage.delete({ where: { id: existing.id } });
      await tx.userProfileImageHistory.create({ data: {
        targetUserId,
        actorUserId: actor.id,
        action: "Profilbild entfernt",
      } });
    });
    // Die Datenbanklöschung ist an dieser Stelle bereits bestätigt. Ein
    // fehlgeschlagenes Dateiaufräumen darf deshalb nicht den alten Dateinamen
    // ohne zugehörige Datenbankreferenz wiederherstellen.
    await unlink(quarantine).catch(() => undefined);
    return true;
  } catch {
    await rename(quarantine, source).catch(() => undefined);
    throw new ProfileImageError("Das Profilbild konnte nicht vollständig entfernt werden.", "STORAGE_ERROR");
  }
}

export async function readProfileImage(storedFileName: string) {
  return readFile(storagePath(storedFileName));
}
