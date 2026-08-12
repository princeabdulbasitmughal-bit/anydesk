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
