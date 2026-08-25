import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";
import { MAX_DATASET_BASE64_CHARS } from "./contracts";

const mocks = vi.hoisted(() => ({
  createDataset: vi.fn(),
  createModelConfiguration: vi.fn(),
  createRun: vi.fn(),
  setRunStatus: vi.fn(),
  saveFinding: vi.fn(),
  createReport: vi.fn(),
  getExperiment: vi.fn(),
  getDataset: vi.fn(),
  getModelConfiguration: vi.fn(),
  getFinding: vi.fn(),
  listRuns: vi.fn(),
  listMetrics: vi.fn(),
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
  createRun: mocks.createRun,
  setRunStatus: mocks.setRunStatus,
  saveFinding: mocks.saveFinding,
  createReport: mocks.createReport,
  getExperiment: mocks.getExperiment,
  getDataset: mocks.getDataset,
  getModelConfiguration: mocks.getModelConfiguration,
  getFinding: mocks.getFinding,
  listRuns: mocks.listRuns,
  listMetrics: mocks.listMetrics,
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

import { researchRouter } from "./router";

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
    mocks.getFinding.mockResolvedValue(undefined);
    mocks.listRuns.mockResolvedValue([]);
    mocks.listMetrics.mockResolvedValue(undefined);
    mocks.storagePut.mockResolvedValue({ key: "research/file", url: "/manus-storage/research/file" });
    mocks.createRun.mockResolvedValue([{ insertId: 12 }]);
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "No stored run metrics are available." } }] });
    mocks.hostedJobFromHyperparameters.mockReturnValue({ image: "registry.example.org/particle-tracker:latest", command: ["python", "train.py"] });
    mocks.safeJobDiagnostic.mockImplementation(error => String(error instanceof Error ? error.message : error).replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/hf_[A-Za-z0-9_-]+/g, "hf_[redacted]"));
  });

  it("accepts a supported dataset, saves a model configuration, and queues a run", async () => {
    const caller = researchRouter.createCaller(context());
    const reproducibleConfiguration = '{"learning_rate":0.001,"modelRevision":"v1.2.0","dataRevision":"hits-2026-08","randomSeed":42}';
    await caller.datasets.upload({ experimentId: 4, fileName: "hits.csv", format: "csv", base64: Buffer.from("x,y,z\n1,2,3\n").toString("base64") });
    await caller.modelConfigurations.create({ experimentId: 4, name: "Baseline", huggingFaceModelId: "lab/particle-tracker", hyperparameters: reproducibleConfiguration });
    const run = await caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, runType: "training" });
    expect(mocks.storagePut).toHaveBeenCalledOnce();
    expect(mocks.createDataset).toHaveBeenCalledOnce();
    expect(mocks.createModelConfiguration).toHaveBeenCalledOnce();
    expect(mocks.createModelConfiguration).toHaveBeenCalledWith(expect.objectContaining({ hyperparameters: reproducibleConfiguration }));
    expect(mocks.createRun).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", runType: "training" }));
    expect(run).toEqual({ success: true, status: "queued" });
  });

  it("keeps an otherwise configured hosted run queued without submitting work when HF_TOKEN is absent", async () => {
    const previousToken = process.env.HF_TOKEN;
    delete process.env.HF_TOKEN;
    mocks.getModelConfiguration.mockResolvedValue({ id: 9, experimentId: 4, hyperparameters: '{"_huggingFaceJob":{"image":"registry.example.org/particle-tracker:latest","command":["python","train.py"]}}' });
    const caller = researchRouter.createCaller(context());

    try {
      await expect(caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, runType: "inference" }))
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
      await expect(caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, runType: "inference" }))
        .resolves.toEqual({ success: false, status: "failed", message: "Authorization: Bearer [redacted] rejected" });
      expect(mocks.setRunStatus).toHaveBeenCalledWith(7, 12, "failed", "Authorization: Bearer [redacted] rejected");
      expect(mocks.sendTerminalRunEmail).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "Authorization: Bearer [redacted] rejected" }));
      expect(JSON.stringify(mocks.setRunStatus.mock.calls)).not.toContain("hf_privateToken_123");
    } finally {
      if (previousToken === undefined) delete process.env.HF_TOKEN;
      else process.env.HF_TOKEN = previousToken;
    }
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

  it("rejects non-researcher access", async () => {
    const caller = researchRouter.createCaller(context("user"));
    await expect(caller.experiments.create({ title: "Study", description: "" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
