"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { recordKnowledgeView, setKnowledgeRead } from "@/lib/knowledge-platform-service";

export async function recordKnowledgeViewAction(contentId: number) {
  const user = await requireUser();
  await recordKnowledgeView(contentId, user);
}

export async function setKnowledgeReadAction(contentId: number, read: boolean) {
  const user = await requireUser();
  await setKnowledgeRead(contentId, read, user);
  revalidatePath(`/ordo-campus/wissen/${contentId}`);
  revalidatePath("/ordo-campus");
  revalidatePath("/ordo-campus/lernpfade");
  revalidatePath("/ordo-campus/zuletzt");
}
