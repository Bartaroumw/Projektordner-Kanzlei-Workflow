import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/permissions";
import {
  prepareProfileImage,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_STORAGE_ROOT,
  ProfileImageError,
  readProfileImage,
  removeProfileImage,
  replaceProfileImage,
} from "@/lib/profile-image-service";

const admin = (id: number): AuthUser => ({ id, fullName: "Anton Administration", username: "anton.admin", active: true, mustChangePassword: false, roles: ["ADMINISTRATOR"] });
const employee = (id: number): AuthUser => ({ id, fullName: "Berta Beispiel", username: "berta.beispiel", active: true, mustChangePassword: false, roles: ["MITARBEITER"] });

async function artificialImage(format: "jpeg" | "png" | "webp") {
  const image = sharp({ create: { width: 16, height: 12, channels: 3, background: { r: 61, g: 113, b: 47 } } });
  return format === "jpeg" ? image.jpeg().toBuffer() : format === "png" ? image.png().toBuffer() : image.webp().toBuffer();
}

async function createUsers() {
  const administrator = await prisma.user.create({ data: { fullName: "Anton Administration", username: "profil.admin", passwordHash: "künstlich", mustChangePassword: false, roles: { create: { role: "ADMINISTRATOR" } } } });
  const target = await prisma.user.create({ data: { fullName: "Berta Beispiel", username: "profil.ziel", passwordHash: "künstlich", mustChangePassword: false, roles: { create: { role: "MITARBEITER" } } } });
  return { administrator, target };
}

