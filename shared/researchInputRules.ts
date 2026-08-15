export const DATASET_FORMATS = ["csv", "json", "hdf5"] as const;
export const MAX_DATASET_BYTES = 25 * 1024 * 1024;

export type DatasetFormat = (typeof DATASET_FORMATS)[number];

export function getDatasetFormatFromFilename(fileName: string): DatasetFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "csv") return "csv";
  if (extension === "json") return "json";
  if (extension === "h5" || extension === "hdf5") return "hdf5";
  return null;
}

export function preflightDatasetFile(fileName: string, byteLength: number): { ok: true; format: DatasetFormat } | { ok: false; error: string } {
  const format = getDatasetFormatFromFilename(fileName);
  if (!format) return { ok: false, error: "Only CSV, JSON, and HDF5 datasets are accepted." };
  if (byteLength > MAX_DATASET_BYTES) return { ok: false, error: "This dataset exceeds the 25 MiB maximum." };
  return { ok: true, format };
}

export function formatDatasetSize(byteLength: number): string {
  return `${(byteLength / 1024 / 1024).toFixed(2)} MiB`;
}

export function parseHyperparameters(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value || "{}");
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Hyperparameters must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export type RunPrerequisite = { id: "dataset" | "configuration"; label: string; ready: boolean; description: string };

export function getRunPrerequisites(hasDataset: boolean, hasConfiguration: boolean): RunPrerequisite[] {
  return [
    { id: "dataset", label: "Stored dataset", ready: hasDataset, description: "An accepted CSV, JSON, or HDF5 file is required." },
    { id: "configuration", label: "Versioned configuration", ready: hasConfiguration, description: "A saved model ID and reproducibility metadata record is required." },
  ];
}
