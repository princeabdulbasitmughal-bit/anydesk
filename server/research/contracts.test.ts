import { describe, expect, it } from "vitest";
import { createDatasetPreview, normalizeTrackPoints, parseHyperparameters, sanitizeFindings } from "./contracts";
import { makeResearchMarkdown } from "./reports";

describe("research dataset contracts", () => {
  it("creates a preview for a valid CSV dataset", () => {
    const result = createDatasetPreview("csv", Buffer.from("x,y,z\n1,2,3\n"));
    expect(result.summary).toContain("3 columns");
    expect(result.preview).toContain("1,2,3");
  });

  it("rejects HDF5 content without the required file signature", () => {
    expect(() => createDatasetPreview("hdf5", Buffer.from("not-hdf5"))).toThrow("signature");
  });

  it("only accepts object-shaped hyperparameters and strips unsafe finding markup", () => {
    expect(parseHyperparameters('{"learning_rate":0.001}')).toEqual({ learning_rate: 0.001 });
    expect(() => parseHyperparameters("[]")).toThrow("JSON object");
    expect(sanitizeFindings('<p>Result</p><script>alert(1)</script>')).toBe("<p>Result</p>");
  });

  it("normalizes finite reconstructed coordinates for persistent track visualizations", () => {
    expect(normalizeTrackPoints([{ trackId: "muon-1", pointOrder: 0, x: 1.25, y: -0.3, z: 8 }])).toEqual([
      { trackId: "muon-1", pointOrder: 0, x: "1.25", y: "-0.3", z: "8" },
    ]);
    expect(() => normalizeTrackPoints([{ trackId: "muon-1", pointOrder: 0, x: Number.NaN, y: 1, z: 2 }])).toThrow("non-finite");
  });

  it("creates a structured Markdown research report without inventing a findings record", () => {
    const report = makeResearchMarkdown(
      { title: "Detector reconstruction", description: "A controlled tracking study." },
      undefined,
      [{ id: 12, runType: "inference", status: "completed", queuedAt: new Date("2026-08-12T00:00:00.000Z") }],
    );
    expect(report).toContain("# Detector reconstruction");
    expect(report).toContain("No findings have been recorded");
    expect(report).toContain("| 12 | inference | completed |");
  });
});
