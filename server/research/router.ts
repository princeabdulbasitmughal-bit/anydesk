import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  DATASET_FORMATS,
  REPORT_FORMATS,
  createDatasetPreview,
  normalizeTrackPoints,
  parseHyperparameters,
  safeStorageName,
  sanitizeFindings,
} from "./contracts";
import * as db from "./db";
import { makeResearchMarkdown, makeResearchPdf } from "./reports";

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

function dataMime(format: (typeof DATASET_FORMATS)[number]) {
  return { csv: "text/csv", json: "application/json", hdf5: "application/x-hdf5" }[format];
}

function readableContent(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(item => ("text" in item ? String(item.text) : "")).join("");
  return "";
}

export const researchRouter = router({
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
      base64: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      if (!(await db.getExperiment(ctx.user.id, input.experimentId))) throw new TRPCError({ code: "NOT_FOUND" });
      const bytes = Buffer.from(input.base64.replace(/^data:[^,]+,/, ""), "base64");
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
    list: researcherProcedure.input(z.object({ experimentId: z.number().int().positive().optional() })).query(({ ctx, input }) => db.listRuns(ctx.user.id, input.experimentId)),
    trigger: researcherProcedure.input(z.object({ experimentId: z.number().int().positive(), datasetId: z.number().int().positive(), modelConfigurationId: z.number().int().positive(), runType: z.enum(["training", "inference"]) })).mutation(async ({ ctx, input }) => {
      const [experiment, dataset, configuration] = await Promise.all([
        db.getExperiment(ctx.user.id, input.experimentId),
        db.getDataset(ctx.user.id, input.experimentId, input.datasetId),
        db.getModelConfiguration(ctx.user.id, input.experimentId, input.modelConfigurationId),
      ]);
      if (!experiment || !dataset || !configuration) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected experiment, dataset, and configuration must belong together." });
      await db.createRun({ ownerId: ctx.user.id, experimentId: input.experimentId, datasetId: input.datasetId, modelConfigurationId: input.modelConfigurationId, runType: input.runType, status: "queued" });
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
    record: adminProcedure.input(z.object({ runId: z.number().int().positive(), status: z.enum(["completed", "failed"]), accuracy: z.number().min(0).max(1).optional(), efficiency: z.number().min(0).max(1).optional(), fakeRate: z.number().min(0).max(1).optional(), metricPayload: z.string().max(10_000).optional(), errorMessage: z.string().max(4_000).optional(), trackPoints: z.array(z.object({ trackId: z.string().trim().min(1).max(120), pointOrder: z.number().int().min(0), x: z.number(), y: z.number(), z: z.number() })).max(200_000).optional(), modelArtifact: z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), base64: z.string().min(1) }).optional() })).mutation(async ({ ctx, input }) => {
      const run = await db.getRun(ctx.user.id, input.runId);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const metricSummary = [input.accuracy !== undefined ? `accuracy ${input.accuracy}` : null, input.efficiency !== undefined ? `efficiency ${input.efficiency}` : null, input.fakeRate !== undefined ? `fake rate ${input.fakeRate}` : null].filter(Boolean).join(", ") || "no key metrics returned";
      let artifact: { key: string; url: string } | undefined;
      if (input.modelArtifact) {
        const bytes = Buffer.from(input.modelArtifact.base64.replace(/^data:[^,]+,/, ""), "base64");
        artifact = await storagePut(`research/${ctx.user.id}/model-artifacts/${run.id}/${Date.now()}-${safeStorageName(input.modelArtifact.fileName)}`, bytes, input.modelArtifact.mimeType);
      }
      await db.recordRunOutcome({
        ownerId: ctx.user.id,
        runId: input.runId,
        status: input.status,
        accuracy: input.accuracy,
        efficiency: input.efficiency,
        fakeRate: input.fakeRate,
        metricPayload: input.metricPayload,
        errorMessage: input.errorMessage,
        trackPoints: input.trackPoints ? normalizeTrackPoints(input.trackPoints) : undefined,
        modelArtifactKey: artifact?.key,
        modelArtifactUrl: artifact?.url,
      });
      await notifyOwner({ title: `Experiment run ${input.status}`, content: `Run ${run.id} is ${input.status}. Key metrics: ${metricSummary}.` });
      return { success: true };
    }),
  }),
});
