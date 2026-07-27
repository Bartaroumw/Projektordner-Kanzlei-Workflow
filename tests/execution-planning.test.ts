import { describe, expect, it } from "vitest";
import {
  ALL_MONTHS,
  executionPlanningMatches,
  formatExecutionPlanning,
  validateExecutionPlanning,
} from "@/lib/task-execution-planning";

describe("Ausführungsplanung", () => {
  it("validiert monatlich mit allen zwölf Monaten", () => {
    expect(validateExecutionPlanning("Monatlich", ALL_MONTHS).months).toHaveLength(12);
  });

  it("erlaubt unterschiedliche Vierteljahreszyklen", () => {
    expect(validateExecutionPlanning("Vierteljährlich", [1, 4, 7, 10]).serializedMonths).toBe("1;4;7;10");
    expect(() => validateExecutionPlanning("Vierteljährlich", [1, 4, 7])).toThrow("genau 4");
  });

  it("verlangt bei halbjährlich genau zwei Monate", () => {
    expect(validateExecutionPlanning("Halbjährlich", [6, 12]).serializedMonths).toBe("6;12");
    expect(() => validateExecutionPlanning("Halbjährlich", [6])).toThrow("genau 2");
  });

  it("verlangt bei jährlich genau einen Monat", () => {
    expect(validateExecutionPlanning("Jährlich", [1]).serializedMonths).toBe("1");
    expect(() => validateExecutionPlanning("Jährlich", [1, 12])).toThrow("genau 1");
  });

  it("validiert benutzerdefinierte Monate und Grenzen", () => {
    expect(validateExecutionPlanning("Benutzerdefinierte Monate", [3, 6, 9, 12]).months).toEqual([3, 6, 9, 12]);
    expect(() => validateExecutionPlanning("Benutzerdefinierte Monate", [])).toThrow("mindestens einen");
    expect(() => validateExecutionPlanning("Benutzerdefinierte Monate", [0])).toThrow("Januar und Dezember");
    expect(() => validateExecutionPlanning("Benutzerdefinierte Monate", [1, 1])).toThrow("nicht doppelt");
  });

  it("entscheidet ausschließlich anhand der gespeicherten Ausführungsmonate", () => {
    expect(executionPlanningMatches("1;4;7;10", 4)).toBe(true);
    expect(executionPlanningMatches("1;4;7;10", 2)).toBe(false);
    expect(formatExecutionPlanning("Vierteljährlich", "1;4;7;10")).toBe("Vierteljährlich · Jan/Apr/Jul/Okt");
  });
});
