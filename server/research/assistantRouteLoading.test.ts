import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("assistant route loading", () => {
  it("loads the assistant route lazily instead of including its markdown renderer in the initial route graph", () => {
    expect(appSource).toContain('const Assistant = lazy(() => import("@/pages/Assistant"));');
    expect(appSource).not.toContain('import Assistant from "@/pages/Assistant";');
    expect(appSource).toContain('<Suspense fallback={<AssistantRouteFallback />}>');
  });
});
