import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  administrationSectionsFor,
  canOpenAdministration,
  canUseCentralCustomTaskOverview,
} from "../lib/administration-navigation.ts";
import type { AuthUser } from "../lib/permissions.ts";

const user = (roles: AuthUser["roles"]): AuthUser => ({
  id: 1,
  fullName: "Künstliche Testperson",
  username: "test.person",
  active: true,
  mustChangePassword: false,
  roles,
});

describe("rollenabhängige Verwaltungsnavigation", () => {
  it("blendet Verwaltung für normale Rechnungswesenbearbeiter aus", () => {
    expect(canOpenAdministration(user(["MITARBEITER"]))).toBe(false);
  });

  it("blendet Verwaltung für reine Lohnsachbearbeiter aus", () => {
    expect(canOpenAdministration(user(["LOHNSACHBEARBEITER"]))).toBe(false);
  });

  it("zeigt fachliche Grundlagen und Import für Standardaufgabenverwalter", () => {
    expect(administrationSectionsFor(user(["STANDARDAUFGABEN_VERWALTEN"]))).toEqual([
      "fachliche-grundlagen",
      "daten-import",
    ]);
  });

  it("zeigt einem reinen Administrator keine fachlichen Grundlagen", () => {
    expect(administrationSectionsFor(user(["ADMINISTRATOR"]))).toEqual([
      "benutzer-rechte",
      "system",
    ]);
  });

  it("zeigt bei Mehrfachrollen jeden Reiter nur einmal", () => {
    const sections = administrationSectionsFor(user([
      "KANZLEILEITUNG",
      "ADMINISTRATOR",
      "STANDARDAUFGABEN_VERWALTEN",
      "ORDO_CAMPUS_VERWALTEN",
      "FIBU_LOHN_THEMEN_VERWALTEN",
    ]));
    expect(sections).toEqual(["fachliche-grundlagen", "benutzer-rechte", "daten-import", "system"]);
    expect(new Set(sections).size).toBe(sections.length);
  });

  it("öffnet als Standard den ersten tatsächlich erlaubten Reiter", () => {
    expect(administrationSectionsFor(user(["ADMINISTRATOR"]))[0]).toBe("benutzer-rechte");
    expect(administrationSectionsFor(user(["ORDO_CAMPUS_VERWALTEN"]))[0]).toBe("fachliche-grundlagen");
  });

  it("verhindert einen vollständig leeren Verwaltungsbereich", () => {
    expect(administrationSectionsFor(user(["MITARBEITER"]))).toHaveLength(0);
    expect(canOpenAdministration(user(["MITARBEITER"]))).toBe(false);
  });

  it("beschränkt die zentrale mandantenspezifische Übersicht auf zentrale Verwaltungsrechte", () => {
    expect(canUseCentralCustomTaskOverview(user(["PRUEFER"]))).toBe(false);
    expect(canUseCentralCustomTaskOverview(user(["MANDANTENSPEZIFISCHE_AUFGABEN_VERWALTEN"]))).toBe(true);
    expect(canUseCentralCustomTaskOverview(user(["KANZLEILEITUNG"]))).toBe(true);
  });
});

describe("Verwaltungsseiten und direkte Zugriffe", () => {
  const shell = readFileSync("app/components/app-shell.tsx", "utf8");
  const hub = readFileSync("app/verwaltung/page.tsx", "utf8");

  it("führt Verwaltung genau einmal als Hauptpunkt", () => {
    expect(shell.match(/label:"Verwaltung"/g)).toHaveLength(1);
    expect(shell).not.toContain('label:"Standardaufgaben"');
    expect(shell).not.toContain('label:"Benutzerverwaltung"');
    expect(shell).not.toContain('label:"FiBu-Lohn-Themen"');
  });

  it("erhält Rechnungswesen, FiBu und Ordo Campus als Hauptmodule", () => {
    expect(shell).toContain('label:"Rechnungswesen"');
    expect(shell).toContain('label:"Rechnungswesen ↔ Lohn"');
    expect(shell).toContain('label:"Ordo Campus"');
  });

  it("bietet die vier Verwaltungsreiter und keine persönlichen Einstellungen", () => {
    expect(hub).toContain('active === "fachliche-grundlagen"');
    expect(hub).toContain('active === "benutzer-rechte"');
    expect(hub).toContain('active === "daten-import"');
    expect(hub).toContain('active === "system"');
    expect(hub).toContain("Persönliche Funktionen wie die Passwortänderung bleiben davon getrennt");
  });

  it("hält Verwaltungsreiter und Karten bei schmalen Ansichten bedienbar", () => {
    const tabs = readFileSync("app/components/administration-navigation.tsx", "utf8");
    const cards = readFileSync("app/verwaltung/page.tsx", "utf8");
    expect(tabs).toContain("overflow-x-auto");
    expect(tabs).toContain("min-w-max");
    expect(cards).toContain("md:grid-cols-2");
  });

  it("erhält direkte fachliche Routen ohne Funktionsduplikate", () => {
    expect(hub).toContain('href="/standardaufgaben"');
    expect(hub).toContain('href="/fibu-lohn/themen"');
    expect(hub).toContain('href="/administration/benutzer"');
    expect(hub).toContain('href="/standardaufgaben/import"');
    expect(hub).toContain('href="/ordo-campus"');
  });

  it("schützt Standardaufgaben, Benutzer, Themen und Import serverseitig", () => {
    expect(readFileSync("app/standardaufgaben/page.tsx", "utf8")).toContain("canManageStandardTasks(user)");
    expect(readFileSync("app/administration/benutzer/page.tsx", "utf8")).toContain('requireRole("ADMINISTRATOR")');
    expect(readFileSync("app/fibu-lohn/themen/page.tsx", "utf8")).toContain("canManagePayrollTopics(user)");
    expect(readFileSync("app/api/standardaufgaben/import/bestaetigen/route.ts", "utf8")).toContain("canManageStandardTasks(user)");
  });

  it("stellt mandantenspezifische Aufgaben zentral nur mit Mandantenlink dar", () => {
    const source = readFileSync("app/verwaltung/mandantenspezifische-aufgaben/page.tsx", "utf8");
    expect(source).toContain("canUseCentralCustomTaskOverview");
    expect(source).toContain("Beim Mandanten öffnen");
    expect(source).toContain('href={`/mandanten/${task.clientId}/zusatzaufgaben/${task.id}`}');
    expect(source).not.toContain("Aufgabe anlegen");
  });

  it("bietet die geforderten Filter der FiBu-Lohn-Themenverwaltung", () => {
    const source = readFileSync("app/fibu-lohn/themen/page.tsx", "utf8");
    expect(source).toContain('label="Ordo Campus"');
    expect(source).toContain("Fahrzeugbezug");
    expect(source).toContain("Sammelerfassung");
    expect(source).toContain("Archiviert");
  });

  it("zeigt Systeminformationen ohne Geheimnisse oder lokale Vollpfade", () => {
    expect(hub).toContain("SQLite, lokal");
    expect(hub).not.toContain("SESSION_SECRET");
    expect(hub).not.toContain("DATABASE_URL");
    expect(hub).not.toContain("C:\\\\");
  });
});
