import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const findingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Findings.tsx"), "utf8");

describe("findings draft protection", () => {
  it("makes saved and unsaved finding state visible to researchers", () => {
    expect(findingsSource).toContain("Unsaved changes");
    expect(findingsSource).toContain("Saved state");
    expect(findingsSource).toContain('aria-live="polite"');
    expect(findingsSource).toContain("Your edited findings are stored only when you save");
  });

  it("registers a browser-exit warning only while findings are dirty", () => {
    expect(findingsSource).toContain("window.addEventListener(\"beforeunload\", preventAccidentalExit)");
    expect(findingsSource).toContain("window.removeEventListener(\"beforeunload\", preventAccidentalExit)");
    expect(findingsSource).toContain("if (!isDirty) return");
  });

  it("reconciles the saved snapshot without overwriting new in-editor changes", () => {
    expect(findingsSource).toContain("pendingSaveSnapshot");
    expect(findingsSource).toContain("snapshotsMatch(saved, readCurrentSnapshot())");
    expect(findingsSource).toContain("onInput={refreshDirtyState}");
    expect(findingsSource).toContain("window.requestAnimationFrame(refreshDirtyState)");
  });
});
