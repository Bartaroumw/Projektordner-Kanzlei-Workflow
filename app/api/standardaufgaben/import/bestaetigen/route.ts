import { revalidatePath } from "next/cache";
import { confirmTaskImport } from "@/lib/task-import";
import { currentUser } from "@/lib/auth";
import { canManageStandardTasks } from "@/lib/permissions";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if(!isSameOrigin(request))return Response.json({error:"Ungültige Anfrage."},{status:403});
  const user=await currentUser();
  if(!user)return Response.json({error:"Anmeldung erforderlich."},{status:401});
  if(!canManageStandardTasks(user))return Response.json({error:"Sie sind für den Excel-Import nicht berechtigt."},{status:403});
  try {
    const body = (await request.json()) as {
      previewId?: string;
      confirmed?: boolean;
      confirmNewCategories?: boolean;
    };
    if (!body.previewId) {
      return Response.json(
        { error: "Vor dem Import ist eine gültige Vorschau erforderlich." },
        { status: 400 },
      );
    }
    const history = await confirmTaskImport(body.previewId, {
      confirmed: body.confirmed === true,
      confirmNewCategories: body.confirmNewCategories === true,
    });
    revalidatePath("/standardaufgaben");
    revalidatePath("/standardaufgaben/import");
    return Response.json({ history });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Der Import ist fehlgeschlagen." },
      { status: 400 },
    );
  }
}
