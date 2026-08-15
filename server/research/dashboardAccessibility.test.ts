import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");
const researchShellSource = readFileSync(resolve(process.cwd(), "client/src/components/ResearchShell.tsx"), "utf8");

describe("dashboard accessibility contract", () => {
  it("provides a keyboard skip link and one named research workspace landmark", () => {
    expect(dashboardSource).toContain('href="#research-content"');
    expect(dashboardSource).toContain('id="research-content"');
    expect(dashboardSource).toContain('aria-label="Research workspace"');
  });

  it("identifies navigation and exposes the active research page to assistive technology", () => {
    expect(dashboardSource).toContain('<nav aria-label="Research workspace">');
    expect(dashboardSource).toContain('aria-current={location === item.path ? "page" : undefined}');
    expect(dashboardSource).toContain('aria-label={isCollapsed ? "Expand research navigation" : "Collapse research navigation"}');
  });

  it("keeps the mobile navigation trigger and experiment entry action explicitly labeled", () => {
    expect(dashboardSource).toContain('aria-label="Open research navigation"');
    expect(researchShellSource).toContain('aria-label="Create a new experiment"');
    expect(researchShellSource).toContain('aria-expanded={open}');
  });

  it("moves focus into the experiment form and returns it after Escape or cancellation", () => {
    expect(researchShellSource).toContain('titleInputRef.current?.focus()');
    expect(researchShellSource).toContain('event.key !== "Escape"');
    expect(researchShellSource).toContain('triggerRef.current?.focus()');
    expect(researchShellSource).toContain('onClick={closeForm}');
  });
});
