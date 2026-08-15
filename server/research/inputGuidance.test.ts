import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DATASET_FORMATS, MAX_DATASET_BYTES, getDatasetFormatFromFilename, getRunPrerequisites, parseHyperparameters, preflightDatasetFile } from "../../shared/researchInputRules";
import { describe, expect, it } from "vitest";

const datasetsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Datasets.tsx"), "utf8");
const modelsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Models.tsx"), "utf8");
const runsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Runs.tsx"), "utf8");

describe("research input guidance", () => {
  it("mirrors the server dataset-format and 25 MiB size boundary before browser encoding", () => {
    expect(DATASET_FORMATS).toEqual(["csv", "json", "hdf5"]);
    expect(getDatasetFormatFromFilename("events.h5")).toBe("hdf5");
    expect(getDatasetFormatFromFilename("events.root")).toBeNull();
    expect(preflightDatasetFile("events.csv", MAX_DATASET_BYTES)).toEqual({ ok: true, format: "csv" });
    expect(preflightDatasetFile("events.csv", MAX_DATASET_BYTES + 1)).toEqual({ ok: false, error: "This dataset exceeds the 25 MiB maximum." });
  });

  it("rejects malformed or non-object model metadata before run configuration submission", () => {
    expect(parseHyperparameters('{"modelRevision":"abc","randomSeed":7}')).toMatchObject({ randomSeed: 7 });
    expect(() => parseHyperparameters("[1,2,3]")).toThrow("Hyperparameters must be a JSON object.");
    expect(() => parseHyperparameters("{broken")).toThrow();
  });

  it("distinguishes dataset and configuration readiness for a future run", () => {
    expect(getRunPrerequisites(false, true)).toEqual([
      expect.objectContaining({ id: "dataset", ready: false }),
      expect.objectContaining({ id: "configuration", ready: true }),
    ]);
  });

  it("wires the contract into dataset, model, and run entry controls", () => {
    expect(datasetsSource).toContain("preflightDatasetFile(candidate.name, candidate.size)");
    expect(datasetsSource).toContain("Client preflight passed");
    expect(modelsSource).toContain("JSON object preflight passed");
    expect(modelsSource).toContain("aria-invalid={Boolean(hyperparameterError)}");
    expect(runsSource).toContain("getRunPrerequisites(Boolean(datasets.data?.length), Boolean(configs.data?.length))");
    expect(runsSource).toContain("Run readiness");
  });
});
