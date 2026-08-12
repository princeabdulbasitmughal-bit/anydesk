import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "researcher", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const experiments = mysqlTable("experiments", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const datasets = mysqlTable("datasets", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  experimentId: int("experimentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  format: mysqlEnum("format", ["csv", "json", "hdf5"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  byteSize: int("byteSize").notNull(),
  preview: text("preview").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const modelConfigurations = mysqlTable("modelConfigurations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  experimentId: int("experimentId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  huggingFaceModelId: varchar("huggingFaceModelId", { length: 255 }).notNull(),
  hyperparameters: text("hyperparameters").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const experimentRuns = mysqlTable("experimentRuns", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  experimentId: int("experimentId").notNull(),
  datasetId: int("datasetId").notNull(),
  modelConfigurationId: int("modelConfigurationId").notNull(),
  runType: mysqlEnum("runType", ["training", "inference"]).notNull(),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).default("queued").notNull(),
  huggingFaceJobId: varchar("huggingFaceJobId", { length: 128 }),
  modelArtifactKey: varchar("modelArtifactKey", { length: 512 }),
  modelArtifactUrl: varchar("modelArtifactUrl", { length: 1024 }),
  errorMessage: text("errorMessage"),
  queuedAt: timestamp("queuedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export const runMetrics = mysqlTable("runMetrics", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull().unique(),
  accuracy: decimal("accuracy", { precision: 8, scale: 5 }),
  efficiency: decimal("efficiency", { precision: 8, scale: 5 }),
  fakeRate: decimal("fakeRate", { precision: 8, scale: 5 }),
  metricPayload: text("metricPayload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const trackPoints = mysqlTable("trackPoints", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  trackId: varchar("trackId", { length: 120 }).notNull(),
  pointOrder: int("pointOrder").notNull(),
  x: decimal("x", { precision: 15, scale: 7 }).notNull(),
  y: decimal("y", { precision: 15, scale: 7 }).notNull(),
  z: decimal("z", { precision: 15, scale: 7 }).notNull(),
});

export const researchFindings = mysqlTable("researchFindings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  experimentId: int("experimentId").notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reportExports = mysqlTable("reportExports", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  experimentId: int("experimentId").notNull(),
  findingId: int("findingId"),
  format: mysqlEnum("format", ["markdown", "pdf"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
