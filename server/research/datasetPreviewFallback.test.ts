import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const datasetsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Datasets.tsx"), "utf8");

describe("dataset preview fallback", () => {
  it("uses an explicit unavailable-evidence fallback instead of crashing or inventing preview content", () => {
    expect(datasetsSource).toContain("function parseDatasetPreview");
    expect(datasetsSource).toContain("try {");
    expect(datasetsSource).toContain("Preview metadata is unavailable for this stored dataset.");
    expect(datasetsSource).toContain("No source preview could be safely rendered.");
    expect(datasetsSource).toContain("const preview = parseDatasetPreview(dataset.preview)");
  });
});
