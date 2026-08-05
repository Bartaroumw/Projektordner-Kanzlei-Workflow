import Link from "next/link";
import { redirect } from "next/navigation";
import { AdministrationTabs } from "@/app/components/administration-navigation";
import { ModuleCard } from "@/app/components/module-card";
import { requireUser } from "@/lib/auth";
import {
  administrationHref,
  administrationSectionsFor,
  canUseCentralCustomTaskOverview,
  type AdministrationSection,
} from "@/lib/administration-navigation";
import { prisma } from "@/lib/prisma";
import {
  canManageOrdoCampus,
  canManagePayrollTopics,
  canManageStandardTasks,
  canManageUsers,
} from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export default async function AdministrationPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sections = administrationSectionsFor(user);
  if (!sections.length) redirect("/zugriff-verweigert?bereich=Verwaltung");
  const requested = one((await searchParams).bereich) as AdministrationSection;
  const active = sections.includes(requested) ? requested : sections[0];
  if (requested && requested !== active) redirect(administrationHref(active));

  const canStandards = canManageStandardTasks(user);
  const canCampus = canManageOrdoCampus(user);
  const canPayrollTopics = canManagePayrollTopics(user);
  const canUsers = canManageUsers(user);
  const canCustomTasks = canUseCentralCustomTaskOverview(user);
  const counts = await loadCounts({ canStandards, canCampus, canPayrollTopics, canUsers, canCustomTasks });

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-primary)]">Zentrale Kanzleifunktionen</p>
        <h1 className="mt-2 text-3xl font-bold">Verwaltung</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
          Zentrale fachliche und technische Grundlagen von Ordo Caroli. Persönliche Funktionen wie die Passwortänderung bleiben davon getrennt.
        </p>
      </header>
      <AdministrationTabs user={user} active={active}/>
      {active === "fachliche-grundlagen" && <section aria-labelledby="fachliche-grundlagen">
        <h2 id="fachliche-grundlagen" className="text-2xl font-bold">Fachliche Grundlagen</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Kanzleiweite Vorlagen und Kataloge; bestehende Checklisten-Snapshots werden dadurch nicht rückwirkend verändert.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(canStandards || canCampus) && <ModuleCard title="Standardaufgaben" description={canStandards ? "Aufgabenbestand, Ausführungsrhythmen, fachliche Bedingungen und Ordo-Campus-Verknüpfungen verwalten." : "Standardaufgaben mit Ordo-Campus-Wissen öffnen und Wissensinhalte pflegen."} href="/standardaufgaben" count={counts.standardTasks}/>}
          {canStandards && <ModuleCard title="Aufgabenbereiche und Kategorien" description="Die vorhandene zentrale Kategorienverwaltung für Standard- und mandantenspezifische Aufgaben." href="/standardaufgaben/kategorien" count={counts.categories}/>}
          {canPayrollTopics && <ModuleCard title="Rechnungswesen–Lohn-Themen" description="Prüffragen, Reihenfolge, Status, Fahrzeugbezug und Campus-Verknüpfungen für künftige Abstimmungen pflegen." href="/fibu-lohn/themen" count={counts.payrollTopics}/>}
          {canCustomTasks && <ModuleCard title="Mandantenspezifische Aufgaben" description="Mandantenübergreifend suchen und kontrollieren. Die Neuanlage bleibt ausschließlich beim jeweiligen Mandanten." href="/verwaltung/mandantenspezifische-aufgaben" count={counts.customTasks}/>}
          {canCampus && <ModuleCard title="Ordo Campus" description="Lesende Wissens- und Lernplattform öffnen. Die Pflege erfolgt im eigenen Reiter Wissensmanagement." href="/ordo-campus" count={counts.knowledgeContents}/>}
        </div>
      </section>}
      {active === "wissensmanagement" && canCampus && <section aria-labelledby="wissensmanagement">
        <h2 id="wissensmanagement" className="text-2xl font-bold">Wissensmanagement</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Eigenständige Wissensinhalte, Gebiete, Lernpfade und ihre Anwendungsorte zentral verwalten.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard title="Wissensinhalte" description="Inhalte anlegen, bearbeiten, aktivieren, archivieren und mehrfach zuordnen." href="/verwaltung/wissensmanagement" count={counts.knowledgeContents}/>
          <ModuleCard title="Wissensgebiete" description="Haupt- und Untergebiete, Reihenfolge und Status verwalten." href="/verwaltung/wissensmanagement/gebiete" count={counts.knowledgeAreas}/>
          <ModuleCard title="Lernpfade" description="Geordnete Lernpfade und Zielgruppen pflegen." href="/verwaltung/wissensmanagement/lernpfade" count={counts.learningPaths}/>
          <ModuleCard title="Entwürfe" description="Noch nicht veröffentlichte Wissensinhalte prüfen." href="/verwaltung/wissensmanagement?status=Entwurf" count={counts.knowledgeDrafts}/>
          <ModuleCard title="Archiv" description="Historisch erhaltene, nicht mehr regulär sichtbare Inhalte öffnen." href="/verwaltung/wissensmanagement?status=Archiviert" count={counts.knowledgeArchived}/>
          <ModuleCard title="Überprüfungsbedarf" description="Fällige oder fehlende nächste Prüftermine kontrollieren." href="/verwaltung/wissensmanagement?pruefung=faellig" count={counts.reviewDue}/>
        </div>
      </section>}
      {active === "benutzer-rechte" && <section aria-labelledby="benutzer-rechte">
        <h2 id="benutzer-rechte" className="text-2xl font-bold">Benutzer und Rechte</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Fachliche Rollen, technische Administratorrolle und Zusatzberechtigungen bleiben klar getrennt.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard title="Benutzerverwaltung" description="Lokale Benutzerkonten, Status, fachliche Rollen, technische Rolle und Zusatzberechtigungen verwalten." href="/administration/benutzer" count={counts.users} action="Benutzer öffnen"/>
        </div>
      </section>}
      {active === "daten-import" && <section aria-labelledby="daten-import">
        <h2 id="daten-import" className="text-2xl font-bold">Daten und Import</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Kontrollierte Datenübernahmen mit Vorschau, Validierung und Importhistorie.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard title="Standardaufgaben-Import" description="Excel-Datei prüfen, Vorschau kontrollieren, ausdrücklich bestätigen und bisherige Importe nachvollziehen." href="/standardaufgaben/import" count={counts.imports} action="Import öffnen"/>
        </div>
      </section>}
      {active === "system" && <section aria-labelledby="system">
        <h2 id="system" className="text-2xl font-bold">System</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Sichere technische Hinweise ohne Geheimnisse, Sitzungsschlüssel oder vollständige interne Pfade.</p>
        <dl className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SystemValue label="Anwendung" value="Ordo Caroli 0.1.0"/>
          <SystemValue label="Umgebung" value={process.env.NODE_ENV === "production" ? "Produktionsmodus" : "Lokale Entwicklung"}/>
          <SystemValue label="Datenbank" value="SQLite, lokal"/>
          <SystemValue label="Maximale Anhangsgröße" value="15 MB"/>
          <SystemValue label="Datensicherung" value="Datenbank und beide geschützten Speicherbereiche gemeinsam sichern"/>
        </dl>
        {process.env.NODE_ENV !== "production" && <Link className="button-secondary mt-5" href="/administration/diagnose">Diagnose künstlicher Daten öffnen</Link>}
      </section>}
    </div>
  );
}

