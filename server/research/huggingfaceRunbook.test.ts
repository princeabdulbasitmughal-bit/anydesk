import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runbook = readFileSync(new URL("../../HUGGING_FACE_RUNBOOK.md", import.meta.url), "utf8");

describe("Hugging Face activation runbook", () => {
  it("uses a structural result-manifest placeholder instead of illustrative scientific metrics", () => {
    expect(runbook).toContain("TRACKLAB_RESULT=<BASE64_ENCODED_MANIFEST_FROM_ACTUAL_EVALUATION>");
    expect(runbook).toContain("it is not a scientific result");
    expect(runbook).not.toContain("TRACKLAB_RESULT=eyJhY2N1cmFjeSI6MC45MSwiZWZmaWNpZW5jeSI6MC44OCwiZmFrZVJhdGUiOjAuMDN9");
  });
});
