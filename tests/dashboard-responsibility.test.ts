import { describe, expect, it } from "vitest";
import {
  annualDashboardResponsibility,
  defaultDashboardMonth,
  monthlyDashboardResponsibility,
} from "@/lib/dashboard-responsibility";

const separated = { processorUserId: 1, reviewerUserId: 2, managementUserId: 3 };
const combined = { processorUserId: 1, reviewerUserId: 1, managementUserId: 1 };

describe("Zentrale Dashboard-Verantwortung", () => {
  it.each(["Offen", "In Bearbeitung", "Nachbearbeitung"])(
    "ordnet %s ausschließlich der aktiven Bearbeitung zu",
    (status) => expect(monthlyDashboardResponsibility(status, 1, combined)).toBe("BEARBEITUNG_AKTIV"),
  );

  it.each(["Zur Prüfung", "In Prüfung"])(
    "ordnet %s bei Mehrfachrolle ausschließlich der aktiven Prüfung zu",
    (status) => expect(monthlyDashboardResponsibility(status, 1, combined)).toBe("PRUEFUNG_AKTIV"),
  );

  it("zeigt dem Bearbeiter eine übergebene Checkliste nur als wartend", () => {
    expect(monthlyDashboardResponsibility("Zur Prüfung", 1, separated)).toBe("WARTET_AUF_PRUEFUNG");
  });

  it("zeigt dem Prüfer eine Nachbearbeitung nur als wartend", () => {
    expect(monthlyDashboardResponsibility("Nachbearbeitung", 2, separated)).toBe("WARTET_AUF_NACHBEARBEITUNG");
  });

  it("ordnet abgeschlossene und fremde Vorgänge nicht aktiv zu", () => {
    expect(monthlyDashboardResponsibility("Abgeschlossen", 1, combined)).toBe("ABGESCHLOSSEN");
    expect(monthlyDashboardResponsibility("Offen", 9, separated)).toBe("NICHT_ZUGEORDNET");
  });

  it("trennt Jahresabschlussprüfung und Leitungsfreigabe", () => {
    expect(annualDashboardResponsibility("Zur Prüfung", 2, separated)).toBe("PRUEFUNG_AKTIV");
    expect(annualDashboardResponsibility("Zur Prüfung", 3, separated)).toBe("NICHT_ZUGEORDNET");
    expect(annualDashboardResponsibility("Zur Freigabe", 3, separated)).toBe("FREIGABE_AKTIV");
    expect(annualDashboardResponsibility("Zur Freigabe", 2, separated)).toBe("NICHT_ZUGEORDNET");
  });
});

describe("Standardmonat", () => {
  it("verwendet den Vormonat", () => {
    expect(defaultDashboardMonth(new Date("2026-07-15T12:00:00Z"))).toEqual({ year: 2026, month: 6 });
  });

  it("wechselt im Januar auf Dezember des Vorjahres", () => {
    expect(defaultDashboardMonth(new Date("2027-01-15T12:00:00Z"))).toEqual({ year: 2026, month: 12 });
  });
});
