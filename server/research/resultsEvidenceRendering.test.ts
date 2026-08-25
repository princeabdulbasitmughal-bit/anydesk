import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const resultsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Results.tsx"), "utf8");

describe("results evidence rendering", () => {
  it("keeps absent and invalid metric values out of chart data", () => {
    expect(resultsSource).toContain("function asRecordedMetric");
    expect(resultsSource).toContain('if (value === null || value === undefined || value === "") return null');
    expect(resultsSource).toContain("return value === null ? []");
    expect(resultsSource).not.toContain("Number(metrics.data.accuracy ?? 0)");
  });

  it("renders only returned numeric evidence and explains an empty numeric result", () => {
    expect(resultsSource).toContain("metrics.data && chartData.length");
    expect(resultsSource).toContain("No numeric metrics returned for this run");
    expect(resultsSource).toContain("does not substitute missing accuracy, efficiency, or fake-rate values with zero");
    expect(resultsSource).toContain("Actual evaluation values returned for the selected run");
  });
});
