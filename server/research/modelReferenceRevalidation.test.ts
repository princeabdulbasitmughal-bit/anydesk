import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const revalidation = readFileSync(new URL("../../MODEL_REFERENCE_REVALIDATION.md", import.meta.url), "utf8");
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

describe("particleflow reference revalidation", () => {
  it("keeps the public repository as a cited research reference, not an assumed execution setup", () => {
    expect(revalidation).toContain("https://huggingface.co/jpata/particleflow");
    expect(revalidation).toContain("https://github.com/jpata/particleflow");
    expect(revalidation).toContain("not deployed by an Inference Provider");
    expect(revalidation).toContain("research and reproducibility reference only");
    expect(revalidation).toContain("detector-specific `_huggingFaceJob` image and command");
    expect(readme).toContain("MODEL_REFERENCE_REVALIDATION.md");
  });
});
