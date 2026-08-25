import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const runsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Runs.tsx"), "utf8");

describe("run launch review", () => {
  it("requires a review before a selected run can be submitted", () => {
    expect(runsSource).toContain("Review &amp; queue run");
    expect(runsSource).toContain("const openReview");
    expect(runsSource).toContain("setReviewOpen(true)");
    expect(runsSource).toContain("const confirmRun");
    expect(runsSource).toContain("trigger.mutate({");
  });

  it("shows selected scientific inputs, queued state, and execution boundary", () => {
    expect(runsSource).toContain("Run launch review");
    expect(runsSource).toContain("selectedDataset?.name");
    expect(runsSource).toContain("selectedConfiguration?.name");
    expect(runsSource).toContain("Initial status");
    expect(runsSource).toContain("Without an owner-authorized Hugging Face token");
  });

  it("requires explicit acknowledgement before queuing the reviewed run", () => {
    expect(runsSource).toContain("run-launch-acknowledgement");
    expect(runsSource).toContain("I confirm that this submission uses the selected dataset");
    expect(runsSource).toContain("disabled={!acknowledged || trigger.isPending}");
    expect(runsSource).toContain("Queue verified run");
  });
});