async function loadCounts(access: {
  canStandards: boolean;
  canCampus: boolean;
  canPayrollTopics: boolean;
  canUsers: boolean;
  canCustomTasks: boolean;
}) {
  const [standardTasks, categories, payrollTopics, customTasks, knowledgeContents, knowledgeAreas, learningPaths, knowledgeDrafts, knowledgeArchived, reviewDue, users, imports] = await Promise.all([
    access.canStandards || access.canCampus ? prisma.standardTask.count() : Promise.resolve(0),
    access.canStandards ? prisma.taskCategory.count() : Promise.resolve(0),
    access.canPayrollTopics ? prisma.payrollReconciliationTopic.count() : Promise.resolve(0),
    access.canCustomTasks ? prisma.customClientTask.count() : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeContent.count() : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeArea.count() : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeLearningPath.count() : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeContent.count({where:{status:"Entwurf"}}) : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeContent.count({where:{status:"Archiviert"}}) : Promise.resolve(0),
    access.canCampus ? prisma.knowledgeContent.count({where:{nextReviewDate:{lte:new Date()}}}) : Promise.resolve(0),
    access.canUsers ? prisma.user.count() : Promise.resolve(0),
    access.canStandards ? prisma.taskImportHistory.count() : Promise.resolve(0),
  ]);
  return { standardTasks, categories, payrollTopics, customTasks, knowledgeContents, knowledgeAreas, learningPaths, knowledgeDrafts, knowledgeArchived, reviewDue, users, imports };
}

function SystemValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--color-border)] bg-white p-5"><dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt><dd className="mt-2 text-sm font-semibold">{value}</dd></div>;
}
