type JsonRecord = Record<string, unknown>;

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

export function hostedJobFromHyperparameters(hyperparameters: string | null | undefined): HostedJobConfig | undefined {
  if (typeof hyperparameters !== "string") return undefined;
  const parsed = JSON.parse(hyperparameters) as unknown;
  const root = asRecord(parsed);
  const raw = asRecord(root?._huggingFaceJob);
  if (!raw) return undefined;
  const image = typeof raw.image === "string" ? raw.image.trim() : "";
  const command = Array.isArray(raw.command) && raw.command.every(item => typeof item === "string") ? raw.command.map(item => item.trim()).filter(Boolean) : [];
  const environmentRecord = asRecord(raw.environment);
  const environment = environmentRecord && Object.values(environmentRecord).every(value => typeof value === "string") ? Object.fromEntries(Object.entries(environmentRecord).map(([key, value]) => [key, String(value)])) : undefined;
  if (!image || !command.length) throw new Error("_huggingFaceJob requires a Docker image and a non-empty command array.");
  if (raw.timeout !== undefined && typeof raw.timeout !== "string" && typeof raw.timeout !== "number") throw new Error("_huggingFaceJob.timeout must be a duration string or number of seconds.");
  return {
    image,
    command,
    flavor: typeof raw.flavor === "string" ? raw.flavor : undefined,
    timeout: typeof raw.timeout === "string" || typeof raw.timeout === "number" ? raw.timeout : undefined,
    environment,
    namespace: typeof raw.namespace === "string" ? raw.namespace.trim() || undefined : undefined,
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
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("_huggingFaceJob.timeout must be positive.");
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
