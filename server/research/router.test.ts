import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  createDataset: vi.fn(),
  createModelConfiguration: vi.fn(),
  createRun: vi.fn(),
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
}));

vi.mock("./db", () => ({
  createDataset: mocks.createDataset,
  createModelConfiguration: mocks.createModelConfiguration,
  createRun: mocks.createRun,
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
  });

  it("accepts a supported dataset, saves a model configuration, and queues a run", async () => {
    const caller = researchRouter.createCaller(context());
    await caller.datasets.upload({ experimentId: 4, fileName: "hits.csv", format: "csv", base64: Buffer.from("x,y,z\n1,2,3\n").toString("base64") });
    await caller.modelConfigurations.create({ experimentId: 4, name: "Baseline", huggingFaceModelId: "lab/particle-tracker", hyperparameters: '{"learning_rate":0.001}' });
    const run = await caller.runs.trigger({ experimentId: 4, datasetId: 8, modelConfigurationId: 9, runType: "training" });
    expect(mocks.storagePut).toHaveBeenCalledOnce();
    expect(mocks.createDataset).toHaveBeenCalledOnce();
    expect(mocks.createModelConfiguration).toHaveBeenCalledOnce();
    expect(mocks.createRun).toHaveBeenCalledWith(expect.objectContaining({ status: "queued", runType: "training" }));
    expect(run).toEqual({ success: true, status: "queued" });
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
