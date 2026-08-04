import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIBU_LOHN_COLLECTION_TOPIC_KEYS,
  FIBU_LOHN_START_TOPICS,
} from "@/lib/fibu-lohn-topic-catalog";

describe("Geschützte Provisionierung der FiBu-Lohn-Startthemen", () => {
  it("führt die sechs stabilen Schlüssel in der fachlichen Reihenfolge", () => {
    expect(FIBU_LOHN_START_TOPICS.map((topic) => topic.key)).toEqual([
      "ARBEITNEHMER_VORTEILE",
      "REISEKOSTEN",
      "FAHRZEUGE",
      "SCHEINSELBSTSTAENDIGKEIT",
      "GESCHENKE_NICHTARBEITNEHMER",
      "KSK",
    ]);
  });

  it("kennzeichnet Fahrzeug- und Sammelpositionsregeln eindeutig", () => {
    expect(FIBU_LOHN_START_TOPICS.filter((topic) => topic.vehicleRelated).map((topic) => topic.key)).toEqual(["FAHRZEUGE"]);
    expect(FIBU_LOHN_COLLECTION_TOPIC_KEYS).toEqual([
      "ARBEITNEHMER_VORTEILE",
      "REISEKOSTEN",
      "GESCHENKE_NICHTARBEITNEHMER",
      "KSK",
    ]);
  });

  it("erzwingt Freigabe, exakten dev-Pfad, Backup und Integritätsprüfungen", () => {
    const source = readFileSync("scripts/provision-fibu-lohn-topics.ts", "utf8");
    expect(source).toContain('DEVELOPMENT_DATABASE_URL = "file:./dev.db"');
    expect(source).toContain('process.argv.includes("--confirm-dev-db")');
    expect(source).toContain("createBackupSet(options, beforeFileSha256)");
    expect(source).toContain('PRAGMA quick_check');
    expect(source).toContain('PRAGMA foreign_key_check');
    expect(source).not.toContain("migrate reset");
    expect(source).not.toContain("db push");
  });
});
