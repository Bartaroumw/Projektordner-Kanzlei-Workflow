"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { StandardTask, TaskCategory } from "@prisma/client";
import type { TaskFormState } from "@/app/standardaufgaben/actions";
import {
  CHECKLIST_TYPES,
  FEATURE_CONDITIONS,
  TASK_RHYTHMS,
} from "@/lib/standard-task-validation";

type TaskWithCategory = StandardTask & { category: TaskCategory };

export function TaskForm({
  action,
  categories,
  task,
  cancelHref,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  categories: TaskCategory[];
  task?: TaskWithCategory;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const error = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-7">
      {state.error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>}

      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Grundangaben</legend>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Aufgaben-ID" required error={error("taskId")} hint={task ? "Die Aufgaben-ID ist dauerhaft unveränderlich." : "Beispiel: MON-BANK-001"}>
            {task ? (
              <>
                <input className="input bg-slate-100" value={task.taskId} disabled />
                <input type="hidden" name="taskId" value={task.taskId} />
              </>
            ) : <input className="input" name="taskId" required />}
          </Field>
          <Field label="Checklistenart" required error={error("checklistType")}>
            <select className="input" name="checklistType" defaultValue={task?.checklistType ?? "Monat"}>
              {CHECKLIST_TYPES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Kategorie" required error={error("categoryName")}>
            <select className="input" name="categoryName" defaultValue={task?.category.name ?? categories[0]?.name}>
              {categories.filter((category) => category.active || category.id === task?.categoryId).map((category) => <option key={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Unterkategorie" error={error("subcategory")}>
            <input className="input" name="subcategory" defaultValue={task?.subcategory ?? ""} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Aufgabenbezeichnung" required error={error("title")}>
              <input className="input" name="title" defaultValue={task?.title ?? ""} required />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Anweisungen</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Arbeitsanweisung" error={error("workInstruction")}>
            <textarea className="input min-h-28" name="workInstruction" defaultValue={task?.workInstruction ?? ""} />
          </Field>
          <Field label="Prüfanweisung" error={error("reviewInstruction")}>
            <textarea className="input min-h-28" name="reviewInstruction" defaultValue={task?.reviewInstruction ?? ""} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Gültigkeit und Rhythmus</legend>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Rhythmus" required error={error("rhythm")}>
            <select className="input" name="rhythm" defaultValue={task?.rhythm ?? "Monatlich"}>
              {TASK_RHYTHMS.map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Ausführungsmonat" error={error("executionMonth")} hint="Nur bei „Bestimmter Monat“: 1 bis 12.">
            <input className="input" type="number" min="1" max="12" name="executionMonth" defaultValue={task?.executionMonth ?? ""} />
          </Field>
          <Field label="Rechtsformgruppen" required error={error("legalFormGroups")} hint="Mehrfachwerte mit Semikolon; „Alle“ nie kombinieren.">
            <input className="input" name="legalFormGroups" defaultValue={task?.legalFormGroups ?? "Alle"} required />
          </Field>
          <Field label="Gewinnermittlungsarten" required error={error("profitDeterminationMethods")} hint="Mehrfachwerte mit Semikolon; „Alle“ nie kombinieren.">
            <input className="input" name="profitDeterminationMethods" defaultValue={task?.profitDeterminationMethods ?? "Alle"} required />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Merkmalsbedingungen</legend>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Condition label="Kasse" name="cashCondition" value={task?.cashCondition} />
          <Condition label="Lohn" name="payrollCondition" value={task?.payrollCondition} />
          <Condition label="Anlagevermögen" name="fixedAssetsCondition" value={task?.fixedAssetsCondition} />
          <Condition label="Debitoren/Kreditoren" name="receivablesPayablesCondition" value={task?.receivablesPayablesCondition} />
          <Condition label="Darlehen" name="loansCondition" value={task?.loansCondition} />
          <Condition label="Umsatzsteuerpflicht" name="vatCondition" value={task?.vatCondition} />
          <Condition label="Dauerfristverlängerung" name="permanentExtensionCondition" value={task?.permanentExtensionCondition} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-semibold">Dokumentation</legend>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Wissensschlüssel" error={error("knowledgeKey")}>
            <input className="input" name="knowledgeKey" defaultValue={task?.knowledgeKey ?? ""} />
          </Field>
          <Field label="Sortierreihenfolge" required error={error("sortOrder")}>
            <input className="input" type="number" min="0" name="sortOrder" defaultValue={task?.sortOrder ?? 10} required />
          </Field>
          <Field label="Fachliche Version" required error={error("professionalVersion")}>
            <input className="input" name="professionalVersion" defaultValue={task?.professionalVersion ?? "1.0"} required />
          </Field>
          <div className="md:col-span-3">
            <Field label="Interne Bemerkung" error={error("internalNote")}>
              <textarea className="input min-h-24" name="internalNote" defaultValue={task?.internalNote ?? ""} />
            </Field>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="mandatory" defaultChecked={task?.mandatory ?? false} className="h-4 w-4" />Pflichtaufgabe</label>
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={task?.active ?? true} className="h-4 w-4" />Standardaufgabe ist aktiv</label>
      </div>
      <div className="flex gap-3 border-t border-slate-200 pt-5">
        <button className="button-primary" type="submit" disabled={pending}>{pending ? "Wird gespeichert …" : "Speichern"}</button>
        <Link className="button-secondary" href={cancelHref}>Abbrechen</Link>
      </div>
    </form>
  );
}

function Condition({ label, name, value }: { label: string; name: string; value?: string }) {
  return <Field label={label} required><select className="input" name={name} defaultValue={value ?? "Alle"}>{FEATURE_CONDITIONS.map((entry) => <option key={entry}>{entry}</option>)}</select></Field>;
}

function Field({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-semibold text-slate-700"><span className="mb-1.5 block">{label}{required && <span className="text-red-700"> *</span>}</span>{children}</label>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}{error && <p className="mt-1 text-sm text-red-700">{error}</p>}</div>;
}
