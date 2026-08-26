import { and, desc, eq } from "drizzle-orm";
import {
  datasets,
  experimentProtocolRevisions,
  experimentRuns,
  experiments,
  modelConfigurations,
  reportExports,
  researchFindings,
  runMetrics,
  trackPoints,
} from "../../drizzle/schema";
import { getDb } from "../db";

export async function listExperiments(ownerId: number) {
  const db = await getDb();
  return db ? db.select().from(experiments).where(eq(experiments.ownerId, ownerId)).orderBy(desc(experiments.updatedAt)) : [];
}

export async function getExperiment(ownerId: number, experimentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(experiments).where(and(eq(experiments.ownerId, ownerId), eq(experiments.id, experimentId))).limit(1);
  return rows[0];
}

export async function createExperiment(ownerId: number, title: string, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(experiments).values({ ownerId, title, description: description || null });
}

export async function listDatasets(ownerId: number, experimentId: number) {
  const db = await getDb();
  return db ? db.select().from(datasets).where(and(eq(datasets.ownerId, ownerId), eq(datasets.experimentId, experimentId))).orderBy(desc(datasets.createdAt)) : [];
}

export async function getDataset(ownerId: number, experimentId: number, datasetId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(datasets).where(and(eq(datasets.ownerId, ownerId), eq(datasets.experimentId, experimentId), eq(datasets.id, datasetId))).limit(1);
  return rows[0];
}

export async function createDataset(values: typeof datasets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(datasets).values(values);
}

export async function listModelConfigurations(ownerId: number, experimentId: number) {
  const db = await getDb();
  return db ? db.select().from(modelConfigurations).where(and(eq(modelConfigurations.ownerId, ownerId), eq(modelConfigurations.experimentId, experimentId))).orderBy(desc(modelConfigurations.updatedAt)) : [];
}

export async function getModelConfiguration(ownerId: number, experimentId: number, configurationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(modelConfigurations).where(and(eq(modelConfigurations.ownerId, ownerId), eq(modelConfigurations.experimentId, experimentId), eq(modelConfigurations.id, configurationId))).limit(1);
  return rows[0];
}

export async function createModelConfiguration(values: typeof modelConfigurations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(modelConfigurations).values(values);
}

export async function listProtocolRevisions(ownerId: number, experimentId: number) {
  const db = await getDb();
  return db ? db.select().from(experimentProtocolRevisions).where(and(eq(experimentProtocolRevisions.ownerId, ownerId), eq(experimentProtocolRevisions.experimentId, experimentId))).orderBy(desc(experimentProtocolRevisions.version)) : [];
}

export async function getLatestProtocolRevision(ownerId: number, experimentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(experimentProtocolRevisions).where(and(eq(experimentProtocolRevisions.ownerId, ownerId), eq(experimentProtocolRevisions.experimentId, experimentId))).orderBy(desc(experimentProtocolRevisions.version)).limit(1);
  return rows[0];
}

export async function getProtocolRevision(ownerId: number, experimentId: number, protocolRevisionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(experimentProtocolRevisions).where(and(
    eq(experimentProtocolRevisions.ownerId, ownerId),
    eq(experimentProtocolRevisions.experimentId, experimentId),
    eq(experimentProtocolRevisions.id, protocolRevisionId),
  )).limit(1);
  return rows[0];
}

export async function createProtocolRevision(input: { ownerId: number; experimentId: number; objective: string; detectorContext: string; evaluationPlan: string; acceptanceCriteria: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const latest = await tx.select({ version: experimentProtocolRevisions.version }).from(experimentProtocolRevisions).where(and(eq(experimentProtocolRevisions.ownerId, input.ownerId), eq(experimentProtocolRevisions.experimentId, input.experimentId))).orderBy(desc(experimentProtocolRevisions.version)).limit(1);
    const version = (latest[0]?.version ?? 0) + 1;
    await tx.insert(experimentProtocolRevisions).values({ ...input, version });
    return version;
  });
}

export async function listRuns(ownerId: number, experimentId?: number) {
  const db = await getDb();
  if (!db) return [];
  const condition = experimentId ? and(eq(experimentRuns.ownerId, ownerId), eq(experimentRuns.experimentId, experimentId)) : eq(experimentRuns.ownerId, ownerId);
  return db.select().from(experimentRuns).where(condition).orderBy(desc(experimentRuns.queuedAt));
}

