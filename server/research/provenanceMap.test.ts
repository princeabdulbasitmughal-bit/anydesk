import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const mapSource = readFileSync(resolve(process.cwd(), "client/src/pages/Provenance.tsx"), "utf8");

describe("Research Provenance Map", () => {
  it("is a lazy protected route grounded in the existing evidence-only ledger", () => {
    expect(appSource).toContain('lazy(() => import("@/pages/Provenance"))');
    expect(appSource).toContain('path="/provenance"');
    expect(mapSource).toContain("trpc.research.reproducibility.ledger.useQuery");
    expect(mapSource).toContain("<ExperimentGate>");
  });

  it("keeps absent records and unresolved links explicit without synthetic outcomes", () => {
    expect(mapSource).toContain("No protocol revision");
    expect(mapSource).toContain("No stored inputs");
    expect(mapSource).toContain("No recorded run links");
    expect(mapSource).toContain("Missing revision #");
    expect(mapSource).toContain("A protocol is not an outcome");
  });
});
