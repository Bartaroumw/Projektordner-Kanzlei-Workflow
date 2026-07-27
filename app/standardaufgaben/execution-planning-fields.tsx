"use client";

import { useMemo, useState } from "react";
import { ALL_MONTHS, EXECUTION_RHYTHMS, MONTHS, defaultExecutionMonths, parseExecutionMonths } from "@/lib/task-execution-planning";

const areas = ["Jahresvorbereitung", "Laufende Bearbeitung", "Quartalsarbeiten", "Halbjahresarbeiten", "Jahresendarbeiten", "Sonstige Aufgaben"];

export function ExecutionPlanningFields({
  initialRhythm,
  initialMonths,
  initialArea,
  annualOnly,
  error,
  rhythmName = "rhythm",
  monthsName = "executionMonths",
  taskAreaName = "taskArea",
}: {
  initialRhythm: string;
  initialMonths: string | null;
  initialArea: string | null;
  annualOnly: boolean;
  error?: string;
  rhythmName?: string;
  monthsName?: string;
  taskAreaName?: string;
}) {
  const normalizedInitial = EXECUTION_RHYTHMS.includes(initialRhythm as never) ? initialRhythm : initialRhythm === "Quartalsweise" ? "Vierteljährlich" : initialRhythm === "Bestimmter Monat" ? "Benutzerdefinierte Monate" : "Monatlich";
  const [rhythm, setRhythm] = useState(annualOnly ? "Jährlich" : normalizedInitial);
  const starting = parseExecutionMonths(initialMonths);
  const [months, setMonths] = useState<number[]>(starting.length ? starting : defaultExecutionMonths(rhythm));
  const expected = rhythm === "Monatlich" ? 12 : rhythm === "Vierteljährlich" ? 4 : rhythm === "Halbjährlich" ? 2 : rhythm === "Jährlich" ? 1 : null;
  const hint = useMemo(() => expected ? `Wählen Sie genau ${expected} Monat${expected === 1 ? "" : "e"}.` : "Wählen Sie mindestens einen Monat.", [expected]);

  function changeRhythm(next: string) {
    setRhythm(next);
    setMonths(defaultExecutionMonths(next));
  }

  function toggleMonth(month: number) {
    if (rhythm === "Monatlich") return;
    setMonths((current) => current.includes(month) ? current.filter((value) => value !== month) : [...current, month].sort((a, b) => a - b));
  }

  return (
    <fieldset className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <legend className="px-2 text-lg font-semibold">Ausführungsplanung</legend>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold">Rhythmus
          <select className="input mt-1" name={rhythmName} value={rhythm} onChange={(event) => changeRhythm(event.target.value)} disabled={annualOnly}>
            {EXECUTION_RHYTHMS.map((value) => <option key={value}>{value}</option>)}
          </select>
          {annualOnly && <input type="hidden" name={rhythmName} value="Jährlich" />}
        </label>
        <label className="text-sm font-semibold">Aufgabenbereich
          <select className="input mt-1" name={taskAreaName} defaultValue={initialArea ?? ""}>
            <option value="">Kein besonderer Aufgabenbereich</option>
            {areas.map((area) => <option key={area}>{area}</option>)}
          </select>
        </label>
      </div>
      {!annualOnly && <div className="mt-4">
        <div className="text-sm font-semibold">Ausführungsmonate</div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{rhythm === "Monatlich" ? "Alle zwölf Monate sind automatisch aktiv." : hint}</p>
        {rhythm === "Vierteljährlich" && <PresetButtons presets={[[1,4,7,10],[2,5,8,11],[3,6,9,12]]} onSelect={setMonths} />}
        {rhythm === "Halbjährlich" && <PresetButtons presets={[[1,7],[2,8],[3,9],[4,10],[5,11],[6,12]]} onSelect={setMonths} />}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {MONTHS.map((month) => <label key={month.value} className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${months.includes(month.value) ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-border)] bg-white"}`}>
            <input type="checkbox" name={monthsName} value={month.value} checked={rhythm === "Monatlich" || months.includes(month.value)} onChange={() => toggleMonth(month.value)} disabled={rhythm === "Monatlich"} />
            {month.label}
            {rhythm === "Monatlich" && <input type="hidden" name={monthsName} value={month.value} />}
          </label>)}
        </div>
        {error && <p className="mt-2 text-sm text-[var(--color-error)]" role="alert">{error}</p>}
      </div>}
      {annualOnly && <input type="hidden" name={monthsName} value={ALL_MONTHS[0]} />}
    </fieldset>
  );
}

function PresetButtons({ presets, onSelect }: { presets: number[][]; onSelect: (months: number[]) => void }) {
  return <div className="mt-3 flex flex-wrap gap-2" aria-label="Voreinstellungen für Ausführungsmonate">
    {presets.map((preset) => <button key={preset.join("-")} className="button-secondary text-xs" type="button" onClick={() => onSelect(preset)}>
      {preset.map((value) => MONTHS.find((month) => month.value === value)?.short).join("/")}
    </button>)}
  </div>;
}
