import { describe, expect, it } from "vitest";
import { buildProtocolReadiness } from "./protocolReadiness";

describe("Protocol Readiness Matrix", () => {
  it("reports only recorded sections and never judges scientific content", () => {
    const readiness = buildProtocolReadiness({ objective: "A supplied objective", detectorContext: "", evaluationPlan: "Researcher plan", acceptanceCriteria: "  " });
    expect(readiness.map(item => item.status)).toEqual(["documented", "missing", "documented", "missing"]);
    expect(readiness.every(item => item.detail.includes("Researcher-authored") || item.detail.includes("No researcher-authored"))).toBe(true);
  });
});
