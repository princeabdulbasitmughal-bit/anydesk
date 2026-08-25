import sanitizeHtml from "sanitize-html";
import { DATASET_FORMATS, MAX_DATASET_BYTES, parseHyperparameters } from "../../shared/researchInputRules";

export { DATASET_FORMATS, MAX_DATASET_BYTES, parseHyperparameters };
export const RUN_STATUSES = ["queued", "running", "completed", "failed"] as const;
export const REPORT_FORMATS = ["markdown", "pdf"] as const;
export const MAX_DATASET_BASE64_CHARS = Math.ceil(MAX_DATASET_BYTES / 3) * 4 + 512;
export const MAX_MODEL_ARTIFACT_BYTES = MAX_DATASET_BYTES;
export const MAX_MODEL_ARTIFACT_BASE64_CHARS = Math.ceil(MAX_MODEL_ARTIFACT_BYTES / 3) * 4 + 512;

export type DatasetFormat = (typeof DATASET_FORMATS)[number];
export type RunStatus = (typeof RUN_STATUSES)[number];

export function isDatasetFormat(value: string): value is DatasetFormat {
  return DATASET_FORMATS.includes(value as DatasetFormat);
}

export function isRunStatus(value: string): value is RunStatus {
  return RUN_STATUSES.includes(value as RunStatus);
}

export function decodeBase64Transport(value: string) {
  const dataUrl = value.match(/^data:[^,]*;base64,([A-Za-z0-9+/]*={0,2})$/i);
  const payload = dataUrl ? dataUrl[1] : value;
  if (!payload || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) {
    throw new Error("The dataset transport is not valid base64.");
  }
  const bytes = Buffer.from(payload, "base64");
  if (bytes.byteLength === 0 || bytes.toString("base64") !== payload) {
    throw new Error("The dataset transport is not valid base64.");
  }
  return bytes;
}

export const decodeDatasetBase64 = decodeBase64Transport;

export function decodeModelArtifactBase64(value: string) {
  const bytes = decodeBase64Transport(value);
  if (bytes.byteLength > MAX_MODEL_ARTIFACT_BYTES) {
    throw new Error("The model artifact exceeds the permitted size.");
  }
  return bytes;
}

export function createDatasetPreview(format: DatasetFormat, bytes: Buffer) {
  if (bytes.byteLength === 0) throw new Error("The uploaded dataset is empty.");
  if (bytes.byteLength > MAX_DATASET_BYTES) {
    throw new Error("The uploaded dataset exceeds the permitted size.");
  }

  if (format === "hdf5") {
    const signature = bytes.subarray(0, 8).toString("hex");
    if (signature !== "894844460d0a1a0a") {
      throw new Error("The HDF5 file signature is invalid.");
    }
    return {
      summary: `HDF5 binary dataset · ${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB`,
      preview: "HDF5 binary dataset validated. Detailed arrays and groups are made available to the configured execution job.",
    };
  }

  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  if (format === "csv") {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) throw new Error("The CSV dataset has no readable rows.");
    const columns = lines[0].split(",").length;
    return {
      summary: `CSV dataset · ${columns} columns · ${Math.max(lines.length - 1, 0)} data rows detected`,
      preview: lines.slice(0, 16).join("\n"),
    };
  }

  try {
    const parsed = JSON.parse(text);
    const kind = Array.isArray(parsed) ? `array with ${parsed.length} entries` : "object";
    return {
      summary: `JSON dataset · ${kind}`,
      preview: JSON.stringify(parsed, null, 2).slice(0, 6000),
    };
  } catch {
    throw new Error("The JSON dataset could not be parsed.");
  }
}

export function sanitizeFindings(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "u", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "code"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).slice(0, 60_000);
}

export function findingsToPlainText(value: string) {
  return sanitizeFindings(value)
    .replace(/<br\s*\/?>(\n)?/gi, "\n")
    .replace(/<\/p>|<\/h[1-3]>|<\/li>|<\/blockquote>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function safeStorageName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "dataset";
}

export function normalizeTrackPoints(points: Array<{ trackId: string; pointOrder: number; x: number; y: number; z: number }>) {
  return points.map(point => {
    if (![point.x, point.y, point.z].every(Number.isFinite)) {
      throw new Error("Inference output contains a non-finite track coordinate.");
    }
    return {
      trackId: point.trackId.trim(),
      pointOrder: point.pointOrder,
      x: String(point.x),
      y: String(point.y),
      z: String(point.z),
    };
  }).filter(point => point.trackId.length > 0);
}