describe("geschützte Profilbilder", () => {
  beforeEach(async () => {
    await prisma.userProfileImageHistory.deleteMany();
    await prisma.userProfileImage.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    if (existsSync(PROFILE_IMAGE_STORAGE_ROOT)) rmSync(PROFILE_IMAGE_STORAGE_ROOT, { recursive: true });
  });

  it.each([
    ["portrait.jpg", "image/jpeg", "jpeg"],
    ["portrait.png", "image/png", "png"],
    ["portrait.webp", "image/webp", "webp"],
  ] as const)("akzeptiert und dekodiert %s vollständig", async (originalFileName, mimeType, format) => {
    const prepared = await prepareProfileImage({ bytes: await artificialImage(format), mimeType, originalFileName });
    expect(prepared.mimeType).toBe(mimeType);
    expect((await sharp(prepared.bytes).metadata()).format).toBe(format);
  });

  it("weist leere, zu große, falsch deklarierte und beschädigte Dateien zurück", async () => {
    const png = await artificialImage("png");
    await expect(prepareProfileImage({ bytes: new Uint8Array(), mimeType: "image/png", originalFileName: "leer.png" })).rejects.toBeInstanceOf(ProfileImageError);
    await expect(prepareProfileImage({ bytes: new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1), mimeType: "image/png", originalFileName: "gross.png" })).rejects.toBeInstanceOf(ProfileImageError);
    await expect(prepareProfileImage({ bytes: png, mimeType: "image/jpeg", originalFileName: "falsch.jpg" })).rejects.toBeInstanceOf(ProfileImageError);
    await expect(prepareProfileImage({ bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]), mimeType: "image/png", originalFileName: "programm.png" })).rejects.toBeInstanceOf(ProfileImageError);
    await expect(prepareProfileImage({ bytes: new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]), mimeType: "image/png", originalFileName: "defekt.png" })).rejects.toBeInstanceOf(ProfileImageError);
  });

  it("verweigert normalen Benutzern jede Profilbildverwaltung", async () => {
    const { target } = await createUsers();
    const prepared = await prepareProfileImage({ bytes: await artificialImage("png"), mimeType: "image/png", originalFileName: "bild.png" });
    await expect(replaceProfileImage(target.id, prepared, employee(target.id))).rejects.toMatchObject({ code: "NOT_ALLOWED" });
    expect(await prisma.userProfileImage.count()).toBe(0);
  });

  it("speichert neutral, ersetzt ohne verwaiste Datei und protokolliert nur die Aktion", async () => {
    const { administrator, target } = await createUsers();
    const first = await prepareProfileImage({ bytes: await artificialImage("png"), mimeType: "image/png", originalFileName: "erstes künstliches bild.png" });
    const firstRecord = await replaceProfileImage(target.id, first, admin(administrator.id));
    expect(firstRecord.storedFileName).not.toContain("erstes");
    expect(await readProfileImage(firstRecord.storedFileName)).toHaveLength(firstRecord.fileSizeBytes);

    const second = await prepareProfileImage({ bytes: await artificialImage("webp"), mimeType: "image/webp", originalFileName: "zweites.webp" });
    const secondRecord = await replaceProfileImage(target.id, second, admin(administrator.id));
    expect(secondRecord.id).toBe(firstRecord.id);
    expect(secondRecord.storedFileName).not.toBe(firstRecord.storedFileName);
    expect(readdirSync(PROFILE_IMAGE_STORAGE_ROOT)).toEqual([secondRecord.storedFileName]);
    expect(await prisma.userProfileImage.count({ where: { userId: target.id } })).toBe(1);
    expect((await prisma.userProfileImageHistory.findMany({ orderBy: { id: "asc" } })).map((entry) => entry.action)).toEqual(["Profilbild hinzugefügt", "Profilbild geändert"]);
  });

  it("entfernt Datei und Referenz vollständig und erhält den Auditnachweis", async () => {
    const { administrator, target } = await createUsers();
    const prepared = await prepareProfileImage({ bytes: await artificialImage("jpeg"), mimeType: "image/jpeg", originalFileName: "entfernen.jpg" });
    await replaceProfileImage(target.id, prepared, admin(administrator.id));
    expect(await removeProfileImage(target.id, admin(administrator.id))).toBe(true);
    expect(await removeProfileImage(target.id, admin(administrator.id))).toBe(false);
    expect(await prisma.userProfileImage.findUnique({ where: { userId: target.id } })).toBeNull();
    expect(existsSync(PROFILE_IMAGE_STORAGE_ROOT) ? readdirSync(PROFILE_IMAGE_STORAGE_ROOT) : []).toHaveLength(0);
    expect((await prisma.userProfileImageHistory.findMany({ orderBy: { id: "asc" } })).at(-1)?.action).toBe("Profilbild entfernt");
  });

  it("liefert Profilbilder ausschließlich über eine authentifizierte Route aktiver Benutzer aus", () => {
    const route = readFileSync("app/api/profile-images/[userId]/route.ts", "utf8");
    expect(route).toContain("await currentUser()");
    expect(route).toContain("active: true");
    expect(route).toContain('"Cache-Control": "private, no-store"');
    expect(route).not.toContain("originalFileName");
    expect(route).not.toContain("PROFILE_IMAGE_STORAGE_ROOT");
  });

  it("behält bei fehlendem Bild die Initialen als wiederverwendbaren Fallback", () => {
    const component = readFileSync("app/components/user-avatar.tsx", "utf8");
    expect(component).toContain("Kein Profilbild für");
    expect(component).toContain("object-cover");
    expect(component).toContain("onError");
  });

  it("bietet jedem angemeldeten Benutzer zentrale, nur lesende Profileinstellungen", () => {
    const page = readFileSync("app/profil/page.tsx", "utf8");
    expect(page).toContain("await requireUser()");
    expect(page).toContain("Profileinstellungen");
    expect(page).toContain("Weitere Berechtigungen");
    expect(page).toContain("<details");
    expect(page).toContain('href="/passwort-aendern"');
    expect(page).not.toContain("updateUserAction");
  });

  it("beschränkt die administrative Bildpflege serverseitig und zeigt den Datenschutzhinweis", () => {
    const actions = readFileSync("app/administration/benutzer/actions.ts", "utf8");
    const form = readFileSync("app/administration/benutzer/user-form.tsx", "utf8");
    expect(actions).toContain('requireRole("ADMINISTRATOR")');
    expect(actions).toContain("replaceProfileImage");
    expect(actions).toContain("removeProfileImage");
    expect(form).toContain("für die interne Benutzeranzeige freigegebenes Profilbild");
    expect(form).toContain("PROFILE_IMAGE_MAX_BYTES");
  });
});
