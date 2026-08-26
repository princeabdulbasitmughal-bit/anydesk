import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const datasetsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Datasets.tsx"), "utf8");
const modelsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Models.tsx"), "utf8");
const protocolsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Protocols.tsx"), "utf8");
const runsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Runs.tsx"), "utf8");

describe("experiment context isolation", () => {
  it("prevents a pending dataset file from crossing experiment context", () => {
    expect(datasetsSource).toContain("fileExperimentId.current !== selectedExperimentId");
    expect(datasetsSource).toContain("selectedExperimentRef.current !== experimentId");
    expect(datasetsSource).toContain("Dataset selection was cleared because the active experiment changed.");
  });

  it("clears unsaved model and run selections when the experiment changes", () => {
    expect(modelsSource).toContain("setName(\"\"); setModelId(\"\"); setHyperparameters(\"{}\")");
    expect(runsSource).toContain("setDatasetId(\"\"); setConfigurationId(\"\"); setReviewOpen(false); setAcknowledged(false)");
  });

  it("suppresses stale mutation success feedback for another experiment", () => {
    expect(modelsSource).toContain("variables.experimentId === selectedExperimentRef.current");
    expect(runsSource).toContain("variables.experimentId !== selectedExperimentRef.current");
    expect(datasetsSource).toContain("variables.experimentId === selectedExperimentRef.current");
  });

  it("resets and only hydrates a Protocol draft for its active experiment", () => {
    expect(protocolsSource).toContain("setDraft(blankDraft);");
    expect(protocolsSource).toContain("latest.data.experimentId !== selectedExperimentId");
  });
});
