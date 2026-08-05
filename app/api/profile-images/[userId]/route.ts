import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readProfileImage } from "@/lib/profile-image-service";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const viewer = await currentUser();
  if (!viewer) return new Response("Anmeldung erforderlich.", { status: 401 });
  const userId = Number((await params).userId);
  if (!Number.isInteger(userId) || userId < 1) return new Response("Nicht gefunden.", { status: 404 });
  const target = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { profileImage: { select: { storedFileName: true, mimeType: true } } },
  });
  if (!target?.profileImage) return new Response("Nicht gefunden.", { status: 404 });
  try {
    const bytes = await readProfileImage(target.profileImage.storedFileName);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": target.profileImage.mimeType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Profilbild konnte nicht ausgeliefert werden.", {
      userId,
      error: error instanceof Error ? error.name : "Unbekannter Fehler",
    });
    return new Response("Nicht gefunden.", { status: 404 });
  }
}
