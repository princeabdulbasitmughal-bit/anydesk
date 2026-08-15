import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "client/src/components/ErrorBoundary.tsx"), "utf8");

describe("research workspace error boundary", () => {
  it("keeps internal error stacks out of the researcher interface", () => {
    expect(source).not.toContain("this.state.error?.stack");
    expect(source).not.toContain("this.state.error?.message");
    expect(source).toContain("A workspace view did not load");
  });

  it("provides retry and reload recovery controls with an accessible alert state", () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("Try again");
    expect(source).toContain("this.setState({ hasError: false, error: null })");
    expect(source).toContain("Reload workspace");
    expect(source).toContain("window.location.reload()");
  });
});
