import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("secondary research route loading", () => {
  const secondaryRoutes = ["Datasets", "Models", "Runs", "Results", "Tracks", "Findings"];

  it("lazy-loads secondary research pages while keeping the command center eager", () => {
    for (const page of secondaryRoutes) {
      expect(appSource).toContain(`const ${page} = lazy(() => import("@/pages/${page}"));`);
      expect(appSource).not.toContain(`import ${page} from "@/pages/${page}";`);
    }
    expect(appSource).toContain('import Home from "@/pages/Home";');
  });

  it("uses an accessible shared fallback for each secondary workspace", () => {
    expect(appSource).toContain("function SecondaryRouteFallback()");
    expect(appSource).toContain("Loading research workspace…");
    expect(appSource).toContain("<Suspense fallback={<SecondaryRouteFallback />}>");
  });
});
