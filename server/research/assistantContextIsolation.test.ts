import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const assistantSource = readFileSync(resolve(process.cwd(), "client/src/pages/Assistant.tsx"), "utf8");

describe("assistant context isolation", () => {
  it("binds each assistant response to the experiment that submitted the question", () => {
    expect(assistantSource).toContain("type AssistantAnswer = { experimentId: number; text: string }");
    expect(assistantSource).toContain("experimentId: variables.experimentId");
    expect(assistantSource).toContain("answer?.experimentId === selectedExperimentId ? answer.text : \"\"");
    expect(assistantSource).toContain("useEffect(() => { setAnswer(null); }, [selectedExperimentId])");
  });

  it("submits only a trimmed non-empty question and explains experiment isolation", () => {
    expect(assistantSource).toContain("const sanitizedQuestion = question.trim()");
    expect(assistantSource).toContain("if (selectedExperimentId && sanitizedQuestion)");
    expect(assistantSource).toContain("No assistant response for this experiment yet");
    expect(assistantSource).toContain("Responses from another experiment are never reused here.");
  });

  it("loads Markdown rendering only when a context-matched response must be displayed", () => {
    expect(assistantSource).toContain("const DeferredStreamdown = lazy(() => import(\"streamdown\")");
    expect(assistantSource).toContain("<Suspense fallback={<p role=\"status\"");
    expect(assistantSource).toContain("Rendering grounded response…");
    expect(assistantSource).toContain("<DeferredStreamdown>{visibleAnswer}</DeferredStreamdown>");
  });
});
