import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runbook = readFileSync(new URL("../../HUGGING_FACE_RUNBOOK.md", import.meta.url), "utf8");

describe("Hugging Face activation runbook", () => {
  it("uses a structural result-manifest placeholder instead of illustrative scientific metrics", () => {
    const resultManifestLines = runbook
      .split(/\r?\n/)
      .filter((line) => line.startsWith("TRACKLAB_RESULT="));

    expect(resultManifestLines).toEqual([
      "TRACKLAB_RESULT=<BASE64_ENCODED_MANIFEST_FROM_ACTUAL_EVALUATION>",
    ]);
    expect(runbook).toContain("it is not a scientific result");
  });
});
