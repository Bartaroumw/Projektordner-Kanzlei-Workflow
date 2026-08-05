"use client";

import { useEffect, useTransition } from "react";
import { recordKnowledgeViewAction, setKnowledgeReadAction } from "@/app/ordo-campus/actions";

export function KnowledgeProgressControls({ contentId, readAt }: { contentId: number; readAt: string | null }) {
  const [pending, startTransition] = useTransition();
  useEffect(() => { startTransition(() => { void recordKnowledgeViewAction(contentId); }); }, [contentId]);
  return <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
    <p className="text-sm">Diese freiwillige Markierung dient nur Ihrer persönlichen Orientierung und ist kein Schulungsnachweis.</p>
    <button className="button-secondary mt-3" disabled={pending} onClick={() => startTransition(() => { void setKnowledgeReadAction(contentId, !readAt); })}>{readAt ? "Markierung als gelesen entfernen" : "Als gelesen markieren"}</button>
  </div>;
}
