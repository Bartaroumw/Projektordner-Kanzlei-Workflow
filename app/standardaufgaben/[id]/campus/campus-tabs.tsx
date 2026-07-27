"use client";

import { useState, type ReactNode } from "react";

const tabs = [
  ["uebersicht", "Übersicht"],
  ["bearbeitung", "Bearbeitung"],
  ["kanzleistandard", "Kanzleistandard"],
  ["pruefung", "Prüfung"],
  ["links", "Links"],
  ["anhaenge", "Anhänge"],
  ["verlauf", "Verlauf"],
] as const;

export function CampusTabs({ panels }: { panels: Record<(typeof tabs)[number][0], ReactNode> }) {
  const [active, setActive] = useState<(typeof tabs)[number][0]>("uebersicht");
  return <div>
    <div className="mb-5 flex flex-wrap gap-2 border-b border-[var(--color-border)]" role="tablist" aria-label="Ordo-Campus-Bereiche">
      {tabs.map(([id, label]) => <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active === id}
        aria-controls={`campus-panel-${id}`}
        className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold ${active === id ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]" : "border-[var(--color-border)] bg-white"}`}
        onClick={() => setActive(id)}
      >{label}</button>)}
    </div>
    {tabs.map(([id]) => <section key={id} id={`campus-panel-${id}`} role="tabpanel" hidden={active !== id}>{panels[id]}</section>)}
  </div>;
}
