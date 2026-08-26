import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { MAX_DATASET_BASE64_CHARS } from "./contracts";

const mocks = vi.hoisted(() => ({
  createDataset: vi.fn(),
  createModelConfiguration: vi.fn(),
  createProtocolRevision: vi.fn(),
  createRun: vi.fn(),
  setRunStatus: vi.fn(),
  saveFinding: vi.fn(),
  createReport: vi.fn(),
  getExperiment: vi.fn(),
  getLatestProtocolRevision: vi.fn(),
  getProtocolRevision: vi.fn(),
  getDataset: vi.fn(),
  getModelConfiguration: vi.fn(),
  getRun: vi.fn(),
  getFinding: vi.fn(),
  listDatasets: vi.fn(),
  listModelConfigurations: vi.fn(),
  listProtocolRevisions: vi.fn(),
  listRuns: vi.fn(),
  listMetrics: vi.fn(),
  listTrackPoints: vi.fn(),
  listReports: vi.fn(),
  recordRunOutcome: vi.fn(),
  storagePut: vi.fn(),
  invokeLLM: vi.fn(),
  hostedJobFromHyperparameters: vi.fn(),
  safeJobDiagnostic: vi.fn(),
  submitHostedJob: vi.fn(),
  sendTerminalRunEmail: vi.fn(),
}));

