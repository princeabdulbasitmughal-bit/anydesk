import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tracksSource = readFileSync(resolve(process.cwd(), "client/src/pages/Tracks.tsx"), "utf8");

describe("track evidence rendering", () => {
  it("filters missing and invalid coordinates before chart grouping", () => {
    expect(tracksSource).toContain("function asRecordedCoordinate");
    expect(tracksSource).toContain('if (value === null || value === undefined || value === "") return null');
    expect(tracksSource).toContain("if (x === null || y === null || z === null)");
    expect(tracksSource).not.toContain("x: Number(point.x)");
  });

  it("explains excluded points and avoids a synthetic no-data plot", () => {
    expect(tracksSource).toContain("excluded rather than plotted as synthetic origin data");
    expect(tracksSource).toContain("No valid reconstructed points for this run");
    expect(tracksSource).toContain("never coerced into plotted origin points");
  });
});
