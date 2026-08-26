import { describe, expect, it } from "vitest";
import { buildReproducibilityLedger } from "./reproducibility";

const experiment = { id: 4, title: "Detector study", description: "A real-record ledger test" };

describe("Reproducibility Ledger", () => {
  it("marks absent evidence as missing without fabricating research records", () => {
    const ledger = buildReproducibilityLedger({ experiment, datasets: [], configurations: [], protocols: [], runs: [], metricsByRun: {}, tracksByRun: {}, reports: [] });

    expect(ledger.hasActualEvidence).toBe(false);
    expect(ledger.coverage).toBe(0);
    expect(ledger.manifest.evidence.datasets).toEqual([]);
    expect(ledger.manifest.evidence.protocols).toEqual([]);
    expect(ledger.manifest.evidence.runs).toEqual([]);
    expect(ledger.manifest.missingEvidence).toContain("Dataset provenance");
    expect(ledger.manifest.missingEvidence).toContain("Returned metric evidence");
  });

  it("preserves only supplied evidence links and never substitutes metric values", () => {
    const ledger = buildReproducibilityLedger({
      experiment,
      datasets: [{ id: 8, name: "uploaded-events.csv", format: "csv", byteSize: 128 }],
      configurations: [{ id: 9, name: "Recorded configuration", huggingFaceModelId: "jpata/particleflow" }],
      protocols: [{ id: 10, version: 1 }],
      runs: [{ id: 12, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, runType: "inference", status: "completed" }],
      metricsByRun: { 12: { accuracy: null, efficiency: null, fakeRate: null, metricPayload: "{}" } },
      tracksByRun: { 12: [] },
      reports: [],
    });

    expect(ledger.hasActualEvidence).toBe(true);
    expect(ledger.manifest.evidence.protocols).toEqual([{ id: 10, version: 1, createdAt: null }]);
    expect(ledger.manifest.evidence.runs[0]).toMatchObject({ id: 12, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, metricRecord: { accuracy: null, efficiency: null, fakeRate: null }, reconstructedPointCount: 0 });
    expect(ledger.checks.find(item => item.id === "run-links")?.status).toBe("present");
    expect(ledger.checks.find(item => item.id === "tracks")?.status).toBe("attention");
    expect(ledger.manifest.missingEvidence).toContain("Reconstructed track evidence");
  });
});