vi.mock("./db", () => ({
  createDataset: mocks.createDataset,
  createModelConfiguration: mocks.createModelConfiguration,
  createProtocolRevision: mocks.createProtocolRevision,
  createRun: mocks.createRun,
  setRunStatus: mocks.setRunStatus,
  saveFinding: mocks.saveFinding,
  createReport: mocks.createReport,
  getExperiment: mocks.getExperiment,
  getLatestProtocolRevision: mocks.getLatestProtocolRevision,
  getProtocolRevision: mocks.getProtocolRevision,
  getDataset: mocks.getDataset,
  getModelConfiguration: mocks.getModelConfiguration,
  getRun: mocks.getRun,
  getFinding: mocks.getFinding,
  listDatasets: mocks.listDatasets,
  listModelConfigurations: mocks.listModelConfigurations,
  listProtocolRevisions: mocks.listProtocolRevisions,
  listRuns: mocks.listRuns,
  listMetrics: mocks.listMetrics,
  listTrackPoints: mocks.listTrackPoints,
  listReports: mocks.listReports,
  recordRunOutcome: mocks.recordRunOutcome,
}));
vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("../_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendTerminalRunEmail: mocks.sendTerminalRunEmail }));
vi.mock("./huggingface", () => ({
  applicationStatus: vi.fn(),
  fetchJobLogResult: vi.fn(),
  hostedJobFromHyperparameters: mocks.hostedJobFromHyperparameters,
  inspectHostedJob: vi.fn(),
  namespaceFor: vi.fn(),
  safeJobDiagnostic: mocks.safeJobDiagnostic,
  shouldIngestCompletedResult: vi.fn(),
  submitHostedJob: mocks.submitHostedJob,
}));

import { researchRouter, safeFailureDetail } from "./router";

function context(role: "user" | "researcher" | "admin" = "researcher") {
  return {
    user: { id: 7, openId: "researcher-7", name: "Researcher", email: "researcher@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} },
    res: {},
  } as unknown as TrpcContext;
}

describe("authenticated research workflows", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getExperiment.mockResolvedValue({ id: 4, title: "Detector study", description: "Tracking study" });
    mocks.getDataset.mockResolvedValue({ id: 8, experimentId: 4 });
    mocks.getModelConfiguration.mockResolvedValue({ id: 9, experimentId: 4 });
    mocks.getRun.mockResolvedValue({ id: 12, experimentId: 4 });
    mocks.getFinding.mockResolvedValue(undefined);
    mocks.getLatestProtocolRevision.mockResolvedValue(undefined);
    mocks.getProtocolRevision.mockResolvedValue({ id: 10, ownerId: 7, experimentId: 4, version: 1 });
    mocks.listDatasets.mockResolvedValue([]);
    mocks.listModelConfigurations.mockResolvedValue([]);
    mocks.listProtocolRevisions.mockResolvedValue([]);
    mocks.listRuns.mockResolvedValue([]);
    mocks.listMetrics.mockResolvedValue(undefined);
    mocks.listTrackPoints.mockResolvedValue([]);
    mocks.listReports.mockResolvedValue([]);
    mocks.storagePut.mockResolvedValue({ key: "research/file", url: "/manus-storage/research/file" });
    mocks.createRun.mockResolvedValue([{ insertId: 12 }]);
    mocks.createProtocolRevision.mockResolvedValue(1);
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "No stored run metrics are available." } }] });
    mocks.hostedJobFromHyperparameters.mockReturnValue({ image: "registry.example.org/particle-tracker:latest", command: ["python", "train.py"] });
    mocks.safeJobDiagnostic.mockImplementation(error => String(error instanceof Error ? error.message : error).replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/hf_[A-Za-z0-9_-]+/g, "hf_[redacted]"));
  });

  it("accepts a supported dataset, saves a model configuration, and queues a run", async () => {
    const caller = researchRouter.createCaller(context());
    const reproducibleConfiguration = '{"learning_rate":0.001,"modelRevision":"v1.2.0","dataRevision":"hits-2026-08","randomSeed":42}';
    await caller.datasets.upload({ experimentId: 4, fileName: "hits.csv", format: "csv", base64: Buffer.from("x,y,z\n1,2,3\n").toString("base64") });
    await caller.modelConfigurations.create({ experimentId: 4, name: "Baseline", huggingFaceModelId: "lab/particle-tracker", hyperparameters: reproducibleConfiguration });
    const run = await caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, runType: "training" });
    expect(mocks.storagePut).toHaveBeenCalledOnce();
    expect(mocks.createDataset).toHaveBeenCalledOnce();
    expect(mocks.createModelConfiguration).toHaveBeenCalledOnce();
    expect(mocks.createModelConfiguration).toHaveBeenCalledWith(expect.objectContaining({ hyperparameters: reproducibleConfiguration }));
    expect(mocks.createRun).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", runType: "training", protocolRevisionId: 10 }));
    expect(run).toEqual({ success: true, status: "queued" });
  });

  it("rejects a run when its requested protocol revision is not owned by the selected experiment", async () => {
    const caller = researchRouter.createCaller(context());
    mocks.getProtocolRevision.mockResolvedValueOnce(undefined);

    await expect(caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, runType: "training" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createRun).not.toHaveBeenCalled();
    expect(mocks.getProtocolRevision).toHaveBeenCalledWith(7, 4, 10);
  });

  it("keeps an otherwise configured hosted run queued without submitting work when HF_TOKEN is absent", async () => {
    const previousToken = process.env.HF_TOKEN;
    delete process.env.HF_TOKEN;
    mocks.getModelConfiguration.mockResolvedValue({ id: 9, experimentId: 4, hyperparameters: '{"_huggingFaceJob":{"image":"registry.example.org/particle-tracker:latest","command":["python","train.py"]}}' });
    const caller = researchRouter.createCaller(context());

    try {
      await expect(caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, runType: "inference" }))
        .resolves.toEqual({ success: true, status: "queued" });
      expect(mocks.createRun).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", runType: "inference" }));
      expect(mocks.hostedJobFromHyperparameters).toHaveBeenCalledOnce();
      expect(mocks.submitHostedJob).not.toHaveBeenCalled();
    } finally {
      if (previousToken === undefined) delete process.env.HF_TOKEN;
      else process.env.HF_TOKEN = previousToken;
    }
  });

  it("redacts hosted submission failure details before persistence, response, and terminal email", async () => {
    const previousToken = process.env.HF_TOKEN;
    process.env.HF_TOKEN = "hf_privateToken_123";
    mocks.submitHostedJob.mockRejectedValue(new Error("Authorization: Bearer hf_privateToken_123 rejected"));
    const caller = researchRouter.createCaller(context());

    try {
      await expect(caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, protocolRevisionId: 10, runType: "inference" }))
        .resolves.toEqual({ success: false, status: "failed", message: "Authorization: Bearer [redacted] rejected" });
      expect(mocks.setRunStatus).toHaveBeenCalledWith(7, 12, "failed", "Authorization: Bearer [redacted] rejected");
      expect(mocks.sendTerminalRunEmail).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "Authorization: Bearer [redacted] rejected" }));
      expect(JSON.stringify(mocks.setRunStatus.mock.calls)).not.toContain("hf_privateToken_123");
    } finally {
      if (previousToken === undefined) delete process.env.HF_TOKEN;
      else process.env.HF_TOKEN = previousToken;
    }
  });

  it("uses the safe failure fallback when a remote terminal status has no message", () => {
    expect(safeFailureDetail(undefined)).toBe("Hosted job execution failed.");
    expect(safeFailureDetail("   ")).toBe("Hosted job execution failed.");
  });

  it("reports only secret-free operational readiness states to an authorized researcher", async () => {
    const originalToken = process.env.HF_TOKEN;
    const originalEmailKey = process.env.RESEND_API_KEY;
    const originalSender = process.env.RESEND_FROM_EMAIL;
    const originalOwner = process.env.TRACKLAB_OWNER_EMAIL;
    delete process.env.HF_TOKEN;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.TRACKLAB_OWNER_EMAIL;

    try {
      const caller = researchRouter.createCaller(context());
      await expect(caller.operational.readiness()).resolves.toMatchObject({
        hostedExecution: { state: "not_configured" },
        terminalEmail: { state: "fallback_only" },
      });
    } finally {
      if (originalToken === undefined) delete process.env.HF_TOKEN; else process.env.HF_TOKEN = originalToken;
      if (originalEmailKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalEmailKey;
      if (originalSender === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalSender;
      if (originalOwner === undefined) delete process.env.TRACKLAB_OWNER_EMAIL; else process.env.TRACKLAB_OWNER_EMAIL = originalOwner;
    }
  });

  it("rejects an oversized dataset payload before binary decoding or storage", async () => {
    const caller = researchRouter.createCaller(context());
    const oversizedPayload = "A".repeat(MAX_DATASET_BASE64_CHARS + 1);
    await expect(caller.datasets.upload({ experimentId: 4, fileName: "oversized.csv", format: "csv", base64: oversizedPayload })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.createDataset).not.toHaveBeenCalled();
  });

  it("rejects malformed dataset base64 before decoding or storage", async () => {
    const caller = researchRouter.createCaller(context());
    await expect(caller.datasets.upload({ experimentId: 4, fileName: "invalid.csv", format: "csv", base64: "not-valid-base64!" }))
      .rejects.toThrow("not valid base64");
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.createDataset).not.toHaveBeenCalled();
  });

  it("rejects malformed or oversized model-artifact transport before managed storage", async () => {
    const caller = researchRouter.createCaller(context("admin"));
    const artifact = { fileName: "model.bin", mimeType: "application/octet-stream", base64: "not-valid-base64!" };
    await expect(caller.runOutcome.record({ runId: 12, status: "completed", modelArtifact: artifact })).rejects.toThrow("not valid base64");
    await expect(caller.runOutcome.record({ runId: 12, status: "completed", modelArtifact: { ...artifact, base64: "A".repeat(MAX_DATASET_BASE64_CHARS + 1) } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("saves findings, exports Markdown, and grounds the assistant answer in stored context", async () => {
    const caller = researchRouter.createCaller(context());
    await caller.findings.save({ experimentId: 4, title: "Notes", content: "<p>Detector behavior is stable.</p>" });
    const report = await caller.reports.export({ experimentId: 4, format: "markdown" });
    const answer = await caller.assistant.ask({ experimentId: 4, question: "Summarize the currently stored result." });
    expect(mocks.saveFinding).toHaveBeenCalledWith(7, 4, "Notes", "<p>Detector behavior is stable.</p>");
    expect(mocks.createReport).toHaveBeenCalledOnce();
    expect(report.url).toBe("/manus-storage/research/file");
    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
    expect(answer.answer).toBe("No stored run metrics are available.");
  });

  it("returns an evidence-only reproducibility ledger and blocks empty manifest exports", async () => {
    const caller = researchRouter.createCaller(context());
    const ledger = await caller.reproducibility.ledger({ experimentId: 4 });
    await expect(caller.reproducibility.manifest({ experimentId: 4 })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(ledger.hasActualEvidence).toBe(false);
    expect(ledger.manifest.evidence.datasets).toEqual([]);
    expect(ledger.manifest.evidence.runs).toEqual([]);
    expect(ledger.manifest.missingEvidence).toContain("Dataset provenance");
  });

  it("records researcher-supplied protocol revisions without supplying scientific claims", async () => {
    const caller = researchRouter.createCaller(context());
    const payload = {
      experimentId: 4,
      objective: "Evaluate the supplied reconstruction workflow.",
      detectorContext: "Use the researcher-provided detector context.",
      evaluationPlan: "Review returned evidence using the stated protocol.",
      acceptanceCriteria: "Record genuine completion evidence and limitations.",
    };
    mocks.createProtocolRevision.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const saved = await caller.protocols.saveRevision(payload);
    const laterRevision = await caller.protocols.saveRevision({ ...payload, objective: "Evaluate a later researcher-supplied reconstruction workflow." });

    expect(saved).toEqual({ success: true, version: 1 });
    expect(laterRevision).toEqual({ success: true, version: 2 });
    expect(mocks.createProtocolRevision).toHaveBeenCalledWith({ ownerId: 7, ...payload });
    expect(mocks.createProtocolRevision).not.toHaveBeenCalledWith(expect.objectContaining({ accuracy: expect.anything(), efficiency: expect.anything(), fakeRate: expect.anything() }));
  });

  it("returns only the owned experiment's recorded protocol history", async () => {
    const caller = researchRouter.createCaller(context());
    const revision = { id: 17, ownerId: 7, experimentId: 4, version: 1, objective: "Researcher supplied objective.", detectorContext: "Researcher supplied detector context.", evaluationPlan: "Researcher supplied evaluation plan.", acceptanceCriteria: "Researcher supplied review criteria.", createdAt: new Date("2026-08-25T00:00:00.000Z") };
    mocks.getLatestProtocolRevision.mockResolvedValue(revision);
    mocks.listProtocolRevisions.mockResolvedValue([revision]);

    await expect(caller.protocols.latest({ experimentId: 4 })).resolves.toEqual(revision);
    await expect(caller.protocols.list({ experimentId: 4 })).resolves.toEqual([revision]);
    expect(mocks.getLatestProtocolRevision).toHaveBeenCalledWith(7, 4);
    expect(mocks.listProtocolRevisions).toHaveBeenCalledWith(7, 4);
  });

  it("rejects protocol requests for unowned experiments and incomplete researcher input", async () => {
    const caller = researchRouter.createCaller(context());
    mocks.getExperiment.mockResolvedValueOnce(undefined);
    await expect(caller.protocols.list({ experimentId: 404 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.listProtocolRevisions).not.toHaveBeenCalled();

    await expect(caller.protocols.saveRevision({ experimentId: 4, objective: "short", detectorContext: "Researcher supplied detector context.", evaluationPlan: "Researcher supplied evaluation plan.", acceptanceCriteria: "Researcher supplied review criteria." })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createProtocolRevision).not.toHaveBeenCalled();
  });

  it("rejects non-researcher access", async () => {
    const caller = researchRouter.createCaller(context("user"));
    await expect(caller.experiments.create({ title: "Study", description: "" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
