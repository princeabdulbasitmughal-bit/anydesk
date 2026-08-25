type JsonRecord = Record<string, unknown>;
const MAX_HOSTED_JOB_IMAGE_LENGTH = 255;
const MAX_HOSTED_JOB_COMMAND_ENTRIES = 64;
const MAX_HOSTED_JOB_COMMAND_LENGTH = 4096;
const MAX_HOSTED_JOB_ENVIRONMENT_ENTRIES = 64;
const MAX_HOSTED_JOB_ENVIRONMENT_KEY_LENGTH = 128;
const MAX_HOSTED_JOB_ENVIRONMENT_VALUE_LENGTH = 4096;
const MAX_HOSTED_JOB_NAMESPACE_LENGTH = 120;
const MAX_HOSTED_JOB_FLAVOR_LENGTH = 80;
const MAX_HOSTED_JOB_TIMEOUT_SECONDS = 24 * 60 * 60;

export type HostedJobConfig = {
  image: string;
  command: string[];
  flavor?: string;
  timeout?: string | number;
  environment?: Record<string, string>;
  namespace?: string;
};

export type HuggingFaceJob = { id: string; status?: { stage?: string; message?: string }; url?: string };
export type HostedJobResult = {
  accuracy?: number;
  efficiency?: number;
  fakeRate?: number;
  metricPayload?: string;
  trackPoints?: Array<{ trackId: string; pointOrder: number; x: number; y: number; z: number }>;
};

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

function boundedText(value: unknown, maxLength: number, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) throw new Error(`${label} must be a non-empty string up to ${maxLength} characters.`);
  return text;
}

function validatedTimeout(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("_huggingFaceJob.timeout must be a duration string or number of seconds.");
  const seconds = typeof value === "number" ? value : durationSeconds(value);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_HOSTED_JOB_TIMEOUT_SECONDS) throw new Error("_huggingFaceJob.timeout must be positive and no more than 24 hours.");
  return typeof value === "number" ? Math.floor(value) : value.trim();
}

function validatedEnvironment(value: unknown) {
  if (value === undefined) return undefined;
  const record = asRecord(value);
  if (!record) throw new Error("_huggingFaceJob.environment must be an object of string values.");
  const entries = Object.entries(record);
  if (entries.length > MAX_HOSTED_JOB_ENVIRONMENT_ENTRIES) throw new Error("_huggingFaceJob.environment has too many entries.");
  return Object.fromEntries(entries.map(([key, entryValue]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || key.length > MAX_HOSTED_JOB_ENVIRONMENT_KEY_LENGTH || typeof entryValue !== "string" || entryValue.length > MAX_HOSTED_JOB_ENVIRONMENT_VALUE_LENGTH) {
      throw new Error("_huggingFaceJob.environment contains an invalid key or value.");
    }
    return [key, entryValue];
  }));
}

export function hostedJobFromHyperparameters(hyperparameters: string | null | undefined): HostedJobConfig | undefined {
  if (typeof hyperparameters !== "string") return undefined;
  const parsed = JSON.parse(hyperparameters) as unknown;
  const root = asRecord(parsed);
  const raw = asRecord(root?._huggingFaceJob);
  if (!raw) return undefined;
  const image = boundedText(raw.image, MAX_HOSTED_JOB_IMAGE_LENGTH, "_huggingFaceJob.image");
  if (!Array.isArray(raw.command) || raw.command.length === 0 || raw.command.length > MAX_HOSTED_JOB_COMMAND_ENTRIES) throw new Error("_huggingFaceJob.command must contain between 1 and 64 arguments.");
  const command = raw.command.map(item => boundedText(item, MAX_HOSTED_JOB_COMMAND_LENGTH, "_huggingFaceJob.command entries"));
  const environment = validatedEnvironment(raw.environment);
  const timeout = validatedTimeout(raw.timeout);
  const flavor = raw.flavor === undefined ? undefined : boundedText(raw.flavor, MAX_HOSTED_JOB_FLAVOR_LENGTH, "_huggingFaceJob.flavor");
  const namespace = raw.namespace === undefined ? undefined : boundedText(raw.namespace, MAX_HOSTED_JOB_NAMESPACE_LENGTH, "_huggingFaceJob.namespace");
  return {
    image,
    command,
    flavor,
    timeout,
    environment,
    namespace,
  };
}

export function jobPayload(config: HostedJobConfig, name: string): JsonRecord {
  const payload: JsonRecord = {
    dockerImage: config.image,
    command: config.command,
    arguments: [],
    environment: config.environment ?? {},
    flavor: config.flavor ?? "cpu-basic",
    labels: { name },
  };
  if (config.timeout !== undefined) {
    const seconds = typeof config.timeout === "number" ? config.timeout : durationSeconds(config.timeout);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_HOSTED_JOB_TIMEOUT_SECONDS) throw new Error("_huggingFaceJob.timeout must be positive and no more than 24 hours.");
    payload.timeoutSeconds = Math.floor(seconds);
  }
  return payload;
}