export async function getRun(ownerId: number, runId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(experimentRuns).where(and(eq(experimentRuns.ownerId, ownerId), eq(experimentRuns.id, runId))).limit(1);
  return rows[0];
}

export async function createRun(values: typeof experimentRuns.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(experimentRuns).values(values);
}

export async function setHostedRunSubmission(ownerId: number, runId: number, huggingFaceJobId: string) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  await database.update(experimentRuns).set({ huggingFaceJobId }).where(and(eq(experimentRuns.ownerId, ownerId), eq(experimentRuns.id, runId)));
}

export async function setRunStatus(ownerId: number, runId: number, status: "queued" | "running" | "completed" | "failed", errorMessage?: string) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const updates: Partial<typeof experimentRuns.$inferInsert> = { status, errorMessage: errorMessage ?? null };
  if (status === "running") updates.startedAt = new Date();
  if (status === "completed" || status === "failed") updates.completedAt = new Date();
  await database.update(experimentRuns).set(updates).where(and(eq(experimentRuns.ownerId, ownerId), eq(experimentRuns.id, runId)));
}

export async function recordRunOutcome(input: {
  ownerId: number;
  runId: number;
  status: "completed" | "failed";
  accuracy?: number;
  efficiency?: number;
  fakeRate?: number;
  errorMessage?: string;
  metricPayload?: string;
  modelArtifactKey?: string;
  modelArtifactUrl?: string;
  trackPoints?: Array<{ trackId: string; pointOrder: number; x: string; y: string; z: string }>;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  await database.update(experimentRuns).set({
    status: input.status,
    completedAt: new Date(),
    errorMessage: input.errorMessage ?? null,
    modelArtifactKey: input.modelArtifactKey ?? null,
    modelArtifactUrl: input.modelArtifactUrl ?? null,
  }).where(and(eq(experimentRuns.ownerId, input.ownerId), eq(experimentRuns.id, input.runId)));
  await database.insert(runMetrics).values({
    runId: input.runId,
    accuracy: input.accuracy === undefined ? null : String(input.accuracy),
    efficiency: input.efficiency === undefined ? null : String(input.efficiency),
    fakeRate: input.fakeRate === undefined ? null : String(input.fakeRate),
    metricPayload: input.metricPayload ?? JSON.stringify({ accuracy: input.accuracy, efficiency: input.efficiency, fakeRate: input.fakeRate }),
  }).onDuplicateKeyUpdate({
    set: {
      accuracy: input.accuracy === undefined ? null : String(input.accuracy),
      efficiency: input.efficiency === undefined ? null : String(input.efficiency),
      fakeRate: input.fakeRate === undefined ? null : String(input.fakeRate),
      metricPayload: input.metricPayload ?? JSON.stringify({ accuracy: input.accuracy, efficiency: input.efficiency, fakeRate: input.fakeRate }),
    },
  });
  if (input.trackPoints) {
    await database.delete(trackPoints).where(eq(trackPoints.runId, input.runId));
    if (input.trackPoints.length) {
      await database.insert(trackPoints).values(input.trackPoints.map(point => ({ runId: input.runId, ...point })));
    }
  }
}

export async function listMetrics(ownerId: number, runId: number) {
  const run = await getRun(ownerId, runId);
  if (!run) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(runMetrics).where(eq(runMetrics.runId, runId)).limit(1);
  return rows[0];
}

export async function listTrackPoints(ownerId: number, runId: number) {
  const run = await getRun(ownerId, runId);
  if (!run) return [];
  const db = await getDb();
  return db ? db.select().from(trackPoints).where(eq(trackPoints.runId, runId)).orderBy(trackPoints.trackId, trackPoints.pointOrder) : [];
}

export async function getFinding(ownerId: number, experimentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(researchFindings).where(and(eq(researchFindings.ownerId, ownerId), eq(researchFindings.experimentId, experimentId))).limit(1);
  return rows[0];
}

export async function saveFinding(ownerId: number, experimentId: number, title: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(researchFindings).values({ ownerId, experimentId, title, content }).onDuplicateKeyUpdate({ set: { title, content } });
}

export async function createReport(values: typeof reportExports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(reportExports).values(values);
}

export async function listReports(ownerId: number, experimentId: number) {
  const db = await getDb();
  return db ? db.select().from(reportExports).where(and(eq(reportExports.ownerId, ownerId), eq(reportExports.experimentId, experimentId))).orderBy(desc(reportExports.createdAt)) : [];
}
