import { describe, expect, it } from "vitest";
import { createDatasetPreview, decodeDatasetBase64, decodeModelArtifactBase64, MAX_DATASET_BASE64_CHARS, MAX_DATASET_BYTES, MAX_MODEL_ARTIFACT_BASE64_CHARS, MAX_MODEL_ARTIFACT_BYTES, normalizeTrackPoints, parseHyperparameters, sanitizeFindings } from "./contracts";
import { makeResearchMarkdown } from "./reports";
import { applicationStatus, hostedJobFromHyperparameters, jobPayload, parseJobLogResult, safeJobDiagnostic, shouldIngestCompletedResult } from "./huggingface";

describe("research dataset contracts", () => {
  it("creates a preview for a valid CSV dataset", () => {
    const result = createDatasetPreview("csv", Buffer.from("x,y,z\n1,2,3\n"));
    expect(result.summary).toContain("3 columns");
    expect(result.preview).toContain("1,2,3");
  });

  it("sets a base64 transport cap consistent with the dataset byte limit", () => {
    expect(MAX_DATASET_BASE64_CHARS).toBeGreaterThan(MAX_DATASET_BYTES);
    expect(MAX_MODEL_ARTIFACT_BASE64_CHARS).toBe(MAX_DATASET_BASE64_CHARS);
  });

  it("decodes only canonical plain or data-URL base64 dataset transport", () => {
    const payload = Buffer.from("x,y,z\n1,2,3\n").toString("base64");
    expect(decodeDatasetBase64(payload).toString("utf8")).toBe("x,y,z\n1,2,3\n");
    expect(decodeDatasetBase64(`data:text/csv;base64,${payload}`).toString("utf8")).toBe("x,y,z\n1,2,3\n");
    expect(() => decodeDatasetBase64("not-valid-base64!")).toThrow("not valid base64");
    expect(() => decodeDatasetBase64("data:text/csv,not-valid-base64!")).toThrow("not valid base64");
  });

  it("enforces the model-artifact cap against decoded bytes, not only base64 transport length", () => {
    const oversizedArtifact = Buffer.alloc(MAX_MODEL_ARTIFACT_BYTES + 1).toString("base64");
    expect(oversizedArtifact.length).toBeLessThanOrEqual(MAX_MODEL_ARTIFACT_BASE64_CHARS);
    expect(() => decodeModelArtifactBase64(oversizedArtifact)).toThrow("model artifact exceeds");
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

  it("creates the official Jobs payload shape and maps remote stages to supported application statuses", () => {
    const job = hostedJobFromHyperparameters('{"_huggingFaceJob":{"image":"python:3.12","command":["python","train.py"],"timeout":"30m"}}');
    expect(jobPayload(job!, "particle-track-run-9")).toMatchObject({ dockerImage: "python:3.12", command: ["python", "train.py"], timeoutSeconds: 1800, flavor: "cpu-basic" });
    expect(applicationStatus("SCHEDULING")).toBe("queued");
    expect(applicationStatus("RUNNING")).toBe("running");
    expect(applicationStatus("COMPLETED")).toBe("completed");
    expect(applicationStatus("ERROR")).toBe("failed");
  });

  it("accepts only a structured log result manifest and preserves actual track coordinates", () => {
    const manifest = Buffer.from(JSON.stringify({ accuracy: 0.91, efficiency: 0.88, fakeRate: 0.03, trackPoints: [{ trackId: "muon-8", pointOrder: 0, x: 1, y: -2, z: 5 }] })).toString("base64");
    expect(parseJobLogResult(`training log\nTRACKLAB_RESULT=${manifest}\n`)).toMatchObject({ accuracy: 0.91, efficiency: 0.88, fakeRate: 0.03, trackPoints: [{ trackId: "muon-8", pointOrder: 0, x: 1, y: -2, z: 5 }] });
    expect(parseJobLogResult("no result manifest")).toBeUndefined();
    const emptyManifest = Buffer.from("{}").toString("base64");
    expect(parseJobLogResult(`TRACKLAB_RESULT=${emptyManifest}`)).toBeUndefined();
  });

  it("retries a completed run until a real result record exists", () => {
    expect(shouldIngestCompletedResult("completed", false)).toBe(true);
    expect(shouldIngestCompletedResult("completed", true)).toBe(false);
    expect(shouldIngestCompletedResult("running", false)).toBe(false);
  });

  it("redacts Hugging Face access tokens from server diagnostic output", () => {
    expect(safeJobDiagnostic(new Error("Authorization: Bearer hf_secretToken_123 failed"))).toContain("[redacted]");
    expect(safeJobDiagnostic(new Error("Authorization: Bearer hf_secretToken_123 failed"))).not.toContain("hf_secretToken_123");
  });
});