function durationSeconds(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)([smhd])$/i);
  if (!match) throw new Error("_huggingFaceJob.timeout must use a suffix such as 30m or 2h.");
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[match[2].toLowerCase() as "s" | "m" | "h" | "d"];
  return Number(match[1]) * factor;
}

export function applicationStatus(stage?: string): "queued" | "running" | "completed" | "failed" {
  if (stage === "RUNNING") return "running";
  if (stage === "COMPLETED") return "completed";
  if (stage === "ERROR" || stage === "CANCELED" || stage === "DELETED") return "failed";
  return "queued";
}

export function shouldIngestCompletedResult(status: "queued" | "running" | "completed" | "failed", hasStoredMetrics: boolean) {
  return status === "completed" && !hasStoredMetrics;
}

export function safeJobDiagnostic(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [redacted]")
    .replace(/\bhf_[A-Za-z0-9_-]+\b/g, "hf_[redacted]")
    .replace(/authorization\s*[:=]\s*[^\s,;]+/gi, "authorization=[redacted]")
    .slice(0, 500);
}

async function hfFetch(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`https://huggingface.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Hugging Face Jobs request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return response;
}

export async function namespaceFor(config: HostedJobConfig, token: string) {
  if (config.namespace) return config.namespace;
  const response = await hfFetch("/api/whoami-v2", token);
  const identity = await response.json() as { name?: string };
  if (!identity.name) throw new Error("Hugging Face account namespace could not be resolved.");
  return identity.name;
}

export async function submitHostedJob(config: HostedJobConfig, token: string, name: string) {
  const namespace = await namespaceFor(config, token);
  const response = await hfFetch(`/api/jobs/${encodeURIComponent(namespace)}`, token, { method: "POST", body: JSON.stringify(jobPayload(config, name)) });
  return await response.json() as HuggingFaceJob;
}

export async function inspectHostedJob(jobId: string, namespace: string, token: string) {
  const response = await hfFetch(`/api/jobs/${encodeURIComponent(namespace)}/${encodeURIComponent(jobId)}`, token);
  return await response.json() as HuggingFaceJob;
}

function finiteOptional(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}

export function parseJobLogResult(logs: string): HostedJobResult | undefined {
  const matches = Array.from(logs.matchAll(/TRACKLAB_RESULT=([A-Za-z0-9+/=]+)/g));
  const encoded = matches.at(-1)?.[1];
  if (!encoded) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as JsonRecord;
    const rawTracks = Array.isArray(payload.trackPoints) ? payload.trackPoints : undefined;
    const trackPoints = rawTracks?.flatMap((point): Array<{ trackId: string; pointOrder: number; x: number; y: number; z: number }> => {
      const record = asRecord(point);
      if (!record || typeof record.trackId !== "string" || !Number.isInteger(record.pointOrder) || ![record.x, record.y, record.z].every(value => typeof value === "number" && Number.isFinite(value))) return [];
      return [{ trackId: record.trackId, pointOrder: Number(record.pointOrder), x: Number(record.x), y: Number(record.y), z: Number(record.z) }];
    });
    const accuracy = finiteOptional(payload.accuracy);
    const efficiency = finiteOptional(payload.efficiency);
    const fakeRate = finiteOptional(payload.fakeRate);
    const metricPayload = typeof payload.metricPayload === "string" ? payload.metricPayload.slice(0, 10_000) : undefined;
    if (accuracy === undefined && efficiency === undefined && fakeRate === undefined && !metricPayload && !trackPoints?.length) return undefined;
    return { accuracy, efficiency, fakeRate, metricPayload, trackPoints };
  } catch {
    return undefined;
  }
}

export async function fetchJobLogResult(jobId: string, namespace: string, token: string) {
  const response = await hfFetch(`/api/jobs/${encodeURIComponent(namespace)}/${encodeURIComponent(jobId)}/logs?tail=250`, token, { headers: { Accept: "text/event-stream" } });
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  let raw = "";
  const decoder = new TextDecoder();
  const deadline = Date.now() + 4_000;
  try {
    while (Date.now() < deadline && raw.length < 1_000_000) {
      const remaining = Math.max(1, deadline - Date.now());
      const next = await Promise.race([
        reader.read(),
        new Promise<ReadableStreamReadResult<Uint8Array>>(resolve => setTimeout(() => resolve({ done: true, value: undefined }), remaining)),
      ]);
      if (next.done) break;
      raw += decoder.decode(next.value, { stream: true });
      const eventData = raw.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
      const parsed = parseJobLogResult(eventData);
      if (parsed) return parsed;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return parseJobLogResult(raw);
}
