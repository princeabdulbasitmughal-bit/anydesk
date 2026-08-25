import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  DATASET_FORMATS,
  MAX_DATASET_BASE64_CHARS,
  MAX_MODEL_ARTIFACT_BASE64_CHARS,
  REPORT_FORMATS,
  createDatasetPreview,
  decodeBase64Transport,
  decodeModelArtifactBase64,
  normalizeTrackPoints,
  parseHyperparameters,
  safeStorageName,
  sanitizeFindings,
} from "./contracts";
import * as db from "./db";
import { makeResearchMarkdown, makeResearchPdf } from "./reports";
import { applicationStatus, fetchJobLogResult, hostedJobFromHyperparameters, inspectHostedJob, namespaceFor, safeJobDiagnostic, shouldIngestCompletedResult, submitHostedJob } from "./huggingface";
import { sendTerminalRunEmail } from "./email";
import { getOperationalReadiness } from "./runtimeReadiness";

const researcherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "researcher" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "This platform is restricted to authorized researchers." });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the platform owner can record a terminal job outcome." });
  }
  return next({ ctx });
});

export function safeFailureDetail(value: unknown, fallback = "Hosted job execution failed.") {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return fallback;
  return safeJobDiagnostic(value).trim() || fallback;
}

async function notifyTerminalRunOutcome(input: { runId: number; status: "completed" | "failed"; metricSummary: string; errorMessage?: string }) {
  await notifyOwner({ title: `Experiment run ${input.status}`, content: `Run ${input.runId} is ${input.status}. Key metrics: ${input.metricSummary}.` });
  await sendTerminalRunEmail({ ...input, errorMessage: input.errorMessage ? safeFailureDetail(input.errorMessage) : undefined });
}

async function refreshHostedRun(ownerId: number, run: Awaited<ReturnType<typeof db.getRun>>) {
  const token = process.env.HF_TOKEN;
  if (!token || !run?.huggingFaceJobId) return run;
  const configuration = await db.getModelConfiguration(ownerId, run.experimentId, run.modelConfigurationId);
  if (!configuration) return run;
  const spec = hostedJobFromHyperparameters(configuration.hyperparameters);
  if (!spec) return run;
  try {
    const namespace = await namespaceFor(spec, token);
    const remote = await inspectHostedJob(run.huggingFaceJobId, namespace, token);
    const status = applicationStatus(remote.status?.stage);
    const existingMetrics = status === "completed" ? await db.listMetrics(ownerId, run.id) : undefined;
    const shouldIngest = shouldIngestCompletedResult(status, Boolean(existingMetrics));
    if (status !== run.status || shouldIngest) {
      const result = shouldIngest ? await fetchJobLogResult(run.huggingFaceJobId, namespace, token) : undefined;
      if (status === "completed" && result) {
        await db.recordRunOutcome({ ownerId, runId: run.id, status, accuracy: result.accuracy, efficiency: result.efficiency, fakeRate: result.fakeRate, metricPayload: result.metricPayload, trackPoints: result.trackPoints?.map(point => ({ ...point, x: String(point.x), y: String(point.y), z: String(point.z) })) });
      } else if (status !== run.status) {
        await db.setRunStatus(ownerId, run.id, status, status === "failed" ? safeFailureDetail(remote.status?.message) : undefined);
      }
      if ((status === "completed" || status === "failed") && run.status !== "completed" && run.status !== "failed") {
        const summary = result ? [result.accuracy !== undefined ? `accuracy ${result.accuracy}` : null, result.efficiency !== undefined ? `efficiency ${result.efficiency}` : null, result.fakeRate !== undefined ? `fake rate ${result.fakeRate}` : null].filter(Boolean).join(", ") || "no key metrics returned" : "no key metrics returned";
        await notifyTerminalRunOutcome({ runId: run.id, status, metricSummary: summary, errorMessage: status === "failed" ? safeFailureDetail(remote.status?.message) : undefined });
      }
      return db.getRun(ownerId, run.id);
    }
  } catch (error) {
    console.warn("[HuggingFace] Run status synchronization failed", { runId: run.id, message: safeJobDiagnostic(error) });
    return run;
  }
  return run;
}

function dataMime(format: (typeof DATASET_FORMATS)[number]) {
  return { csv: "text/csv", json: "application/json", hdf5: "application/x-hdf5" }[format];
}

function readableContent(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(item => ("text" in item ? String(item.text) : "")).join("");
  return "";
}

