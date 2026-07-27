import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("Abnahme: geschützte Rücksprungziele", () => {
  it("erhält erforderliche Query-Parameter eines geschützten Campus-Downloads", () => {
    const response = proxy(
      new NextRequest(
        "http://localhost:3000/api/ordo-campus/attachments/1/download?kind=monat&taskId=6",
      ),
    );
    const location = response.headers.get("location");
    expect(location).toContain(
      "weiter=%2Fapi%2Fordo-campus%2Fattachments%2F1%2Fdownload%3Fkind%3Dmonat%26taskId%3D6",
    );
  });

  it("verwendet weiterhin nur interne Rücksprungziele", () => {
    const response = proxy(
      new NextRequest("http://localhost:3000/mandanten?weiter=https://example.invalid"),
    );
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/anmelden");
    expect(location.searchParams.get("weiter")).toBe(
      "/mandanten?weiter=https://example.invalid",
    );
  });
});