export const researchRouter = router({
  operational: router({
    readiness: researcherProcedure.query(() => getOperationalReadiness()),
  }),
  experiments: router({
    list: researcherProcedure.query(({ ctx }) => db.listExperiments(ctx.user.id)),
    create: researcherProcedure.input(z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().max(4000) })).mutation(async ({ ctx, input }) => {
      await db.createExperiment(ctx.user.id, input.title, input.description);
      return { success: true };
    }),
  }),
  datasets: router({
    list: researcherProcedure.input(z.object({ experimentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.getExperiment(ctx.user.id, input.experimentId))) throw new TRPCError({ code: "NOT_FOUND" });
      return db.listDatasets(ctx.user.id, input.experimentId);
    }),
    upload: researcherProcedure.input(z.object({
      experimentId: z.number().int().positive(),
      fileName: z.string().min(1).max(255),
      format: z.enum(DATASET_FORMATS),
      base64: z.string().min(1).max(MAX_DATASET_BASE64_CHARS),
    })).mutation(async ({ ctx, input }) => {
      if (!(await db.getExperiment(ctx.user.id, input.experimentId))) throw new TRPCError({ code: "NOT_FOUND" });
      const bytes = decodeBase64Transport(input.base64);
      const preview = createDatasetPreview(input.format, bytes);
      const fileKey = `research/${ctx.user.id}/datasets/${input.experimentId}/${Date.now()}-${safeStorageName(input.fileName)}`;
      const stored = await storagePut(fileKey, bytes, dataMime(input.format));
      await db.createDataset({ ownerId: ctx.user.id, experimentId: input.experimentId, name: input.fileName, format: input.format, fileKey: stored.key, fileUrl: stored.url, byteSize: bytes.byteLength, preview: JSON.stringify(preview) });
      return { success: true };
    }),
  }),
  modelConfigurations: router({
    list: researcherProcedure.input(z.object({ experimentId: z.number().int().positive() })).query(({ ctx, input }) => db.listModelConfigurations(ctx.user.id, input.experimentId)),
    create: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), name: z.string().trim().min(3).max(160), huggingFaceModelId: z.string().trim().min(3).max(255), hyperparameters: z.string().max(20_000) })).mutation(async ({ ctx, input }) => {
      if (!(await db.getExperiment(ctx.user.id, input.experimentId))) throw new TRPCError({ code: "NOT_FOUND" });
      parseHyperparameters(input.hyperparameters);
      await db.createModelConfiguration({ ownerId: ctx.user.id, experimentId: input.experimentId, name: input.name, huggingFaceModelId: input.huggingFaceModelId, hyperparameters: input.hyperparameters });
      return { success: true };
    }),
  }),
  runs: router({
    list: researcherProcedure.input(z.object({ experimentId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const runs = await db.listRuns(ctx.user.id, input.experimentId);
      if (!process.env.HF_TOKEN) return runs;
      const refreshed = await Promise.all(runs.map(run => refreshHostedRun(ctx.user.id, run)));
      return refreshed.filter((run): run is NonNullable<typeof run> => Boolean(run));
    }),
    trigger: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), datasetId: z.number().int().positive(), modelConfigurationId: z.number().int().positive(), runType: z.enum(["training", "inference"]) })).mutation(async ({ ctx, input }) => {
      const [experiment, dataset, configuration] = await Promise.all([
        db.getExperiment(ctx.user.id, input.experimentId),
        db.getDataset(ctx.user.id, input.experimentId, input.datasetId),
        db.getModelConfiguration(ctx.user.id, input.experimentId, input.modelConfigurationId),
      ]);
      if (!experiment || !dataset || !configuration) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected experiment, dataset, and configuration must belong together." });
      const created = await db.createRun({ ownerId: ctx.user.id, experimentId: input.experimentId, datasetId: input.datasetId, modelConfigurationId: input.modelConfigurationId, runType: input.runType, status: "queued" });
      const runId = Number(created[0].insertId);
      const token = process.env.HF_TOKEN;
      const hostedSpec = hostedJobFromHyperparameters(configuration.hyperparameters);
      if (token && hostedSpec) {
        try {
          const submitted = await submitHostedJob(hostedSpec, token, `particle-track-run-${runId}`);
          if (!submitted.id) throw new Error("Hugging Face Jobs did not return a job identifier.");
          await db.setHostedRunSubmission(ctx.user.id, runId, submitted.id);
        } catch (error) {
          const message = safeFailureDetail(error, "Hosted job submission failed.");
          await db.setRunStatus(ctx.user.id, runId, "failed", message);
          await notifyTerminalRunOutcome({ runId, status: "failed", metricSummary: "no key metrics returned", errorMessage: message });
          return { success: false, status: "failed" as const, message };
        }
      }
      return { success: true, status: "queued" as const };
    }),
  }),
  results: router({
    metrics: researcherProcedure.input(z.object({ runId: z.number().int().positive() })).query(({ ctx, input }) => db.listMetrics(ctx.user.id, input.runId)),
  }),
  tracks: router({
    list: researcherProcedure.input(z.object({ runId: z.number().int().positive() })).query(({ ctx, input }) => db.listTrackPoints(ctx.user.id, input.runId)),
  }),
  findings: router({
    get: researcherProcedure.input(z.object({ experimentId: z.number().int().positive() })).query(({ ctx, input }) => db.getFinding(ctx.user.id, input.experimentId)),
    save: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), title: z.string().trim().min(1).max(220), content: z.string().max(70_000) })).mutation(async ({ ctx, input }) => {
      if (!(await db.getExperiment(ctx.user.id, input.experimentId))) throw new TRPCError({ code: "NOT_FOUND" });
      await db.saveFinding(ctx.user.id, input.experimentId, input.title, sanitizeFindings(input.content));
      return { success: true };
    }),
  }),
  reports: router({
    list: researcherProcedure.input(z.object({ experimentId: z.number().int().positive() })).query(({ ctx, input }) => db.listReports(ctx.user.id, input.experimentId)),
    export: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), format: z.enum(REPORT_FORMATS) })).mutation(async ({ ctx, input }) => {
      const experiment = await db.getExperiment(ctx.user.id, input.experimentId);
      if (!experiment) throw new TRPCError({ code: "NOT_FOUND" });
      const [finding, runs] = await Promise.all([db.getFinding(ctx.user.id, input.experimentId), db.listRuns(ctx.user.id, input.experimentId)]);
      const markdown = makeResearchMarkdown(experiment, finding, runs);
      const extension = input.format === "markdown" ? "md" : "pdf";
      const storageContent = input.format === "markdown" ? markdown : await makeResearchPdf(markdown);
      const stored = await storagePut(`research/${ctx.user.id}/reports/${input.experimentId}/${Date.now()}-research-report.${extension}`, storageContent, input.format === "markdown" ? "text/markdown" : "application/pdf");
      await db.createReport({ ownerId: ctx.user.id, experimentId: input.experimentId, findingId: finding?.id ?? null, format: input.format, fileKey: stored.key, fileUrl: stored.url });
      return { url: stored.url, format: input.format };
    }),
  }),
  assistant: router({
    ask: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), question: z.string().trim().min(2).max(4_000) })).mutation(async ({ ctx, input }) => {
      const experiment = await db.getExperiment(ctx.user.id, input.experimentId);
      if (!experiment) throw new TRPCError({ code: "NOT_FOUND" });
      const [runs, finding] = await Promise.all([db.listRuns(ctx.user.id, input.experimentId), db.getFinding(ctx.user.id, input.experimentId)]);
      const metrics = await Promise.all(runs.slice(0, 12).map(run => db.listMetrics(ctx.user.id, run.id)));
      const context = JSON.stringify({ experiment, runs, metrics: metrics.filter(Boolean), finding: finding ? { title: finding.title, content: finding.content } : null });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an AI assistant for particle-physics researchers. Use only the supplied research context. Do not invent datasets, model outcomes, metrics, or literature citations. Clearly label hyperparameter ideas as hypotheses. If required information is absent, say so directly." },
          { role: "user", content: `Research context:\n${context}\n\nResearcher question:\n${input.question}` },
        ],
      });
      return { answer: readableContent(response.choices[0]?.message.content) || "No answer was returned." };
    }),
  }),
  runOutcome: router({
    record: adminProcedure.input(z.object({ runId: z.number().int().positive(), status: z.enum(["completed", "failed"]), accuracy: z.number().min(0).max(1).optional(), efficiency: z.number().min(0).max(1).optional(), fakeRate: z.number().min(0).max(1).optional(), metricPayload: z.string().max(10_000).optional(), errorMessage: z.string().max(4_000).optional(), trackPoints: z.array(z.object({ trackId: z.string().trim().min(1).max(120), pointOrder: z.number().int().min(0), x: z.number(), y: z.number(), z: z.number() })).max(200_000).optional(), modelArtifact: z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64: z.string().min(1).max(MAX_MODEL_ARTIFACT_BASE64_CHARS) }).optional() })).mutation(async ({ ctx, input }) => {
      const run = await db.getRun(ctx.user.id, input.runId);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const metricSummary = [input.accuracy !== undefined ? `accuracy ${input.accuracy}` : null, input.efficiency !== undefined ? `efficiency ${input.efficiency}` : null, input.fakeRate !== undefined ? `fake rate ${input.fakeRate}` : null].filter(Boolean).join(", ") || "no key metrics returned";
      let artifact: { key: string; url: string } | undefined;
      if (input.modelArtifact) {
        const bytes = decodeModelArtifactBase64(input.modelArtifact.base64);
        artifact = await storagePut(`research/${ctx.user.id}/model-artifacts/${run.id}/${Date.now()}-${safeStorageName(input.modelArtifact.fileName)}`, bytes, input.modelArtifact.mimeType);
      }
      const safeErrorMessage = input.errorMessage ? safeFailureDetail(input.errorMessage) : undefined;
      await db.recordRunOutcome({
        ownerId: ctx.user.id,
        runId: input.runId,
        status: input.status,
        accuracy: input.accuracy,
        efficiency: input.efficiency,
        fakeRate: input.fakeRate,
        metricPayload: input.metricPayload,
        errorMessage: safeErrorMessage,
        trackPoints: input.trackPoints ? normalizeTrackPoints(input.trackPoints) : undefined,
        modelArtifactKey: artifact?.key,
        modelArtifactUrl: artifact?.url,
      });
      await notifyTerminalRunOutcome({ runId: run.id, status: input.status, metricSummary, errorMessage: safeErrorMessage });
      return { success: true };
    }),
  }),
});
